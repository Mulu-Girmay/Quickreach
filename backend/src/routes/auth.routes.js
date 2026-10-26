const express = require("express");
const bcrypt = require("bcryptjs");
const { Volunteer } = require("../models");
const { generateToken, authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { registerLimiter, loginLimiter } = require("../middleware/ratelimit");
const { sendDispatcherWelcome } = require("../lib/mailer");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

// Public volunteer registration — always assigns "volunteer" role server-side.
// Dispatchers and admins cannot be created through this endpoint.
router.post("/register", registerLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
      return res.status(400).json({ error: "A valid email is required" });
    }
    if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({
        error: `Password is required and must be at least ${MIN_PASSWORD_LENGTH} characters`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const volunteer = await Volunteer.create({
      name: name || email.split("@")[0],
      email,
      password: hashedPassword,
      role: "volunteer",        // always forced — never trust client input
      approval_status: "pending",
      is_active: true,
    });

    const token = generateToken(volunteer);
    res.json({
      token,
      user: { ...volunteer.toObject(), password: undefined },
      volunteer: { ...volunteer.toObject(), password: undefined },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: "Email is already registered" });
    }
    console.error("Register error:", err);
    res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const volunteer = await Volunteer.findOne({ email });
    if (!volunteer || !(await bcrypt.compare(password, volunteer.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (volunteer.is_active === false) {
      return res.status(403).json({ error: "This account has been deactivated. Contact an administrator." });
    }

    const token = generateToken(volunteer);
    res.json({
      token,
      user: { ...volunteer.toObject(), password: undefined },
      volunteer: { ...volunteer.toObject(), password: undefined },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

// ── Dispatcher management (dispatcher or admin only) ──────────────────────────

// Create another dispatcher. The creating dispatcher sets the password;
// it is emailed to the new account as a temporary credential.
// The new account is flagged must_change_password so they are prompted on first login.
router.post(
  "/dispatchers",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { name, email, password } = req.body;

      if (!email || typeof email !== "string" || !EMAIL_RE.test(email)) {
        return res.status(400).json({ error: "A valid email is required" });
      }
      if (!password || typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const dispatcher = await Volunteer.create({
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        role: "dispatcher",
        approval_status: "approved",
        is_active: true,
        must_change_password: true,
      });

      await sendDispatcherWelcome({
        name: dispatcher.name,
        email: dispatcher.email,
        temporaryPassword: password,
        createdBy: req.user.name || req.user.email,
      });

      res.status(201).json({
        user: { ...dispatcher.toObject(), password: undefined },
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Email is already registered" });
      }
      console.error("Create dispatcher error:", err);
      res.status(500).json({ error: "Failed to create dispatcher" });
    }
  },
);

// Change own password — any authenticated role.
// Requires the current password to prevent session-hijack escalation.
router.patch(
  "/change-password",
  authMiddleware,
  async (req, res) => {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({ error: "current_password and new_password are required" });
      }
      if (new_password.length < MIN_PASSWORD_LENGTH) {
        return res.status(400).json({
          error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        });
      }

      const user = await Volunteer.findById(req.user._id);
      const valid = await bcrypt.compare(current_password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Current password is incorrect" });
      }

      await Volunteer.findByIdAndUpdate(req.user._id, {
        password: await bcrypt.hash(new_password, 10),
        must_change_password: false,
      });

      res.json({ message: "Password updated successfully" });
    } catch (err) {
      console.error("Change password error:", err);
      res.status(500).json({ error: "Failed to change password" });
    }
  },
);

// List all dispatcher accounts.
router.get(
  "/dispatchers",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const dispatchers = await Volunteer.find({ role: { $in: ["dispatcher", "admin"] } })
        .select("-password -push_subscriptions")
        .sort({ created_at: -1 });
      res.json({ dispatchers });
    } catch (err) {
      console.error("List dispatchers error:", err);
      res.status(500).json({ error: "Failed to list dispatchers" });
    }
  },
);

// Deactivate a dispatcher account (soft-delete).
// Guards: cannot deactivate yourself; cannot deactivate the last active dispatcher.
router.patch(
  "/dispatchers/:id/deactivate",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;

      if (String(req.user._id) === String(id)) {
        return res.status(400).json({ error: "You cannot deactivate your own account." });
      }

      const target = await Volunteer.findById(id);
      if (!target) {
        return res.status(404).json({ error: "Dispatcher not found" });
      }
      if (!["dispatcher", "admin"].includes(target.role)) {
        return res.status(400).json({ error: "Target account is not a dispatcher" });
      }

      // Prevent removing the last active dispatcher.
      const activeDispatcherCount = await Volunteer.countDocuments({
        role: { $in: ["dispatcher", "admin"] },
        is_active: true,
      });
      if (activeDispatcherCount <= 1) {
        return res.status(400).json({
          error: "Cannot deactivate the last active dispatcher. Create another dispatcher first.",
        });
      }

      const updated = await Volunteer.findByIdAndUpdate(
        id,
        { is_active: false },
        { new: true },
      ).select("-password -push_subscriptions");

      res.json({ user: updated });
    } catch (err) {
      console.error("Deactivate dispatcher error:", err);
      res.status(500).json({ error: "Failed to deactivate dispatcher" });
    }
  },
);

// ── Legacy admin endpoint (kept for backward compatibility) ───────────────────
// Requires admin role; allows creating citizen/volunteer/dispatcher/admin accounts.
router.post(
  "/admin/create-user",
  authMiddleware,
  requireRoles("admin"),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const normalizedRole = String(role || "").toLowerCase();
      const allowedRoles = ["citizen", "volunteer", "dispatcher", "admin"];

      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const volunteer = await Volunteer.create({
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        role: normalizedRole,
        approval_status: "approved",
        is_active: true,
      });

      res.json({
        user: { ...volunteer.toObject(), password: undefined },
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ error: "Email is already registered" });
      }
      console.error("Admin create-user error:", err);
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

module.exports = router;

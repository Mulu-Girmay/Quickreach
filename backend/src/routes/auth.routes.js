const express = require("express");
const bcrypt = require("bcryptjs");
const { Volunteer } = require("../models");
const { generateToken, authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { registerLimiter, loginLimiter } = require("../middleware/ratelimit");

const router = express.Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

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
      role: "volunteer",
      approval_status: "pending",
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

// Admin-only: create dispatcher/admin accounts. Requires a valid admin JWT —
// there is no unauthenticated path to a privileged role anymore.
router.post(
  "/admin/create-user",
  authMiddleware,
  requireRoles("admin"),
  async (req, res) => {
    try {
      const { name, email, password, role } = req.body;
      const normalizedRole = String(role || "").toLowerCase();
      const allowedRoles = ["citizen", "volunteer", "admin"];

      if (!allowedRoles.includes(normalizedRole)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      if (!email || !password) {
        return res
          .status(400)
          .json({ error: "Email and password are required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const volunteer = await Volunteer.create({
        name: name || email.split("@")[0],
        email,
        password: hashedPassword,
        role: normalizedRole,
        approval_status: "approved",
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

module.exports = router;

const express = require("express");
const bcrypt = require("bcryptjs");
const { Volunteer } = require("../models");
const { generateToken, authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");

const router = express.Router();

const SELF_REGISTERABLE_ROLES = ["citizen", "volunteer"];

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "volunteer" } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedRole = String(role || "volunteer").toLowerCase();
    if (!SELF_REGISTERABLE_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        error:
          "Invalid role. Public registration only supports citizen or volunteer accounts.",
      });
    }

    const volunteer = await Volunteer.create({
      name: name || email.split("@")[0],
      email,
      password: hashedPassword,
      role: normalizedRole,
    });

    const token = generateToken(volunteer);
    res.json({
      token,
      user: { ...volunteer.toObject(), password: undefined },
      volunteer: { ...volunteer.toObject(), password: undefined },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message || "Registration failed" });
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
      const allowedRoles = ["citizen", "volunteer", "dispatcher", "admin"];

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
      });

      res.json({
        user: { ...volunteer.toObject(), password: undefined },
      });
    } catch (err) {
      console.error("Admin create-user error:", err);
      res.status(500).json({ error: err.message || "Failed to create user" });
    }
  },
);

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

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

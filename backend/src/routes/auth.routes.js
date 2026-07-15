const express = require("express");
const bcrypt = require("bcryptjs");
const { Volunteer } = require("../models");
const { generateToken } = require("../lib/auth");

const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "volunteer" } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);

    const normalizedRole = String(role || "volunteer").toLowerCase();
    const allowedRoles = ["citizen", "volunteer", "dispatcher", "admin"];
    if (!allowedRoles.includes(normalizedRole)) {
      return res.status(400).json({ error: "Invalid role" });
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

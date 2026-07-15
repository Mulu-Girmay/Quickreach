const express = require("express");
const { Volunteer } = require("../models");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { getIO } = require("../sockets/io");

const router = express.Router();

router.get("/online", async (req, res) => {
  try {
    // Public endpoint — never return password hashes or push subscription
    // internals (endpoint URLs/keys) to unauthenticated callers.
    const volunteers = await Volunteer.find({ is_online: true }).select(
      "-password -push_subscriptions",
    );
    res.json({ volunteers });
  } catch (err) {
    console.error("Fetch volunteers error:", err);
    res.status(500).json({ error: "Failed to fetch volunteers" });
  }
});

router.get(
  "/me",
  authMiddleware,
  requireRoles("volunteer", "dispatcher", "admin"),
  async (req, res) => {
    try {
      res.json({ volunteer: req.user });
    } catch (err) {
      console.error("Fetch volunteer profile error:", err);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  },
);

router.patch(
  "/me/status",
  authMiddleware,
  requireRoles("volunteer", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const { is_online, lat, lng } = req.body;
      const updateData = { is_online, last_active: new Date() };
      if (lat !== undefined) updateData.lat = lat;
      if (lng !== undefined) updateData.lng = lng;

      const volunteer = await Volunteer.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true },
      );

      getIO().emit("volunteer-updated", volunteer);

      res.json(volunteer);
    } catch (err) {
      console.error("Update volunteer status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

module.exports = router;

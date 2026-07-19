const express = require("express");
const { Hospital } = require("../models");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json({ hospitals });
  } catch (err) {
    console.error("Fetch hospitals error:", err);
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

router.post(
  "/",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { name, lat, lng, capacity, available_beds, contact } = req.body;

      if (!name || lat === undefined || lng === undefined) {
        return res
          .status(400)
          .json({ error: "name, lat, and lng are required" });
      }

      const hospital = await Hospital.create({
        name,
        lat: Number(lat),
        lng: Number(lng),
        capacity: capacity !== undefined ? Number(capacity) : undefined,
        available_beds:
          available_beds !== undefined ? Number(available_beds) : undefined,
        contact,
      });

      res.status(201).json({ hospital });
    } catch (err) {
      console.error("Create hospital error:", err);
      res.status(500).json({ error: "Failed to create hospital" });
    }
  },
);

router.patch(
  "/:id",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { name, lat, lng, capacity, available_beds, contact } = req.body;
      const update = {};
      if (name !== undefined) update.name = name;
      if (lat !== undefined) update.lat = Number(lat);
      if (lng !== undefined) update.lng = Number(lng);
      if (capacity !== undefined) update.capacity = Number(capacity);
      if (available_beds !== undefined)
        update.available_beds = Number(available_beds);
      if (contact !== undefined) update.contact = contact;

      const hospital = await Hospital.findByIdAndUpdate(req.params.id, update, {
        new: true,
      });

      if (!hospital) {
        return res.status(404).json({ error: "Hospital not found" });
      }

      res.json({ hospital });
    } catch (err) {
      console.error("Update hospital error:", err);
      res.status(500).json({ error: "Failed to update hospital" });
    }
  },
);

module.exports = router;

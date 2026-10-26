const express = require("express");
const { Volunteer, Incident } = require("../models");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { normalizeIncidentMessageRole } = require("../utils/normalize");
const { emitToTeam } = require("../sockets/io");

const router = express.Router();

/**
 * List all volunteers with optional filtering by status and online state.
 * Accessible to dispatchers and admins.
 */
router.get(
  "/",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { status, online } = req.query;
      const query = { role: "volunteer" };

      if (status && status !== "all") {
        query.approval_status = status;
      }
      if (online !== undefined && online !== "all") {
        query.is_online = online === "true";
      }

      const volunteers = await Volunteer.find(query)
        .select("-password -push_subscriptions")
        .sort({ is_online: -1, created_at: -1 })
        .lean();

      // Find any active assigned incidents for these volunteers
      const volunteerIds = volunteers.map((v) => v._id);
      const activeIncidents = await Incident.find({
        assigned_volunteer_id: { $in: volunteerIds },
        status: { $nin: ["Resolved", "Cancelled"] },
      })
        .select("_id type status lat lng reporter_phone created_at assigned_volunteer_id")
        .lean();

      const incidentByVolId = new Map();
      activeIncidents.forEach((inc) => {
        if (inc.assigned_volunteer_id) {
          incidentByVolId.set(String(inc.assigned_volunteer_id), inc);
        }
      });

      const enrichedVolunteers = volunteers.map((v) => ({
        ...v,
        active_incident: incidentByVolId.get(String(v._id)) || null,
      }));

      res.json({ volunteers: enrichedVolunteers });
    } catch (err) {
      console.error("Fetch all volunteers error:", err);
      res.status(500).json({ error: "Failed to fetch volunteers" });
    }
  },
);

router.get("/online", async (req, res) => {
  try {
    const volunteers = await Volunteer.find({
      is_online: true,
      approval_status: "approved",
    }).select("-password -push_subscriptions");
    res.json({ volunteers });
  } catch (err) {
    console.error("Fetch volunteers error:", err);
    res.status(500).json({ error: "Failed to fetch volunteers" });
  }
});

router.get(
  "/pending",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const pending = await Volunteer.find({
        role: "volunteer",
        approval_status: "pending",
      })
        .select("-password -push_subscriptions")
        .sort({ created_at: -1 });
      res.json({ volunteers: pending });
    } catch (err) {
      console.error("Fetch pending volunteers error:", err);
      res.status(500).json({ error: "Failed to fetch pending volunteers" });
    }
  },
);

router.patch(
  "/:id/approval",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { approval_status } = req.body;

      if (!["approved", "rejected"].includes(approval_status)) {
        return res
          .status(400)
          .json({ error: 'approval_status must be "approved" or "rejected"' });
      }

      const volunteer = await Volunteer.findByIdAndUpdate(
        id,
        { approval_status },
        { new: true },
      ).select("-password -push_subscriptions");

      if (!volunteer) {
        return res.status(404).json({ error: "Volunteer not found" });
      }

      if (approval_status !== "approved" && volunteer.is_online) {
        volunteer.is_online = false;
        await Volunteer.findByIdAndUpdate(id, { is_online: false });
      }

      emitToTeam("volunteer-updated", volunteer);

      res.json({ volunteer });
    } catch (err) {
      console.error("Update volunteer approval error:", err);
      res.status(500).json({ error: "Failed to update approval status" });
    }
  },
);

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

      const role = normalizeIncidentMessageRole(req.user.role);
      if (
        role === "volunteer" &&
        is_online &&
        req.user.approval_status !== "approved"
      ) {
        return res.status(403).json({
          error:
            req.user.approval_status === "rejected"
              ? "Your volunteer application was not approved. Contact a dispatcher for details."
              : "Your volunteer registration is pending dispatcher approval.",
        });
      }

      const updateData = { is_online, last_active: new Date() };
      if (lat !== undefined) updateData.lat = lat;
      if (lng !== undefined) updateData.lng = lng;

      const volunteer = await Volunteer.findByIdAndUpdate(
        req.user._id,
        updateData,
        { new: true },
      ).select("-password -push_subscriptions");

      emitToTeam("volunteer-updated", volunteer);

      res.json(volunteer);
    } catch (err) {
      console.error("Update volunteer status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

module.exports = router;

const express = require("express");
const { Incident, Message } = require("../models");
const { triggerEmergency } = require("../ussd/handler");
const { sendSMS } = require("../lib/sms");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { requireIncidentAccess } = require("../middleware/incidentAccess");
const { buildIncidentRecommendation } = require("../services/hospitalRecommendation");
const { buildIncidentTimeline } = require("../services/incidentTimeline");
const { emitPushToEmergencyTeam } = require("../services/pushFanout");
const { getIO } = require("../sockets/io");
const { normalizeIncidentMessageRole } = require("../utils/normalize");

const router = express.Router();

/**
 * Public Incident Trigger (Web Panic Button)
 */
router.post("/public", async (req, res) => {
  try {
    const {
      type,
      lat,
      lng,
      reporter_phone,
      description,
      offline_created = false,
      client_created_at,
      client_request_id,
    } = req.body;

    const result = await triggerEmergency(
      {
        type,
        lat,
        lng,
        description,
        offline_created,
        client_created_at,
        client_request_id,
      },
      reporter_phone,
    );

    const io = getIO();

    // Create an initial citizen message so dispatch chat has a first SOS entry.
    const incidentId = result?.incident?._id;
    if (incidentId) {
      const initialMessage = await Message.create({
        incident_id: incidentId,
        sender: "citizen",
        message:
          description?.trim() ||
          `SOS alert received for ${type || result.incident.type || "Unknown"} emergency.`,
      });
      io.emit(`message-${incidentId}`, initialMessage);
    }

    io.emit("new-incident", result.incident);
    await emitPushToEmergencyTeam({
      title: "New Emergency Alert",
      body: `${result.incident.type} incident reported. Open QuickReach to review details.`,
      url: "/dispatcher",
      tag: `incident-${result.incident._id || result.incident.id}`,
      data: {
        incidentId: String(result.incident._id || result.incident.id || ""),
        status: result.incident.status || "Pending",
      },
    });
    res.json(result);
  } catch (err) {
    console.error("Public Incident Error:", err.message, err.details || err);
    res.status(500).json({ error: err.message || "Failed to create incident" });
  }
});

router.get("/", async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ created_at: -1 });
    res.json({ incidents });
  } catch (err) {
    console.error("Fetch incidents error:", err);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

router.get("/:id", requireIncidentAccess, async (req, res) => {
  try {
    const incident =
      req.publicIncident || (await Incident.findById(req.params.id));
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }
    res.json({ incident });
  } catch (err) {
    console.error("Fetch incident error:", err);
    res.status(500).json({ error: "Failed to fetch incident" });
  }
});

router.get(
  "/:id/recommendation",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const incident = await Incident.findById(req.params.id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      const recommendation = await buildIncidentRecommendation(incident);
      res.json({ recommendation });
    } catch (err) {
      res.status(500).json({ error: "Failed to get recommendation" });
    }
  },
);

router.get(
  "/:id/timeline",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const incident = await Incident.findById(req.params.id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      const timeline = await buildIncidentTimeline(incident);
      res.json({ timeline });
    } catch (err) {
      res.status(500).json({ error: "Failed to get timeline" });
    }
  },
);

router.post(
  "/:id/volunteer-accept",
  authMiddleware,
  requireRoles("volunteer", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const volunteer = req.user;

      const incident = await Incident.findById(id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      const responderLabel = normalizeIncidentMessageRole(volunteer.role) || "volunteer";
      await Message.create({
        incident_id: id,
        sender: responderLabel,
        message: `${responderLabel === "dispatcher" ? "Dispatcher" : "Volunteer"} update: ${volunteer.name} has accepted this incident and is en route.`,
      });

      await emitPushToEmergencyTeam({
        title: "Volunteer Accepted Incident",
        body: `${volunteer.name} accepted the ${incident.type} incident and is en route.`,
        url: "/dispatcher",
        tag: `incident-accept-${id}`,
        data: {
          incidentId: String(id),
        },
      });

      if (
        incident.reporter_phone &&
        !incident.reporter_phone.toUpperCase().startsWith("USSD")
      ) {
        try {
          const phone = incident.reporter_phone.replace(/[\s\-()]/g, "");
          const smsMessage = `QuickReach: Good news! ${volunteer.name} is on the way to help with your ${incident.type} emergency. Stay calm, help is coming.`;
          await sendSMS(phone, smsMessage);
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      res.json({ success: true, message: "Incident accepted" });
    } catch (err) {
      console.error("Volunteer accept error:", err);
      res.status(500).json({ error: "Failed to accept incident" });
    }
  },
);

router.patch(
  "/:id/status",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const incident = await Incident.findByIdAndUpdate(
        id,
        { status, updated_at: new Date() },
        { new: true },
      );

      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      const dispatcherUpdate = await Message.create({
        incident_id: id,
        sender: normalizeIncidentMessageRole(req.user?.role) || "dispatcher",
        message: `Dispatcher updated the incident status to ${status}.`,
      });

      const io = getIO();
      io.emit("incident-updated", incident);
      io.emit(`incident-${id}`, incident);
      io.emit(`message-${id}`, dispatcherUpdate);

      await emitPushToEmergencyTeam({
        title: `Incident ${status}`,
        body: `${incident.type} case is now marked ${status.toLowerCase()}.`,
        url: "/dispatcher",
        tag: `incident-status-${id}`,
        data: {
          incidentId: String(id),
          status,
        },
      });

      if (
        status === "Resolved" &&
        incident.reporter_phone &&
        !incident.reporter_phone.toUpperCase().startsWith("USSD")
      ) {
        try {
          const phone = incident.reporter_phone.replace(/[\s\-()]/g, "");
          const smsMessage = `QuickReach: Your ${incident.type} emergency has been resolved. We hope you are safe. Thank you for using QuickReach.`;
          await sendSMS(phone, smsMessage);
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      res.json(incident);
    } catch (err) {
      console.error("Update status error:", err);
      res.status(500).json({ error: "Failed to update status" });
    }
  },
);

module.exports = router;

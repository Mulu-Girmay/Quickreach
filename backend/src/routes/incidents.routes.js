const express = require("express");
const { Incident, Message } = require("../models");
const { triggerEmergency } = require("../ussd/handler");
const { sendSMS } = require("../lib/sms");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { requireIncidentAccess } = require("../middleware/incidentAccess");
const {
  buildIncidentRecommendation,
} = require("../services/hospitalRecommendation");
const { buildIncidentTimeline } = require("../services/incidentTimeline");
const { emitPushToEmergencyTeam } = require("../services/pushFanout");
const { emitIncidentEvent, emitToTeamAndIncident } = require("../sockets/io");
const { normalizeIncidentMessageRole } = require("../utils/normalize");
const { maskPhone } = require("../utils/mask");
const { incidentCreationLimiter } = require("../middleware/rateLimit");

const router = express.Router();

/**
 * Public Incident Trigger (Web Panic Button)
 */
router.post("/public", incidentCreationLimiter, async (req, res) => {
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
      emitToTeamAndIncident(
        incidentId,
        `message-${incidentId}`,
        initialMessage,
      );
    }

    // Team-scoped, split by privilege: dispatchers/admins get the full
    // record, volunteers get it with the phone number masked. Previously
    // this was io.emit("new-incident", ...) — a global broadcast to every
    // connected socket, authenticated or not.
    emitIncidentEvent("new-incident", result.incident, { incidentId });

    await emitPushToEmergencyTeam(
      {
        title: "New Emergency Alert",
        body: `${result.incident.type} incident reported. Open QuickReach to review details.`,
        url: "/dispatcher",
        tag: `incident-${result.incident._id || result.incident.id}`,
        data: {
          incidentId: String(result.incident._id || result.incident.id || ""),
          status: result.incident.status || "Pending",
        },
      },
      {
        incidentLocation: {
          lat: result.incident.lat,
          lng: result.incident.lng,
        },
      },
    );
    res.json(result);
  } catch (err) {
    console.error("Public Incident Error:", err.message, err.details || err);
    res.status(500).json({ error: err.message || "Failed to create incident" });
  }
});

router.get(
  "/",
  authMiddleware,
  requireRoles("volunteer", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const incidents = await Incident.find().sort({ created_at: -1 }).lean();
      const role = normalizeIncidentMessageRole(req.user?.role);

      const sanitized =
        role === "dispatcher"
          ? incidents
          : incidents.map((incident) => ({
              ...incident,
              reporter_phone: maskPhone(incident.reporter_phone),
            }));

      res.json({ incidents: sanitized });
    } catch (err) {
      console.error("Fetch incidents error:", err);
      res.status(500).json({ error: "Failed to fetch incidents" });
    }
  },
);

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

      // Atomic, conditional update: only succeeds if assigned_volunteer_id
      // is still null at the moment MongoDB applies the write. If two
      // volunteers race to accept the same incident, MongoDB serializes the
      // writes per-document — exactly one of these calls can match the
      // filter and win; the other gets null back and is told it's taken.
      // This replaces the old version, which just wrote a message with no
      // check at all, letting any number of volunteers "accept" the same
      // incident simultaneously.
      const incident = await Incident.findOneAndUpdate(
        { _id: id, assigned_volunteer_id: null },
        {
          $set: {
            assigned_volunteer_id: volunteer._id,
            assigned_volunteer_name: volunteer.name,
            assigned_at: new Date(),
            status: "Dispatched",
            updated_at: new Date(),
          },
        },
        { new: true },
      );

      if (!incident) {
        const existing = await Incident.findById(id);
        if (!existing) {
          return res.status(404).json({ error: "Incident not found" });
        }
        return res.status(409).json({
          error:
            "This incident has already been accepted by another responder.",
          assigned_volunteer_name: existing.assigned_volunteer_name,
        });
      }

      const responderLabel =
        normalizeIncidentMessageRole(volunteer.role) || "volunteer";
      const acceptMessage = await Message.create({
        incident_id: id,
        sender: responderLabel,
        message: `${responderLabel === "dispatcher" ? "Dispatcher" : "Volunteer"} update: ${volunteer.name} has accepted this incident and is en route.`,
      });

      // Status changed (Pending -> Dispatched) and assignment was set, so
      // broadcast the updated incident the same way the manual dispatcher
      // status-update endpoint does — team gets it (masked for volunteers),
      // and the citizen who owns this incident gets it via their room.
      emitIncidentEvent("incident-updated", incident, { incidentId: id });
      emitIncidentEvent(`incident-${id}`, incident, { incidentId: id });
      emitToTeamAndIncident(id, `message-${id}`, acceptMessage);

      await emitPushToEmergencyTeam(
        {
          title: "Volunteer Accepted Incident",
          body: `${volunteer.name} accepted the ${incident.type} incident and is en route.`,
          url: "/dispatcher",
          tag: `incident-accept-${id}`,
          data: {
            incidentId: String(id),
          },
        },
        { incidentLocation: { lat: incident.lat, lng: incident.lng } },
      );

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

      res.json({ success: true, message: "Incident accepted", incident });
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

      emitIncidentEvent("incident-updated", incident, { incidentId: id });
      emitIncidentEvent(`incident-${id}`, incident, { incidentId: id });
      emitToTeamAndIncident(id, `message-${id}`, dispatcherUpdate);

      await emitPushToEmergencyTeam(
        {
          title: `Incident ${status}`,
          body: `${incident.type} case is now marked ${status.toLowerCase()}.`,
          url: "/dispatcher",
          tag: `incident-status-${id}`,
          data: {
            incidentId: String(id),
            status,
          },
        },
        { incidentLocation: { lat: incident.lat, lng: incident.lng } },
      );

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

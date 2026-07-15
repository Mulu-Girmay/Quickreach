const express = require("express");
const { Incident, Message } = require("../models");
const { requireIncidentAccess } = require("../middleware/incidentAccess");
const { normalizeIncidentMessageRole } = require("../utils/normalize");
const { getIO } = require("../sockets/io");

const router = express.Router();

router.get("/:incidentId", requireIncidentAccess, async (req, res) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const messages = await Message.find({ incident_id: incidentId }).sort({
      created_at: 1,
    });
    res.json({ messages });
  } catch (err) {
    console.error("Fetch Messages Error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

router.post("/", requireIncidentAccess, async (req, res) => {
  try {
    const { incident_id, sender, message } = req.body;

    const incident = await Incident.findById(incident_id);
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const requestedSender = normalizeIncidentMessageRole(sender);
    const actorRole = req.user
      ? normalizeIncidentMessageRole(req.user.role)
      : "citizen";

    if (!requestedSender) {
      return res.status(400).json({ error: "Invalid message sender" });
    }

    if (actorRole !== requestedSender) {
      return res.status(403).json({ error: "Sender does not match your role" });
    }

    const newMessage = await Message.create({
      incident_id,
      sender: requestedSender,
      message,
    });

    const io = getIO();
    io.emit(`message-${incident_id}`, newMessage);
    if (requestedSender === "volunteer") {
      io.emit("volunteer-message", newMessage);
    }

    res.json(newMessage);
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

module.exports = router;

const { Message } = require("../models");
const { normalizeRole, normalizeIncidentMessageRole } = require("../utils/normalize");

const buildIncidentTimeline = async (incident) => {
  const messages = await Message.find({ incident_id: incident._id })
    .sort({ created_at: 1 })
    .lean();

  const events = [
    {
      event_type: `incident.reported.${normalizeRole(incident.type || "unknown")}`,
      created_at: incident.created_at || new Date(),
      detail: `Incident reported by ${incident.reporter_phone || "Unknown"}.`,
    },
  ];

  for (const message of messages) {
    events.push({
      event_type: `message.${normalizeIncidentMessageRole(message.sender) || "unknown"}`,
      created_at: message.created_at || new Date(),
      detail: message.message,
      sender: message.sender,
    });
  }

  return events.sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
};

module.exports = { buildIncidentTimeline };

const { authMiddleware } = require("../lib/auth");
const { normalizeIncidentMessageRole } = require("../utils/normalize");
const { Incident } = require("../models");

const getIncidentAccessToken = (req) =>
  String(req.headers["x-incident-token"] || "").trim();

const requireIncidentAccess = async (req, res, next) => {
  const incidentId =
    req.params.incidentId || req.params.id || req.body?.incident_id || req.body?.incidentId;
  const token = getIncidentAccessToken(req);
  const authHeader = req.headers.authorization;

  if (authHeader) {
    return authMiddleware(req, res, () => {
      const role = normalizeIncidentMessageRole(req.user?.role);
      if (!role) {
        return res.status(403).json({ error: "Insufficient role permissions" });
      }
      // Citizens with a JWT still need a valid incident token
      if (role === "citizen") {
        return validateIncidentToken(token, incidentId, res, next);
      }
      return next();
    });
  }

  if (!token) {
    return res.status(401).json({ error: "Incident token required" });
  }

  if (!incidentId) {
    return res.status(400).json({ error: "Incident id is required" });
  }

  return validateIncidentToken(token, incidentId, res, next);
};

// Validates the token against the stored access_token on the Incident document.
// Falls back to comparing against _id for incidents created before this change.
const validateIncidentToken = async (token, incidentId, res, next) => {
  if (!token) return res.status(401).json({ error: "Incident token required" });
  try {
    const incident = await Incident.findById(incidentId).select("access_token");
    if (!incident) return res.status(404).json({ error: "Incident not found" });

    const storedToken = incident.access_token;
    // If the incident has a real token, require an exact match.
    // Legacy incidents (no access_token) fall back to ID comparison.
    const valid = storedToken
      ? token === storedToken
      : String(token) === String(incidentId);

    if (!valid) return res.status(403).json({ error: "Invalid incident token" });
    return next();
  } catch {
    return res.status(400).json({ error: "Invalid incident id" });
  }
};

module.exports = { requireIncidentAccess, getIncidentAccessToken };

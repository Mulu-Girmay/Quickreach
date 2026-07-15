const { authMiddleware } = require("../lib/auth");
const { normalizeIncidentMessageRole } = require("../utils/normalize");

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

      if (role === "citizen") {
        if (!token) {
          return res.status(401).json({ error: "Incident token required" });
        }
        if (!incidentId || String(token) !== String(incidentId)) {
          return res.status(403).json({ error: "Invalid incident token" });
        }
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

  if (String(token) !== String(incidentId)) {
    return res.status(403).json({ error: "Invalid incident token" });
  }

  return next();
};

module.exports = { requireIncidentAccess, getIncidentAccessToken };

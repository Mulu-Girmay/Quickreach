const normalizeRole = (value) => String(value || "").toLowerCase();

const normalizeIncidentMessageRole = (value) => {
  const role = normalizeRole(value);
  if (role === "admin") return "dispatcher";
  if (["citizen", "volunteer", "dispatcher"].includes(role)) return role;
  return null;
};

module.exports = { normalizeRole, normalizeIncidentMessageRole };

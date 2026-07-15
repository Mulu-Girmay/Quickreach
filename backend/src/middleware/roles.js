const { normalizeRole } = require("../utils/normalize");

const requireRoles = (...allowedRoles) => {
  const normalizedAllowed = allowedRoles.map(normalizeRole);
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const role = normalizeRole(req.user.role);
    if (!normalizedAllowed.includes(role)) {
      return res.status(403).json({ error: "Insufficient role permissions" });
    }

    return next();
  };
};

module.exports = { requireRoles };

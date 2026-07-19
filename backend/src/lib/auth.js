const jwt = require("jsonwebtoken");
const { Volunteer } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET is not set. Refusing to start with an insecure fallback secret.",
  );
}

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id || user.id, role: user.role || "volunteer" },
    JWT_SECRET,
    { expiresIn: "7d" },
  );
};

// Shared by both the Express authMiddleware (below) and Socket.io's
// connection handshake, so both surfaces trust identity the exact same way
// instead of two slightly-different implementations drifting apart.
const verifyUserFromToken = async (token) => {
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const volunteer = await Volunteer.findById(decoded.id);
    return volunteer || null;
  } catch (error) {
    return null;
  }
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const user = await verifyUserFromToken(token);
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = {
  generateToken,
  authMiddleware,
  verifyUserFromToken,
  JWT_SECRET,
};

const jwt = require("jsonwebtoken");
const { Volunteer } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  // Refuse to start rather than silently signing tokens with a secret that's
  // sitting in plaintext in this file's git history. Set JWT_SECRET in your
  // environment (.env locally, host's env config in production).
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

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace("Bearer ", "");
    const decoded = jwt.verify(token, JWT_SECRET);

    const volunteer = await Volunteer.findById(decoded.id);
    if (!volunteer) {
      return res.status(401).json({ error: "Invalid token" });
    }

    req.user = volunteer;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

module.exports = { generateToken, authMiddleware, JWT_SECRET };

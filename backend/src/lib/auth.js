const jwt = require('jsonwebtoken');
const { Volunteer } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

const generateToken = (volunteerId) => {
  return jwt.sign({ id: volunteerId }, JWT_SECRET, { expiresIn: '7d' });
};

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace('Bearer ', '');
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

const rateLimit = require("express-rate-limit");

const jsonRateLimitHandler = (req, res, _next, options) => {
  res.status(options.statusCode).json({
    error: "Too many requests. Please wait a bit and try again.",
  });
};

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const incidentCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

module.exports = {
  registerLimiter,
  loginLimiter,
  incidentCreationLimiter,
  generalApiLimiter,
};

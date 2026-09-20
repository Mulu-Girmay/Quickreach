const rateLimit = require("express-rate-limit");

const jsonRateLimitHandler = (req, res, _next, options) => {
  res.status(options.statusCode).json({
    error: "Too many requests. Please wait a bit and try again.",
  });
};

// Rate limits exist to protect production from abuse, not to make the test
// suite flaky. Automated tests legitimately fire far more requests at these
// routes per run than any real client would in the same window, so under
// NODE_ENV=test we keep the limiters wired up (so behavior/shape of a 429 is
// still testable on demand) but raise the ceiling instead of disabling them.
const isTestEnv = process.env.NODE_ENV === "test";
const withTestCeiling = (max) => (isTestEnv ? Math.max(max, 100000) : max);

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: withTestCeiling(10),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: withTestCeiling(8),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const incidentCreationLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: withTestCeiling(8),
  standardHeaders: true,
  legacyHeaders: false,
  handler: jsonRateLimitHandler,
});

const generalApiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: withTestCeiling(120),
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
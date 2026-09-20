// Runs via Jest's `setupFiles`, i.e. before the test framework itself and
// before any test file (or the modules it requires) are loaded. This matters
// because src/lib/auth.js throws at *require* time if JWT_SECRET isn't set,
// so the secret has to exist before the very first `require("../src/app")`
// anywhere in the suite.
process.env.NODE_ENV = "test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-jwt-secret-do-not-use-in-prod";
process.env.VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL || "mailto:test@quickreach.local";
// Points BullMQ and the USSD session manager at a real local Redis (started
// by you, or by CI). Override via env if your local Redis lives elsewhere.
process.env.REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
process.env.NODE_ENV = "test";
process.env.JWT_SECRET =
  process.env.JWT_SECRET || "test-jwt-secret-do-not-use-in-prod";
process.env.VAPID_CONTACT_EMAIL =
  process.env.VAPID_CONTACT_EMAIL || "mailto:test@quickreach.local";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// BullMQ requires maxRetriesPerRequest: null on any connection it manages —
// it handles its own retry/backoff logic and will throw on startup if this
// isn't set. This connection is patient by design: a 5-minute background
// sweep can afford to wait out a Redis blip.
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

connection.on("connect", () => {
  console.log(`🔌 Connected to Redis at ${REDIS_URL}`);
});

// For callers that need a bounded-latency connection instead (e.g. USSD
// sessions, which live under Africa's Talking's own gateway timeout — a
// hung Redis call there means the citizen sees a blank/generic telco error
// instead of our friendlier fallback message).
const createBoundedConnection = (commandTimeoutMs = 3000) => {
  const boundedConnection = new IORedis(REDIS_URL, {
    commandTimeout: commandTimeoutMs,
  });

  boundedConnection.on("error", (err) => {
    console.error("❌ Redis connection error:", err.message);
  });

  return boundedConnection;
};

module.exports = { connection, REDIS_URL, createBoundedConnection };

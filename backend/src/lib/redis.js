const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// BullMQ requires maxRetriesPerRequest: null on any connection it manages —
// it handles its own retry/backoff logic and will throw on startup if this
// isn't set.
const connection = new IORedis(REDIS_URL, {
  maxRetriesPerRequest: null,
});

connection.on("error", (err) => {
  console.error("❌ Redis connection error:", err.message);
});

connection.on("connect", () => {
  console.log(`🔌 Connected to Redis at ${REDIS_URL}`);
});

module.exports = { connection, REDIS_URL };

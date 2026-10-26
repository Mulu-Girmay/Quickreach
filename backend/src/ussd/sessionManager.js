const NodeCache = require("node-cache");
const { getBoundedRedisConnection, isRedisAvailable } = require("../lib/redis");

const SESSION_TTL_SECONDS = 300;
const SESSION_KEY_PREFIX = "ussd:session:";

// In-memory fallback session store. Ensures USSD works seamlessly even when
// Redis is offline or not installed in local development.
const memoryCache = new NodeCache({
  stdTTL: SESSION_TTL_SECONDS,
  checkperiod: 60,
  useClones: false,
});

const STATES = {
  START: "START",
  PICK_TYPE: "PICK_TYPE",
  PICK_LOCATION: "PICK_LOCATION",
  CONFIRM: "CONFIRM",
  COMPLETED: "COMPLETED",
};

const sessionKey = (sessionId) => `${SESSION_KEY_PREFIX}${sessionId}`;

const getSession = async (sessionId) => {
  const key = sessionKey(sessionId);

  // If Redis is active, try Redis first
  if (isRedisAvailable()) {
    try {
      const redis = getBoundedRedisConnection(3000);
      if (redis) {
        const raw = await redis.get(key);
        if (raw) {
          try {
            return JSON.parse(raw);
          } catch (err) {
            console.error(`[USSD] Corrupted session data for ${sessionId}, resetting.`);
            return { state: STATES.START, data: {} };
          }
        }
      }
    } catch (err) {
      console.warn(`[USSD] Redis get failed, checking memory fallback:`, err.message);
    }
  }

  // Fallback to in-memory store
  const cached = memoryCache.get(key);
  if (cached) {
    return cached;
  }

  return { state: STATES.START, data: {} };
};

const updateSession = async (sessionId, state, data = {}) => {
  const current = await getSession(sessionId);
  const next = { state, data: { ...current.data, ...data } };
  const key = sessionKey(sessionId);

  // Always update in-memory cache
  memoryCache.set(key, next, SESSION_TTL_SECONDS);

  // Sync to Redis if active
  if (isRedisAvailable()) {
    try {
      const redis = getBoundedRedisConnection(3000);
      if (redis) {
        await redis.set(
          key,
          JSON.stringify(next),
          "EX",
          SESSION_TTL_SECONDS,
        );
      }
    } catch (err) {
      console.warn(`[USSD] Redis set failed:`, err.message);
    }
  }

  return next;
};

const clearSession = async (sessionId) => {
  const key = sessionKey(sessionId);
  memoryCache.del(key);

  if (isRedisAvailable()) {
    try {
      const redis = getBoundedRedisConnection(3000);
      if (redis) {
        await redis.del(key);
      }
    } catch (err) {
      console.warn(`[USSD] Redis del failed:`, err.message);
    }
  }
};

module.exports = {
  STATES,
  getSession,
  updateSession,
  clearSession,
};


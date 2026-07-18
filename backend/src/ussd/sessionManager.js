const { createBoundedConnection } = require("../lib/redis");

const redis = createBoundedConnection(3000);

const SESSION_TTL_SECONDS = 300;
const SESSION_KEY_PREFIX = "ussd:session:";

const STATES = {
  START: "START",
  PICK_TYPE: "PICK_TYPE",
  PICK_LOCATION: "PICK_LOCATION",
  CONFIRM: "CONFIRM",
  COMPLETED: "COMPLETED",
};

const sessionKey = (sessionId) => `${SESSION_KEY_PREFIX}${sessionId}`;

const getSession = async (sessionId) => {
  const raw = await redis.get(sessionKey(sessionId));
  if (!raw) {
    return { state: STATES.START, data: {} };
  }

  try {
    return JSON.parse(raw);
  } catch (err) {
    console.error(`[USSD] Corrupted session data for ${sessionId}, resetting.`);
    return { state: STATES.START, data: {} };
  }
};

const updateSession = async (sessionId, state, data = {}) => {
  const current = await getSession(sessionId);
  const next = { state, data: { ...current.data, ...data } };

  await redis.set(
    sessionKey(sessionId),
    JSON.stringify(next),
    "EX",
    SESSION_TTL_SECONDS,
  );

  return next;
};

const clearSession = async (sessionId) => {
  await redis.del(sessionKey(sessionId));
};

module.exports = {
  STATES,
  getSession,
  updateSession,
  clearSession,
};

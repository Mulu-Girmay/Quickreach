const NodeCache = require('node-cache');

// Sessions expire after 5 minutes of inactivity
const sessionCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

const STATES = {
  START: 'START',
  PICK_TYPE: 'PICK_TYPE',
  PICK_LOCATION: 'PICK_LOCATION',
  CONFIRM: 'CONFIRM',
  COMPLETED: 'COMPLETED'
};

const getSession = (sessionId) => {
  return sessionCache.get(sessionId) || { state: STATES.START, data: {} };
};

const updateSession = (sessionId, state, data = {}) => {
  const current = getSession(sessionId);
  sessionCache.set(sessionId, { 
    state, 
    data: { ...current.data, ...data } 
  });
};

const clearSession = (sessionId) => {
  sessionCache.del(sessionId);
};

module.exports = {
  STATES,
  getSession,
  updateSession,
  clearSession
};

const IORedis = require("ioredis");

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const isRedisExplicitlyDisabled =
  process.env.ENABLE_REDIS === "false" ||
  process.env.REDIS_ENABLED === "false" ||
  process.env.REDIS_URL === "";

let redisAvailable = false;
let redisChecked = false;
let connection = null;
let boundedConnection = null;
let loggedRedisWarning = false;

// Retry strategy: in non-production, stop retrying after 3 failed attempts
// to avoid spamming the console with ECONNREFUSED loops.
const retryStrategy = (times) => {
  if (process.env.NODE_ENV !== "production" && times > 3) {
    return null;
  }
  return Math.min(times * 1000, 10000);
};

const attachLogging = (client, name = "Redis") => {
  if (!client) return;

  client.on("connect", () => {
    redisAvailable = true;
    loggedRedisWarning = false;
    console.log(`🔌 Connected to Redis (${name}) at ${REDIS_URL}`);
  });

  client.on("ready", () => {
    redisAvailable = true;
  });

  client.on("error", (err) => {
    redisAvailable = false;
    if (!loggedRedisWarning) {
      loggedRedisWarning = true;
      console.warn(
        `⚠️ Redis (${name}) is not reachable at ${REDIS_URL} (${err.message}). QuickReach will run in local fallback mode (in-memory sessions + local dispatch sweep).`
      );
    }
  });

  client.on("close", () => {
    redisAvailable = false;
  });

  client.on("end", () => {
    redisAvailable = false;
  });
};

/**
 * Fast ping check to verify if Redis is reachable before creating persistent clients.
 * Completes in milliseconds and never loops on ECONNREFUSED.
 */
const pingRedis = async (url = REDIS_URL, timeoutMs = 1200) => {
  if (isRedisExplicitlyDisabled) {
    redisAvailable = false;
    redisChecked = true;
    return false;
  }

  return new Promise((resolve) => {
    let client;
    let timer;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
      if (client) {
        client.removeAllListeners();
        try {
          client.disconnect();
        } catch (_) {}
      }
    };

    timer = setTimeout(() => {
      cleanup();
      redisAvailable = false;
      redisChecked = true;
      resolve(false);
    }, timeoutMs);

    try {
      client = new IORedis(url, {
        connectTimeout: timeoutMs,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null,
        enableOfflineQueue: false,
        lazyConnect: false,
      });

      client.on("ready", () => {
        cleanup();
        redisAvailable = true;
        redisChecked = true;
        resolve(true);
      });

      client.on("error", () => {
        cleanup();
        redisAvailable = false;
        redisChecked = true;
        resolve(false);
      });
    } catch {
      cleanup();
      redisAvailable = false;
      redisChecked = true;
      resolve(false);
    }
  });
};

/**
 * Initialize Redis on app startup. Probes Redis reachability and only spins
 * up persistent clients if Redis is alive.
 */
const initRedis = async () => {
  if (redisChecked) return redisAvailable;
  const isUp = await pingRedis();
  if (isUp) {
    getConnection();
    getBoundedRedisConnection();
  }
  return isUp;
};

const isRedisAvailable = () => redisAvailable;

const getConnection = () => {
  if (isRedisExplicitlyDisabled) return null;
  if (!connection && redisAvailable) {
    connection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      retryStrategy,
    });
    attachLogging(connection, "BullMQ");
  }
  return connection;
};

const getBoundedRedisConnection = (commandTimeoutMs = 3000) => {
  if (isRedisExplicitlyDisabled) return null;
  if (!boundedConnection && redisAvailable) {
    boundedConnection = new IORedis(REDIS_URL, {
      commandTimeout: commandTimeoutMs,
      retryStrategy,
    });
    attachLogging(boundedConnection, "USSD-Bounded");
  }
  return boundedConnection;
};

const createBoundedConnection = (commandTimeoutMs = 3000) => {
  return getBoundedRedisConnection(commandTimeoutMs);
};

module.exports = {
  get connection() {
    return getConnection();
  },
  getConnection,
  REDIS_URL,
  pingRedis,
  initRedis,
  isRedisAvailable,
  getBoundedRedisConnection,
  createBoundedConnection,
};


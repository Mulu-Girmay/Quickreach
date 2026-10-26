const { isRedisAvailable } = require("../lib/redis");
const { scheduleDispatchSweep } = require("../queues/incidentSmsQueue");
const {
  startIncidentSmsWorker,
  processDispatchSweep,
} = require("../workers/incidentSmsWorker");

let localSweepInterval = null;

// Multi-instance mode: backed by BullMQ + Redis. The recurring schedule is registered
// once and deduped across instances by jobId.
// Single-instance/local fallback mode: runs via in-process setInterval so no external
// Redis service is required for local testing or single-server deployment.
const startIncidentUpdateService = async () => {
  if (isRedisAvailable()) {
    try {
      startIncidentSmsWorker();
      await scheduleDispatchSweep();
      console.log("✅ Dispatch sweep scheduled via Redis + BullMQ (distributed mode).");
      return;
    } catch (err) {
      console.warn("⚠️ BullMQ initialization failed:", err.message);
      console.log("ℹ️ Switching to local in-process dispatch sweep interval.");
    }
  } else {
    console.log("ℹ️ Redis not running. Dispatch sweep active via in-process interval (5m).");
  }

  // Fallback: in-process recurring sweep (every 5 minutes)
  if (!localSweepInterval) {
    localSweepInterval = setInterval(async () => {
      try {
        await processDispatchSweep();
      } catch (err) {
        console.error("❌ Local dispatch sweep error:", err.message);
      }
    }, 5 * 60 * 1000);

    if (localSweepInterval.unref) {
      localSweepInterval.unref();
    }
  }
};

const stopIncidentUpdateService = () => {
  if (localSweepInterval) {
    clearInterval(localSweepInterval);
    localSweepInterval = null;
  }
};

module.exports = { startIncidentUpdateService, stopIncidentUpdateService };


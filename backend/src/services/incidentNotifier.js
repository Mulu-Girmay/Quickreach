const { scheduleDispatchSweep } = require("../queues/incidentSmsQueue");
const { startIncidentSmsWorker } = require("../workers/incidentSmsWorker");

// Previously: a setInterval running inside this process. If you ever ran
// more than one backend instance (which you'll need to do the moment this
// gets real traffic), every instance polled independently every 5 minutes
// and could double- or triple-send the same "dispatch confirmed" SMS.
//
// Now: backed by BullMQ + Redis. The recurring schedule is registered once
// (deduped across instances by jobId), and only a worker that picks up the
// job actually runs it — so N running instances no longer mean N duplicate
// sends. See queues/incidentSmsQueue.js and workers/incidentSmsWorker.js.
const startIncidentUpdateService = async () => {
  startIncidentSmsWorker();
  await scheduleDispatchSweep();
};

module.exports = { startIncidentUpdateService };

const { Queue } = require("bullmq");
const { connection } = require("../lib/redis");

const INCIDENT_SMS_QUEUE_NAME = "incident-dispatch-sms";
const SWEEP_JOB_NAME = "sweep-dispatched-incidents";

const incidentSmsQueue = new Queue(INCIDENT_SMS_QUEUE_NAME, { connection });

// Schedules the recurring "check for Dispatched incidents that haven't been
// SMS-confirmed yet" sweep. This replaces the old setInterval that ran
// inside every backend process — if you ran 2+ instances, each one polled
// independently and could double-send the same SMS.
//
// BullMQ dedupes repeatable jobs by their jobId + repeat config, stored in
// Redis. So every instance calls this on startup, but only one schedule
// actually gets registered — re-adding an identical one is a no-op, not a
// duplicate.
const scheduleDispatchSweep = async () => {
  await incidentSmsQueue.add(
    SWEEP_JOB_NAME,
    {},
    {
      repeat: { every: 5 * 60 * 1000 },
      jobId: SWEEP_JOB_NAME,
      removeOnComplete: 50,
      removeOnFail: 50,
    },
  );
};

module.exports = {
  incidentSmsQueue,
  INCIDENT_SMS_QUEUE_NAME,
  SWEEP_JOB_NAME,
  scheduleDispatchSweep,
};

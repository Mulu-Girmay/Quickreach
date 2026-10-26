const { Queue } = require("bullmq");
const { getConnection } = require("../lib/redis");

const INCIDENT_SMS_QUEUE_NAME = "incident-dispatch-sms";
const SWEEP_JOB_NAME = "sweep-dispatched-incidents";

let queue = null;

const getIncidentSmsQueue = () => {
  if (!queue) {
    const conn = getConnection();
    if (!conn) {
      throw new Error("Redis connection is not available for BullMQ queue");
    }
    queue = new Queue(INCIDENT_SMS_QUEUE_NAME, { connection: conn });
  }
  return queue;
};

// Schedules the recurring "check for Dispatched incidents that haven't been
// SMS-confirmed yet" sweep.
const scheduleDispatchSweep = async () => {
  const q = getIncidentSmsQueue();
  await q.add(
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
  get incidentSmsQueue() {
    return getIncidentSmsQueue();
  },
  getIncidentSmsQueue,
  INCIDENT_SMS_QUEUE_NAME,
  SWEEP_JOB_NAME,
  scheduleDispatchSweep,
};


const { Worker } = require("bullmq");
const { connection } = require("../lib/redis");
const { Incident } = require("../models");
const { sendSMS } = require("../lib/sms");
const {
  INCIDENT_SMS_QUEUE_NAME,
  SWEEP_JOB_NAME,
} = require("../queues/incidentSmsQueue");

// Same logic that used to live inside the setInterval. Only difference: this
// now only runs once per scheduled tick, on whichever single worker process
// picks the job up — not once per running backend instance.
const processDispatchSweep = async () => {
  const incidents = await Incident.find({
    status: "Dispatched",
    notified_dispatched: false,
  });

  let sent = 0;
  for (const incident of incidents) {
    try {
      const phone = incident.reporter_phone.replace("USSD ", "");
      const message = `QuickReach: Dispatch confirmed. The ${incident.type} team is moving toward you. 2km remaining.`;
      await sendSMS(phone, message);

      await Incident.findByIdAndUpdate(incident._id, {
        notified_dispatched: true,
      });
      sent += 1;
    } catch (err) {
      // Deliberately swallow per-incident errors so one bad phone number or
      // one SMS-gateway blip doesn't fail the whole sweep or trigger BullMQ
      // to retry-storm the entire batch.
      console.error(
        `Failed to send SMS for incident ${incident._id}:`,
        err.message,
      );
    }
  }

  return { checked: incidents.length, sent };
};

let worker = null;

const startIncidentSmsWorker = () => {
  if (worker) return worker;

  worker = new Worker(
    INCIDENT_SMS_QUEUE_NAME,
    async (job) => {
      if (job.name === SWEEP_JOB_NAME) {
        return processDispatchSweep();
      }
    },
    { connection },
  );

  worker.on("completed", (job, result) => {
    if (result?.sent) {
      console.log(
        `✅ Dispatch sweep sent ${result.sent}/${result.checked} pending SMS confirmations.`,
      );
    }
  });

  worker.on("failed", (job, err) => {
    console.error(`❌ Incident SMS job ${job?.id} failed:`, err.message);
  });

  return worker;
};

module.exports = { startIncidentSmsWorker, processDispatchSweep };

const { Incident } = require("../models");
const { sendSMS } = require("../lib/sms");

const startIncidentUpdateService = () => {
  setInterval(
    async () => {
      const incidents = await Incident.find({
        status: "Dispatched",
        notified_dispatched: false,
      });

      for (const incident of incidents) {
        try {
          const phone = incident.reporter_phone.replace("USSD ", "");
          const message = `QuickReach: Dispatch confirmed. The ${incident.type} team is moving toward you. 2km remaining.`;
          await sendSMS(phone, message);

          await Incident.findByIdAndUpdate(incident._id, {
            notified_dispatched: true,
          });
        } catch (err) {
          console.error(
            `Failed to send SMS for incident ${incident._id}:`,
            err,
          );
        }
      }
    },
    5 * 60 * 1000,
  );
};

module.exports = { startIncidentUpdateService };

const { Volunteer } = require("../models");
const { sendPushNotification } = require("../lib/push");

const EMERGENCY_TEAM_ROLES = ["volunteer", "dispatcher", "admin"];

const normalizePushSubscription = (subscription, userAgent = "") => {
  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return null;
  }

  return {
    endpoint: subscription.endpoint,
    expirationTime: subscription.expirationTime || null,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    userAgent: userAgent || "",
    created_at: new Date(),
  };
};

const emitPushToEmergencyTeam = async (payload) => {
  const recipients = await Volunteer.find({
    role: { $in: EMERGENCY_TEAM_ROLES },
    "push_subscriptions.0": { $exists: true },
  }).lean();

  const jobs = [];

  for (const recipient of recipients) {
    for (const subscription of recipient.push_subscriptions || []) {
      jobs.push(
        (async () => {
          try {
            await sendPushNotification(subscription, payload);
          } catch (error) {
            const statusCode = error?.statusCode || error?.status;
            if (statusCode === 410 || statusCode === 404) {
              await Volunteer.updateOne(
                { _id: recipient._id },
                {
                  $pull: {
                    push_subscriptions: { endpoint: subscription.endpoint },
                  },
                },
              );
            }
          }
        })(),
      );
    }
  }

  await Promise.allSettled(jobs);
};

module.exports = {
  EMERGENCY_TEAM_ROLES,
  normalizePushSubscription,
  emitPushToEmergencyTeam,
};

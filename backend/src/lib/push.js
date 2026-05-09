const webpush = require("web-push");

const createVapidKeys = () => {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
    return {
      publicKey: process.env.VAPID_PUBLIC_KEY,
      privateKey: process.env.VAPID_PRIVATE_KEY,
    };
  }

  return webpush.generateVAPIDKeys();
};

const vapidKeys = createVapidKeys();
const vapidContact =
  process.env.VAPID_CONTACT_EMAIL || "mailto:alerts@quickreach.local";

webpush.setVapidDetails(
  vapidContact,
  vapidKeys.publicKey,
  vapidKeys.privateKey,
);

const getVapidPublicKey = () => vapidKeys.publicKey;

const sendPushNotification = async (subscription, payload) => {
  if (!subscription?.endpoint) {
    return { success: false, skipped: true };
  }

  await webpush.sendNotification(subscription, JSON.stringify(payload));
  return { success: true };
};

module.exports = {
  getVapidPublicKey,
  sendPushNotification,
};

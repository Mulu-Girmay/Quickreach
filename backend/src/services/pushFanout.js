const { Volunteer } = require("../models");
const { sendPushNotification } = require("../lib/push");
const { haversineKm } = require("../utils/geo");
const { normalizeIncidentMessageRole } = require("../utils/normalize");

const EMERGENCY_TEAM_ROLES = ["volunteer", "dispatcher", "admin"];

// Default radius for "nearby" volunteer notifications. Dispatchers/admins
// always get notified regardless of distance — they're managing the whole
// board, not responding in person.
const DEFAULT_NOTIFY_RADIUS_KM = 10;

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

// `incidentLocation`, if provided as { lat, lng }, restricts volunteer
// recipients to those within `radiusKm` who have a known location.
// Volunteers with no lat/lng on file (e.g. they've never sent a location
// update) are treated as "unknown distance" and still notified — better to
// over-notify a volunteer who hasn't shared location than to silently drop
// them from every alert. Dispatchers/admins are never distance-filtered.
const emitPushToEmergencyTeam = async (
  payload,
  { incidentLocation = null, radiusKm = DEFAULT_NOTIFY_RADIUS_KM } = {},
) => {
  const recipients = await Volunteer.find({
    role: { $in: EMERGENCY_TEAM_ROLES },
    "push_subscriptions.0": { $exists: true },
  }).lean();

  const hasIncidentLocation =
    incidentLocation &&
    Number.isFinite(Number(incidentLocation.lat)) &&
    Number.isFinite(Number(incidentLocation.lng));

  const targetRecipients = recipients.filter((recipient) => {
    const role = normalizeIncidentMessageRole(recipient.role);
    if (role === "dispatcher") return true; // dispatcher/admin: always notified

    if (!hasIncidentLocation) return true; // no incident location given: don't filter

    if (recipient.lat == null || recipient.lng == null) {
      return true; // unknown volunteer location: don't silently drop them
    }

    const volLat = Number(recipient.lat);
    const volLng = Number(recipient.lng);
    if (!Number.isFinite(volLat) || !Number.isFinite(volLng)) {
      return true; // malformed location data: don't silently drop them
    }

    const distanceKm = haversineKm(
      Number(incidentLocation.lat),
      Number(incidentLocation.lng),
      volLat,
      volLng,
    );
    return distanceKm <= radiusKm;
  });

  const jobs = [];

  for (const recipient of targetRecipients) {
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
  DEFAULT_NOTIFY_RADIUS_KM,
  normalizePushSubscription,
  emitPushToEmergencyTeam,
};

const express = require("express");
const { Volunteer } = require("../models");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { getVapidPublicKey } = require("../lib/push");
const { normalizePushSubscription } = require("../services/pushFanout");

const router = express.Router();

router.get("/vapid-public-key", (req, res) => {
  res.json({ publicKey: getVapidPublicKey() });
});

router.post(
  "/subscribe",
  authMiddleware,
  requireRoles("volunteer", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const { subscription } = req.body;
      const normalized = normalizePushSubscription(
        subscription,
        req.headers["user-agent"],
      );

      if (!normalized) {
        return res.status(400).json({ error: "Invalid push subscription" });
      }

      const volunteer = await Volunteer.findByIdAndUpdate(
        req.user._id,
        {
          $pull: { push_subscriptions: { endpoint: normalized.endpoint } },
          $push: { push_subscriptions: normalized },
        },
        { new: true },
      );

      res.json({ success: true, volunteer });
    } catch (err) {
      console.error("Subscribe push error:", err);
      res.status(500).json({ error: "Failed to subscribe to push" });
    }
  },
);

router.post(
  "/unsubscribe",
  authMiddleware,
  requireRoles("volunteer", "dispatcher", "admin"),
  async (req, res) => {
    try {
      const endpoint = req.body?.endpoint || req.body?.subscription?.endpoint;
      if (!endpoint) {
        return res.status(400).json({ error: "Missing subscription endpoint" });
      }

      const volunteer = await Volunteer.findByIdAndUpdate(
        req.user._id,
        { $pull: { push_subscriptions: { endpoint } } },
        { new: true },
      );

      res.json({ success: true, volunteer });
    } catch (err) {
      console.error("Unsubscribe push error:", err);
      res.status(500).json({ error: "Failed to unsubscribe from push" });
    }
  },
);

module.exports = router;

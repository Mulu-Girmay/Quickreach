const express = require("express");
const { buildPublicStats } = require("../services/publicStats");

const router = express.Router();

// Public, unauthenticated aggregate stats for the landing page. Returns only
// counts — never raw incident/volunteer records. Safe to poll without auth.
router.get("/public", async (req, res) => {
  try {
    const stats = await buildPublicStats();
    res.json(stats);
  } catch (err) {
    console.error("Public stats error:", err);
    res.status(500).json({ error: "Failed to fetch public stats" });
  }
});

module.exports = router;

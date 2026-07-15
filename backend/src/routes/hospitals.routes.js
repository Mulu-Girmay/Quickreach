const express = require("express");
const { Hospital } = require("../models");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json({ hospitals });
  } catch (err) {
    console.error("Fetch hospitals error:", err);
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

module.exports = router;

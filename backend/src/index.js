const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();

const { connectDB } = require("./lib/mongodb");
const { Incident, Volunteer, Hospital, Message } = require("./models");
const { ussdHandler } = require("./ussd/handler");
const { sendSMS } = require("./lib/sms");
const { authMiddleware, generateToken } = require("./lib/auth");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.get("/", (req, res) => {
  res.json({ message: "QuickReach Backend API is live." });
});

/**
 * Public Incident Trigger (Web Panic Button)
 */
const { triggerEmergency } = require("./ussd/handler");

app.post("/api/incidents/public", async (req, res) => {
  try {
    const { type, lat, lng, reporter_phone, description } = req.body;

    const result = await triggerEmergency(
      { type, lat, lng, description },
      reporter_phone,
    );

    // Create an initial citizen message so dispatch chat has a first SOS entry.
    const incidentId = result?.incident?._id;
    if (incidentId) {
      const initialMessage = await Message.create({
        incident_id: incidentId,
        sender: "citizen",
        message:
          description?.trim() ||
          `SOS alert received for ${type || result.incident.type || "Unknown"} emergency.`,
      });
      io.emit(`message-${incidentId}`, initialMessage);
    }

    io.emit("new-incident", result.incident);
    res.json(result);
  } catch (err) {
    console.error("Public Incident Error:", err.message, err.details || err);
    res.status(500).json({ error: err.message || "Failed to create incident" });
  }
});

app.get("/api/incidents", async (req, res) => {
  try {
    const incidents = await Incident.find().sort({ created_at: -1 });
    res.json({ incidents });
  } catch (err) {
    console.error("Fetch incidents error:", err);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

app.get("/api/hospitals", async (req, res) => {
  try {
    const hospitals = await Hospital.find();
    res.json({ hospitals });
  } catch (err) {
    console.error("Fetch hospitals error:", err);
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

app.get("/api/analytics/overview", async (req, res) => {
  try {
    const [incidents, hospitals, volunteers, messages] = await Promise.all([
      Incident.find().lean(),
      Hospital.find().lean(),
      Volunteer.find().lean(),
      Message.find().lean(),
    ]);

    const toDate = (value) => {
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };

    const totalIncidents = incidents.length;
    const resolvedIncidents = incidents.filter(
      (incident) => incident.status === "Resolved",
    ).length;
    const dispatchedIncidents = incidents.filter(
      (incident) => incident.status === "Dispatched",
    ).length;
    const onlineVolunteers = volunteers.filter(
      (volunteer) => volunteer.is_online,
    );

    const responseDurations = incidents
      .map((incident) => {
        const created = toDate(incident.created_at);
        const updated = toDate(incident.updated_at);
        if (!created || !updated) return null;
        const duration = updated.getTime() - created.getTime();
        return duration > 0 ? duration : null;
      })
      .filter(Boolean);

    const avgResponseMin =
      responseDurations.length > 0
        ? responseDurations.reduce((sum, value) => sum + value, 0) /
          responseDurations.length /
          (1000 * 60)
        : 0;

    const sortedIncidents = [...incidents].sort(
      (a, b) => new Date(a.created_at) - new Date(b.created_at),
    );
    const dayBuckets = new Map();
    for (const incident of sortedIncidents) {
      const created = toDate(incident.created_at);
      if (!created) continue;
      const key = created.toISOString().slice(0, 10);
      dayBuckets.set(key, (dayBuckets.get(key) || 0) + 1);
    }

    const incidentTrends = Array.from(dayBuckets.entries())
      .slice(-30)
      .map(([day, incidentsCount]) => ({
        day,
        incidents: incidentsCount,
      }));

    const typeCounts = new Map();
    for (const incident of incidents) {
      const key = incident.type || "Unknown";
      typeCounts.set(key, (typeCounts.get(key) || 0) + 1);
    }

    const emergencyDistribution = Array.from(typeCounts.entries()).map(
      ([name, value]) => ({ name, value, color: null }),
    );

    const hospitalLoad = hospitals.map((hospital) => {
      const capacity = Number(hospital.capacity || 0);
      const availableBeds = Number(hospital.available_beds || 0);
      const loadPct =
        capacity > 0
          ? Math.max(
              0,
              Math.min(100, ((capacity - availableBeds) / capacity) * 100),
            )
          : 0;

      return {
        name: hospital.name,
        load_pct: loadPct,
        available_beds: availableBeds,
        capacity,
      };
    });

    const reporterCounts = new Map();
    for (const incident of incidents) {
      const reporter = String(incident.reporter_phone || "Unknown");
      const current = reporterCounts.get(reporter) || {
        name: reporter,
        responses: 0,
        lastIncidentAt: null,
      };
      current.responses += 1;
      const created = toDate(incident.created_at);
      if (
        created &&
        (!current.lastIncidentAt || created > current.lastIncidentAt)
      ) {
        current.lastIncidentAt = created;
      }
      reporterCounts.set(reporter, current);
    }

    const topReporters = Array.from(reporterCounts.values())
      .sort((a, b) => b.responses - a.responses)
      .slice(0, 5)
      .map((item) => ({
        name: item.name,
        responses: item.responses,
        stars: Math.min(5, Math.max(1, item.responses)),
        lastIncidentAt: item.lastIncidentAt,
      }));

    const zoneCounts = new Map();
    for (const incident of incidents) {
      const lat = Number(incident.lat);
      const lng = Number(incident.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
      const zoneKey = `${lat.toFixed(1)}, ${lng.toFixed(1)}`;
      const current = zoneCounts.get(zoneKey) || {
        zone: zoneKey,
        time: 0,
        count: 0,
      };
      const created = toDate(incident.created_at);
      current.count += 1;
      current.time += created
        ? Math.max(1, Math.round((Date.now() - created.getTime()) / 60000))
        : 0;
      zoneCounts.set(zoneKey, current);
    }

    const incidentHotspots = Array.from(zoneCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 6)
      .map((item) => ({
        zone: item.zone,
        time:
          item.count > 0 ? Math.max(1, Math.round(item.time / item.count)) : 0,
        count: item.count,
        color:
          item.count >= 3
            ? "#EF4444"
            : item.count === 2
              ? "#EAB308"
              : "#00FF88",
        detail: `${item.count} incidents recorded in this geographic cluster.`,
      }));

    const volunteerActivity = volunteers
      .slice()
      .sort(
        (a, b) => new Date(b.last_active || 0) - new Date(a.last_active || 0),
      )
      .slice(0, 10)
      .map((volunteer) => ({
        name: volunteer.name,
        is_online: Boolean(volunteer.is_online),
        last_active: volunteer.last_active || volunteer.created_at || null,
        lat: volunteer.lat,
        lng: volunteer.lng,
        email: volunteer.email,
      }));

    res.json({
      metrics: {
        total_incidents: totalIncidents,
        dispatch_success_pct:
          totalIncidents > 0
            ? Math.round((resolvedIncidents / totalIncidents) * 100)
            : 0,
        avg_response_min: avgResponseMin,
        avg_response_delta_pct:
          dispatchedIncidents > 0 && resolvedIncidents > 0
            ? Math.round(
                ((resolvedIncidents - dispatchedIncidents) /
                  Math.max(1, dispatchedIncidents)) *
                  100,
              )
            : 0,
        volunteer_response_pct:
          volunteers.length > 0
            ? Math.round((onlineVolunteers.length / volunteers.length) * 100)
            : 0,
      },
      incident_trends: incidentTrends,
      emergency_distribution: emergencyDistribution,
      hospital_load: hospitalLoad,
      top_reporters: topReporters,
      incident_hotspots: incidentHotspots,
      volunteer_activity: volunteerActivity,
      recent_messages: messages
        .slice()
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10),
    });
  } catch (err) {
    console.error("Analytics overview error:", err);
    res.status(500).json({ error: "Failed to fetch analytics overview" });
  }
});

app.get("/api/volunteers/online", async (req, res) => {
  try {
    const volunteers = await Volunteer.find({ is_online: true });
    res.json({ volunteers });
  } catch (err) {
    console.error("Fetch volunteers error:", err);
    res.status(500).json({ error: "Failed to fetch volunteers" });
  }
});

app.get("/api/volunteers/me", authMiddleware, async (req, res) => {
  try {
    res.json({ volunteer: req.user });
  } catch (err) {
    console.error("Fetch volunteer profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.patch("/api/volunteers/me/status", authMiddleware, async (req, res) => {
  try {
    const { is_online, lat, lng } = req.body;
    const updateData = { is_online, last_active: new Date() };
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;

    const volunteer = await Volunteer.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true },
    );

    res.json(volunteer);
  } catch (err) {
    console.error("Update volunteer status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.post(
  "/api/incidents/:id/volunteer-accept",
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const volunteer = req.user;

      const incident = await Incident.findById(id);
      if (!incident) {
        return res.status(404).json({ error: "Incident not found" });
      }

      await Message.create({
        incident_id: id,
        sender: "volunteer",
        message: `Volunteer update: ${volunteer.name} has accepted this incident and is en route.`,
      });

      if (
        incident.reporter_phone &&
        !incident.reporter_phone.toUpperCase().startsWith("USSD")
      ) {
        try {
          const phone = incident.reporter_phone.replace(/[\s\-()]/g, "");
          const smsMessage = `QuickReach: Good news! ${volunteer.name} is on the way to help with your ${incident.type} emergency. Stay calm, help is coming.`;
          await sendSMS(phone, smsMessage);
        } catch (smsError) {
          console.error("SMS notification failed:", smsError);
        }
      }

      res.json({ success: true, message: "Incident accepted" });
    } catch (err) {
      console.error("Volunteer accept error:", err);
      res.status(500).json({ error: "Failed to accept incident" });
    }
  },
);

app.patch("/api/incidents/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const incident = await Incident.findByIdAndUpdate(
      id,
      { status, updated_at: new Date() },
      { new: true },
    );

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    // Emit Socket.io event for real-time updates
    io.emit("incident-updated", incident);
    io.emit(`incident-${id}`, incident);

    if (
      status === "Resolved" &&
      incident.reporter_phone &&
      !incident.reporter_phone.toUpperCase().startsWith("USSD")
    ) {
      try {
        const phone = incident.reporter_phone.replace(/[\s\-()]/g, "");
        const smsMessage = `QuickReach: Your ${incident.type} emergency has been resolved. We hope you are safe. Thank you for using QuickReach.`;
        await sendSMS(phone, smsMessage);
      } catch (smsError) {
        console.error("SMS notification failed:", smsError);
      }
    }

    res.json(incident);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.get("/api/incidents/:id/recommendation", async (req, res) => {
  try {
    res.json({ recommendation: null });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recommendation" });
  }
});

app.get("/api/incidents/:id/timeline", async (req, res) => {
  try {
    res.json({ timeline: [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

/**
 * Emergency Chat Messages
 */
app.get("/api/messages/:incidentId", async (req, res) => {
  try {
    const { incidentId } = req.params;

    const incident = await Incident.findById(incidentId);
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const messages = await Message.find({ incident_id: incidentId }).sort({
      created_at: 1,
    });
    res.json({ messages });
  } catch (err) {
    console.error("Fetch Messages Error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { incident_id, sender, message } = req.body;

    const incident = await Incident.findById(incident_id);
    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const newMessage = await Message.create({ incident_id, sender, message });

    // Emit Socket.io event for real-time chat
    io.emit(`message-${incident_id}`, newMessage);
    if (sender === "volunteer") {
      io.emit("volunteer-message", newMessage);
    }

    res.json(newMessage);
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * Africa's Talking USSD Webhook
 * POST requests from AT gateway
 */
app.post("/ussd", ussdHandler);

// Background Service: Automated SMS Updates
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

startIncidentUpdateService();

// Health Check
app.get("/health", (req, res) => {
  res.status(200).send("OK");
});

// Socket.io for real-time updates
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Auth endpoints
app.post("/api/auth/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    const volunteer = await Volunteer.create({
      name: name || email.split("@")[0],
      email,
      password: hashedPassword,
    });

    const token = generateToken(volunteer._id);
    res.json({
      token,
      volunteer: { ...volunteer.toObject(), password: undefined },
    });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ error: err.message || "Registration failed" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const bcrypt = require("bcryptjs");

    const volunteer = await Volunteer.findOne({ email });
    if (!volunteer || !(await bcrypt.compare(password, volunteer.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = generateToken(volunteer._id);
    res.json({
      token,
      volunteer: { ...volunteer.toObject(), password: undefined },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed" });
  }
});

const startServer = async () => {
  try {
    await connectDB();
    server.listen(PORT, () => {
      console.log(`
  🚑 QuickReach Backend Service
  ----------------------------
  Port: ${PORT}
  USSD Webhook: http://localhost:${PORT}/ussd
  Database: MongoDB
  Status: Operational
  `);
    });
  } catch (error) {
    console.error("❌ Startup failed:", error.message);
    process.exit(1);
  }
};

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      `❌ Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`,
    );
  } else {
    console.error("❌ Server error:", err);
  }
  process.exit(1);
});

// Start Server
startServer();

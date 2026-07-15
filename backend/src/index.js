const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");
require("dotenv").config({ debug: true });

const { connectDB } = require("./lib/mongodb");
const { ussdHandler } = require("./ussd/handler");
const { allowedOrigins } = require("./config/cors");
const socketIO = require("./sockets/io");
const { seedDemoAccounts } = require("./services/seedDemoAccounts");
const { startIncidentUpdateService } = require("./services/incidentNotifier");
const { generalApiLimiter } = require("./middleware/rateLimit");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

socketIO.init(server, allowedOrigins);

// Middleware
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.use("/", require("./routes/system.routes"));
app.use("/api", generalApiLimiter);
app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/incidents", require("./routes/incidents.routes"));
app.use("/api/hospitals", require("./routes/hospitals.routes"));
app.use("/api/volunteers", require("./routes/volunteers.routes"));
app.use("/api/messages", require("./routes/messages.routes"));
app.use("/api/push", require("./routes/push.routes"));
app.use("/api/analytics", require("./routes/analytics.routes"));
app.use("/api/stats", require("./routes/stats.routes"));

/**
 * Africa's Talking USSD Webhook
 * POST requests from AT gateway
 */
app.post("/ussd", ussdHandler);

const startServer = async () => {
  try {
    await connectDB();
    await seedDemoAccounts();
    startIncidentUpdateService();
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

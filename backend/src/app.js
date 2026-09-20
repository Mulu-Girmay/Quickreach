const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");

const { ussdHandler } = require("./ussd/handler");
const { allowedOrigins } = require("./config/cors");
const socketIO = require("./sockets/io");
const { generalApiLimiter } = require("./middleware/ratelimit");

/**
 * Builds a fully wired Express app + its underlying http.Server, but does
 * NOT connect to MongoDB, seed data, start background services, or call
 * server.listen(). That separation is what lets tests (supertest) and the
 * real entrypoint (src/index.js) share one source of truth for routing
 * without tests needing a live port or a real database connection to even
 * import the app.
 */
function createApp() {
  const app = express();
  const server = http.createServer(app);

  app.set("trust proxy", 1);

  // Socket.io needs to be initialized before routes run, since several
  // routes emit events synchronously via sockets/io.js's getIO(), which
  // throws if init() hasn't been called yet.
  socketIO.init(server, allowedOrigins);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

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

  app.post("/ussd", ussdHandler);

  // Fallback error handler: any thrown/rejected error that a route didn't
  // catch itself lands here as a clean JSON 500 instead of Express's
  // default HTML stack trace (which leaks internals to API clients).
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error("Unhandled error:", err);
    if (res.headersSent) return next(err);
    res.status(500).json({ error: "Internal server error" });
  });

  return { app, server };
}

module.exports = { createApp };
require("dotenv").config({ debug: true });

const { createApp } = require("./app");
const { connectDB } = require("./lib/mongodb");
const { seedDemoAccounts } = require("./services/seedDemoAccounts");
const { startIncidentUpdateService } = require("./services/incidentNotifier");

const { app, server } = createApp();
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    await connectDB();
    await seedDemoAccounts();
    await startIncidentUpdateService();
    server.listen(PORT, () => {
      console.log(`
  server is running at http://localhost:${PORT}
  `);
    });
  } catch (error) {
    console.error("Startup failed:", error.message);
    process.exit(1);
  }
};

server.on("error", (err) => {
  if (err && err.code === "EADDRINUSE") {
    console.error(
      ` Port ${PORT} is already in use. Stop the other process or change PORT in backend/.env.`,
    );
  } else {
    console.error("Server error:", err);
  }
  process.exit(1);
});

startServer();

module.exports = { app, server };
const dns = require("dns");
const mongoose = require("mongoose");
require("dotenv").config();

// On Windows, local network/ISP DNS often fails querySrv for mongodb+srv://
if (process.platform === "win32") {
  try {
    dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
  } catch (_) {}
}

function maskMongoUri(uri) {
  if (!uri || typeof uri !== "string") return uri;
  return uri.replace(/\/\/.*@/, "//<credentials>@");
}

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error(
        "Missing MongoDB URI. Set MONGO_URI or MONGODB_URI in backend/.env",
      );
    }

    console.log("Connecting to MongoDB at", maskMongoUri(mongoUri));
    await mongoose.connect(mongoUri, { connectTimeoutMS: 10000 });
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error.message);
    console.error(error);
    if (process.env.MONGO_URI) {
      console.error("Used MONGO_URI:", maskMongoUri(process.env.MONGO_URI));
    }
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };

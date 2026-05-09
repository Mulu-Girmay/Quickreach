const mongoose = require("mongoose");

const IncidentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  status: { type: String, default: "Pending" },
  reporter_phone: { type: String, required: true },
  description: String,
  session_id: String,
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  triage_score: Number,
  notified_dispatched: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const VolunteerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  role: {
    type: String,
    enum: ["citizen", "volunteer", "dispatcher", "admin"],
    default: "volunteer",
  },
  phone: { type: String },
  email: { type: String, required: true, unique: true },
  password: String,
  is_online: { type: Boolean, default: false },
  lat: Number,
  lng: Number,
  last_active: Date,
  push_subscriptions: {
    type: [
      new mongoose.Schema(
        {
          endpoint: { type: String, required: true },
          expirationTime: { type: Number, default: null },
          keys: {
            p256dh: { type: String, required: true },
            auth: { type: String, required: true },
          },
          userAgent: { type: String },
          created_at: { type: Date, default: Date.now },
        },
        { _id: false },
      ),
    ],
    default: [],
  },
  created_at: { type: Date, default: Date.now },
});

const HospitalSchema = new mongoose.Schema({
  name: { type: String, required: true },
  lat: Number,
  lng: Number,
  capacity: Number,
  available_beds: Number,
  contact: String,
  created_at: { type: Date, default: Date.now },
});

const MessageSchema = new mongoose.Schema({
  incident_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Incident",
    required: true,
  },
  sender: { type: String, required: true },
  message: { type: String, required: true },
  created_at: { type: Date, default: Date.now },
});

const Incident = mongoose.model("Incident", IncidentSchema);
const Volunteer = mongoose.model("Volunteer", VolunteerSchema);
const Hospital = mongoose.model("Hospital", HospitalSchema);
const Message = mongoose.model("Message", MessageSchema);

module.exports = { Incident, Volunteer, Hospital, Message };

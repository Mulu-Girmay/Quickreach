const IncidentSchema = new mongoose.Schema({
  type: { type: String, required: true },
  lat: { type: Number, required: true },
  lng: { type: Number, required: true },
  status: { type: String, default: "Pending" },
  reporter_phone: { type: String, required: true },
  description: String,
  session_id: String,
  client_request_id: { type: String, index: true, unique: true, sparse: true },
  offline_created: { type: Boolean, default: false },
  client_created_at: { type: Date },
  hospital_id: { type: mongoose.Schema.Types.ObjectId, ref: "Hospital" },
  triage_score: Number,
  notified_dispatched: { type: Boolean, default: false },
  // Tracks which single volunteer/dispatcher accepted this incident. Null
  // means unassigned. Set atomically (see volunteer-accept route) so two
  // responders racing to accept the same incident can't both "win."
  assigned_volunteer_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Volunteer",
    default: null,
  },
  assigned_volunteer_name: { type: String, default: null },
  assigned_at: { type: Date, default: null },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
});

const { Incident, Hospital, Volunteer } = require("../models");
const { haversineKm } = require("../utils/geo");

// Aggregate-only numbers for public, unauthenticated display (e.g. the
// marketing landing page). Deliberately never returns raw incident records —
// no reporter_phone, no lat/lng, no per-incident detail. If you need more
// public metrics later, add the aggregation here rather than exposing
// /api/incidents publicly again.
const buildPublicStats = async () => {
  const [incidents, hospitals, onlineVolunteersCount] = await Promise.all([
    Incident.find().select("lat lng hospital_id").lean(),
    Hospital.find().lean(),
    Volunteer.countDocuments({ is_online: true }),
  ]);

  const usedHospitalIds = new Set();
  for (const incident of incidents) {
    if (incident.hospital_id) {
      usedHospitalIds.add(String(incident.hospital_id));
      continue;
    }

    const lat = Number(incident.lat);
    const lng = Number(incident.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    let nearestId = null;
    let nearestKm = Infinity;
    for (const hospital of hospitals) {
      const hLat = Number(hospital.lat);
      const hLng = Number(hospital.lng);
      if (!Number.isFinite(hLat) || !Number.isFinite(hLng)) continue;
      const km = haversineKm(lat, lng, hLat, hLng);
      if (km < nearestKm) {
        nearestKm = km;
        nearestId = hospital._id;
      }
    }
    if (nearestId) usedHospitalIds.add(String(nearestId));
  }

  return {
    incidents_count: incidents.length,
    hospitals_in_use_count: usedHospitalIds.size,
    volunteers_online_count: onlineVolunteersCount,
  };
};

module.exports = { buildPublicStats };

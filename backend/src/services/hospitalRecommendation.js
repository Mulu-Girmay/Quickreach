const { Hospital } = require("../models");
const { haversineKm } = require("../utils/geo");

const buildIncidentRecommendation = async (incident) => {
  const hospitals = await Hospital.find().lean();
  const incidentLat = Number(incident?.lat);
  const incidentLng = Number(incident?.lng);

  if (
    !Number.isFinite(incidentLat) ||
    !Number.isFinite(incidentLng) ||
    hospitals.length === 0
  ) {
    return {
      hospital_name: "No hospital available",
      eta_minutes: null,
      capacity_confidence: 0,
      distance_km: null,
      available_beds: null,
      capacity: null,
      contact: null,
    };
  }

  let nearestHospital = null;
  let nearestDistanceKm = Infinity;

  for (const hospital of hospitals) {
    const hospitalLat = Number(hospital.lat);
    const hospitalLng = Number(hospital.lng);
    if (!Number.isFinite(hospitalLat) || !Number.isFinite(hospitalLng)) continue;

    const distanceKm = haversineKm(
      incidentLat,
      incidentLng,
      hospitalLat,
      hospitalLng,
    );

    if (distanceKm < nearestDistanceKm) {
      nearestDistanceKm = distanceKm;
      nearestHospital = hospital;
    }
  }

  if (!nearestHospital) {
    return {
      hospital_name: "No hospital available",
      eta_minutes: null,
      capacity_confidence: 0,
      distance_km: null,
      available_beds: null,
      capacity: null,
      contact: null,
    };
  }

  const capacity = Number(
    nearestHospital.capacity ?? nearestHospital.max_capacity ?? 0,
  );
  const availableBeds = Number(
    nearestHospital.available_beds ?? nearestHospital.current_capacity ?? 0,
  );
  const availabilityRatio =
    capacity > 0 ? Math.max(0, Math.min(1, availableBeds / capacity)) : 0.5;
  const etaMinutes = Math.max(2, Math.round((nearestDistanceKm / 35) * 60));

  return {
    hospital_name: nearestHospital.name || "Nearest hospital",
    eta_minutes: etaMinutes,
    capacity_confidence: Number(availabilityRatio.toFixed(2)),
    distance_km: Number(nearestDistanceKm.toFixed(1)),
    available_beds: availableBeds,
    capacity,
    contact: nearestHospital.contact || null,
    hospital_id: nearestHospital._id || nearestHospital.id || null,
  };
};

module.exports = { buildIncidentRecommendation };

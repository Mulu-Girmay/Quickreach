const express = require("express");
const { Incident, Hospital, Volunteer, Message } = require("../models");
const { authMiddleware } = require("../lib/auth");
const { requireRoles } = require("../middleware/roles");
const { normalizeIncidentMessageRole } = require("../utils/normalize");

const router = express.Router();

router.get(
  "/overview",
  authMiddleware,
  requireRoles("dispatcher", "admin"),
  async (req, res) => {
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
      const averagePriority =
        incidents.length > 0
          ? incidents.reduce(
              (sum, incident) => sum + Number(incident.triage_score || 0),
              0,
            ) / incidents.length
          : 0;
      const collapseRatePct =
        dispatchedIncidents > 0
          ? Math.max(
              0,
              Math.min(
                100,
                ((dispatchedIncidents - resolvedIncidents) / dispatchedIncidents) *
                  100,
              ),
            )
          : 0;

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

      const operatorAccountability = messages.reduce((acc, message) => {
        const key = normalizeIncidentMessageRole(message.sender) || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});

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
          collapse_rate_pct: Math.round(collapseRatePct),
          average_priority: Number(averagePriority.toFixed(1)),
        },
        operator_accountability: operatorAccountability,
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
  },
);

module.exports = router;

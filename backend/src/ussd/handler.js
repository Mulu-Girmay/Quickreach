const {
  STATES,
  getSession,
  updateSession,
  clearSession,
} = require("./sessionManager");
const { Incident } = require("../models");
const { findNearestHospital } = require("../services/hospitalRecommendation");

const ussdHandler = async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;

  const textArray = text.split("*");
  const lastInput = textArray[textArray.length - 1];

  let session = await getSession(sessionId);
  let response = "";

  try {
    if (text === "" && session.state === STATES.START) {
      const recentIncidents = await Incident.find({
        reporter_phone: phoneNumber,
        status: "Pending",
      })
        .sort({ created_at: -1 })
        .limit(1);

      if (recentIncidents.length > 0) {
        response = `CON QuickReach: You have an active alert pending.
1. Escalated Help
2. New Emergency
0. Cancel`;
        await updateSession(sessionId, STATES.START, {
          fastPath: true,
          incidentId: recentIncidents[0]._id,
        });
        return res.send(response);
      }
    }

    switch (session.state) {
      case STATES.START:
        if (text === "") {
          response = `CON Welcome to QuickReach Emergency
1. Medical (Ambulance)
2. Fire & Rescue
3. Police`;
          await updateSession(sessionId, STATES.PICK_TYPE);
        } else {
          if (lastInput === "1") {
            response = `END We are prioritizing your request. A dispatcher will call you shortly.`;
            await clearSession(sessionId);
          } else {
            await updateSession(sessionId, STATES.START, { fastPath: false });
            return ussdHandler(
              { ...req, body: { ...req.body, text: "" } },
              res,
            );
          }
        }
        break;

      case STATES.PICK_TYPE:
        const types = { 1: "Medical", 2: "Fire", 3: "Police" };
        const selectedType = types[lastInput];

        if (!selectedType) {
          response = `CON Invalid Choice.
1. Medical
2. Fire
3. Police`;
        } else {
          await updateSession(sessionId, STATES.PICK_LOCATION, {
            type: selectedType,
          });
          response = `CON Emergency: ${selectedType}
Choose Location:
1. Current (Detect)
2. Bole
3. Piassa
4. Arada`;
        }
        break;

      case STATES.PICK_LOCATION:
        const locations = { 1: "Detected", 2: "Bole", 3: "Piassa", 4: "Arada" };
        const selectedLocation = locations[lastInput];

        if (!selectedLocation) {
          response = `CON Invalid Location.
1. Current
2. Bole
3. Piassa
4. Arada`;
        } else {
          await updateSession(sessionId, STATES.CONFIRM, {
            locationName: selectedLocation,
          });
          response = `CON Confirm ${session.data.type} request at ${selectedLocation}?
1. Yes, Send Help
2. No, Cancel`;
        }
        break;

      case STATES.CONFIRM:
        if (lastInput === "1") {
          const result = await triggerEmergency(
            session.data,
            phoneNumber,
            sessionId,
          );
          response = `END Help is coming from ${result.nearestFacility}. Reference: #QR-${result.incidentId.slice(0, 5)}`;
          await clearSession(sessionId);
        } else {
          response = `END Request cancelled. Stay safe.`;
          await clearSession(sessionId);
        }
        break;

      default:
        response = "END Session error. Please try again.";
        await clearSession(sessionId);
    }
  } catch (error) {
    console.error("USSD Error:", error);
    response = "END QuickReach is currently overloaded. Please dial 991/992.";
    try {
      await clearSession(sessionId);
    } catch (cleanupError) {
      console.error("USSD session cleanup also failed:", cleanupError.message);
    }
  }

  res.send(response);
};

async function triggerEmergency(data, phone, sessionId = null) {
  if (data?.client_request_id) {
    const existingClientIncident = await Incident.findOne({
      client_request_id: data.client_request_id,
    });

    if (existingClientIncident) {
      console.log(
        `[IDEMPOTENCY] Re-returning incident for client request ${data.client_request_id}`,
      );
      return {
        incidentId: existingClientIncident._id,
        incident: existingClientIncident,
        nearestFacility: "Processing...",
        incident_access_token: existingClientIncident._id,
      };
    }
  }

  if (sessionId) {
    const existing = await Incident.findOne({ session_id: sessionId });

    if (existing) {
      console.log(
        `[IDEMPOTENCY] Re-returning incident for session ${sessionId}`,
      );
      return {
        incidentId: existing._id,
        incident: existing,
        nearestFacility: "Processing...",
        incident_access_token: existing._id,
      };
    }
  }

  let lat, lng;
  if (data.lat && data.lng) {
    lat = data.lat;
    lng = data.lng;
  } else {
    const coords = {
      Bole: { lat: 8.9894, lng: 38.7884 },
      Piassa: { lat: 9.0356, lng: 38.7512 },
      Arada: { lat: 9.03, lng: 38.75 },
      Detected: { lat: 9.0197, lng: 38.7469 },
    };
    const location = coords[data.locationName] || coords["Detected"];
    lat = location.lat;
    lng = location.lng;
  }

  let hospitalId = null;
  let hospitalName = "Emergency Center";

  try {
    const nearest = await findNearestHospital(lat, lng);

    if (nearest) {
      hospitalId = nearest.hospital._id;
      hospitalName = nearest.hospital.name;
    }
  } catch (err) {
    console.log("[HOSPITAL] No hospitals found, using default");
  }

  const incident = await Incident.create({
    type: data.type,
    lat,
    lng,
    status: "Pending",
    reporter_phone: phone.startsWith("USSD") ? phone : `WEB ${phone}`,
    session_id: sessionId,
    hospital_id: hospitalId,
    offline_created: Boolean(data.offline_created),
    client_created_at: data.client_created_at
      ? new Date(data.client_created_at)
      : undefined,
    client_request_id: data.client_request_id || undefined,
  });

  setupEscalationTimeout(incident._id);

  return {
    incidentId: incident._id,
    incident,
    nearestFacility: hospitalName,
    incident_access_token: incident._id,
  };
}

function setupEscalationTimeout(incidentId) {
  setTimeout(async () => {
    const incident = await Incident.findById(incidentId);

    if (incident && incident.status === "Pending") {
      console.log(
        `[ESCALATION] Incident ${incidentId} not acknowledged in 60s. Alerting National Command Center!`,
      );
    }
  }, 60000);
}

module.exports = { ussdHandler, triggerEmergency };

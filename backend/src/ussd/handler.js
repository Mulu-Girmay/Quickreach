const { STATES, getSession, updateSession, clearSession } = require('./sessionManager');
const { supabase } = require('../lib/supabase');

/**
 * Handles Africa's Talking USSD POST requests
 * Expected body: { sessionId, serviceCode, phoneNumber, text }
 */
const ussdHandler = async (req, res) => {
  const { sessionId, phoneNumber, text } = req.body;
  
  // Africa's Talking sends the accumulated text (e.g., "1*1")
  const textArray = text.split('*');
  const lastInput = textArray[textArray.length - 1];
  
  let session = getSession(sessionId);
  let response = "";

  try {
    // 1. FAST-PATH check for repeated callers (if new session)
    if (text === "" && session.state === STATES.START) {
      const { data: recentIncidents } = await supabase
        .from('incidents')
        .select('status, id')
        .eq('reporter_phone', phoneNumber)
        .eq('status', 'Pending')
        .order('created_at', { ascending: false })
        .limit(1);

      if (recentIncidents && recentIncidents.length > 0) {
        response = `CON QuickReach: You have an active alert pending.
1. Escalated Help
2. New Emergency
0. Cancel`;
        updateSession(sessionId, STATES.START, { fastPath: true, incidentId: recentIncidents[0].id });
        return res.send(response);
      }
    }

    // 2. STATE MACHINE
    switch (session.state) {
      case STATES.START:
        if (text === "") {
          response = `CON Welcome to QuickReach Emergency
1. Medical (Ambulance)
2. Fire & Rescue
3. Police`;
          updateSession(sessionId, STATES.PICK_TYPE);
        } else {
          // Handle fast-path input
          if (lastInput === '1') {
             response = `END We are prioritizing your request. A dispatcher will call you shortly.`;
             clearSession(sessionId);
          } else {
             updateSession(sessionId, STATES.START, { fastPath: false });
             // Recursively handle as a new emergency
             return ussdHandler({ ...req, body: { ...req.body, text: "" } }, res);
          }
        }
        break;

      case STATES.PICK_TYPE:
        const types = { '1': 'Medical', '2': 'Fire', '3': 'Police' };
        const selectedType = types[lastInput];
        
        if (!selectedType) {
          response = `CON Invalid Choice.
1. Medical
2. Fire
3. Police`;
        } else {
          updateSession(sessionId, STATES.PICK_LOCATION, { type: selectedType });
          response = `CON Emergency: ${selectedType}
Choose Location:
1. Current (Detect)
2. Bole
3. Piassa
4. Arada`;
        }
        break;

      case STATES.PICK_LOCATION:
        const locations = { '1': 'Detected', '2': 'Bole', '3': 'Piassa', '4': 'Arada' };
        const selectedLocation = locations[lastInput];

        if (!selectedLocation) {
          response = `CON Invalid Location.
1. Current
2. Bole
3. Piassa
4. Arada`;
        } else {
          updateSession(sessionId, STATES.CONFIRM, { locationName: selectedLocation });
          response = `CON Confirm ${session.data.type} request at ${selectedLocation}?
1. Yes, Send Help
2. No, Cancel`;
        }
        break;

      case STATES.CONFIRM:
        if (lastInput === '1') {
          // 3. FINAL TRIGGER
          const result = await triggerEmergency(session.data, phoneNumber, sessionId);
          response = `END Help is coming from ${result.nearestFacility}. Reference: #QR-${result.incidentId.slice(0,5)}`;
          clearSession(sessionId);
        } else {
          response = `END Request cancelled. Stay safe.`;
          clearSession(sessionId);
        }
        break;

      default:
        response = "END Session error. Please try again.";
        clearSession(sessionId);
    }
  } catch (error) {
    console.error("USSD Error:", error);
    response = "END QuickReach is currently overloaded. Please dial 991/992.";
    clearSession(sessionId);
  }

  res.send(response);
};

/**
 * Logic to insert into Supabase and find nearest facility with capacity
 */
async function triggerEmergency(data, phone, sessionId) {
  // 1. IDEMPOTENCY CHECK
  const { data: existing } = await supabase
    .from('incidents')
    .select('id, status')
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    console.log(`[IDEMPOTENCY] Re-returning incident for session ${sessionId}`);
    return { incidentId: existing.id, nearestFacility: "Processing..." };
  }

  // Mock coordinates based on chosen sub-city
  const coords = {
    'Bole': { lat: 8.9894, lng: 38.7884 },
    'Piassa': { lat: 9.0356, lng: 38.7512 },
    'Arada': { lat: 9.0300, lng: 38.7500 },
    'Detected': { lat: 9.0197, lng: 38.7469 }
  };
  const { lat, lng } = coords[data.locationName] || coords['Detected'];

  // 2. INCIDENT COLLAPSING (Deduplication)
  // Check if someone else reported a similar incident nearby in the last 10 mins
  const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: nearby } = await supabase
    .from('incidents')
    .select('id')
    .eq('type', data.type)
    .eq('status', 'Pending')
    .gt('created_at', tenMinsAgo)
    .filter('lat', 'gte', lat - 0.005)
    .filter('lat', 'lte', lat + 0.005)
    .filter('lng', 'gte', lng - 0.005)
    .filter('lng', 'lte', lng + 0.005)
    .limit(1);

  if (nearby && nearby.length > 0) {
    console.log(`[COLLAPSING] Incident deduplicated to parent ${nearby[0].id}`);
    // Register as a "child" incident
    const { data: child } = await supabase
      .from('incidents')
      .insert([{
        type: data.type,
        lat, lng,
        status: 'Collapsed',
        reporter_phone: `USSD ${phone}`,
        source: 'USSD',
        session_id: sessionId,
        parent_incident_id: nearby[0].id,
        is_collapsed: true
      }])
      .select().single();
    
    return { incidentId: child.id, nearestFacility: "Request Merged with Active Response" };
  }

  // 3. DYNAMIC ROUTING (Capacity Check)
  // Find nearest hospital with remaining capacity
  const { data: hospital } = await supabase
    .from('hospitals')
    .select('id, name')
    .filter('current_capacity', 'lt', 'max_capacity')
    .order('created_at', { ascending: true }) // Simulating proximity order
    .limit(1)
    .single();

  const hospitalId = hospital ? hospital.id : null;
  const hospitalName = hospital ? hospital.name : "Emergency Center";

  // Insert PRIMARY incident
  const { data: incident, error } = await supabase
    .from('incidents')
    .insert([{
      type: data.type,
      lat,
      lng,
      status: 'Pending',
      reporter_phone: `USSD ${phone}`,
      source: 'USSD',
      session_id: sessionId,
      hospital_id: hospitalId
    }])
    .select()
    .single();

  if (error) throw error;

  // Update hospital capacity if assigned
  if (hospitalId) {
    await supabase.rpc('increment_hospital_capacity', { row_id: hospitalId });
  }

  setupEscalationTimeout(incident.id);

  return { incidentId: incident.id, nearestFacility: hospitalName };
}

// Update the call site in ussdHandler
// Lines 100-104 in original:
// if (lastInput === '1') {
//   const result = await triggerEmergency(session.data, phoneNumber);
//   response = `END Help is coming from ${result.nearestFacility}. Reference: #QR-${result.incidentId.slice(0,5)}`;
//   clearSession(sessionId);
// }

// I'll replace the entire CONFIRM case in ussdHandler too if I can, or just wait.
// Actually, I should update the call to include sessionId.


function setupEscalationTimeout(incidentId) {
  // Simulated background check in 60s
  setTimeout(async () => {
    const { data } = await supabase
      .from('incidents')
      .select('status')
      .eq('id', incidentId)
      .single();
    
    if (data && data.status === 'Pending') {
      console.log(`[ESCALATION] Incident ${incidentId} not acknowledged in 60s. Alerting National Command Center!`);
      // In production: trigger SMS/Webhook/Call to national managers
    }
  }, 60000);
}

module.exports = { ussdHandler };

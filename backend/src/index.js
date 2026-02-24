const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { ussdHandler } = require('./ussd/handler');
const { sendSMS } = require('./lib/sms');
const { supabase } = require('./lib/supabase');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Routes
app.get('/', (req, res) => {
  res.json({ message: "QuickReach Backend API is live." });
});

/**
 * Public Incident Trigger (Web Panic Button)
 */
const { triggerEmergency } = require('./ussd/handler');

app.post('/api/incidents/public', async (req, res) => {
  try {
    const { type, lat, lng, reporter_phone, description } = req.body;
    
    const result = await triggerEmergency(
      { type, lat, lng, description },
      reporter_phone
    );

    res.json(result);
  } catch (err) {
    console.error("Public Incident Error:", err.message, err.details || err);
    res.status(500).json({ error: err.message || "Failed to create incident" });
  }
});

app.patch('/api/incidents/:id/location', async (req, res) => {
  try {
    const { id } = req.params;
    const { lat, lng } = req.body;
    const incidentToken = req.headers['x-incident-token'];

    if (incidentToken !== id) {
      return res.status(401).json({ error: "Invalid incident token" });
    }

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: "lat and lng must be numbers" });
    }

    const { data: incident, error: findError } = await supabase
      .from('incidents')
      .select('id, status')
      .eq('id', id)
      .single();

    if (findError || !incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    if (incident.status === 'Resolved') {
      return res.status(409).json({ error: "Incident already resolved" });
    }

    const { data, error } = await supabase
      .from('incidents')
      .update({ lat, lng })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    res.json({ incident: data });
  } catch (err) {
    console.error("Update incident location error:", err);
    res.status(500).json({ error: "Failed to update location" });
  }
});

app.get('/api/incidents', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('incidents')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json({ incidents: data || [] });
  } catch (err) {
    console.error("Fetch incidents error:", err);
    res.status(500).json({ error: "Failed to fetch incidents" });
  }
});

app.get('/api/hospitals', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('hospitals')
      .select('*');
    
    if (error) throw error;
    res.json({ hospitals: data || [] });
  } catch (err) {
    console.error("Fetch hospitals error:", err);
    res.status(500).json({ error: "Failed to fetch hospitals" });
  }
});

app.get('/api/volunteers/online', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .eq('is_online', true);
    
    if (error) throw error;
    res.json({ volunteers: data || [] });
  } catch (err) {
    console.error("Fetch volunteers error:", err);
    res.status(500).json({ error: "Failed to fetch volunteers" });
  }
});

app.get('/api/volunteers/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data, error } = await supabase
      .from('volunteers')
      .select('*')
      .eq('phone', user.email)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Volunteer not found, create one
      const { data: newVol, error: insertError } = await supabase
        .from('volunteers')
        .insert([{
          name: user.user_metadata?.name || 'Volunteer',
          phone: user.email,
          is_online: false
        }])
        .select()
        .single();
      
      if (insertError) throw insertError;
      return res.json({ volunteer: newVol });
    }
    
    if (error) throw error;
    res.json({ volunteer: data });
  } catch (err) {
    console.error("Fetch volunteer profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
});

app.patch('/api/volunteers/me/status', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { is_online, lat, lng } = req.body;
    const updateData = { is_online, last_active: new Date().toISOString() };
    if (lat !== undefined) updateData.lat = lat;
    if (lng !== undefined) updateData.lng = lng;

    const { data, error } = await supabase
      .from('volunteers')
      .update(updateData)
      .eq('phone', user.email)
      .select()
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error("Update volunteer status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.post('/api/incidents/:id/volunteer-accept', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "No authorization header" });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { id } = req.params;
    
    // Get volunteer info
    const { data: volunteer } = await supabase
      .from('volunteers')
      .select('name')
      .eq('phone', user.email)
      .single();

    // Get incident info for SMS
    const { data: incident } = await supabase
      .from('incidents')
      .select('reporter_phone, type')
      .eq('id', id)
      .single();

    // Post message to incident
    await supabase
      .from('incident_messages')
      .insert([{
        incident_id: id,
        sender: 'volunteer',
        message: `Volunteer update: ${volunteer?.name || 'A volunteer'} has accepted this incident and is en route.`
      }]);

    // Send SMS to citizen if phone is valid
    if (incident?.reporter_phone && !incident.reporter_phone.toUpperCase().startsWith('USSD')) {
      try {
        const phone = incident.reporter_phone.replace(/[\s\-()]/g, '');
        const smsMessage = `QuickReach: Good news! ${volunteer?.name || 'A volunteer'} is on the way to help with your ${incident.type} emergency. Stay calm, help is coming.`;
        await sendSMS(phone, smsMessage);
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
        // Don't fail the request if SMS fails
      }
    }

    res.json({ success: true, message: "Incident accepted" });
  } catch (err) {
    console.error("Volunteer accept error:", err);
    res.status(500).json({ error: "Failed to accept incident" });
  }
});

app.patch('/api/incidents/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Get incident info before update
    const { data: incident } = await supabase
      .from('incidents')
      .select('reporter_phone, type')
      .eq('id', id)
      .single();
    
    const { data, error } = await supabase
      .from('incidents')
      .update({ status })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;

    // Send SMS when incident is resolved
    if (status === 'Resolved' && incident?.reporter_phone && !incident.reporter_phone.toUpperCase().startsWith('USSD')) {
      try {
        const phone = incident.reporter_phone.replace(/[\s\-()]/g, '');
        const smsMessage = `QuickReach: Your ${incident.type} emergency has been resolved. We hope you are safe. Thank you for using QuickReach.`;
        await sendSMS(phone, smsMessage);
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
      }
    }
    
    res.json(data);
  } catch (err) {
    console.error("Update status error:", err);
    res.status(500).json({ error: "Failed to update status" });
  }
});

app.get('/api/incidents/:id/recommendation', async (req, res) => {
  try {
    res.json({ recommendation: null });
  } catch (err) {
    res.status(500).json({ error: "Failed to get recommendation" });
  }
});

app.get('/api/incidents/:id/timeline', async (req, res) => {
  try {
    res.json({ timeline: [] });
  } catch (err) {
    res.status(500).json({ error: "Failed to get timeline" });
  }
});

/**
 * Emergency Chat Messages
 */
app.get('/api/messages/:incidentId', async (req, res) => {
  try {
    const { incidentId } = req.params;

    const { data: incident } = await supabase
      .from('incidents')
      .select('id')
      .eq('id', incidentId)
      .single();

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const { data: messages, error } = await supabase
      .from('incident_messages')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    res.json({ messages });
  } catch (err) {
    console.error("Fetch Messages Error:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { incident_id, sender, message } = req.body;

    const { data: incident } = await supabase
      .from('incidents')
      .select('id')
      .eq('id', incident_id)
      .single();

    if (!incident) {
      return res.status(404).json({ error: "Incident not found" });
    }

    const { data: newMessage, error } = await supabase
      .from('incident_messages')
      .insert([{ incident_id, sender, message }])
      .select()
      .single();

    if (error) throw error;
    res.json(newMessage);
  } catch (err) {
    console.error("Send Message Error:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/**
 * Africa's Talking USSD Webhook
 * POST requests from AT gateway
 */
app.post('/ussd', ussdHandler);

// Background Service: Automated SMS Updates
const startIncidentUpdateService = () => {
  setInterval(async () => {
    const { data: incidents } = await supabase
      .from('incidents')
      .select('id, reporter_phone, status, type')
      .eq('status', 'Dispatched')
      .eq('notified_dispatched', false);

    if (incidents) {
      for (const incident of incidents) {
         try {
           const phone = incident.reporter_phone.replace('USSD ', '');
           const message = `QuickReach: Dispatch confirmed. The ${incident.type} team is moving toward you. 2km remaining.`;
           await sendSMS(phone, message);
           
           // Mark as notified to avoid duplicates
           await supabase
             .from('incidents')
             .update({ notified_dispatched: true })
             .eq('id', incident.id);
         } catch (err) {
           console.error(`Failed to send SMS for incident ${incident.id}:`, err);
         }
      }
    }
  }, 5 * 60 * 1000);
};

startIncidentUpdateService();

// Health Check
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// Start Server
app.listen(PORT, () => {
  console.log(`
  🚑 QuickReach Backend Service
  ----------------------------
  Port: ${PORT}
  USSD Webhook: http://localhost:${PORT}/ussd
  Status: Operational
  `);
});

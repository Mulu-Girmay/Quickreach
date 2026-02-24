const { supabase } = require('../backend/src/lib/supabase');
const { sendSMS } = require('../backend/src/lib/sms');
const { triggerEmergency, ussdHandler } = require('../backend/src/ussd/handler');

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (req.method === 'GET' || req.method === 'HEAD') return {};

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host}`);
    const path = url.pathname;
    const method = req.method || 'GET';
    const body = await readBody(req);

    if (method === 'GET' && path === '/api/health') {
      return json(res, 200, { ok: true });
    }

    if (method === 'POST' && path === '/api/incidents/public') {
      try {
        const { type, lat, lng, reporter_phone, description } = body;
        const result = await triggerEmergency(
          { type, lat, lng, description },
          reporter_phone
        );
        return json(res, 200, result);
      } catch (err) {
        return json(res, 500, { error: err.message || 'Failed to create incident' });
      }
    }

    let match = path.match(/^\/api\/incidents\/([^/]+)\/location$/);
    if (match && method === 'PATCH') {
      try {
        const id = match[1];
        const { lat, lng } = body;
        const incidentToken = req.headers['x-incident-token'];

        if (incidentToken !== id) return json(res, 401, { error: 'Invalid incident token' });
        if (typeof lat !== 'number' || typeof lng !== 'number') {
          return json(res, 400, { error: 'lat and lng must be numbers' });
        }

        const { data: incident, error: findError } = await supabase
          .from('incidents')
          .select('id, status')
          .eq('id', id)
          .single();

        if (findError || !incident) return json(res, 404, { error: 'Incident not found' });
        if (incident.status === 'Resolved') return json(res, 409, { error: 'Incident already resolved' });

        const { data, error } = await supabase
          .from('incidents')
          .update({ lat, lng })
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;
        return json(res, 200, { incident: data });
      } catch (err) {
        return json(res, 500, { error: 'Failed to update location' });
      }
    }

    if (method === 'GET' && path === '/api/incidents') {
      try {
        const { data, error } = await supabase
          .from('incidents')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return json(res, 200, { incidents: data || [] });
      } catch {
        return json(res, 500, { error: 'Failed to fetch incidents' });
      }
    }

    if (method === 'GET' && path === '/api/hospitals') {
      try {
        const { data, error } = await supabase.from('hospitals').select('*');
        if (error) throw error;
        return json(res, 200, { hospitals: data || [] });
      } catch {
        return json(res, 500, { error: 'Failed to fetch hospitals' });
      }
    }

    if (method === 'GET' && path === '/api/volunteers/online') {
      try {
        const { data, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('is_online', true);
        if (error) throw error;
        return json(res, 200, { volunteers: data || [] });
      } catch {
        return json(res, 500, { error: 'Failed to fetch volunteers' });
      }
    }

    if (method === 'GET' && path === '/api/volunteers/me') {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return json(res, 401, { error: 'No authorization header' });
        const token = authHeader.replace('Bearer ', '');
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser(token);
        if (authError || !user) return json(res, 401, { error: 'Invalid token' });

        const { data, error } = await supabase
          .from('volunteers')
          .select('*')
          .eq('phone', user.email)
          .single();

        if (error && error.code === 'PGRST116') {
          const { data: newVol, error: insertError } = await supabase
            .from('volunteers')
            .insert([
              {
                name: user.user_metadata?.name || 'Volunteer',
                phone: user.email,
                is_online: false
              }
            ])
            .select()
            .single();
          if (insertError) throw insertError;
          return json(res, 200, { volunteer: newVol });
        }
        if (error) throw error;
        return json(res, 200, { volunteer: data });
      } catch {
        return json(res, 500, { error: 'Failed to fetch profile' });
      }
    }

    if (method === 'PATCH' && path === '/api/volunteers/me/status') {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader) return json(res, 401, { error: 'No authorization header' });
        const token = authHeader.replace('Bearer ', '');
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser(token);
        if (authError || !user) return json(res, 401, { error: 'Invalid token' });

        const { is_online, lat, lng } = body;
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
        return json(res, 200, data);
      } catch {
        return json(res, 500, { error: 'Failed to update status' });
      }
    }

    match = path.match(/^\/api\/incidents\/([^/]+)\/volunteer-accept$/);
    if (match && method === 'POST') {
      try {
        const id = match[1];
        const authHeader = req.headers.authorization;
        if (!authHeader) return json(res, 401, { error: 'No authorization header' });
        const token = authHeader.replace('Bearer ', '');
        const {
          data: { user },
          error: authError
        } = await supabase.auth.getUser(token);
        if (authError || !user) return json(res, 401, { error: 'Invalid token' });

        const { data: volunteer } = await supabase
          .from('volunteers')
          .select('name')
          .eq('phone', user.email)
          .single();

        const { data: incident } = await supabase
          .from('incidents')
          .select('reporter_phone, type')
          .eq('id', id)
          .single();

        await supabase.from('incident_messages').insert([
          {
            incident_id: id,
            sender: 'volunteer',
            message: `Volunteer update: ${volunteer?.name || 'A volunteer'} has accepted this incident and is en route.`
          }
        ]);

        if (incident?.reporter_phone && !incident.reporter_phone.toUpperCase().startsWith('USSD')) {
          try {
            const phone = incident.reporter_phone.replace(/[\s\-()]/g, '');
            const smsMessage = `QuickReach: Good news! ${volunteer?.name || 'A volunteer'} is on the way to help with your ${incident.type} emergency. Stay calm, help is coming.`;
            await sendSMS(phone, smsMessage);
          } catch {}
        }

        return json(res, 200, { success: true, message: 'Incident accepted' });
      } catch {
        return json(res, 500, { error: 'Failed to accept incident' });
      }
    }

    match = path.match(/^\/api\/incidents\/([^/]+)\/status$/);
    if (match && method === 'PATCH') {
      try {
        const id = match[1];
        const { status } = body;
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

        if (status === 'Resolved' && incident?.reporter_phone && !incident.reporter_phone.toUpperCase().startsWith('USSD')) {
          try {
            const phone = incident.reporter_phone.replace(/[\s\-()]/g, '');
            const smsMessage = `QuickReach: Your ${incident.type} emergency has been resolved. We hope you are safe. Thank you for using QuickReach.`;
            await sendSMS(phone, smsMessage);
          } catch {}
        }
        return json(res, 200, data);
      } catch {
        return json(res, 500, { error: 'Failed to update status' });
      }
    }

    match = path.match(/^\/api\/incidents\/([^/]+)\/recommendation$/);
    if (match && method === 'GET') return json(res, 200, { recommendation: null });
    match = path.match(/^\/api\/incidents\/([^/]+)\/timeline$/);
    if (match && method === 'GET') return json(res, 200, { timeline: [] });

    match = path.match(/^\/api\/messages\/([^/]+)$/);
    if (match && method === 'GET') {
      try {
        const incidentId = match[1];
        const { data: incident } = await supabase
          .from('incidents')
          .select('id')
          .eq('id', incidentId)
          .single();
        if (!incident) return json(res, 404, { error: 'Incident not found' });

        const { data: messages, error } = await supabase
          .from('incident_messages')
          .select('*')
          .eq('incident_id', incidentId)
          .order('created_at', { ascending: true });
        if (error) throw error;
        return json(res, 200, { messages });
      } catch {
        return json(res, 500, { error: 'Failed to fetch messages' });
      }
    }

    if (method === 'POST' && path === '/api/messages') {
      try {
        const { incident_id, sender, message } = body;
        const { data: incident } = await supabase
          .from('incidents')
          .select('id')
          .eq('id', incident_id)
          .single();
        if (!incident) return json(res, 404, { error: 'Incident not found' });

        const { data: newMessage, error } = await supabase
          .from('incident_messages')
          .insert([{ incident_id, sender, message }])
          .select()
          .single();
        if (error) throw error;
        return json(res, 200, newMessage);
      } catch {
        return json(res, 500, { error: 'Failed to send message' });
      }
    }

    if (method === 'POST' && (path === '/api/ussd' || path === '/ussd')) {
      return ussdHandler(req, res);
    }

    return json(res, 404, { error: 'Not found' });
  } catch {
    return json(res, 500, { error: 'Internal server error' });
  }
};

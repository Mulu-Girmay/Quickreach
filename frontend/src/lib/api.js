import { supabase } from './supabase';

const rawApiBase = import.meta.env.VITE_API_BASE_URL;

if (!rawApiBase?.trim()) {
  throw new Error('VITE_API_BASE_URL is required.');
}

const API_BASE = rawApiBase.replace(/\/$/, '');

export async function apiFetch(path, options = {}) {
  const { body, auth = true, headers = {}, ...rest } = options;
  const reqHeaders = { 'Content-Type': 'application/json', ...headers };

  if (auth) {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (!token) throw new Error('Authentication required.');
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || `Request failed with status ${response.status}`);
  }
  return payload;
}

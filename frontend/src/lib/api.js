const API_BASE = (
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_API_BASE_URL ||
  ""
).replace(/\/$/, "");
const AUTH_TOKEN_KEY = "quickreach_auth_token";

export async function apiFetch(path, options = {}) {
  const { body, auth = true, headers = {}, ...rest } = options;
  const reqHeaders = { "Content-Type": "application/json", ...headers };

  if (auth) {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) throw new Error("Authentication required.");
    reqHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...rest,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      payload.error || `Request failed with status ${response.status}`,
    );
  }
  return payload;
}

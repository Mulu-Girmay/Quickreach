# QuickReach

QuickReach is an emergency response platform with:

- Citizen SOS flow (web panic button + live location updates)
- Dispatcher operations dashboard
- Volunteer response dashboard
- Emergency chat + optional video room (Jitsi)
- USSD simulation/backend flow

## Tech Stack

- Frontend: React + Vite + Tailwind + Supabase client
- Backend: Node.js + Express + Supabase service client
- Realtime: Supabase realtime subscriptions
- Maps: Leaflet / OpenStreetMap

## Project Structure

```text
Quickreach/
  backend/
    src/
      index.js
      lib/
      ussd/
  frontend/
    src/
```

## Prerequisites

- Node.js 18+ (recommended: latest LTS)
- npm
- Supabase project (URL + keys)

## Environment Variables

Create local env files.

### `backend/.env`

```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### `frontend/.env`

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
# Optional (if not using Vite proxy)
VITE_API_BASE_URL=http://localhost:3000
```

## Install Dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

## Run Locally

Open 2 terminals.

```bash
# Terminal 1 - Backend
cd backend
npm run dev
```

```bash
# Terminal 2 - Frontend
cd frontend
npm run dev
```

Default URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

## Available Scripts

### Frontend

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

### Backend

```bash
npm run start
npm run dev
```

Note: backend `npm test` is not implemented yet.

## Core API Endpoints

- `POST /api/incidents/public` create incident (panic/USSD/web)
- `PATCH /api/incidents/:id/location` live location update (requires `x-incident-token`)
- `GET /api/incidents`
- `PATCH /api/incidents/:id/status`
- `POST /api/incidents/:id/volunteer-accept`
- `GET /api/volunteers/online`
- `GET /api/volunteers/me` (auth)
- `PATCH /api/volunteers/me/status` (auth)
- `GET /api/messages/:incidentId`
- `POST /api/messages`
- `POST /ussd`

## Main App Routes

- `/` landing page
- `/panic` citizen SOS flow
- `/dispatcher-login` dispatcher auth
- `/dispatcher` dispatcher dashboard
- `/volunteer-login` volunteer auth
- `/volunteer` volunteer dashboard
- `/analytics` analytics dashboard

## Functional Notes

- Citizen incident location is now updated live while incident is active.
- Volunteer `Navigate` uses latest incident coordinates.
- Video call uses a Jitsi room derived from incident id.
- SMS service in backend is currently mocked (`backend/src/lib/sms.js`).

## Troubleshooting

- `404` API errors in frontend:
  - confirm backend is running on port `3000`
  - keep Vite proxy enabled, or set `VITE_API_BASE_URL`
- Auth errors:
  - verify Supabase keys in both env files
- Map/location issues:
  - allow browser geolocation permissions
- Build warnings about chunk size are informational, not build failures.

## Security

- Do not commit real keys/secrets to git.
- Rotate keys immediately if exposed.
- Keep `SUPABASE_SERVICE_ROLE_KEY` backend-only.

## License

Internal project. Add a license file if this will be distributed publicly.

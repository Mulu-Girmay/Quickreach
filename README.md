# QuickReach

QuickReach is a real-time emergency response platform with citizen SOS reporting, dispatcher coordination, and volunteer response workflows.

## Key Features

- Citizen panic flow with GPS capture
- Live incident location updates
- Dispatcher dashboard for incident triage and status control
- Volunteer dashboard with nearby incident response
- Incident messaging (citizen, dispatcher, volunteer)
- Optional video call room per incident (Jitsi)
- USSD flow support (local/backend mode)

## Tech Stack

- Frontend: React, Vite, Tailwind CSS, React Router, React Query
- Maps: Leaflet + OpenStreetMap
- Backend: Node.js + Express (local mode), Vercel Serverless API (deploy mode)
- Data/Auth/Realtime: Supabase

## Repository Layout

```text
Quickreach/
  api/                    # Vercel serverless API (same-domain /api/*)
  backend/                # Local Express backend
    src/
  frontend/               # React app
    src/
  vercel.json
```

## Prerequisites

- Node.js 18+ (LTS recommended)
- npm
- Supabase project

## Environment Variables

Use the provided templates:

- `backend/.env.example`
- `frontend/.env.example`

### Local backend (`backend/.env`)

```env
PORT=3000
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Frontend (`frontend/.env`)

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_API_BASE_URL=http://localhost:3000
```

`VITE_API_BASE_URL` is required.

## Local Development

Install dependencies:

```bash
cd backend && npm install
cd ../frontend && npm install
```

Run in two terminals:

```bash
# Terminal 1
cd backend
npm run dev
```

```bash
# Terminal 2
cd frontend
npm run dev
```

Local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- Backend health: `http://localhost:3000/health`

## Deployment (Recommended: One Vercel Project)

This repo is configured for one-domain deployment:

- Frontend static app
- Same-domain API routes at `/api/*` via `api/[...path].js`

### Vercel settings

- Project root: repository root (`Quickreach`)
- Uses root `vercel.json`

### Required Vercel env vars

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_API_BASE_URL` (set to your frontend domain, e.g. `https://quickreach-one.vercel.app`)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Do not set `BACKEND_API_ORIGIN` for current one-domain setup.

## Scripts

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

Note: backend automated tests are not implemented yet.

## Main API Endpoints

- `POST /api/incidents/public`
- `PATCH /api/incidents/:id/location`
- `GET /api/incidents`
- `PATCH /api/incidents/:id/status`
- `POST /api/incidents/:id/volunteer-accept`
- `GET /api/volunteers/online`
- `GET /api/volunteers/me`
- `PATCH /api/volunteers/me/status`
- `GET /api/messages/:incidentId`
- `POST /api/messages`

## Frontend Routes

- `/`
- `/panic`
- `/dispatcher-login`
- `/dispatcher`
- `/volunteer-login`
- `/volunteer`
- `/analytics`

## Troubleshooting

- `404 NOT_FOUND` on `/api/*`:
  - verify Vercel is building from repo root
  - verify `vercel.json` is present at root
- `405` on API calls:
  - verify requests are hitting `/api/*` serverless routes, not static files
- Login works but data endpoints fail:
  - confirm backend env vars are set in Vercel (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)
- Map errors (`lat`/`lng`):
  - ensure incidents/volunteers have valid numeric coordinates
- Build chunk-size warnings:
  - informational; build still succeeds

## Security Notes

- Never commit real secrets to source control.
- Keep service role key server-side only.
- Rotate keys immediately if exposed.

## License

Internal project. Add a license before public distribution.

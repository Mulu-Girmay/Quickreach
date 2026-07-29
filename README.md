# QuickReach — Emergency Response System

QuickReach is an emergency incident reporting and dispatch platform built for low-connectivity conditions. Citizens report emergencies via a web panic button, USSD (feature phones), or a mobile app; dispatchers triage and route them to hospitals and volunteers in real time.


## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Reference](#-api-reference)
- [Real-time Events](#-real-time-events)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Known Limitations](#-known-limitations)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

| Stakeholder | Problem | Solution | Status |
|---|---|---|---|
| **Citizens** | Can't report emergencies without a smartphone or data | Web panic button + USSD (`*xxx#`) work on any phone | ✅ |
| **Citizens** | Can't report emergencies offline | Mobile app queues locally and syncs when connectivity returns | ✅ |
| **Dispatchers** | Delayed awareness of new incidents | Authenticated, room-scoped Socket.io push to the dashboard | ✅ |
| **Volunteers** | Unaware of nearby emergencies | Real GPS-based 10km proximity filtering, both for display and for push notification targeting | ✅ |
| **Volunteers** | Anyone could self-register and immediately respond | Dispatcher approval required before a volunteer can go online or accept incidents | ✅ |
| **Responders** | Two people responding to the same call | Atomic, race-safe incident acceptance — only one volunteer can accept a given incident | ✅ |
| **Dispatchers** | Which hospital to route to | Real nearest-hospital calculation (haversine distance), with dispatcher-managed capacity data | ✅ |

### What's real vs. what's still a demo

- **Real-time ambulance/volunteer tracking on the map** — 🟡 the web app receives real volunteer GPS coordinates server-side, but the on-screen "ambulance approaching" animation on both the citizen and dispatcher views is still a scripted client-side animation, not wired to that real data yet.
- **IVR (voice) reporting** — 🟡 there's a UI component that simulates what an IVR call flow would look like for demo purposes; it doesn't place real calls or create real incidents.
- **Video calls** — ✅ real. The video SOS feature embeds an actual Jitsi Meet video room per incident.
- **Chat encryption** — ❌ not implemented. Chat runs over standard HTTPS/WSS transport encryption only, no end-to-end encryption layer.
- **Automated triage scoring** — ❌ the schema has a `triage_score` field but nothing currently sets it.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        QUICKREACH SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐        │
│  │   Citizen    │    │  Dispatcher  │    │  Volunteer   │        │
│  │ Flutter App  │    │  React Web   │    │  React Web   │        │
│  │ (REST only,  │    │ (REST + WS)  │    │ (REST + WS)  │        │
│  │  no sockets) │    │              │    │              │        │
│  └──────┬───────┘    └──────┬───────┘    └──────┬───────┘        │
│         │                   │                   │                 │
│         └───────────────────┼───────────────────┘                 │
│                              │                                     │
│                    ┌─────────▼─────────┐                          │
│                    │   Express REST API │                          │
│                    │   Socket.io        │                          │
│                    │   (JWT-authed on   │                          │
│                    │    both surfaces)  │                          │
│                    └─────────┬─────────┘                          │
│                              │                                     │
│              ┌───────────────┼───────────────┐                    │
│              │               │               │                    │
│        ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐              │
│        │  MongoDB  │   │   Redis   │   │  Africa's │              │
│        │ (primary  │   │ (USSD     │   │  Talking  │              │
│        │  store)   │   │  sessions,│   │  (SMS +   │              │
│        │           │   │  BullMQ)  │   │   USSD)   │              │
│        └───────────┘   └───────────┘   └───────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

The web dispatcher/volunteer clients authenticate their Socket.io connection with the same JWT used for REST calls and are placed in role-scoped rooms server-side (dispatchers/admins see full incident data; volunteers see phone numbers masked). Anonymous citizen sockets can only join the room for the one incident they hold a valid access token for. The Flutter mobile app does not use sockets at all — see Known Limitations.

---

## ✨ Features

### For Citizens 👤

| Feature | Status |
|---|---|
| Web panic button (type + location + description) | ✅ |
| USSD reporting via feature phone (`*xxx#`, no smartphone/data needed) | ✅ |
| Offline incident creation on mobile, synced when back online | ✅ |
| Automatic GPS capture (web and mobile) | ✅ |
| Live chat with dispatch, scoped to your own incident | ✅ |
| Video call with a responder | ✅ |
| First Aid guide (CPR, bleeding control, etc.) | ✅ |
| Live "ambulance approaching" map animation | 🟡 cosmetic only — not driven by the real responder's location yet |
| Real-time status updates on mobile | ❌ mobile only refreshes on manual pull-to-refresh, no push/poll while an incident is active |

### For Dispatchers 🎛️

| Feature | Status |
|---|---|
| Live incident dashboard (Socket.io push, not polling) | ✅ |
| Incident status workflow: Pending → Dispatched → Resolved, enforced server-side (can't skip straight to Resolved) | ✅ |
| Nearest-hospital recommendation with real distance/ETA math | ✅ |
| Hospital capacity management (create/update via API) | ✅ |
| Volunteer approval queue (approve/reject new volunteer registrations) | ✅ |
| Analytics dashboard (incident trends, response times, hospital load) | ✅ |
| Automated incident priority/triage scoring | ❌ field exists, never populated |
| "Top reporters" leaderboard | 🟡 exists but worth reconsidering — ranks citizens by call frequency, which risks surfacing people in repeated crisis as a leaderboard |

### For Volunteers 🚑

| Feature | Status |
|---|---|
| Dispatcher approval required before going active | ✅ |
| Online/offline toggle, with real GPS reported to the backend | ✅ |
| Nearby-incident discovery (10km radius, real distance calculation) | ✅ |
| One-tap incident acceptance | ✅ |
| Race-safe acceptance — if two volunteers tap accept simultaneously, exactly one wins and the other is told the incident is taken | ✅ |
| Push notifications, targeted to volunteers within range of the incident (dispatchers/admins always notified regardless of distance) | ✅ |

---

## 🛠️ Tech Stack

### Backend

| Technology | Purpose |
|---|---|
| Node.js + Express | API server |
| MongoDB + Mongoose | Primary data store |
| Socket.io | Authenticated, room-scoped real-time updates |
| Redis + BullMQ | USSD session storage (survives multi-instance deployment) and the dispatch-confirmation SMS job queue |
| JWT (jsonwebtoken) | Stateless auth for dispatcher/volunteer/admin roles |
| bcryptjs | Password hashing |
| express-rate-limit | Rate limiting on auth and incident-creation endpoints |
| web-push | Push notifications (VAPID) |

### Frontend (Web)

| Technology | Purpose |
|---|---|
| React + Vite | UI framework and build tool |
| TailwindCSS | Styling |
| Leaflet | Maps |
| Socket.io Client | Real-time updates (authenticated) |

### Mobile (Flutter)

| Technology | Purpose |
|---|---|
| Flutter + BLoC | App framework and state management |
| sqflite | Local offline incident queue |
| Dio | HTTP client (REST only — no real-time socket connection) |
| Geolocator | GPS |
| Workmanager | Background sync of queued offline incidents |

### External Services

| Service | Purpose |
|---|---|
| Africa's Talking | SMS delivery and USSD gateway |
| MongoDB Atlas | Managed database hosting (or self-hosted MongoDB) |
| Redis | Required in production — USSD sessions and the SMS job queue both depend on it |

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 18.0.0
MongoDB >= 6.0.0
Redis >= 6.2.0        # required — USSD sessions and the SMS job queue depend on it
Flutter >= 3.0.0       # only if working on the mobile app
```

### Backend setup

```bash
cd backend
npm install

# Create backend/.env with at least:
#   MONGO_URI=mongodb://localhost:27017/quickreach
#   JWT_SECRET=<a long random string — the server refuses to boot without this>
#   REDIS_URL=redis://127.0.0.1:6379
#   NODE_ENV=development   # set to "production" on real deployments to disable demo-account seeding

npm run dev
```

The server will exit immediately with a clear error if `JWT_SECRET` is missing — this is intentional, not a bug.

### Bootstrapping your first accounts and hospital data

Public self-registration only ever creates `citizen`/`volunteer` accounts. To create your first dispatcher/admin account and seed hospital data for now , use the CLI scripts:

```bash
npm run create-user -- --email=you@example.com --password=SomeStrongPassword123 --role=dispatcher --name="Your Name"
npm run add-hospital -- --name="Example Hospital" --lat=9.03 --lng=38.75 --capacity=200 --available_beds=45
```

Once you have a dispatcher account, further hospitals and privileged users can be managed through the authenticated API instead of these scripts.

### Frontend setup

```bash
cd frontend
npm install
npm run dev
```

Set `VITE_API_URL` (or `VITE_API_BASE_URL`) in a `.env` file if the backend isn't running on the frontend's default proxy target.

### Mobile setup

```bash
cd rapidaid
flutter pub get
flutter run --dart-define=QUICKREACH_API_URL=http://<your-backend-host>:3000
```

The default API URL (`http://10.0.2.2:3000`) only works from the Android emulator talking to a backend running on the same machine — you must override it for a physical device or a deployed backend.

---

## 📡 API Reference

All endpoints are prefixed with the backend's base URL. Auth-required endpoints expect `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/register` | none | Register as citizen or volunteer (rate-limited) |
| POST | `/api/auth/login` | none | Log in (rate-limited) |
| POST | `/api/auth/admin/create-user` | admin | Create a dispatcher/admin account |
| POST | `/api/incidents/public` | none | Create an incident (panic button; rate-limited) |
| GET | `/api/incidents` | volunteer/dispatcher/admin | List incidents (phone numbers masked for volunteers) |
| GET | `/api/incidents/:id` | incident access token or team | Get one incident |
| GET | `/api/incidents/:id/recommendation` | dispatcher/admin | Nearest hospital + ETA + capacity |
| GET | `/api/incidents/:id/timeline` | dispatcher/admin | Full event timeline |
| PATCH | `/api/incidents/:id/status` | dispatcher/admin | Update status (enforces valid transitions) |
| POST | `/api/incidents/:id/volunteer-accept` | volunteer/dispatcher/admin | Accept an incident (atomic, race-safe) |
| GET | `/api/hospitals` | none | List hospitals |
| POST | `/api/hospitals` | dispatcher/admin | Add a hospital |
| PATCH | `/api/hospitals/:id` | dispatcher/admin | Update hospital capacity/details |
| GET | `/api/volunteers/online` | none | List online, approved volunteers |
| GET | `/api/volunteers/pending` | dispatcher/admin | List volunteers awaiting approval |
| PATCH | `/api/volunteers/:id/approval` | dispatcher/admin | Approve/reject a volunteer |
| GET | `/api/volunteers/me` | volunteer/dispatcher/admin | Own profile |
| PATCH | `/api/volunteers/me/status` | volunteer/dispatcher/admin | Update online status + GPS |
| GET | `/api/messages/:incidentId` | incident access token or team | Get chat messages |
| POST | `/api/messages` | incident access token or team | Send a chat message |
| GET | `/api/analytics/overview` | dispatcher/admin | Dashboard metrics |
| GET | `/api/stats/public` | none | Aggregate counts only, safe for the public landing page |
| POST | `/ussd` | Africa's Talking gateway | USSD webhook |

---

## ⚡ Real-time Events

Socket.io connections authenticate via `socket.handshake.auth.token` (the same JWT as REST calls). Dispatchers/admins join a `team:privileged` room and receive full incident data; volunteers join `team:volunteer` and receive the same events with phone numbers masked. Anonymous (citizen) sockets must call `join-incident` with their incident's access token before receiving any events for it.

| Event | Who receives it | Payload |
|---|---|---|
| `new-incident` | Team (role-scoped) | New incident created |
| `incident-updated` | Team (role-scoped) | Any incident's status/assignment changed |
| `incident-{id}` | Team + that incident's room | That specific incident changed |
| `message-{incidentId}` | Team + that incident's room | New chat message |
| `volunteer-updated` | Team only | A volunteer's online status/location changed |
| `volunteer-message` | Team only | A volunteer sent a chat message (for team notification purposes) |

---

## 🗄️ Database Schema (MongoDB, via Mongoose)

**Incident** — `type`, `lat`/`lng`, `status` (`Pending`/`Dispatched`/`Resolved`), `reporter_phone`, `description`, `hospital_id`, `assigned_volunteer_id`/`assigned_volunteer_name`/`assigned_at`, `client_request_id` (idempotency key), `offline_created`, `notified_dispatched`, `triage_score` (unused), timestamps.

**Volunteer** — `name`, `email`, `password` (hashed), `role` (`citizen`/`volunteer`/`dispatcher`/`admin`), `approval_status` (`pending`/`approved`/`rejected`), `is_online`, `lat`/`lng`, `push_subscriptions`, timestamps.

**Hospital** — `name`, `lat`/`lng`, `capacity`, `available_beds`, `contact`.

**Message** — `incident_id`, `sender` (`citizen`/`volunteer`/`dispatcher`), `message`, `created_at`.

---

## 🚢 Deployment

- The backend requires `MONGO_URI`/`MONGODB_URI`, `JWT_SECRET`, and `REDIS_URL` to be set — it will refuse to start or silently misbehave without them.
- Set `NODE_ENV=production` to disable automatic demo-account seeding on boot.
- Requires case-sensitive filesystem awareness: all `require()` paths must exactly match on-disk filenames (this has been a real bug source when developing on macOS/Windows and deploying to Linux).
- The USSD webhook (`POST /ussd`) needs to be reachable by Africa's Talking, so it must be on a publicly accessible URL in production.
- Redis is a hard dependency in production, not optional — both USSD sessions and the SMS confirmation queue require it.

---

## 🧪 Testing

There is currently no automated test suite in this repository. Testing so far has been manual and ad-hoc. Adding coverage for incident creation, the status-transition rules, and the USSD state machine is a priority — see Known Limitations.

---

## ⚠️ Known Limitations

- No automated tests.
- Mobile app has no real-time connection to the backend; incident status only updates on manual pull-to-refresh.
- Ambulance/responder map animations are not yet driven by real volunteer GPS, despite that data now being available server-side.
- No chat encryption beyond standard transport-layer HTTPS/WSS.
- `triage_score` field exists but nothing populates it.
- No automatic escalation if an incident goes unacknowledged — this currently only logs to the server console.
- Hospital capacity data has no freshness indicator; a dispatcher has no way to tell if `available_beds` is current or stale.

---

## 🤝 Contributing

This is currently a small, actively-developed project without a formal contribution process yet. If you'd like to contribute, open an issue describing the change before submitting a pull request.

---

## 📄 License

MIT

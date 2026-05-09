# QuickReach - MongoDB Edition

> Emergency Response System with MongoDB, JWT Authentication, and Socket.io Real-time Updates

## 🚀 Major Update: Migrated from Supabase to MongoDB

This version of QuickReach uses **MongoDB** as the database, **JWT** for authentication, and **Socket.io** for real-time updates.

---

## 📋 Tech Stack

### Backend
- **Node.js** + Express
- **MongoDB** + Mongoose
- **JWT** Authentication (bcryptjs)
- **Socket.io** for real-time updates
- **Africa's Talking** SMS API

### Frontend
- **React** + Vite
- **TailwindCSS**
- **Socket.io Client**
- **Leaflet** for maps
- **React Router**

---

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v18+)
- MongoDB (Local or Atlas)
- Git

### 1. Clone Repository
```bash
git clone <your-new-repo-url>
cd Quickreach
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create `.env` file:
```env
MONGODB_URI=mongodb://localhost:27017/quickreach
JWT_SECRET=<your-jwt-secret>
PORT=3000

# SMS Configuration (Africa's Talking)
AT_API_KEY=your_api_key
AT_USERNAME=your_username
AT_SENDER_ID=QuickReach
```

Start backend:
```bash
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
```

Create `.env` file:
```env
VITE_API_BASE_URL=http://localhost:3000
```

Start frontend:
```bash
npm run dev
```

---

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Incidents
- `GET /api/incidents` - Get all incidents
- `POST /api/incidents/public` - Create incident (public)
- `PATCH /api/incidents/:id/status` - Update incident status
- `POST /api/incidents/:id/volunteer-accept` - Accept incident (volunteer)

### Volunteers
- `GET /api/volunteers/me` - Get current volunteer profile
- `PATCH /api/volunteers/me/status` - Update volunteer status
- `GET /api/volunteers/online` - Get online volunteers

### Hospitals
- `GET /api/hospitals` - Get all hospitals

### Messages
- `GET /api/messages/:incidentId` - Get incident messages
- `POST /api/messages` - Send message

---

## 🔄 Real-time Events (Socket.io)

### Server Emits:
- `new-incident` - New incident created
- `incident-updated` - Incident status changed
- `incident-{id}` - Specific incident update
- `message-{incidentId}` - New message in incident
- `volunteer-message` - Volunteer sent message
- `hospital-updated` - Hospital data changed
- `volunteer-updated` - Volunteer status changed

### Client Listens:
Connect to Socket.io server and listen for events:
```javascript
import { socket, connectSocket } from './lib/socket';

connectSocket();
socket.on('new-incident', (incident) => {
  // Handle new incident
});
```

---

## 🗄️ Database Schema

### Incidents
```javascript
{
  type: String,           // Medical, Fire, Police
  lat: Number,
  lng: Number,
  status: String,         // Pending, Dispatched, Resolved
  reporter_phone: String,
  description: String,
  session_id: String,
  hospital_id: ObjectId,
  triage_score: Number,
  notified_dispatched: Boolean,
  created_at: Date,
  updated_at: Date
}
```

### Volunteers
```javascript
{
  name: String,
  phone: String,
  email: String,
  password: String,       // Hashed with bcryptjs
  is_online: Boolean,
  lat: Number,
  lng: Number,
  last_active: Date,
  created_at: Date
}
```

### Hospitals
```javascript
{
  name: String,
  lat: Number,
  lng: Number,
  capacity: Number,
  available_beds: Number,
  contact: String,
  created_at: Date
}
```

### Messages
```javascript
{
  incident_id: ObjectId,
  sender: String,         // citizen, dispatcher, volunteer
  message: String,
  created_at: Date
}
```

---

## 🎯 Features

### For Citizens
- 🚨 Emergency panic button
- 📍 GPS location tracking
- 💬 Live chat with dispatcher
- 📹 Video call support
- 📱 Share location with contacts
- 🏥 First aid guide

### For Volunteers
- 🔔 Real-time incident alerts
- 📍 Nearby incident notifications
- ✅ Accept and respond to incidents
- 🗺️ Live incident map
- 📊 Online/offline status toggle

### For Dispatchers
- 🎛️ Command center dashboard
- 🗺️ Real-time incident map
- 🚑 Ambulance tracking
- 💬 Multi-party chat
- 📞 Direct call integration
- 📊 Analytics dashboard

### Additional Features
- 📞 USSD integration (Africa's Talking)
- 📱 SMS notifications
- 🌍 Multi-language support
- 🔐 JWT authentication
- ⚡ Real-time updates (Socket.io)

---

## 📖 Migration from Supabase

This project was migrated from Supabase to MongoDB. See `MIGRATION_GUIDE.md` for details.

### Key Changes:
- ✅ Database: PostgreSQL → MongoDB
- ✅ Auth: Supabase Auth → JWT
- ✅ Real-time: Supabase Realtime → Socket.io
- ✅ All Supabase dependencies removed

---

## 🧪 Testing

### Test Accounts
Create test accounts via the registration endpoints or use the login pages.

### Test Flow
1. Start backend and frontend
2. Open `http://localhost:5173`
3. Click "Emergency Panic Button"
4. Login as dispatcher at `/dispatcher-login`
5. Accept incident and track in real-time

---

## 📝 Environment Variables

### Backend (.env)
```env
MONGODB_URI=mongodb://localhost:27017/quickreach
JWT_SECRET=your-secret-key
PORT=3000
AT_API_KEY=your_api_key
AT_USERNAME=your_username
AT_SENDER_ID=QuickReach
```

### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🚀 Deployment

### Backend (Railway/Render/Heroku)
1. Set environment variables
2. Deploy from GitHub
3. Ensure MongoDB connection string is correct

### Frontend (Vercel/Netlify)
1. Set `VITE_API_BASE_URL` to your backend URL
2. Deploy from GitHub
3. Build command: `npm run build`
4. Output directory: `dist`

### MongoDB (Atlas)
1. Create free cluster at mongodb.com/cloud/atlas
2. Whitelist IP addresses
3. Get connection string
4. Update `MONGODB_URI` in backend

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

---

## 📄 License

MIT License - See LICENSE file for details

---

## 👥 Authors

- **Mulu Girmay** - Initial work & MongoDB migration

---

## 🙏 Acknowledgments

- Africa's Talking for SMS/USSD API
- MongoDB for database
- Socket.io for real-time capabilities
- React & Vite for frontend framework

---

## 📞 Support

For issues or questions, please open an issue on GitHub.

---

**Built with ❤️ for emergency response in Ethiopia**

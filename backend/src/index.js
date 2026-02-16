const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const { ussdHandler } = require('./ussd/handler');

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
 * Africa's Talking USSD Webhook
 * POST requests from AT gateway
 */
app.post('/ussd', ussdHandler);

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

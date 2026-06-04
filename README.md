# QuickReach - Emergency Response System

QuickReach is a comprehensive emergency response system designed for rapid incident reporting, intelligent dispatch, and coordinated volunteer response. Built for reliability in critical situations with offline-first capabilities and real-time communication.

## 📋 Table of Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [API Documentation](#-api-documentation)
- [Real-time Events](#-real-time-events)
- [Database Schema](#-database-schema)
- [Deployment](#-deployment)
- [Testing](#-testing)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🎯 Overview

QuickReach solves critical gaps in emergency response by enabling:

| Stakeholder     | Problem Solved                            | Solution                                           |
| --------------- | ----------------------------------------- | -------------------------------------------------- |
| **Citizens**    | Cannot report emergencies without network | Offline-first mobile app with local SQLite storage |
| **Dispatchers** | Delayed awareness of incidents            | Real-time dashboard with Socket.io updates         |
| **Volunteers**  | Unaware of nearby emergencies             | Geolocation-based incident discovery               |
| **Responders**  | Poor coordination                         | Multi-party chat and live tracking                 |

### Key Differentiators

✅ **Offline-First Architecture** - Create incidents without internet, sync automatically  
✅ **Real-time Communication** - Socket.io for instant updates across all roles  
✅ **Multi-Channel Reporting** - Mobile app, USSD, and web panic button  
✅ **Intelligent Dispatch** - Triage scoring and proximity-based volunteer matching  
✅ **SMS Fallback** - Africa's Talking integration for feature phones

---

## 🏗️ Architecture

┌─────────────────────────────────────────────────────────────────┐
│ QUICKREACH SYSTEM │
├─────────────────────────────────────────────────────────────────┤
│ │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ │
│ │ Citizen │ │ Dispatcher │ │ Volunteer │ │
│ │ Flutter App │ │ React Web │ │ React Web │ │
│ └──────┬───────┘ └──────┬───────┘ └──────┬───────┘ │
│ │ │ │ │
│ └───────────────────┼───────────────────┘ │
│ │ │
│ ┌────────▼────────┐ │
│ │ REST API │ │
│ │ Socket.io │ │
│ │ JWT Auth │ │
│ └────────┬────────┘ │
│ │ │
│ ┌──────────────┼──────────────┐ │
│ │ │ │ │
│ ┌────▼────┐ ┌─────▼─────┐ ┌───▼────┐ │
│ │ MongoDB │ │ Redis │ │ SMS │ │
│ │ (Primary│ │ (Session) │ │ Gateway│ │
│ └─────────┘ └───────────┘ └────────┘ │
└─────────────────────────────────────────────────────────────────┘

---

## ✨ Features

### For Citizens 👤

| Feature                   | Description                                 | Status |
| ------------------------- | ------------------------------------------- | ------ |
| Emergency Panic Button    | One-tap SOS activation with hold-to-confirm | ✅     |
| Offline Incident Creation | Works without internet, syncs automatically | ✅     |
| GPS Location Tracking     | Automatic coordinates capture               | ✅     |
| Live Chat                 | Real-time communication with dispatch       | ✅     |
| Video Call Support        | Face-to-face with dispatcher                | ✅     |
| First Aid Guide           | Step-by-step emergency instructions         | ✅     |
| USSD Integration          | Feature phone support via \*123#            | ✅     |

### For Dispatchers 🎛️

| Feature           | Description                        | Status |
| ----------------- | ---------------------------------- | ------ |
| Command Dashboard | Real-time incident overview        | ✅     |
| Live Incident Map | Geolocation visualization          | ✅     |
| Triage Scoring    | Automated priority assessment      | ✅     |
| Resource Dispatch | Assign volunteers and ambulances   | ✅     |
| Analytics Panel   | Incident trends and response times | ✅     |
| SMS Broadcasting  | Mass notification system           | ✅     |

### For Volunteers 🚑

| Feature            | Description               | Status |
| ------------------ | ------------------------- | ------ |
| Nearby Incidents   | 10km radius discovery     | ✅     |
| One-Tap Acceptance | Instant incident claiming | ✅     |
| Status Management  | Online/offline toggle     | ✅     |
| Live Navigation    | Turn-by-turn directions   | ✅     |
| Push Notifications | Real-time alerts          | ✅     |

---

## 🛠️ Tech Stack

### Backend

| Technology | Version | Purpose                 |
| ---------- | ------- | ----------------------- |
| Node.js    | 18+     | Runtime environment     |
| Express.js | 4.18+   | Web framework           |
| MongoDB    | 6.0+    | Primary database        |
| Mongoose   | 7.0+    | ODM for MongoDB         |
| Socket.io  | 4.5+    | Real-time communication |
| JWT        | 9.0+    | Authentication          |
| bcryptjs   | 2.4+    | Password hashing        |

### Frontend (Web)

| Technology       | Version | Purpose           |
| ---------------- | ------- | ----------------- |
| React            | 18.2+   | UI framework      |
| Vite             | 4.0+    | Build tool        |
| TailwindCSS      | 3.3+    | Styling           |
| Leaflet          | 1.9+    | Maps              |
| Socket.io Client | 4.5+    | Real-time updates |

### Mobile (Flutter)

| Technology  | Version | Purpose          |
| ----------- | ------- | ---------------- |
| Flutter     | 3.0+    | Mobile framework |
| SQLite      | 2.3+    | Offline storage  |
| BLoC        | 8.1+    | State management |
| Workmanager | 0.5+    | Background sync  |

### External Services

| Service          | Purpose                   |
| ---------------- | ------------------------- |
| Africa's Talking | SMS & USSD gateway        |
| MongoDB Atlas    | Cloud database (optional) |
| Redis            | Session management        |

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required versions
Node.js >= 18.0.0
MongoDB >= 6.0.0
Flutter >= 3.0.0 (for mobile)
Git

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/your-repo/quickreach)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-brightgreen.svg)](https://nodejs.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.0%2B-brightgreen.svg)](https://mongodb.com)
[![Flutter](https://img.shields.io/badge/Flutter-3.0%2B-blue.svg)](https://flutter.dev)

> **Enterprise-Grade Emergency Response Platform** | Real-time Incident Management | Offline-First Mobile App | Multi-Role Coordination
```

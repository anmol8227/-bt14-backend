# 🏛️ BT14 Civic Issue Resolution Portal

**Complete Full-Stack App**
- Frontend: React (CivicPortal-BT14.jsx)
- Backend:  Node.js + Express + MongoDB + JWT

---

## 📁 Folder Structure

```
bt14-backend/
├── server.js           ← Main Express server (entry point)
├── seed.js             ← Demo data script
├── package.json        ← Dependencies
├── .env                ← Environment variables
│
├── models/
│   ├── User.js         ← User schema (citizen + admin)
│   └── Feedback.js     ← Feedback schema
│
├── middleware/
│   └── auth.js         ← JWT verify, adminOnly, citizenOnly
│
└── routes/
    ├── auth.js         ← Register, Login, Me
    ├── feedback.js     ← Submit, Mine, All (admin)
    └── analytics.js    ← Summary, By-category, Monthly
```

---

## 🚀 Setup & Run (Step by Step)

### Step 1 — Prerequisites
```bash
# Node.js install karo (nodejs.org)
# MongoDB install karo (mongodb.com/try/download/community)
node --version   # v18+ hona chahiye
mongod --version # MongoDB hona chahiye
```

### Step 2 — MongoDB Start Karo
```bash
# Windows
mongod --dbpath C:\data\db

# Mac/Linux
mongod --dbpath /data/db
# ya
brew services start mongodb-community
```

### Step 3 — Backend Setup
```bash
cd bt14-backend
npm install
```

### Step 4 — .env Check Karo
```env
PORT=5000
MONGO_URI=mongodb://localhost:27017/bt14_civic_portal
JWT_SECRET=bt14_civic_super_secret_key_2024
JWT_EXPIRES_IN=7d
ADMIN_REGISTRATION_KEY=BT14ADMIN
NODE_ENV=development
```

### Step 5 — Demo Data Seed Karo
```bash
node seed.js
# Ya server start hone ke baad:
# curl -X POST http://localhost:5000/api/seed
```

### Step 6 — Server Start Karo
```bash
npm run dev    # development (auto-restart with nodemon)
# ya
npm start      # production
```

Server `http://localhost:5000` par chalega

---

## ⚛️ Frontend Setup

```bash
npm create vite@latest bt14-frontend -- --template react
cd bt14-frontend
npm install
# src/App.jsx ko CivicPortal-BT14.jsx se replace karo
npm run dev    # http://localhost:5173
```

---

## 🔌 API Endpoints

### Auth Routes
| Method | Endpoint              | Auth? | Description              |
|--------|-----------------------|-------|--------------------------|
| POST   | /api/auth/register    | ❌    | Register (citizen/admin) |
| POST   | /api/auth/login       | ❌    | Login → JWT token        |
| GET    | /api/auth/me          | ✅    | Get current user         |

### Feedback Routes
| Method | Endpoint              | Auth    | Description              |
|--------|-----------------------|---------|--------------------------|
| POST   | /api/feedback         | Citizen | Submit feedback          |
| GET    | /api/feedback/mine    | Citizen | My feedback history      |
| GET    | /api/feedback         | Admin   | All feedback + filters   |
| GET    | /api/feedback/:id     | Admin   | Single feedback detail   |

**Query params for GET /api/feedback:**
- `?category=roads` — filter by department
- `?status=Resolved` — filter by status
- `?page=1&limit=12` — pagination
- `?sort=-createdAt` — sorting

### Analytics Routes (Admin Only)
| Method | Endpoint                        | Description                    |
|--------|---------------------------------|--------------------------------|
| GET    | /api/analytics/summary          | Total, avg rating, NPS, satPct |
| GET    | /api/analytics/by-category      | Dept-wise count + avg rating   |
| GET    | /api/analytics/monthly          | Month-wise trend               |
| GET    | /api/analytics/satisfaction     | Rating distribution            |

### Utility
| Method | Endpoint    | Description            |
|--------|-------------|------------------------|
| GET    | /           | API health check       |
| POST   | /api/seed   | Create demo accounts   |

---

## 🔑 Demo Credentials

| Role    | Email                | Password   | Admin Key |
|---------|----------------------|------------|-----------|
| Admin   | admin@bt14.gov       | admin123   | —         |
| Citizen | citizen@bt14.gov     | citizen123 | —         |
| Register as admin | any email | any pass | BT14ADMIN |

---

## 📊 System Flow (Flowchart ke hisab se)

```
CITIZEN FLOW:
Citizen → React UI → POST /api/auth/login → JWT Token
        → Fill Form → POST /api/feedback → MongoDB save
        → GET /api/feedback/mine → History dekhe

ADMIN FLOW:
Admin → React Panel → POST /api/auth/login (role=admin) → JWT Token
      → GET /api/analytics/summary → Dashboard KPIs
      → GET /api/analytics/by-category → Dept-wise bars
      → GET /api/analytics/monthly → Month-wise graph
      → GET /api/feedback → All records + filter
```

---

## 📦 Dependencies

```json
{
  "express": "REST API framework",
  "mongoose": "MongoDB ODM",
  "jsonwebtoken": "JWT auth tokens",
  "bcryptjs": "Password hashing",
  "cors": "Cross-origin requests",
  "dotenv": "Environment variables",
  "express-validator": "Input validation"
}
```

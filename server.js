// ============================================================
//  BT14 Civic Issue Resolution Portal — Backend Server
//  Flow: Citizen/Admin → React UI → Node API → MongoDB
// ============================================================

require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
  ],
  credentials: true,
}));
app.use(express.json({ limit: "10kb" }));
app.use(express.urlencoded({ extended: true }));

// Request logger (development)
if (process.env.NODE_ENV === "development") {
  app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} | ${req.method} ${req.path}`);
    next();
  });
}

// ─── Database Connection ─────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    console.error("   Make sure MongoDB is running: mongod --dbpath /data/db");
    process.exit(1);
  }
};

// ─── Routes ──────────────────────────────────────────────────
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/feedback",  require("./routes/feedback"));
app.use("/api/analytics", require("./routes/analytics"));

// ─── Health Check ─────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "🏛️ BT14 Civic Portal API is running",
    version: "1.0.0",
    status: "healthy",
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    endpoints: {
      auth:      "/api/auth/register  |  /api/auth/login  |  /api/auth/me",
      feedback:  "/api/feedback  |  /api/feedback/mine",
      analytics: "/api/analytics/summary  |  /api/analytics/by-category  |  /api/analytics/monthly",
      seed:      "/api/seed  (POST - create demo accounts)",
    },
  });
});

// ─── Seed Demo Data ───────────────────────────────────────────
app.post("/api/seed", async (req, res) => {
  try {
    const User = require("./models/User");
    const Feedback = require("./models/Feedback");

    const results = { created: [], skipped: [] };

    // Create demo admin
    const adminExists = await User.findOne({ email: "admin@bt14.gov" });
    if (!adminExists) {
      await User.create({
        name: "Admin BT14",
        email: "admin@bt14.gov",
        password: "admin123",
        role: "admin",
      });
      results.created.push("admin@bt14.gov");
    } else {
      results.skipped.push("admin@bt14.gov (already exists)");
    }

    // Create demo citizen
    const citizenExists = await User.findOne({ email: "citizen@bt14.gov" });
    let citizenUser = citizenExists;
    if (!citizenExists) {
      citizenUser = await User.create({
        name: "Rahul Sharma",
        email: "citizen@bt14.gov",
        password: "citizen123",
        role: "citizen",
      });
      results.created.push("citizen@bt14.gov");
    } else {
      results.skipped.push("citizen@bt14.gov (already exists)");
    }

    // Seed sample feedbacks if none exist
    const fbCount = await Feedback.countDocuments();
    if (fbCount === 0 && citizenUser) {
      const sampleFeedbacks = [
        { issueId:"CIR-2024101", category:"roads",  rating:5, nps:9,  satisfied:true,  daysToResolve:2,  status:"Resolved",          comment:"Road fixed quickly!", tags:["Fast resolution","Staff was helpful"] },
        { issueId:"CIR-2024102", category:"water",  rating:3, nps:6,  satisfied:false, daysToResolve:8,  status:"Partially Resolved", comment:"Drainage still leaks a bit.", tags:["Professional service"] },
        { issueId:"CIR-2024103", category:"street", rating:5, nps:10, satisfied:true,  daysToResolve:1,  status:"Resolved",          comment:"Light fixed same day!", tags:["Fast resolution"] },
        { issueId:"CIR-2024104", category:"waste",  rating:4, nps:8,  satisfied:true,  daysToResolve:3,  status:"Resolved",          comment:"Waste cleared on time.", tags:["Communication clear"] },
        { issueId:"CIR-2024105", category:"parks",  rating:2, nps:3,  satisfied:false, daysToResolve:15, status:"Escalated",         comment:"Park still dirty.", tags:[] },
        { issueId:"CIR-2024106", category:"safety", rating:5, nps:9,  satisfied:true,  daysToResolve:2,  status:"Resolved",          comment:"Very fast response!", tags:["Fast resolution","Issue fully fixed"] },
        { issueId:"CIR-2024107", category:"roads",  rating:4, nps:8,  satisfied:true,  daysToResolve:4,  status:"Resolved",          comment:"Good job team.", tags:["Staff was helpful"] },
        { issueId:"CIR-2024108", category:"water",  rating:5, nps:10, satisfied:true,  daysToResolve:1,  status:"Resolved",          comment:"Excellent service!", tags:["Fast resolution","Follow-up received"] },
      ];

      for (const fb of sampleFeedbacks) {
        await Feedback.create({ ...fb, citizen: citizenUser._id, citizenName: citizenUser.name });
      }
      results.created.push(`${sampleFeedbacks.length} sample feedbacks`);
    } else if (fbCount > 0) {
      results.skipped.push(`${fbCount} feedbacks already exist`);
    }

    res.json({
      success: true,
      message: "✅ Demo data seeded successfully",
      results,
      loginCredentials: {
        admin:   { email: "admin@bt14.gov",   password: "admin123",   role: "admin" },
        citizen: { email: "citizen@bt14.gov", password: "citizen123", role: "citizen" },
      },
    });
  } catch (err) {
    console.error("Seed error:", err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── 404 Handler ─────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
  });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, error: messages[0] });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, error: `${field} already exists.` });
  }

  // JWT error
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({ success: false, error: "Invalid token." });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || "Internal server error",
  });
});

// ─── Start Server ─────────────────────────────────────────────
const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log("");
    console.log("╔═══════════════════════════════════════════╗");
    console.log("║   🏛️  BT14 Civic Portal Backend           ║");
    console.log(`║   🚀  Running on: http://localhost:${PORT}   ║`);
    console.log("║   📦  MongoDB: Connected                  ║");
    console.log("╚═══════════════════════════════════════════╝");
    console.log("");
    console.log("📋 API Routes:");
    console.log("   POST /api/auth/register     → Register user");
    console.log("   POST /api/auth/login        → Login + get JWT");
    console.log("   POST /api/feedback          → Submit feedback (citizen)");
    console.log("   GET  /api/feedback/mine     → My feedback history");
    console.log("   GET  /api/feedback          → All feedback (admin)");
    console.log("   GET  /api/analytics/summary → Dashboard KPIs (admin)");
    console.log("   GET  /api/analytics/by-category → Dept breakdown");
    console.log("   GET  /api/analytics/monthly → Monthly trend");
    console.log("   POST /api/seed              → Create demo accounts");
    console.log("");
    console.log("💡 Seed demo data: curl -X POST http://localhost:5000/api/seed");
    console.log("");
  });
});

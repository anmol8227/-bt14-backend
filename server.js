// ============================================================
//  Civic Issue Resolution Portal — Backend Server
// ============================================================

require('dotenv').config();
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');

const app = express();

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://127.0.0.1:5173',
    'https://bt14-frontend.vercel.app',
  ],
  credentials: true,
}));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    console.log(`${new Date().toLocaleTimeString()} | ${req.method} ${req.path}`);
    next();
  });
}

// ─── Database ────────────────────────────────────────────────
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (err) {
    console.error(`❌ MongoDB Error: ${err.message}`);
    process.exit(1);
  }
};

// ─── Routes ──────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/feedback',  require('./routes/feedback'));
app.use('/api/analytics', require('./routes/analytics'));

// ─── Health Check ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    message: '🏛️ Civic Portal API is running',
    version: '2.0.0',
    status:  'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    endpoints: {
      auth:      'POST /api/auth/register | POST /api/auth/login | GET /api/auth/me',
      reset:     'POST /api/auth/forgot-password | POST /api/auth/forgot-password/verify | POST /api/auth/reset-password',
      feedback:  'POST /api/feedback | GET /api/feedback/mine | GET /api/feedback (admin)',
      analytics: 'GET /api/analytics/summary | /by-category | /monthly | /satisfaction',
    },
  });
});

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.path} not found` });
});

// ─── Global Error Handler ─────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ success: false, error: messages[0] });
  }
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({ success: false, error: `${field} already exists.` });
  }
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ success: false, error: 'Invalid token.' });
  }
  res.status(err.statusCode || 500).json({ success: false, error: err.message || 'Internal server error' });
});

// ─── Start ───────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║   🏛️  Civic Portal Backend v2.0              ║');
    console.log(`║   🚀  Running on: http://localhost:${PORT}      ║`);
    console.log('║   📦  MongoDB: Connected                     ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log('');
    console.log('📋 Routes:');
    console.log('   POST /api/auth/register');
    console.log('   POST /api/auth/login');
    console.log('   GET  /api/auth/security-questions');
    console.log('   POST /api/auth/forgot-password');
    console.log('   POST /api/auth/forgot-password/verify');
    console.log('   POST /api/auth/reset-password');
    console.log('   POST /api/feedback');
    console.log('   GET  /api/feedback/mine');
    console.log('   GET  /api/feedback  (admin)');
    console.log('   GET  /api/analytics/summary');
    console.log('   GET  /api/analytics/by-category');
    console.log('   GET  /api/analytics/monthly');
    console.log('');
  });
});

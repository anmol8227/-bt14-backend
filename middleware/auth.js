const jwt = require('jsonwebtoken');
const User = require('../models/User');

// ─── Protect: verify JWT ──────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    let token;
    if (req.headers.authorization?.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }
    if (!token) {
      return res.status(401).json({ success: false, message: 'Not authorized. Token missing.' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found.' });
    }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// ─── Admin only ───────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, message: 'Admin access required.' });
  }
  next();
};

// ─── Citizen only ─────────────────────────────────────────────
const citizenOnly = (req, res, next) => {
  if (req.user?.role !== 'citizen') {
    return res.status(403).json({ success: false, message: 'Citizen access required.' });
  }
  next();
};

module.exports = { protect, adminOnly, citizenOnly };

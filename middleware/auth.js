// middleware/auth.js
const jwt = require("jsonwebtoken");
const User = require("../models/User");

// ── Verify JWT Token ─────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "User no longer exists.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: "Account is deactivated.",
      });
    }

    // Attach user to request
    req.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    next();
  } catch (err) {
    if (err.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, error: "Invalid token." });
    }
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, error: "Token expired. Please login again." });
    }
    res.status(500).json({ success: false, error: "Authentication error." });
  }
};

// ── Admin Only ───────────────────────────────────────────────
const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Admin privileges required.",
    });
  }
  next();
};

// ── Citizen Only ─────────────────────────────────────────────
const citizenOnly = (req, res, next) => {
  if (req.user.role !== "citizen") {
    return res.status(403).json({
      success: false,
      error: "This action is for citizens only.",
    });
  }
  next();
};

module.exports = { protect, adminOnly, citizenOnly };

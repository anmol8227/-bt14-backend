// routes/auth.js
const express = require("express");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

const router = express.Router();

// ── Helper: Generate JWT ─────────────────────────────────────
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, name: user.name, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// ── Helper: Send token response ──────────────────────────────
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user);
  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
};

// ════════════════════════════════════════════════════════════
// POST /api/auth/register
// Register a new user (citizen or admin)
// ════════════════════════════════════════════════════════════
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required").isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
    body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    try {
      // Validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
      }

      const { name, email, password, role, adminKey } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: "Email already registered. Please login instead.",
        });
      }

      // Determine role
      let userRole = "citizen";
      if (role === "admin") {
        if (adminKey !== process.env.ADMIN_REGISTRATION_KEY) {
          return res.status(403).json({
            success: false,
            error: "Invalid admin key. Contact system administrator.",
          });
        }
        userRole = "admin";
      }

      // Create user
      const user = await User.create({ name, email, password, role: userRole });

      console.log(`✅ New ${userRole} registered: ${name} (${email})`);
      sendTokenResponse(user, 201, res);
    } catch (err) {
      console.error("Register error:", err.message);
      res.status(500).json({ success: false, error: "Server error during registration." });
    }
  }
);

// ════════════════════════════════════════════════════════════
// POST /api/auth/login
// Login with email + password
// ════════════════════════════════════════════════════════════
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Please enter a valid email").normalizeEmail(),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: errors.array()[0].msg,
        });
      }

      const { email, password } = req.body;

      // Find user (include password for comparison)
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        });
      }

      // Compare password
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          error: "Invalid email or password.",
        });
      }

      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: "Account is deactivated. Contact administrator.",
        });
      }

      console.log(`✅ ${user.role} logged in: ${user.name} (${user.email})`);
      sendTokenResponse(user, 200, res);
    } catch (err) {
      console.error("Login error:", err.message);
      res.status(500).json({ success: false, error: "Server error during login." });
    }
  }
);

// ════════════════════════════════════════════════════════════
// GET /api/auth/me
// Get current logged-in user
// ════════════════════════════════════════════════════════════
router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, error: "Server error." });
  }
});

module.exports = router;

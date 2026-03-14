const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const { SECURITY_QUESTIONS } = require('../models/User');

// ─── Helper: Generate JWT ──────────────────────────────────────────────────────
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
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

// ════════════════════════════════════════════════════════════════════════════════
// GET SECURITY QUESTIONS LIST
// GET /api/auth/security-questions
// Frontend pe register form mein dikhao
// ════════════════════════════════════════════════════════════════════════════════
router.get('/security-questions', (req, res) => {
  res.json({
    success: true,
    questions: SECURITY_QUESTIONS.map((q, i) => ({ index: i, question: q })),
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// REGISTER
// POST /api/auth/register
// Body: { name, email, password, adminKey?, securityAnswers: ["ans1","ans2","ans3"] }
// ════════════════════════════════════════════════════════════════════════════════
router.post('/register', [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('securityAnswers')
    .isArray({ min: 3, max: 3 })
    .withMessage('All 3 security answers are required'),
  body('securityAnswers.*')
    .notEmpty().withMessage('Security answers cannot be empty')
    .isLength({ min: 2 }).withMessage('Each answer must be at least 2 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, email, password, adminKey, securityAnswers } = req.body;

    // Check duplicate
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const role = adminKey === process.env.ADMIN_REGISTRATION_KEY ? 'admin' : 'citizen';

    // Hash all 3 security answers
    const hashedAnswers = await Promise.all(
      securityAnswers.map(async (ans, idx) => ({
        questionIndex: idx,
        answerHash: await bcrypt.hash(ans.toLowerCase().trim(), 10),
      }))
    );

    const user = await User.create({
      name,
      email,
      password,
      role,
      securityAnswers: hashedAnswers,
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// LOGIN
// POST /api/auth/login
// Body: { email, password }
// ════════════════════════════════════════════════════════════════════════════════
router.post('/login', [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD — STEP 1
// POST /api/auth/forgot-password
// Body: { email }
// Returns: security questions for that user
// ════════════════════════════════════════════════════════════════════════════════
router.post('/forgot-password', [
  body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email } = req.body;
    const user = await User.findOne({ email });

    // Don't reveal if user exists or not
    if (!user) {
      return res.json({
        success: true,
        message: 'Agar yeh email registered hai, toh security questions neeche hain.',
        questions: SECURITY_QUESTIONS.map((q, i) => ({ index: i, question: q })),
        userId: null,
      });
    }

    res.json({
      success: true,
      message: 'Apne security questions ke jawab dein.',
      questions: SECURITY_QUESTIONS.map((q, i) => ({ index: i, question: q })),
      userId: user._id,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Kuch galat ho gaya' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD — STEP 2: Verify answers
// POST /api/auth/forgot-password/verify
// Body: { userId, answers: ["ans1", "ans2", "ans3"] }
// Returns: short-lived resetToken
// ════════════════════════════════════════════════════════════════════════════════
router.post('/forgot-password/verify', [
  body('userId').notEmpty().withMessage('userId is required'),
  body('answers').isArray({ min: 3, max: 3 }).withMessage('All 3 answers are required'),
  body('answers.*').notEmpty().withMessage('Answers cannot be empty'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { userId, answers } = req.body;

    const user = await User.findById(userId).select('+securityAnswers');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (!user.securityAnswers || user.securityAnswers.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Security answers not set for this account. Please contact admin.',
      });
    }

    // Verify all 3 answers
    const results = await Promise.all(
      answers.map((ans, idx) => user.compareSecurityAnswer(idx, ans))
    );

    const allCorrect = results.every(Boolean);

    if (!allCorrect) {
      // Tell which ones are wrong (optional - can remove for more security)
      const wrongIndexes = results
        .map((ok, i) => (!ok ? i + 1 : null))
        .filter(Boolean);

      return res.status(400).json({
        success: false,
        message: `Galat jawab: Question ${wrongIndexes.join(', ')}. Dobara try karein.`,
      });
    }

    // All correct — issue a 10-min reset token
    const resetToken = jwt.sign(
      { id: user._id, purpose: 'reset-password' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    res.json({
      success: true,
      message: 'Jawab sahi hain! Ab naya password set karein.',
      resetToken,
    });
  } catch (err) {
    console.error('Verify answers error:', err);
    res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD — STEP 3: Set new password
// POST /api/auth/reset-password
// Body: { resetToken, newPassword }
// ════════════════════════════════════════════════════════════════════════════════
router.post('/reset-password', [
  body('resetToken').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { resetToken, newPassword } = req.body;

    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({
        success: false,
        message: 'Reset token expire ho gaya (10 min). Please dobara try karein.',
      });
    }

    if (decoded.purpose !== 'reset-password') {
      return res.status(400).json({ success: false, message: 'Invalid reset token' });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Set new password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password successfully reset! Ab naye password se login karein.',
    });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
});

// ════════════════════════════════════════════════════════════════════════════════
// GET CURRENT USER
// GET /api/auth/me
// ════════════════════════════════════════════════════════════════════════════════
router.get('/me', protect, async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = router;

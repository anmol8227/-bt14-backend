const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');
const { protect, adminOnly, citizenOnly } = require('../middleware/auth');

// ─── Submit feedback (Citizen) ────────────────────────────────
// POST /api/feedback
router.post('/', protect, citizenOnly, async (req, res) => {
  try {
    const { issueId, category, rating, nps, satisfied, daysToResolve, resolution, comment, tags, status } = req.body;
    if (!issueId || !category || !rating) {
      return res.status(400).json({ success: false, message: 'issueId, category aur rating zaroori hain' });
    }
    const feedback = await Feedback.create({
      citizen:     req.user._id,
      citizenName: req.user.name,
      issueId, category, rating, nps, satisfied,
      daysToResolve, resolution, comment, tags,
      status: status || 'Resolved',
    });
    const refCode = 'FB-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    res.status(201).json({ success: true, feedback, refCode });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── My feedback history (Citizen) ────────────────────────────
// GET /api/feedback/mine
router.get('/mine', protect, citizenOnly, async (req, res) => {
  try {
    const feedbacks = await Feedback.find({ citizen: req.user._id }).sort('-createdAt');
    res.json({ success: true, feedbacks });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── All feedback (Admin) ─────────────────────────────────────
// GET /api/feedback?category=roads&status=Resolved&page=1&limit=12
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { category, status, page = 1, limit = 12, sort = '-createdAt' } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status)   filter.status   = status;
    const skip  = (parseInt(page) - 1) * parseInt(limit);
    const total = await Feedback.countDocuments(filter);
    const feedbacks = await Feedback.find(filter).sort(sort).skip(skip).limit(parseInt(limit));
    res.json({ success: true, feedbacks, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Single feedback (Admin) ──────────────────────────────────
// GET /api/feedback/:id
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) return res.status(404).json({ success: false, message: 'Feedback not found' });
    res.json({ success: true, feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

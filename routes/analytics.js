const express = require('express');
const router = express.Router();
const Feedback = require('../models/feedback');
const { protect, adminOnly } = require('../middleware/auth');

// ─── Summary KPIs ─────────────────────────────────────────────
// GET /api/analytics/summary
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    const fb = await Feedback.find();
    const total = fb.length;
    const avgRating = total ? (fb.reduce((s, f) => s + f.rating, 0) / total).toFixed(1) : 0;
    const npsAll    = fb.map(f => f.nps).filter(x => x != null);
    const promoters  = npsAll.filter(n => n >= 9).length;
    const detractors = npsAll.filter(n => n <= 6).length;
    const passives   = npsAll.length - promoters - detractors;
    const nps        = npsAll.length ? Math.round(((promoters - detractors) / npsAll.length) * 100) : 0;
    const satPct     = total ? Math.round((fb.filter(f => f.satisfied).length / total) * 100) : 0;
    const avgDays    = total ? (fb.reduce((s, f) => s + (f.daysToResolve || 0), 0) / total).toFixed(1) : 0;
    res.json({ success: true, total, avgRating, nps, satPct, avgDays, promoters, detractors, passives });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── By Category ─────────────────────────────────────────────
// GET /api/analytics/by-category
router.get('/by-category', protect, adminOnly, async (req, res) => {
  try {
    const categories = await Feedback.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 }, avgRating: { $avg: '$rating' } } },
      { $sort: { count: -1 } },
      { $project: { _id: 1, count: 1, avgRating: { $round: ['$avgRating', 1] } } },
    ]);
    res.json({ success: true, categories });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Monthly Trend ────────────────────────────────────────────
// GET /api/analytics/monthly
router.get('/monthly', protect, adminOnly, async (req, res) => {
  try {
    const months = await Feedback.aggregate([
      {
        $group: {
          _id:   { year: { $year: '$createdAt' }, month: { $month: '$createdAt' } },
          count: { $sum: 1 },
          score: { $avg: { $multiply: ['$rating', 20] } }, // convert 1-5 → 0-100
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 7 },
      {
        $project: {
          _id: 0,
          m:     { $let: { vars: { months: ['','Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] }, in: { $arrayElemAt: ['$$months', '$_id.month'] } } },
          count: 1,
          score: { $round: ['$score', 0] },
        },
      },
    ]);
    res.json({ success: true, months });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Satisfaction distribution ────────────────────────────────
// GET /api/analytics/satisfaction
router.get('/satisfaction', protect, adminOnly, async (req, res) => {
  try {
    const dist = await Feedback.aggregate([
      { $group: { _id: '$rating', count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);
    res.json({ success: true, distribution: dist });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;

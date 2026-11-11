// Profile, leaderboard, community goal and the fixed lists the app needs.

const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { BUILDINGS, IMPACTS, STATUSES, CAMPUS_GOAL } = require('../config');
const { POINT_RULES, LEVELS, getPoints, levelFor, contributionStats, badgesFor } = require('../gamification');

const router = express.Router();
router.use(requireAuth);

// Students ranked by points. `sinceDays` limits the ledger to recent rows.
function ranking(sinceDays) {
  const recentOnly = sinceDays ? `AND p.created_at >= datetime('now', '-${Number(sinceDays)} days')` : '';
  const rows = db
    .prepare(
      `SELECT u.id, u.name, COALESCE(SUM(p.amount), 0) AS points
       FROM users u LEFT JOIN point_events p ON p.user_id = u.id ${recentOnly}
       WHERE u.role = 'student'
       GROUP BY u.id
       ORDER BY points DESC, u.name ASC`
    )
    .all();
  return rows.map((row, index) => ({ ...row, rank: index + 1 }));
}

// Lists that never change while the app runs, sent once after login.
router.get('/meta', (req, res) => {
  res.json({
    categories: db.prepare('SELECT id, name, icon, department_id FROM categories ORDER BY id').all(),
    departments: db.prepare('SELECT id, name, icon FROM departments ORDER BY id').all(),
    buildings: BUILDINGS,
    impacts: IMPACTS,
    statuses: STATUSES,
    levels: LEVELS,
    pointRules: POINT_RULES,
  });
});

router.get('/me', (req, res) => {
  const userId = req.user.id;
  const points = getPoints(userId);
  const stats = contributionStats(userId);
  const allTime = ranking(null).find((row) => row.id === userId);

  const events = db
    .prepare(
      `SELECT p.id, p.amount, p.reason, p.issue_id, p.created_at, i.title AS issue_title
       FROM point_events p LEFT JOIN issues i ON i.id = p.issue_id
       WHERE p.user_id = ? ORDER BY p.id DESC LIMIT 15`
    )
    .all(userId);

  res.json({
    user: req.user,
    points,
    level: levelFor(points),
    rank: allTime ? allTime.rank : null,
    stats: {
      reports: stats.reports,
      acknowledged: stats.acknowledged,
      resolved: stats.resolved,
      upvotesGiven: stats.upvotesGiven,
      upvotesReceived: stats.upvotesReceived,
    },
    badges: badgesFor(userId),
    events,
  });
});

router.get('/leaderboard', (req, res) => {
  const period = req.query.period === 'all' ? 'all' : 'week';
  const rows = ranking(period === 'week' ? 7 : null);

  // Level always comes from all-time points, even on the weekly board.
  const withLevel = (row) => ({ ...row, level: levelFor(getPoints(row.id)).name, isMe: row.id === req.user.id });

  res.json({
    period,
    top: rows.slice(0, 10).map(withLevel),
    me: rows.filter((row) => row.id === req.user.id).map(withLevel)[0] || null,
    totalStudents: rows.length,
  });
});

router.get('/campus-health', (req, res) => {
  const resolvedRecently = db
    .prepare(
      `SELECT COUNT(DISTINCT issue_id) AS n FROM status_history
       WHERE new_status = 'Resolved' AND changed_at >= datetime('now', '-30 days')`
    )
    .get().n;
  const totals = db
    .prepare("SELECT COUNT(*) AS total, SUM(status = 'Resolved') AS resolved FROM issues")
    .get();
  const total = totals.total || 0;
  const resolved = totals.resolved || 0;

  res.json({
    goal: CAMPUS_GOAL,
    resolvedLast30Days: resolvedRecently,
    open: total - resolved,
    total,
    percentResolved: total ? Math.round((resolved / total) * 100) : 0,
  });
});

module.exports = router;

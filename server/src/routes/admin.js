// Admin-only routes: move a report to its next status, and see the numbers.

const express = require('express');
const fs = require('fs');
const { db, transaction } = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { HttpError } = require('../middleware/errors');
const { statusSchema, parse } = require('../validation');
const { STATUSES, NEXT_STATUS } = require('../config');
const { POINTS, award, checkBadges } = require('../gamification');
const { ISSUE_SELECT, toIssue, getIssue, upload } = require('./issues');

const router = express.Router();
router.use(requireAuth, requireAdmin);

const changeStatus = transaction((admin, issueId, newStatus, note, photoPath) => {
  const issue = db.prepare('SELECT id, reporter_id, status FROM issues WHERE id = ?').get(issueId);
  if (!issue) throw new HttpError(404, 'This report does not exist.');

  // A report can only move one step forward: no skipping, no going back.
  const allowed = NEXT_STATUS[issue.status];
  if (!allowed) throw new HttpError(400, 'This report is already resolved.');
  if (newStatus !== allowed) {
    throw new HttpError(400, `A report that is "${issue.status}" can only move to "${allowed}".`);
  }

  // The "AND status = ?" guard means that if another admin changed this
  // report a moment ago, this update touches no rows and we stop.
  const info = db
    .prepare("UPDATE issues SET status = ?, updated_at = datetime('now') WHERE id = ? AND status = ?")
    .run(newStatus, issueId, issue.status);
  if (Number(info.changes) !== 1) throw new HttpError(409, 'This report was just updated by someone else. Refresh and try again.');

  db.prepare(
    'INSERT INTO status_history (issue_id, old_status, new_status, changed_by, note, photo_path) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(issueId, issue.status, newStatus, admin.id, note, photoPath);

  // The reporter is rewarded when staff confirm the report and when it is fixed.
  if (newStatus === 'Acknowledged') {
    award(issue.reporter_id, POINTS.REPORT_ACKNOWLEDGED, 'Your report was acknowledged', issueId);
  }
  if (newStatus === 'Resolved') {
    award(issue.reporter_id, POINTS.REPORT_RESOLVED, 'Your report was resolved', issueId);
  }
  checkBadges(issue.reporter_id);
});

// Accepts JSON, or a multipart form when the admin attaches a photo of the fix.
router.patch('/issues/:id/status', upload.single('photo'), (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Issue id must be a number.');
    const { status, note } = parse(statusSchema, req.body);
    if (req.file && status !== 'Resolved') {
      throw new HttpError(400, 'A photo of the fix can only be added when marking a report resolved.');
    }

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    changeStatus(req.user, id, status, note, photoPath);
    res.json({ issue: getIssue(id, req.user.id) });
  } catch (err) {
    if (req.file) fs.unlink(req.file.path, () => {}); // keep no photo for a change that was refused
    throw err;
  }
});

router.get('/stats', (req, res) => {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const row of db.prepare('SELECT status, COUNT(*) AS n FROM issues GROUP BY status').all()) {
    counts[row.status] = row.n;
  }

  const byCategory = db
    .prepare(
      `SELECT c.id, c.name, c.icon, COUNT(i.id) AS open
       FROM categories c JOIN issues i ON i.category_id = c.id AND i.status <> 'Resolved'
       GROUP BY c.id ORDER BY open DESC, c.name LIMIT 5`
    )
    .all();

  // Open problems per department, including departments with none.
  const byDepartment = db
    .prepare(
      `SELECT d.id, d.name, d.icon, COUNT(i.id) AS open
       FROM departments d
       LEFT JOIN categories c ON c.department_id = d.id
       LEFT JOIN issues i ON i.category_id = c.id AND i.status <> 'Resolved'
       GROUP BY d.id ORDER BY d.id`
    )
    .all();

  const topOpen = db
    .prepare(`${ISSUE_SELECT} WHERE i.status <> 'Resolved' ORDER BY upvotes DESC, i.created_at ASC LIMIT 3`)
    .all(req.user.id)
    .map((row) => toIssue(row, req.user.id));

  const resolveTime = db
    .prepare(
      `SELECT AVG((julianday(h.changed_at) - julianday(i.created_at)) * 24.0) AS hours
       FROM status_history h JOIN issues i ON i.id = h.issue_id
       WHERE h.new_status = 'Resolved'`
    )
    .get();

  res.json({
    byStatus: counts,
    total: Object.values(counts).reduce((a, b) => a + b, 0),
    open: counts.Reported + counts.Acknowledged + counts['In Progress'],
    byCategory,
    byDepartment,
    topOpen,
    avgResolveHours: resolveTime.hours === null ? null : Math.round(resolveTime.hours),
  });
});

module.exports = router;

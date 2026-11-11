// Reports: list, search, read, create, upvote and withdraw an upvote.

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const { db, transaction } = require('../db');
const { requireAuth } = require('../middleware/auth');
const { HttpError } = require('../middleware/errors');
const { issueSchema, parse } = require('../validation');
const { STATUSES } = require('../config');
const { POINTS, award, checkBadges } = require('../gamification');

const router = express.Router();
router.use(requireAuth);

// ---------- photo uploads ----------
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_TYPES = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/heic': '.heic' };

const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    // A random name, so an uploaded file can never overwrite another or carry a risky name.
    filename: (req, file, done) => done(null, crypto.randomBytes(12).toString('hex') + IMAGE_TYPES[file.mimetype]),
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, done) => {
    if (IMAGE_TYPES[file.mimetype]) return done(null, true);
    done(new HttpError(400, 'Only JPG, PNG or WebP photos can be attached.'));
  },
});

// ---------- shared query pieces ----------
// The upvote count is always counted from the upvotes table, never stored,
// so it cannot drift out of step with the real votes.
const ISSUE_SELECT = `
  SELECT i.*,
         c.name AS category_name,
         c.icon AS category_icon,
         u.name AS reporter_name,
         (SELECT COUNT(*) FROM upvotes v WHERE v.issue_id = i.id) AS upvotes,
         EXISTS (SELECT 1 FROM upvotes v WHERE v.issue_id = i.id AND v.user_id = ?) AS has_upvoted
  FROM issues i
  JOIN categories c ON c.id = i.category_id
  JOIN users u ON u.id = i.reporter_id`;

function toIssue(row, userId) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    building: row.building,
    room: row.room,
    location_note: row.location_note,
    impact: row.impact,
    status: row.status,
    photo_url: row.photo_path,
    created_at: row.created_at,
    updated_at: row.updated_at,
    category: { id: row.category_id, name: row.category_name, icon: row.category_icon },
    reporter: { id: row.reporter_id, name: row.reporter_name },
    upvotes: row.upvotes,
    hasUpvoted: Boolean(row.has_upvoted),
    isMine: row.reporter_id === userId,
  };
}

function getIssue(id, userId) {
  const row = db.prepare(`${ISSUE_SELECT} WHERE i.id = ?`).get(userId, id);
  return row ? toIssue(row, userId) : null;
}

function issueIdFrom(req) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Issue id must be a number.');
  return id;
}

// ---------- routes ----------
router.get('/categories', (req, res) => {
  res.json(db.prepare('SELECT id, name, icon FROM categories ORDER BY id').all());
});

// Feed with optional filters. Every value from the user is passed as a bound
// parameter (the ? marks), so it can never be run as SQL.
router.get('/issues', (req, res) => {
  const { status, category, q, mine, sort } = req.query;
  const where = [];
  const params = [req.user.id];

  if (status) {
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Unknown status filter.');
    where.push('i.status = ?');
    params.push(status);
  }
  if (category) {
    const categoryId = Number(category);
    if (!Number.isInteger(categoryId)) throw new HttpError(400, 'Category filter must be a number.');
    where.push('i.category_id = ?');
    params.push(categoryId);
  }
  if (typeof q === 'string' && q.trim()) {
    const like = `%${q.trim().replace(/[\\%_]/g, '\\$&')}%`;
    where.push(
      "(i.title LIKE ? ESCAPE '\\' OR i.description LIKE ? ESCAPE '\\' OR i.building LIKE ? ESCAPE '\\' OR IFNULL(i.room, '') LIKE ? ESCAPE '\\')"
    );
    params.push(like, like, like, like);
  }
  if (mine === '1') {
    where.push('i.reporter_id = ?');
    params.push(req.user.id);
  }

  // Sort options come from a fixed list, never from the request text.
  const orderBy =
    sort === 'newest'
      ? 'i.created_at DESC, i.id DESC'
      : "(i.status = 'Resolved') ASC, upvotes DESC, i.created_at DESC, i.id DESC";

  const sql = `${ISSUE_SELECT} ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY ${orderBy} LIMIT 200`;
  const rows = db.prepare(sql).all(...params);
  res.json(rows.map((row) => toIssue(row, req.user.id)));
});

// Open issues at the same building and category: shown before a student
// submits, so they can upvote the existing report instead of duplicating it.
router.get('/issues/similar', (req, res) => {
  const building = String(req.query.building || '');
  const categoryId = Number(req.query.category_id);
  if (!building || !Number.isInteger(categoryId)) return res.json([]);

  const rows = db
    .prepare(
      `${ISSUE_SELECT}
       WHERE i.building = ? AND i.category_id = ? AND i.status <> 'Resolved'
       ORDER BY upvotes DESC, i.created_at DESC LIMIT 3`
    )
    .all(req.user.id, building, categoryId);
  res.json(rows.map((row) => toIssue(row, req.user.id)));
});

router.get('/issues/:id', (req, res) => {
  const id = issueIdFrom(req);
  const issue = getIssue(id, req.user.id);
  if (!issue) throw new HttpError(404, 'This report does not exist.');

  const history = db
    .prepare(
      `SELECT h.id, h.old_status, h.new_status, h.note, h.changed_at, u.name AS changed_by_name, u.role AS changed_by_role
       FROM status_history h JOIN users u ON u.id = h.changed_by
       WHERE h.issue_id = ? ORDER BY h.id`
    )
    .all(id);
  res.json({ ...issue, history });
});

const createIssue = transaction((user, data, photoPath) => {
  const info = db
    .prepare(
      `INSERT INTO issues (reporter_id, category_id, title, description, building, room, location_note, impact, photo_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(user.id, data.category_id, data.title, data.description, data.building, data.room, data.location_note, data.impact, photoPath);
  const issueId = Number(info.lastInsertRowid);

  db.prepare("INSERT INTO status_history (issue_id, old_status, new_status, changed_by) VALUES (?, NULL, 'Reported', ?)").run(
    issueId,
    user.id
  );

  const rewards = [award(user.id, POINTS.REPORT_SUBMITTED, 'Report submitted', issueId), ...checkBadges(user.id)];
  return { issueId, rewards };
});

router.post('/issues', upload.single('photo'), (req, res) => {
  const removeUpload = () => req.file && fs.unlink(req.file.path, () => {});
  try {
    if (req.user.role !== 'student') {
      throw new HttpError(403, 'Admin accounts manage reports. Use a student account to report a problem.');
    }
    const data = parse(issueSchema, req.body);
    const category = db.prepare('SELECT id FROM categories WHERE id = ?').get(data.category_id);
    if (!category) throw new HttpError(400, 'Choose a category from the list.');

    const photoPath = req.file ? `/uploads/${req.file.filename}` : null;
    const { issueId, rewards } = createIssue(req.user, data, photoPath);
    res.status(201).json({ issue: getIssue(issueId, req.user.id), rewards });
  } catch (err) {
    removeUpload(); // do not keep a photo for a report that was rejected
    throw err;
  }
});

const addUpvote = transaction((user, issueId) => {
  const issue = db.prepare('SELECT id, reporter_id, status FROM issues WHERE id = ?').get(issueId);
  if (!issue) throw new HttpError(404, 'This report does not exist.');
  if (user.role !== 'student') throw new HttpError(403, 'Only students can upvote reports.');
  if (issue.reporter_id === user.id) throw new HttpError(403, 'You cannot upvote your own report.');
  if (issue.status === 'Resolved') throw new HttpError(400, 'This issue is already resolved.');

  const already = db.prepare('SELECT 1 AS yes FROM upvotes WHERE user_id = ? AND issue_id = ?').get(user.id, issueId);
  if (already) throw new HttpError(409, 'You have already upvoted this report.');

  // Even if two requests raced past the check above, the primary key on
  // (user_id, issue_id) makes the second insert fail.
  db.prepare('INSERT INTO upvotes (user_id, issue_id) VALUES (?, ?)').run(user.id, issueId);

  const rewards = [award(user.id, POINTS.UPVOTE_GIVEN, 'You upvoted an issue', issueId)];
  award(issue.reporter_id, POINTS.UPVOTE_RECEIVED, 'Someone upvoted your report', issueId);
  rewards.push(...checkBadges(user.id));
  checkBadges(issue.reporter_id);
  return rewards;
});

router.post('/issues/:id/upvote', (req, res) => {
  const id = issueIdFrom(req);
  const rewards = addUpvote(req.user, id);
  res.status(201).json({ issue: getIssue(id, req.user.id), rewards });
});

const removeUpvote = transaction((user, issueId) => {
  const issue = db.prepare('SELECT id, reporter_id FROM issues WHERE id = ?').get(issueId);
  if (!issue) throw new HttpError(404, 'This report does not exist.');

  const info = db.prepare('DELETE FROM upvotes WHERE user_id = ? AND issue_id = ?').run(user.id, issueId);
  if (Number(info.changes) === 0) throw new HttpError(404, 'You have not upvoted this report.');

  // Take the points back with new negative rows, so voting and un-voting
  // again and again can never be used to farm points.
  award(user.id, -POINTS.UPVOTE_GIVEN, 'You withdrew an upvote', issueId);
  award(issue.reporter_id, -POINTS.UPVOTE_RECEIVED, 'An upvote on your report was withdrawn', issueId);
});

router.delete('/issues/:id/upvote', (req, res) => {
  const id = issueIdFrom(req);
  removeUpvote(req.user, id);
  res.json({ issue: getIssue(id, req.user.id), rewards: [] });
});

module.exports = router;
module.exports.ISSUE_SELECT = ISSUE_SELECT;
module.exports.toIssue = toIssue;
module.exports.getIssue = getIssue;

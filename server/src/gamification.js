// Points, levels and badges.
//
// Design idea: reward reports that turn out to be useful, not the number of
// reports. Most points only arrive when an admin confirms a report is real
// (Acknowledged) or the problem gets fixed (Resolved), so spam earns almost nothing.

const { db } = require('./db');

const POINTS = {
  REPORT_SUBMITTED: 5,
  REPORT_ACKNOWLEDGED: 15,
  REPORT_RESOLVED: 25,
  UPVOTE_RECEIVED: 2,
  UPVOTE_GIVEN: 1,
};

// Shown to students in the app so the rules are never a mystery.
const POINT_RULES = [
  { label: 'Submit a report', amount: POINTS.REPORT_SUBMITTED },
  { label: 'Staff acknowledge your report', amount: POINTS.REPORT_ACKNOWLEDGED },
  { label: 'Your report gets resolved', amount: POINTS.REPORT_RESOLVED },
  { label: 'Another student upvotes your report', amount: POINTS.UPVOTE_RECEIVED },
  { label: 'Upvote an existing issue instead of filing a duplicate', amount: POINTS.UPVOTE_GIVEN },
];

const LEVELS = [
  { name: 'Newcomer', min: 0 },
  { name: 'Spotter', min: 50 },
  { name: 'Fixer', min: 150 },
  { name: 'Campus Guardian', min: 300 },
  { name: 'Legend', min: 600 },
];

const BADGES = [
  { code: 'FIRST_REPORT', name: 'First Report', description: 'Submit your first report', icon: 'flag-variant' },
  { code: 'SHARP_EYE', name: 'Sharp Eye', description: 'Have 5 reports acknowledged by staff', icon: 'eye-check' },
  { code: 'CROWD_FAVOURITE', name: 'Crowd Favourite', description: 'Get 5 upvotes on one report', icon: 'account-group' },
  { code: 'PROBLEM_SOLVER', name: 'Problem Solver', description: 'Have 3 of your reports resolved', icon: 'check-decagram' },
  { code: 'TEAM_PLAYER', name: 'Team Player', description: 'Upvote 10 issues', icon: 'handshake' },
  { code: 'EXPLORER', name: 'Explorer', description: 'Report in 4 different categories', icon: 'compass' },
  { code: 'ON_A_ROLL', name: 'On a Roll', description: 'Contribute on 3 different days in one week', icon: 'fire' },
];

// Adds one row to the points ledger. `at` is only used by the seed script to back-date history.
function award(userId, amount, reason, issueId = null, at = null) {
  if (at) {
    db.prepare(
      'INSERT INTO point_events (user_id, amount, reason, issue_id, created_at) VALUES (?, ?, ?, ?, ?)'
    ).run(userId, amount, reason, issueId, at);
  } else {
    db.prepare('INSERT INTO point_events (user_id, amount, reason, issue_id) VALUES (?, ?, ?, ?)').run(
      userId,
      amount,
      reason,
      issueId
    );
  }
  return { type: 'points', amount, reason };
}

function getPoints(userId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS total FROM point_events WHERE user_id = ?').get(userId).total;
}

function levelFor(points) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) {
    if (points >= LEVELS[i].min) index = i;
  }
  const current = LEVELS[index];
  const next = LEVELS[index + 1] || null;
  const progress = next ? (points - current.min) / (next.min - current.min) : 1;
  return {
    name: current.name,
    index,
    min: current.min,
    nextName: next ? next.name : null,
    nextMin: next ? next.min : null,
    pointsToNext: next ? next.min - points : 0,
    progress: Math.max(0, Math.min(1, progress)),
  };
}

// The numbers the badge rules need, all counted from the database.
function contributionStats(userId) {
  const one = (sql, ...params) => db.prepare(sql).get(...params).n;
  const days = db
    .prepare(
      `SELECT date(created_at) AS d FROM issues WHERE reporter_id = ?
       UNION
       SELECT date(created_at) AS d FROM upvotes WHERE user_id = ?
       ORDER BY d`
    )
    .all(userId, userId)
    .map((row) => row.d);

  return {
    reports: one('SELECT COUNT(*) AS n FROM issues WHERE reporter_id = ?', userId),
    acknowledged: one("SELECT COUNT(*) AS n FROM issues WHERE reporter_id = ? AND status <> 'Reported'", userId),
    resolved: one("SELECT COUNT(*) AS n FROM issues WHERE reporter_id = ? AND status = 'Resolved'", userId),
    upvotesGiven: one('SELECT COUNT(*) AS n FROM upvotes WHERE user_id = ?', userId),
    upvotesReceived: one(
      'SELECT COUNT(*) AS n FROM upvotes v JOIN issues i ON i.id = v.issue_id WHERE i.reporter_id = ?',
      userId
    ),
    bestReportUpvotes: one(
      `SELECT COALESCE(MAX(c), 0) AS n FROM (
         SELECT COUNT(*) AS c FROM upvotes v JOIN issues i ON i.id = v.issue_id
         WHERE i.reporter_id = ? GROUP BY v.issue_id
       )`,
      userId
    ),
    categories: one('SELECT COUNT(DISTINCT category_id) AS n FROM issues WHERE reporter_id = ?', userId),
    activeDays: days,
  };
}

// True if any three active days fall inside the same 7-day window.
function hasThreeDaysInAWeek(days) {
  const stamps = days.map((d) => Date.parse(`${d}T00:00:00Z`));
  for (let i = 0; i + 2 < stamps.length; i++) {
    if (stamps[i + 2] - stamps[i] <= 6 * 24 * 60 * 60 * 1000) return true;
  }
  return false;
}

const BADGE_RULES = {
  FIRST_REPORT: (s) => s.reports >= 1,
  SHARP_EYE: (s) => s.acknowledged >= 5,
  CROWD_FAVOURITE: (s) => s.bestReportUpvotes >= 5,
  PROBLEM_SOLVER: (s) => s.resolved >= 3,
  TEAM_PLAYER: (s) => s.upvotesGiven >= 10,
  EXPLORER: (s) => s.categories >= 4,
  ON_A_ROLL: (s) => hasThreeDaysInAWeek(s.activeDays),
};

// Gives the user any badge they now qualify for and returns the new ones.
// The primary key on user_badges means a badge can only ever be earned once.
function checkBadges(userId) {
  const stats = contributionStats(userId);
  const owned = new Set(
    db.prepare('SELECT badge_code FROM user_badges WHERE user_id = ?').all(userId).map((row) => row.badge_code)
  );
  const earned = [];
  for (const badge of BADGES) {
    if (!owned.has(badge.code) && BADGE_RULES[badge.code](stats)) {
      db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_code) VALUES (?, ?)').run(userId, badge.code);
      earned.push({ type: 'badge', code: badge.code, name: badge.name, description: badge.description, icon: badge.icon });
    }
  }
  return earned;
}

function badgesFor(userId) {
  const owned = new Map(
    db
      .prepare('SELECT badge_code, earned_at FROM user_badges WHERE user_id = ?')
      .all(userId)
      .map((row) => [row.badge_code, row.earned_at])
  );
  return BADGES.map((badge) => ({
    ...badge,
    earned: owned.has(badge.code),
    earned_at: owned.get(badge.code) || null,
  }));
}

module.exports = {
  POINTS,
  POINT_RULES,
  LEVELS,
  BADGES,
  award,
  getPoints,
  levelFor,
  contributionStats,
  checkBadges,
  badgesFor,
};

// Demo data. Run with:  npm run seed
// Clears every table and fills it again, so the demo always starts from the
// same known state. It is safe to run while the server is running.

const bcrypt = require('bcryptjs');
const { db, transaction } = require('./db');
const { POINTS, award, checkBadges } = require('./gamification');

const CATEGORIES = [
  ['Computers & IT', 'desktop-classic'],
  ['Furniture', 'chair-rolling'],
  ['Projector & AV', 'projector'],
  ['Water & Plumbing', 'water-pump'],
  ['Cleanliness', 'broom'],
  ['Network & Wi-Fi', 'wifi'],
  ['Electrical', 'flash'],
  ['Safety', 'shield-alert'],
  ['Other', 'dots-horizontal-circle'],
];

const ADMIN = { key: 'admin', name: 'Campus Admin', email: 'admin@campus.test', password: 'Admin123!', role: 'admin' };

const STUDENTS = [
  { key: 'alice', name: 'Alice Borg' },
  { key: 'ben', name: 'Ben Camilleri' },
  { key: 'chloe', name: 'Chloe Vella' },
  { key: 'luca', name: 'Luca Farrugia' },
  { key: 'maria', name: 'Maria Zammit' },
  { key: 'karl', name: 'Karl Grech' },
  { key: 'nadia', name: 'Nadia Attard' },
  { key: 'sam', name: 'Sam Micallef' },
].map((s) => ({ ...s, email: `${s.key}@campus.test`, password: 'Student123!', role: 'student' }));

// `created` and each step are "days ago". Alice has no reports on purpose:
// the live demo starts with her very first one.
const ISSUES = [
  {
    by: 'ben', cat: 'Projector & AV', building: 'Block D', room: 'D204', impact: 'High', created: 6,
    title: 'Projector keeps shutting off mid-lecture',
    desc: 'The ceiling projector turns itself off every 10 to 15 minutes and takes a few minutes to come back. Three lectures were interrupted this week.',
    votes: ['chloe', 'luca', 'maria', 'karl', 'nadia', 'sam'],
    steps: [['Acknowledged', 5, 'Logged with the AV team.'], ['In Progress', 3, 'Replacement lamp ordered, fitting on Thursday.']],
  },
  {
    by: 'chloe', cat: 'Water & Plumbing', building: 'Block B', room: null, note: 'First floor corridor, next to the stairwell', impact: 'High', created: 2,
    title: 'Water dripping from the ceiling',
    desc: 'Water is dripping from a ceiling tile and a puddle forms on the floor by mid-morning. Someone put a bucket under it but it fills up.',
    votes: ['ben', 'luca', 'maria', 'alice', 'karl'],
    steps: [['Acknowledged', 1.5, 'Maintenance will inspect the pipe above the tile.']],
  },
  {
    by: 'karl', cat: 'Water & Plumbing', building: 'Block D', room: 'D310', impact: 'High', created: 0.8,
    title: 'Air conditioner leaking onto desks',
    desc: 'The wall unit at the back drips water onto the last row of desks whenever it is switched on. Two sockets are right underneath it.',
    votes: ['ben', 'maria', 'chloe', 'nadia', 'luca'],
    steps: [],
  },
  {
    by: 'luca', cat: 'Network & Wi-Fi', building: 'Library', room: null, note: 'Study area 2, upper floor', impact: 'Medium', created: 1.2,
    title: 'Wi-Fi drops every few minutes',
    desc: 'The campus Wi-Fi disconnects every few minutes in the upper study area. Laptops and phones both lose the connection, so online submissions keep failing.',
    votes: ['ben', 'chloe', 'maria', 'nadia'],
    steps: [],
  },
  {
    by: 'maria', cat: 'Safety', building: 'Sports Hall', room: null, note: 'Main entrance', impact: 'High', created: 4,
    title: 'Entrance floor is slippery when it rains',
    desc: 'Rainwater gets carried inside and the tiles at the entrance become very slippery. One student already fell on Monday.',
    votes: ['nadia', 'sam', 'karl', 'ben'],
    steps: [['Acknowledged', 3.5, null], ['In Progress', 2, 'Anti-slip mats ordered.']],
  },
  {
    by: 'ben', cat: 'Safety', building: 'Block F', room: null, note: 'Main staircase, between ground and first floor', impact: 'High', created: 3,
    title: 'Loose handrail on the main staircase',
    desc: 'The handrail on the left side moves when you hold it. Two of the wall brackets look like they have come out.',
    votes: ['chloe', 'maria', 'nadia', 'sam'],
    steps: [['Acknowledged', 2.5, 'Area marked with tape until the brackets are refitted.']],
  },
  {
    by: 'sam', cat: 'Electrical', building: 'Block E', room: null, note: 'Second floor corridor', impact: 'Medium', created: 5,
    title: 'Corridor lights flickering',
    desc: 'Two of the ceiling lights flicker constantly. It is uncomfortable to walk through and gets worse in the evening.',
    votes: ['ben', 'karl', 'alice'],
    steps: [['Acknowledged', 4, null], ['In Progress', 1, 'Electrician replacing the starters.']],
  },
  {
    by: 'sam', cat: 'Other', building: 'Canteen', room: null, note: 'Vending machine by the door', impact: 'Low', created: 1.5,
    title: 'Vending machine takes coins and gives nothing',
    desc: 'The drinks machine accepts coins but does not release anything and does not give the money back.',
    votes: ['ben', 'chloe', 'maria'],
    steps: [],
  },
  {
    by: 'karl', cat: 'Projector & AV', building: 'Block D', room: 'D101', impact: 'Medium', created: 0.6,
    title: 'HDMI cable missing from the lecture hall',
    desc: 'The HDMI cable at the lecturer desk is gone, so nobody can connect a laptop to the screen.',
    votes: ['nadia'],
    steps: [],
  },
  {
    by: 'nadia', cat: 'Furniture', building: 'Block B', room: 'B305', impact: 'Medium', created: 3.2,
    title: 'Window will not close',
    desc: 'The latch on the middle window is broken and the window stays open. Rain comes in on windy days.',
    votes: ['luca'],
    steps: [['Acknowledged', 2.2, null]],
  },
  {
    by: 'maria', cat: 'Other', building: 'Block A', room: 'A203', impact: 'Low', created: 0.4,
    title: 'All whiteboard markers are dry',
    desc: 'None of the markers in this room write any more. Lecturers have been borrowing from the room next door.',
    votes: ['karl'],
    steps: [],
  },
  {
    by: 'sam', cat: 'Computers & IT', building: 'Block C', room: 'C104', impact: 'Low', created: 2.8,
    title: 'Keys missing on PC 7',
    desc: 'The keyboard on PC 7 has lost its E and Enter keys, so the machine cannot really be used.',
    votes: [],
    steps: [['Acknowledged', 1.8, 'Spare keyboard being brought from stores.']],
  },
  {
    by: 'maria', cat: 'Computers & IT', building: 'Block C', room: 'C102', impact: 'High', created: 12,
    title: 'Three PCs will not boot in Lab C102',
    desc: 'PCs 4, 9 and 15 show a black screen with a blinking cursor. The lab is full during practical sessions, so three students have no machine.',
    votes: ['ben', 'chloe', 'luca', 'karl'],
    steps: [['Acknowledged', 11, null], ['In Progress', 10, 'IT re-imaging the three machines.'], ['Resolved', 8, 'All three PCs re-imaged and tested.']],
  },
  {
    by: 'ben', cat: 'Electrical', building: 'Block E', room: 'E112', impact: 'Medium', created: 11,
    title: 'Back row power sockets are dead',
    desc: 'None of the floor sockets in the back row work, so laptops run out of battery during long sessions.',
    votes: ['chloe', 'karl', 'luca'],
    steps: [['Acknowledged', 10, null], ['In Progress', 8.5, null], ['Resolved', 6.5, 'Tripped breaker reset and the circuit checked.']],
  },
  {
    by: 'nadia', cat: 'Cleanliness', building: 'Canteen', room: null, note: 'Bins outside the main entrance', impact: 'Low', created: 9,
    title: 'Bins overflowing outside the canteen',
    desc: 'The bins by the entrance have been overflowing since lunchtime and rubbish is blowing across the courtyard.',
    votes: ['alice', 'sam', 'maria'],
    steps: [['Acknowledged', 8.8, null], ['In Progress', 8.6, null], ['Resolved', 8.4, 'Emptied. An extra daily collection has been added.']],
  },
  {
    by: 'karl', cat: 'Furniture', building: 'Block A', room: 'A110', impact: 'Medium', created: 10,
    title: 'Two chairs with broken legs',
    desc: 'Two chairs near the window have cracked legs and tip over when you sit down.',
    votes: ['luca', 'nadia'],
    steps: [['Acknowledged', 9, null], ['In Progress', 7.5, null], ['Resolved', 7, 'Both chairs removed and replaced.']],
  },
  {
    by: 'luca', cat: 'Water & Plumbing', building: 'Block C', room: null, note: 'Ground floor washroom', impact: 'Medium', created: 8,
    title: 'Tap will not turn off',
    desc: 'The middle tap keeps running at full flow even when closed all the way.',
    votes: ['ben', 'sam'],
    steps: [['Acknowledged', 7.6, null], ['In Progress', 7, null], ['Resolved', 5.5, 'Washer replaced.']],
  },
  {
    by: 'chloe', cat: 'Computers & IT', building: 'Library', room: null, note: 'Ground floor print station', impact: 'Low', created: 7,
    title: 'Printer is out of toner',
    desc: 'The black and white printer prints blank pages and shows a toner warning.',
    votes: [],
    steps: [['Acknowledged', 6.8, null], ['In Progress', 6.6, null], ['Resolved', 6.2, 'New toner fitted.']],
  },
  {
    by: 'chloe', cat: 'Cleanliness', building: 'Block F', room: null, note: 'First floor washrooms', impact: 'Low', created: 5.5,
    title: 'No soap in the washrooms',
    desc: 'All the soap dispensers on the first floor are empty.',
    votes: ['maria'],
    steps: [['Acknowledged', 5.2, null], ['In Progress', 5, null], ['Resolved', 4.6, 'Dispensers refilled.']],
  },
  {
    by: 'luca', cat: 'Network & Wi-Fi', building: 'Block C', room: 'C210', impact: 'Low', created: 6.5,
    title: 'Network port at desk 14 not working',
    desc: 'The wall network port at desk 14 gives no connection. The cable was tested on another port and works there.',
    votes: [],
    steps: [['Acknowledged', 6, null], ['In Progress', 5, null], ['Resolved', 3.8, 'Port re-patched in the cabinet.']],
  },
];

// "N days ago" as the UTC text format SQLite uses.
function daysAgo(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
}

const seed = transaction(() => {
  // Children before parents, so foreign keys are never left dangling.
  for (const table of ['user_badges', 'point_events', 'status_history', 'upvotes', 'issues', 'categories', 'users']) {
    db.exec(`DELETE FROM ${table}`);
  }

  const insertCategory = db.prepare('INSERT INTO categories (name, icon) VALUES (?, ?)');
  const categoryIds = {};
  for (const [name, icon] of CATEGORIES) {
    categoryIds[name] = Number(insertCategory.run(name, icon).lastInsertRowid);
  }

  const insertUser = db.prepare('INSERT INTO users (name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)');
  const userIds = {};
  for (const user of [ADMIN, ...STUDENTS]) {
    const hash = bcrypt.hashSync(user.password, 10);
    userIds[user.key] = Number(insertUser.run(user.name, user.email, hash, user.role, daysAgo(30)).lastInsertRowid);
  }

  const insertIssue = db.prepare(
    `INSERT INTO issues (reporter_id, category_id, title, description, building, room, location_note, impact, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const insertHistory = db.prepare(
    'INSERT INTO status_history (issue_id, old_status, new_status, changed_by, note, changed_at) VALUES (?, ?, ?, ?, ?, ?)'
  );
  const insertUpvote = db.prepare('INSERT INTO upvotes (user_id, issue_id, created_at) VALUES (?, ?, ?)');

  for (const item of ISSUES) {
    const reporter = userIds[item.by];
    const createdAt = daysAgo(item.created);
    const finalStatus = item.steps.length ? item.steps[item.steps.length - 1][0] : 'Reported';
    const updatedAt = item.steps.length ? daysAgo(item.steps[item.steps.length - 1][1]) : createdAt;

    const issueId = Number(
      insertIssue.run(
        reporter, categoryIds[item.cat], item.title, item.desc, item.building,
        item.room || null, item.note || null, item.impact, finalStatus, createdAt, updatedAt
      ).lastInsertRowid
    );

    insertHistory.run(issueId, null, 'Reported', reporter, null, createdAt);
    award(reporter, POINTS.REPORT_SUBMITTED, 'Report submitted', issueId, createdAt);

    // Spread the upvotes over the hours after the report was made.
    item.votes.forEach((voterKey, index) => {
      const votedAt = daysAgo(Math.max(item.created - (index + 1) * 0.12, 0.01));
      insertUpvote.run(userIds[voterKey], issueId, votedAt);
      award(userIds[voterKey], POINTS.UPVOTE_GIVEN, 'You upvoted an issue', issueId, votedAt);
      award(reporter, POINTS.UPVOTE_RECEIVED, 'Someone upvoted your report', issueId, votedAt);
    });

    let previous = 'Reported';
    for (const [status, when, note] of item.steps) {
      const changedAt = daysAgo(when);
      insertHistory.run(issueId, previous, status, userIds.admin, note, changedAt);
      if (status === 'Acknowledged') award(reporter, POINTS.REPORT_ACKNOWLEDGED, 'Your report was acknowledged', issueId, changedAt);
      if (status === 'Resolved') award(reporter, POINTS.REPORT_RESOLVED, 'Your report was resolved', issueId, changedAt);
      previous = status;
    }
  }

  for (const student of STUDENTS) checkBadges(userIds[student.key]);
});

// Used by the server on its very first start, when the database has no users yet.
function seedIfEmpty() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM users').get();
  if (n > 0) return false;
  seed();
  return true;
}

module.exports = { seed, seedIfEmpty, ADMIN, STUDENTS };

if (require.main === module) {
  seed();
  console.log('Demo data loaded:');
  for (const table of ['users', 'categories', 'issues', 'upvotes', 'status_history', 'point_events', 'user_badges']) {
    console.log(`  ${table.padEnd(15)} ${db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n} rows`);
  }
  console.log(`\nAdmin:    ${ADMIN.email} / ${ADMIN.password}`);
  console.log(`Students: ${STUDENTS.map((s) => s.key).join(', ')} @campus.test / ${STUDENTS[0].password}`);
}

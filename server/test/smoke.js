// End-to-end check of the API. Run with:  npm run smoke
// It starts its own copy of the server on port 4100 with a separate test
// database, so it never touches the real demo data.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = 4100;
const BASE = `http://127.0.0.1:${PORT}`;
const TEST_DB = path.join(__dirname, 'smoke-test.db');
process.env.DB_PATH = TEST_DB; // so this script can also open the same database directly

let passed = 0;
let failed = 0;
function check(name, condition, detail = '') {
  if (condition) {
    passed++;
    console.log(`PASS  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name} ${detail}`);
  }
}

function removeTestDb() {
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(TEST_DB + suffix, { force: true });
}

let server;
async function startServer() {
  server = spawn(process.execPath, [path.join(__dirname, '..', 'src', 'index.js')], {
    env: { ...process.env, PORT: String(PORT), DB_PATH: TEST_DB },
    stdio: ['ignore', 'ignore', 'inherit'], // show server errors in this terminal
  });
  // Slow laptops (and antivirus scanning node_modules) can take a while on the first start.
  for (let i = 0; i < 300; i++) {
    try {
      const res = await fetch(`${BASE}/health`);
      if (res.ok) return;
    } catch (err) {
      /* not up yet */
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error('Server did not start within 60 seconds. Run "npm run server" to see why.');
}
function stopServer() {
  return new Promise((resolve) => {
    if (!server) return resolve();
    server.once('exit', resolve);
    server.kill();
  });
}

async function api(method, url, { token, body, form } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  let payload;
  if (form) payload = form;
  else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(BASE + url, { method, headers, body: payload });
  let json = null;
  try {
    json = await res.json();
  } catch (err) {
    /* no JSON body */
  }
  return { status: res.status, json };
}

const login = async (email, password) => (await api('POST', '/auth/login', { body: { email, password } })).json;
const pointsOf = async (token) => (await api('GET', '/me', { token })).json.points;

// A valid 1x1 PNG, used to test photo upload.
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

async function main() {
  removeTestDb();
  await startServer();

  // ----- accounts -----
  check('server is healthy', (await api('GET', '/health')).json.ok === true);

  const reg = await api('POST', '/auth/register', { body: { name: 'Test Reporter', email: 'Reporter@Campus.test', password: 'Password1!' } });
  check('register creates a student and returns a token', reg.status === 201 && !!reg.json.token && reg.json.user.role === 'student');
  check('register never returns the password hash', reg.json.user.password_hash === undefined);
  const reporter = reg.json.token;

  check('duplicate email is rejected (409)', (await api('POST', '/auth/register', { body: { name: 'Copy', email: 'reporter@campus.test', password: 'Password1!' } })).status === 409);
  check('short password is rejected (400)', (await api('POST', '/auth/register', { body: { name: 'Shorty', email: 'short@campus.test', password: '123' } })).status === 400);
  check('wrong password is rejected (401)', (await api('POST', '/auth/login', { body: { email: 'reporter@campus.test', password: 'nope-nope' } })).status === 401);
  check('login works with the right password', !!(await login('reporter@campus.test', 'Password1!')).token);
  check('feed needs a login (401)', (await api('GET', '/issues')).status === 401);
  check('a made-up token is rejected (401)', (await api('GET', '/issues', { token: 'abc.def.ghi' })).status === 401);

  const voter = (await login('ben@campus.test', 'Student123!')).token;
  const admin = (await login('admin@campus.test', 'Admin123!')).token;
  check('seeded student and admin can log in', !!voter && !!admin);

  // ----- reading -----
  const feed = await api('GET', '/issues', { token: reporter });
  check('feed returns the 20 seeded reports', feed.status === 200 && feed.json.length === 20, `got ${feed.json && feed.json.length}`);
  const firstResolved = feed.json.findIndex((i) => i.status === 'Resolved');
  const openSorted = feed.json.slice(0, firstResolved).every((issue, idx, arr) => idx === 0 || arr[idx - 1].upvotes >= issue.upvotes);
  check('trending puts open reports first, most upvoted on top', firstResolved > 0 && openSorted && feed.json.slice(firstResolved).every((i) => i.status === 'Resolved'));
  check('every report has location, category, description and status', feed.json.every((i) => i.building && i.category.name && i.description && i.status));

  const meta = await api('GET', '/meta', { token: reporter });
  const avCategory = meta.json.categories.find((c) => c.name === 'Projector & AV');
  check('meta lists 9 categories and the buildings', meta.json.categories.length === 9 && meta.json.buildings.includes('Block A'));
  const departments = meta.json.departments || [];
  const itDept = departments.find((d) => d.name === 'IT Services');
  check('meta lists 5 departments and every category belongs to one', departments.length === 5 && meta.json.categories.every((c) => departments.some((d) => d.id === c.department_id)));
  check('every report carries its department', feed.json.every((i) => i.department && i.department.name));
  const itFeed = await api('GET', `/issues?department=${itDept.id}`, { token: reporter });
  check('department filter returns only that department', itFeed.status === 200 && itFeed.json.length > 0 && itFeed.json.length < 20 && itFeed.json.every((i) => i.department.id === itDept.id));
  const deptTotal = (await Promise.all(departments.map((d) => api('GET', `/issues?department=${d.id}`, { token: reporter })))).reduce((n, r) => n + r.json.length, 0);
  check('the departments together cover every report exactly once', deptTotal === 20);
  const blockA = await api('GET', `/issues?building=${encodeURIComponent('Block A')}`, { token: reporter });
  check('building filter returns only that building', blockA.status === 200 && blockA.json.every((i) => i.building === 'Block A'));
  check('department and building filters combine', (await api('GET', `/issues?department=${itDept.id}&building=${encodeURIComponent('Block A')}`, { token: reporter })).json.every((i) => i.building === 'Block A' && i.department.id === itDept.id));
  check('a non-number department filter is refused (400)', (await api('GET', '/issues?department=abc', { token: reporter })).status === 400);
  check('an unknown building filter is refused (400)', (await api('GET', '/issues?building=Hogwarts', { token: reporter })).status === 400);

  // ----- reporting -----
  const newIssue = {
    category_id: avCategory.id,
    title: 'Projector will not switch on',
    description: 'The projector in this room shows no light at all when switched on.',
    building: 'Block A',
    room: 'A105',
    impact: 'High',
  };
  const created = await api('POST', '/issues', { token: reporter, body: newIssue });
  check('student can submit a report (201)', created.status === 201 && created.json.issue.status === 'Reported');
  const issueId = created.json.issue.id;
  check('first report pays +5 points', created.json.rewards.some((r) => r.type === 'points' && r.amount === 5));
  check('first report unlocks the First Report badge', created.json.rewards.some((r) => r.type === 'badge' && r.code === 'FIRST_REPORT'));
  check('report with a missing building is rejected (400)', (await api('POST', '/issues', { token: reporter, body: { ...newIssue, building: undefined } })).status === 400);
  check('report with a made-up building is rejected (400)', (await api('POST', '/issues', { token: reporter, body: { ...newIssue, building: 'Hogwarts' } })).status === 400);
  check('report with a too-short description is rejected (400)', (await api('POST', '/issues', { token: reporter, body: { ...newIssue, description: 'broken' } })).status === 400);
  check('admin account cannot file reports (403)', (await api('POST', '/issues', { token: admin, body: newIssue })).status === 403);

  const seenByOther = await api('GET', '/issues?sort=newest', { token: voter });
  check('another student sees the new report', seenByOther.json[0].id === issueId && seenByOther.json[0].isMine === false);

  const similar = await api('GET', `/issues/similar?building=${encodeURIComponent('Block A')}&category_id=${avCategory.id}`, { token: voter });
  check('duplicate check finds the open report at the same place', similar.json.some((i) => i.id === issueId));

  const search = await api('GET', '/issues?q=projector', { token: voter });
  check('search finds reports by title', search.json.length >= 2 && search.json.every((i) => /projector/i.test(i.title + i.description)));
  check('search text is never run as SQL', (await api('GET', `/issues?q=${encodeURIComponent("'; DROP TABLE issues; --")}`, { token: voter })).status === 200 && (await api('GET', '/issues', { token: voter })).json.length === 21);
  check('unknown status filter is rejected (400)', (await api('GET', '/issues?status=Done', { token: voter })).status === 400);
  check('mine filter only returns my reports', (await api('GET', '/issues?mine=1', { token: reporter })).json.every((i) => i.isMine));

  // ----- photo upload -----
  const photoForm = new FormData();
  for (const [key, value] of Object.entries({ ...newIssue, title: 'Cracked socket cover', room: 'A106', category_id: String(avCategory.id) })) photoForm.append(key, value);
  photoForm.append('photo', new Blob([TINY_PNG], { type: 'image/png' }), 'photo.png');
  const withPhoto = await api('POST', '/issues', { token: reporter, form: photoForm });
  check('report with a photo is stored', withPhoto.status === 201 && /^\/uploads\/.+\.png$/.test(withPhoto.json.issue.photo_url || ''));
  check('the stored photo can be downloaded', (await fetch(BASE + withPhoto.json.issue.photo_url)).status === 200);
  const badForm = new FormData();
  for (const [key, value] of Object.entries({ ...newIssue, category_id: String(avCategory.id) })) badForm.append(key, value);
  badForm.append('photo', new Blob(['not an image'], { type: 'text/plain' }), 'notes.txt');
  check('a non-image upload is rejected (400)', (await api('POST', '/issues', { token: reporter, form: badForm })).status === 400);

  // ----- upvoting -----
  const voterBefore = await pointsOf(voter);
  const up1 = await api('POST', `/issues/${issueId}/upvote`, { token: voter });
  check('another student can upvote (201)', up1.status === 201 && up1.json.issue.upvotes === 1 && up1.json.issue.hasUpvoted === true);
  const up2 = await api('POST', `/issues/${issueId}/upvote`, { token: voter });
  check('upvoting the same report again is blocked (409)', up2.status === 409);
  check('the count stays at 1 after the blocked repeat', (await api('GET', `/issues/${issueId}`, { token: voter })).json.upvotes === 1);
  check('you cannot upvote your own report (403)', (await api('POST', `/issues/${issueId}/upvote`, { token: reporter })).status === 403);
  check('admin cannot upvote (403)', (await api('POST', `/issues/${issueId}/upvote`, { token: admin })).status === 403);
  check('upvoting a missing report gives 404', (await api('POST', '/issues/99999/upvote', { token: voter })).status === 404);
  check('reporter earned +2 for the upvote (5 + 5 + 2 = 12)', (await pointsOf(reporter)) === 12);
  check('voter earned +1 for upvoting', (await pointsOf(voter)) === voterBefore + 1);

  const withdrawn = await api('DELETE', `/issues/${issueId}/upvote`, { token: voter });
  check('an upvote can be withdrawn', withdrawn.status === 200 && withdrawn.json.issue.upvotes === 0);
  check('withdrawing takes the points back from both students', (await pointsOf(reporter)) === 10 && (await pointsOf(voter)) === voterBefore);
  check('withdrawing twice gives 404', (await api('DELETE', `/issues/${issueId}/upvote`, { token: voter })).status === 404);
  check('the student can upvote again after withdrawing', (await api('POST', `/issues/${issueId}/upvote`, { token: voter })).status === 201);

  // ----- the database itself enforces the rules -----
  const { db } = require('../src/db');
  const voterId = db.prepare("SELECT id FROM users WHERE email = 'ben@campus.test'").get().id;
  let duplicateBlocked = false;
  try {
    db.prepare('INSERT INTO upvotes (user_id, issue_id) VALUES (?, ?)').run(voterId, issueId);
  } catch (err) {
    duplicateBlocked = /UNIQUE|constraint/i.test(String(err.message));
  }
  check('database refuses a second upvote row (primary key)', duplicateBlocked);
  let badStatusBlocked = false;
  try {
    db.prepare("UPDATE issues SET status = 'Done' WHERE id = ?").run(issueId);
  } catch (err) {
    badStatusBlocked = /CHECK|constraint/i.test(String(err.message));
  }
  check('database refuses an unknown status (CHECK)', badStatusBlocked);
  let orphanBlocked = false;
  try {
    db.prepare('INSERT INTO upvotes (user_id, issue_id) VALUES (?, ?)').run(voterId, 99999);
  } catch (err) {
    orphanBlocked = /FOREIGN|constraint/i.test(String(err.message));
  }
  check('database refuses an upvote for a missing report (foreign key)', orphanBlocked);
  const hash = db.prepare("SELECT password_hash FROM users WHERE email = 'reporter@campus.test'").get().password_hash;
  check('passwords are stored as bcrypt hashes, not text', hash.startsWith('$2') && !hash.includes('Password1!'));

  // ----- admin status changes -----
  const patch = (token, status, note) => api('PATCH', `/admin/issues/${issueId}/status`, { token, body: { status, note } });
  check('a student cannot change status (403)', (await patch(voter, 'Acknowledged')).status === 403);
  check('status change needs a login (401)', (await patch(undefined, 'Acknowledged')).status === 401);
  check('a student cannot read admin stats (403)', (await api('GET', '/admin/stats', { token: voter })).status === 403);
  check('admin cannot skip a step (400)', (await patch(admin, 'In Progress')).status === 400);
  check('admin cannot jump straight to Resolved (400)', (await patch(admin, 'Resolved')).status === 400);
  const ack = await patch(admin, 'Acknowledged', 'Technician booked for Thursday.');
  check('admin moves Reported -> Acknowledged', ack.status === 200 && ack.json.issue.status === 'Acknowledged');
  check('admin cannot move a report backwards (400)', (await patch(admin, 'Reported')).status === 400);
  check('reporter gets +15 when acknowledged (12 + 15 = 27)', (await pointsOf(reporter)) === 27);
  check('admin moves Acknowledged -> In Progress', (await patch(admin, 'In Progress')).json.issue.status === 'In Progress');
  check('admin moves In Progress -> Resolved', (await patch(admin, 'Resolved', 'Lamp replaced.')).json.issue.status === 'Resolved');
  check('a resolved report cannot be advanced again (400)', (await patch(admin, 'Resolved')).status === 400);
  check('reporter gets +25 when resolved (27 + 25 = 52)', (await pointsOf(reporter)) === 52);

  const detail = await api('GET', `/issues/${issueId}`, { token: reporter });
  check('the timeline records all four steps in order', detail.json.history.map((h) => h.new_status).join('>') === 'Reported>Acknowledged>In Progress>Resolved');
  check("the admin's note shows in the timeline", detail.json.history.some((h) => h.note === 'Technician booked for Thursday.'));
  check('a resolved report cannot be upvoted (400)', (await api('POST', `/issues/${issueId}/upvote`, { token: (await login('chloe@campus.test', 'Student123!')).token })).status === 400);

  // ----- gamification -----
  const me = await api('GET', '/me', { token: reporter });
  check('52 points puts the reporter on level Spotter', me.json.level.name === 'Spotter' && me.json.points === 52);
  check('profile shows First Report as earned and 6 badges still locked', me.json.badges.filter((b) => b.earned).map((b) => b.code).join() === 'FIRST_REPORT' && me.json.badges.length === 7);
  check('the points ledger adds up to the score', me.json.points === db.prepare('SELECT SUM(amount) AS s FROM point_events WHERE user_id = ?').get(me.json.user.id).s);
  const board = await api('GET', '/leaderboard?period=all', { token: reporter });
  check('leaderboard is sorted, students only, and includes me', board.json.top.every((row, i, arr) => i === 0 || arr[i - 1].points >= row.points) && !board.json.top.some((row) => row.name === 'Campus Admin') && board.json.me.points === 52);
  check('weekly leaderboard works', (await api('GET', '/leaderboard?period=week', { token: reporter })).json.period === 'week');
  const health = await api('GET', '/campus-health', { token: reporter });
  check('campus health counts recent fixes (8 seeded + 1 new)', health.json.resolvedLast30Days === 9 && health.json.goal === 20);
  const stats = await api('GET', '/admin/stats', { token: admin });
  check('admin stats count open problems per department', (stats.json.byDepartment || []).length === 5 && stats.json.byDepartment.reduce((n, d) => n + d.open, 0) === stats.json.open);
  check('admin stats add up', stats.status === 200 && stats.json.total === 22 && stats.json.byStatus.Resolved === 9 && stats.json.topOpen.length === 3);
  const sneaky = await api('POST', '/issues', { token: voter, body: { ...newIssue, title: 'Projector lamp is dead again', department_id: 999, department: 'Cleaning Services' } });
  check('a student cannot choose the department: it follows the category', sneaky.status === 201 && sneaky.json.issue.department.name === 'IT Services');
  check('unknown route gives a JSON 404', (await api('GET', '/nope', { token: reporter })).status === 404);

  // ----- comments -----
  const chloe = (await login('chloe@campus.test', 'Student123!')).token;
  const c1 = await api('POST', `/issues/${issueId}/comments`, { token: chloe, body: { body: 'Still flickering in the morning lecture.' } });
  check('a student can comment on a report (201)', c1.status === 201 && c1.json.comments.length === 1 && c1.json.comments[0].isMine === true);
  const c2 = await api('POST', `/issues/${issueId}/comments`, { token: admin, body: { body: 'Thanks, the technician will check it again.' } });
  check('admin replies show the staff role', c2.status === 201 && c2.json.comments[1].user.role === 'admin');
  check('an empty comment is rejected (400)', (await api('POST', `/issues/${issueId}/comments`, { token: chloe, body: { body: ' ' } })).status === 400);
  check('a comment over 500 characters is rejected (400)', (await api('POST', `/issues/${issueId}/comments`, { token: chloe, body: { body: 'x'.repeat(501) } })).status === 400);
  check('commenting on a missing report gives 404', (await api('POST', '/issues/99999/comments', { token: chloe, body: { body: 'Hello there' } })).status === 404);
  check('commenting needs a login (401)', (await api('POST', `/issues/${issueId}/comments`, { body: { body: 'Hello there' } })).status === 401);
  const withComments = await api('GET', `/issues/${issueId}`, { token: reporter });
  check('comments show on the report, oldest first', withComments.json.comments.map((m) => m.user.role).join() === 'student,admin' && withComments.json.comments[0].isMine === false);
  check('the feed shows the comment count', (await api('GET', '/issues?mine=1', { token: reporter })).json.find((i) => i.id === issueId).commentCount === 2);
  check('comments earn no points (reporter still on 52)', (await pointsOf(reporter)) === 52);

  // ----- photo of the fix -----
  const inProgress = (await api('GET', `/issues?status=${encodeURIComponent('In Progress')}`, { token: admin })).json[0];
  const ackForm = new FormData();
  ackForm.append('status', 'Resolved');
  ackForm.append('photo', new Blob([TINY_PNG], { type: 'image/png' }), 'fix.png');
  const earlyPhoto = await api('PATCH', `/admin/issues/${(await api('GET', '/issues?status=Reported', { token: admin })).json[0].id}/status`, {
    token: admin,
    form: (() => { const f = new FormData(); f.append('status', 'Acknowledged'); f.append('photo', new Blob([TINY_PNG], { type: 'image/png' }), 'fix.png'); return f; })(),
  });
  check('a fix photo is refused before the Resolved step (400)', earlyPhoto.status === 400);
  const resolvedWithPhoto = await api('PATCH', `/admin/issues/${inProgress.id}/status`, { token: admin, form: ackForm });
  check('admin can resolve with a photo of the fix', resolvedWithPhoto.status === 200 && resolvedWithPhoto.json.issue.status === 'Resolved');
  const fixed = await api('GET', `/issues/${inProgress.id}`, { token: reporter });
  const fixPhoto = fixed.json.history.find((h) => h.new_status === 'Resolved').photo_path;
  check('the fix photo is saved on the Resolved step', /^\/uploads\/.+\.png$/.test(fixPhoto || ''));
  check('the fix photo can be downloaded', (await fetch(BASE + fixPhoto)).status === 200);
  check('a student cannot upload a fix photo (403)', (await api('PATCH', `/admin/issues/${inProgress.id}/status`, { token: chloe, body: { status: 'Resolved' } })).status === 403);

  // ----- persistence -----
  db.close();
  await stopServer();
  await startServer();
  const again = await login('reporter@campus.test', 'Password1!');
  const afterRestart = await api('GET', `/issues/${issueId}`, { token: again.token });
  check('data survives a server restart', afterRestart.status === 200 && afterRestart.json.status === 'Resolved' && afterRestart.json.upvotes === 1);
  check('points survive a server restart', (await pointsOf(again.token)) === 52);

  // ----- an older database gets the new column without losing data -----
  const { spawnSync } = require('child_process');
  const OLD_DB = path.join(__dirname, 'smoke-old.db');
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(OLD_DB + suffix, { force: true });
  const oldSetup = `
    const { DatabaseSync } = require('node:sqlite');
    const d = new DatabaseSync(${JSON.stringify(OLD_DB)});
    d.exec("CREATE TABLE status_history (id INTEGER PRIMARY KEY, issue_id INTEGER NOT NULL, old_status TEXT, new_status TEXT NOT NULL, changed_by INTEGER NOT NULL, note TEXT, changed_at TEXT NOT NULL DEFAULT (datetime('now')))");
    d.exec("INSERT INTO status_history (issue_id, new_status, changed_by) VALUES (1, 'Reported', 1)");
    d.exec("CREATE TABLE categories (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE, icon TEXT NOT NULL)");
    d.exec("INSERT INTO categories (name, icon) VALUES ('Safety', 'shield-alert'), ('Something new', 'help')");
    d.close();`;
  spawnSync(process.execPath, ['-e', oldSetup], { stdio: 'ignore' });
  const migrate = spawnSync(process.execPath, ['-e', `const { db } = require(${JSON.stringify(path.join(__dirname, '..', 'src', 'db.js'))}); const cols = db.prepare('PRAGMA table_info(status_history)').all().map((c) => c.name); const rows = db.prepare('SELECT COUNT(*) AS n FROM status_history').get().n; const cats = db.prepare('SELECT c.name, d.name AS dept FROM categories c LEFT JOIN departments d ON d.id = c.department_id ORDER BY c.id').all(); console.log(JSON.stringify({ cols, rows, cats })); db.close();`], { env: { ...process.env, DB_PATH: OLD_DB }, encoding: 'utf8' });
  let migrated = null;
  try { migrated = JSON.parse(migrate.stdout.trim().split('\n').pop()); } catch (err) { /* reported below */ }
  check('an older database gains the photo column and keeps its rows', !!migrated && migrated.cols.includes('photo_path') && migrated.rows === 1);
  check('an older database gains departments for its categories', !!migrated && JSON.stringify(migrated.cats) === JSON.stringify([{ name: 'Safety', dept: 'Health & Safety' }, { name: 'Something new', dept: 'Student Services' }]));
  for (const suffix of ['', '-wal', '-shm']) fs.rmSync(OLD_DB + suffix, { force: true });

  await stopServer();
  removeTestDb();
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch(async (err) => {
  console.error('Smoke test crashed:', err);
  await stopServer();
  removeTestDb();
  process.exit(1);
});

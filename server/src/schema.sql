-- Campus Fix database schema (SQLite).
-- The important rules live here, in the database itself, so no bug in the
-- app or the API can break them:
--   * one upvote per user per issue  -> composite PRIMARY KEY on upvotes
--   * only the four allowed statuses -> CHECK on issues.status
--   * no orphan rows                 -> FOREIGN KEYs everywhere

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL DEFAULT 'student' CHECK (role IN ('student','admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS issues (
  id            INTEGER PRIMARY KEY,
  reporter_id   INTEGER NOT NULL REFERENCES users(id),
  category_id   INTEGER NOT NULL REFERENCES categories(id),
  title         TEXT    NOT NULL,
  description   TEXT    NOT NULL,
  building      TEXT    NOT NULL,
  room          TEXT,
  location_note TEXT,
  impact        TEXT    NOT NULL DEFAULT 'Medium' CHECK (impact IN ('Low','Medium','High')),
  photo_path    TEXT,
  status        TEXT    NOT NULL DEFAULT 'Reported'
                CHECK (status IN ('Reported','Acknowledged','In Progress','Resolved')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS upvotes (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  issue_id   INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, issue_id)
);

CREATE TABLE IF NOT EXISTS status_history (
  id         INTEGER PRIMARY KEY,
  issue_id   INTEGER NOT NULL REFERENCES issues(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT    NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  note       TEXT,
  changed_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Points ledger. A user's score is never stored; it is always SUM(amount).
-- Taking points back (a withdrawn upvote) is a new negative row, never an edit.
CREATE TABLE IF NOT EXISTS point_events (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  amount     INTEGER NOT NULL,
  reason     TEXT    NOT NULL,
  issue_id   INTEGER REFERENCES issues(id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id    INTEGER NOT NULL REFERENCES users(id),
  badge_code TEXT    NOT NULL,
  earned_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, badge_code)
);

CREATE INDEX IF NOT EXISTS idx_issues_status   ON issues(status);
CREATE INDEX IF NOT EXISTS idx_issues_category ON issues(category_id);
CREATE INDEX IF NOT EXISTS idx_issues_reporter ON issues(reporter_id);
CREATE INDEX IF NOT EXISTS idx_upvotes_issue   ON upvotes(issue_id);
CREATE INDEX IF NOT EXISTS idx_points_user     ON point_events(user_id);
CREATE INDEX IF NOT EXISTS idx_history_issue   ON status_history(issue_id);

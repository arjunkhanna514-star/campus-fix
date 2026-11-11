// Opens the SQLite database file and applies the schema.
// Every other file gets its database access from here.

const fs = require('fs');
const path = require('path');

const { DATA_DIR } = require('./config');

const DB_PATH = process.env.DB_PATH || path.join(DATA_DIR, 'campus.db');

// better-sqlite3 is the main driver. If its native part cannot load on a
// machine, we fall back to the SQLite that ships inside Node itself.
// Both expose the same prepare / run / get / all / exec calls used in this project.
function openDatabase(file) {
  try {
    if (process.env.SQLITE_DRIVER === 'node') throw new Error('built-in driver requested');
    const BetterSqlite3 = require('better-sqlite3');
    return { db: new BetterSqlite3(file), driver: 'better-sqlite3' };
  } catch (err) {
    const { DatabaseSync } = require('node:sqlite');
    return { db: new DatabaseSync(file), driver: 'node:sqlite' };
  }
}

const { db, driver } = openDatabase(DB_PATH);

// Foreign keys are off by default in SQLite, so switch them on for every connection.
// WAL mode lets the seed script write while the server is running.
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');
db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));

// Small migration: databases created before the "photo of the fix" feature
// have no photo_path column on status_history. Add it without losing any data.
const historyColumns = db.prepare('PRAGMA table_info(status_history)').all().map((column) => column.name);
if (!historyColumns.includes('photo_path')) {
  db.exec('ALTER TABLE status_history ADD COLUMN photo_path TEXT');
}

// Second migration: categories gained a department. Add the column, then make
// sure every department exists and every category points at its department.
const categoryColumns = db.prepare('PRAGMA table_info(categories)').all().map((column) => column.name);
if (!categoryColumns.includes('department_id')) {
  db.exec('ALTER TABLE categories ADD COLUMN department_id INTEGER REFERENCES departments(id)');
}
function syncDepartments() {
  const { DEPARTMENTS } = require('./config');
  const addDepartment = db.prepare('INSERT OR IGNORE INTO departments (name, icon) VALUES (?, ?)');
  const link = db.prepare('UPDATE categories SET department_id = (SELECT id FROM departments WHERE name = ?) WHERE name = ?');
  for (const d of DEPARTMENTS) {
    addDepartment.run(d.name, d.icon);
    for (const category of d.categories) link.run(d.name, category);
  }
  // Anything not listed goes to the last department (Student Services).
  db.prepare('UPDATE categories SET department_id = (SELECT id FROM departments WHERE name = ?) WHERE department_id IS NULL').run(
    DEPARTMENTS[DEPARTMENTS.length - 1].name
  );
}
syncDepartments();

// Wraps a function so that all of its database writes succeed together or
// not at all. If anything throws, every change made inside is rolled back.
let insideTransaction = false;
function transaction(fn) {
  return (...args) => {
    if (insideTransaction) return fn(...args);
    db.exec('BEGIN IMMEDIATE');
    insideTransaction = true;
    try {
      const result = fn(...args);
      db.exec('COMMIT');
      return result;
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    } finally {
      insideTransaction = false;
    }
  };
}

module.exports = { db, transaction, driver, DB_PATH, syncDepartments };

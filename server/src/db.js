// Opens the SQLite database file and applies the schema.
// Every other file gets its database access from here.

const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'campus.db');

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

module.exports = { db, transaction, driver, DB_PATH };

// Register and log in. Passwords are stored only as bcrypt hashes.

const express = require('express');
const bcrypt = require('bcryptjs');
const { db } = require('../db');
const { signToken } = require('../middleware/auth');
const { HttpError } = require('../middleware/errors');
const { registerSchema, loginSchema, parse } = require('../validation');

const router = express.Router();

// Never send the password hash back to the app.
function publicUser(row) {
  return { id: row.id, name: row.name, email: row.email, role: row.role };
}

router.post('/register', (req, res) => {
  const data = parse(registerSchema, req.body);

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(data.email);
  if (existing) throw new HttpError(409, 'An account with this email already exists.');

  const passwordHash = bcrypt.hashSync(data.password, 10);
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, 'student')")
    .run(data.name, data.email, passwordHash);

  const user = publicUser({ id: Number(info.lastInsertRowid), name: data.name, email: data.email, role: 'student' });
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', (req, res) => {
  const data = parse(loginSchema, req.body);

  const row = db.prepare('SELECT * FROM users WHERE email = ?').get(data.email);
  // Same message for "no such email" and "wrong password", so nobody can
  // use this endpoint to find out which emails have accounts.
  if (!row || !bcrypt.compareSync(data.password, row.password_hash)) {
    throw new HttpError(401, 'Email or password is incorrect.');
  }

  const user = publicUser(row);
  res.json({ token: signToken(user), user });
});

module.exports = router;

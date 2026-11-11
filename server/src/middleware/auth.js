// Checks who is making a request.
// requireAuth: a valid login token is needed.
// requireAdmin: the logged-in user must also have the admin role.

const jwt = require('jsonwebtoken');
const { db } = require('../db');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config');
const { HttpError } = require('./errors');

function signToken(user) {
  return jwt.sign({ sub: String(user.id), role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new HttpError(401, 'Please log in first.');

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new HttpError(401, 'Your session has expired. Please log in again.');
  }

  // Read the user fresh from the database, so a deleted account or a changed
  // role takes effect immediately instead of trusting the old token.
  const user = db.prepare('SELECT id, name, email, role FROM users WHERE id = ?').get(Number(payload.sub));
  if (!user) throw new HttpError(401, 'This account no longer exists. Please log in again.');

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    throw new HttpError(403, 'Only an administrator can do this.');
  }
  next();
}

module.exports = { signToken, requireAuth, requireAdmin };

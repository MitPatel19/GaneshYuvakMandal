'use strict';
const bcrypt = require('bcryptjs');
const { db } = require('./db');

/* Very small in-memory throttle: this app runs as a single instance and the
   goal is only to stop someone guessing the mandal PIN from a phone. */
const attempts = new Map();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

function attemptKey(req) {
  return req.ip || req.headers['x-forwarded-for'] || 'unknown';
}

function isLockedOut(req) {
  const rec = attempts.get(attemptKey(req));
  if (!rec) return false;
  if (Date.now() - rec.first > WINDOW_MS) {
    attempts.delete(attemptKey(req));
    return false;
  }
  return rec.count >= MAX_ATTEMPTS;
}

function noteFailure(req) {
  const key = attemptKey(req);
  const rec = attempts.get(key);
  if (!rec || Date.now() - rec.first > WINDOW_MS) {
    attempts.set(key, { count: 1, first: Date.now() });
  } else {
    rec.count += 1;
  }
}

function clearFailures(req) {
  attempts.delete(attemptKey(req));
}

function verifyUser(username, password) {
  if (!username || !password) return null;
  const user = db
    .prepare('SELECT * FROM users WHERE username = ?')
    .get(String(username).trim().toLowerCase());
  if (!user) return null;
  if (!bcrypt.compareSync(String(password), user.password_hash)) return null;
  return { id: user.id, username: user.username, display_name: user.display_name, role: user.role };
}

function setPassword(userId, newPassword) {
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
    bcrypt.hashSync(String(newPassword), 10),
    userId
  );
}

/** Attach req.user from the signed cookie session. */
function loadUser(req, _res, next) {
  const sessUser = req.session && req.session.user;
  if (sessUser && sessUser.id) {
    const fresh = db
      .prepare('SELECT id, username, display_name, role FROM users WHERE id = ?')
      .get(sessUser.id);
    req.user = fresh || null;
    if (!fresh) req.session = null;
  } else {
    req.user = null;
  }
  next();
}

/** Gate for every admin page. Remembers where the user was headed. */
function requireLogin(req, res, next) {
  if (req.user) return next();
  if (req.method === 'GET' && req.accepts('html')) {
    const back = encodeURIComponent(req.originalUrl || '/');
    return res.redirect(`/login?next=${back}`);
  }
  return res.status(401).send('Login required');
}

module.exports = {
  verifyUser,
  setPassword,
  loadUser,
  requireLogin,
  isLockedOut,
  noteFailure,
  clearFailures,
};

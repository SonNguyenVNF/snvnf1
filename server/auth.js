'use strict';
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function isRateLimited(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() > entry.resetAt) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_ATTEMPTS;
}

function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

function recordSuccess(ip) {
  attempts.delete(ip);
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.redirect('/admin/login');
}

function ensureCsrfToken(req) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(24).toString('hex');
  }
  return req.session.csrfToken;
}

function csrfOk(req) {
  const token = req.body && req.body._csrf;
  return Boolean(token) && token === req.session.csrfToken;
}

function verifyCsrf(req, res, next) {
  if (!csrfOk(req)) {
    return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
  }
  return next();
}

async function checkPassword(plain) {
  const hash = process.env.ADMIN_PASSWORD_HASH;
  if (!hash) {
    throw new Error('ADMIN_PASSWORD_HASH chưa được cấu hình trong .env');
  }
  return bcrypt.compare(plain, hash);
}

module.exports = {
  isRateLimited,
  recordFailure,
  recordSuccess,
  requireAdmin,
  ensureCsrfToken,
  csrfOk,
  verifyCsrf,
  checkPassword
};

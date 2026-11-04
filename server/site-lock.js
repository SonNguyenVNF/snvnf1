'use strict';
const crypto = require('crypto');
const { readJSON, writeJSON } = require('./data-store');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

// The password itself stays in the server settings (SITE_LOCK_PASSWORD) and is never shown or
// stored by the site. The on/off switch is in /admin/khoa-website and kept in data/site-lock.json.
const hasPassword = () => !!process.env.SITE_LOCK_PASSWORD;

let cache = { at: 0, on: true };
function isEnabled() {
  const now = Date.now();
  if (now - cache.at < 2000) return cache.on;   // re-read every 2s, so a switch reaches every app process quickly
  let on = true;
  try { on = readJSON('site-lock').enabled !== false; } catch (e) { on = true; }
  cache = { at: now, on };
  return on;
}

function setEnabled(on) {
  writeJSON('site-lock', { enabled: !!on });
  cache = { at: Date.now(), on: !!on };
}

function siteLockMiddleware() {
  const user = process.env.SITE_LOCK_USER || 'synetic';

  return (req, res, next) => {
    const password = process.env.SITE_LOCK_PASSWORD;
    if (!password || !isEnabled()) return next();

    const header = req.headers.authorization || '';
    const [scheme, encoded] = header.split(' ');
    if (scheme === 'Basic' && encoded) {
      const decoded = Buffer.from(encoded, 'base64').toString('utf8');
      const sep = decoded.indexOf(':');
      const reqUser = decoded.slice(0, sep);
      const reqPass = decoded.slice(sep + 1);
      if (safeEqual(reqUser, user) && safeEqual(reqPass, password)) {
        return next();
      }
    }
    res.set('WWW-Authenticate', 'Basic realm="Synetic - Website dang bao tri"');
    res.status(401).type('text/plain; charset=utf-8').send('Website đang trong quá trình cập nhật. Vui lòng nhập mật khẩu để xem.');
  };
}

module.exports = { siteLockMiddleware, isEnabled, setEnabled, hasPassword };

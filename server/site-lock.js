'use strict';
const crypto = require('crypto');

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function siteLockMiddleware() {
  const password = process.env.SITE_LOCK_PASSWORD;
  const user = process.env.SITE_LOCK_USER || 'synetic';

  if (!password) {
    return (req, res, next) => next();
  }

  return (req, res, next) => {
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

module.exports = { siteLockMiddleware };

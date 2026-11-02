'use strict';
// Sends every message from the "Gửi thông tin" forms to the company mailbox.
// Settings live in data/mail.json and are edited in /admin/gui-email.
const { readJSON, writeJSON } = require('./data-store');

function clean(v, max) { return String(v == null ? '' : v).trim().slice(0, max || 200); }

function getMail() {
  let raw = {};
  try { raw = readJSON('mail'); } catch (e) { raw = {}; }
  const port = parseInt(raw.port, 10);
  return {
    enabled: raw.enabled === true,
    host: clean(raw.host),
    port: port > 0 && port < 65536 ? port : 465,
    user: clean(raw.user),
    pass: String(raw.pass || ''),
    fromName: clean(raw.fromName, 80) || 'Website Synetic',
    to: clean(raw.to, 300)
  };
}

function saveMail(cfg) {
  writeJSON('mail', {
    enabled: !!cfg.enabled, host: cfg.host, port: cfg.port, user: cfg.user, pass: cfg.pass, fromName: cfg.fromName, to: cfg.to
  });
}

function esc(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function ready(cfg) { return !!(cfg.host && cfg.user && cfg.pass && cfg.to); }

// the library is loaded only when a mail is sent, so a missing install never takes the website down
function transportFor(cfg) {
  let nodemailer;
  try { nodemailer = require('nodemailer'); } catch (e) {
    throw new Error('Máy chủ chưa cài thư viện gửi email (nodemailer). Cần chạy "NPM install" trong Plesk rồi khởi động lại website.');
  }
  return nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 12000, greetingTimeout: 12000, socketTimeout: 20000
  });
}

function friendly(err) {
  const m = String((err && err.message) || err || '');
  if (/EAUTH|Invalid login|authentication/i.test(m)) return 'Sai email hoặc mật khẩu đăng nhập hộp thư.';
  if (/ENOTFOUND|EAI_AGAIN/i.test(m)) return 'Không tìm thấy máy chủ gửi thư, kiểm tra lại ô "Máy chủ gửi thư".';
  if (/ECONNREFUSED|ETIMEDOUT|ECONNRESET|timeout/i.test(m)) return 'Không kết nối được máy chủ gửi thư, kiểm tra lại máy chủ và cổng.';
  return m.slice(0, 200);
}

async function send(cfg, mail) {
  const t = transportFor(cfg);
  await t.sendMail(Object.assign({ from: { name: cfg.fromName, address: cfg.user }, to: cfg.to }, mail));
}

// a visitor sent the form: email it, and remember on the stored message whether it worked
async function notifyContact(item) {
  const cfg = getMail();
  if (!cfg.enabled) return { skipped: true };
  let status;
  if (!ready(cfg)) {
    status = 'Chưa gửi email: cài đặt email chưa điền đủ.';
  } else {
    try {
      const rows = [['Họ và tên', item.name], ['Số điện thoại', item.phone], ['Email', item.email], ['Gửi từ trang', item.page], ['Thời gian', new Date(item.createdAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })]];
      const html = '<div style="font-family:Arial,sans-serif;font-size:15px;color:#222">' +
        '<h2 style="color:#02a02b;margin:0 0 12px">Có khách vừa gửi thông tin trên website</h2>' +
        '<table style="border-collapse:collapse">' + rows.filter((r) => r[1]).map((r) => '<tr><td style="padding:4px 14px 4px 0;color:#666">' + esc(r[0]) + '</td><td style="padding:4px 0"><b>' + esc(r[1]) + '</b></td></tr>').join('') + '</table>' +
        '<p style="margin:16px 0 4px;color:#666">Nội dung:</p><div style="white-space:pre-wrap;border-left:3px solid #ffb345;padding:6px 12px;background:#faf7f0">' + esc(item.message) + '</div></div>';
      const text = rows.filter((r) => r[1]).map((r) => r[0] + ': ' + r[1]).join('\n') + '\n\nNội dung:\n' + item.message;
      const mail = { subject: 'Khách liên hệ từ website: ' + item.name, text, html };
      if (item.email && /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/.test(item.email)) mail.replyTo = item.email;
      await send(cfg, mail);
      status = 'Đã gửi email về ' + cfg.to;
    } catch (e) {
      console.error('[mail] contact notify failed:', e && e.message);
      status = 'Gửi email lỗi: ' + friendly(e);
    }
  }
  try {
    const data = readJSON('contacts');
    const m = data.items.find((i) => i.id === item.id);
    if (m) { m.mail = status; writeJSON('contacts', data); }
  } catch (e) { /* the message itself is already saved */ }
  return { status };
}

async function sendTest(cfg) {
  if (!ready(cfg)) return { ok: false, message: 'Hãy điền đủ máy chủ, email đăng nhập, mật khẩu và email nhận thư.' };
  try {
    await send(cfg, {
      subject: 'Thử gửi email từ website Synetic',
      text: 'Nếu bạn đọc được thư này, website đã gửi được email. Từ giờ mọi thông tin khách gửi sẽ về hộp thư này.',
      html: '<p style="font-family:Arial,sans-serif;font-size:15px">Nếu bạn đọc được thư này, website đã gửi được email. Từ giờ mọi thông tin khách gửi sẽ về hộp thư này.</p>'
    });
    return { ok: true, message: 'Đã gửi thư thử tới ' + cfg.to + '. Hãy kiểm tra hộp thư (cả mục Spam).' };
  } catch (e) {
    console.error('[mail] test failed:', e && e.message);
    return { ok: false, message: 'Gửi thử không được: ' + friendly(e) };
  }
}

module.exports = { getMail, saveMail, notifyContact, sendTest, ready, clean };

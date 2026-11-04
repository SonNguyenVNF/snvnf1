'use strict';
// Visitor counter shown in the footer ticker: online now, visitors today, visitors ever.
// A browser is counted once ever (long-lived cookie) and once per day (date cookie); no
// personal data and no list of visitors is kept - only three numbers and a count per day.
const { readJSON, writeJSON } = require('./data-store');

const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget/i;
const ONLINE_WINDOW = 75 * 1000;   // a page that pinged within the last 75s counts as online
const MAX_ONLINE = 5000;
const KEEP_DAYS = 120;
const YEAR = 365 * 24 * 3600;

let state = null;
const online = new Map();
let saveTimer = null;

function load() {
  if (state) return state;
  let raw = {};
  try { raw = readJSON('visitors'); } catch (e) { raw = {}; }
  state = {
    total: Number.isFinite(raw.total) ? raw.total : 0,
    days: raw.days && typeof raw.days === 'object' ? raw.days : {}
  };
  return state;
}

function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const keys = Object.keys(state.days).sort();
    while (keys.length > KEEP_DAYS) delete state.days[keys.shift()];
    try { writeJSON('visitors', state); } catch (e) { /* keep counting in memory */ }
  }, 4000);
}

// today's date in Vietnam time, so "hôm nay" rolls over at local midnight
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function cookies(req) {
  const out = {};
  String(req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = p.slice(i + 1).trim();
  });
  return out;
}

function onlineNow(now) {
  let n = 0;
  online.forEach((t, id) => { if (now - t > ONLINE_WINDOW) online.delete(id); else n++; });
  return n;
}

module.exports = function registerVisitors(app) {
  app.post('/api/visit', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const s = load();
    const now = Date.now();
    const day = today();
    const counted = !(req.session && req.session.isAdmin) && !BOT.test(String(req.headers['user-agent'] || ''));

    if (counted) {
      const c = cookies(req);
      const secure = req.secure ? '; Secure' : '';
      const base = '; Path=/; Max-Age=' + YEAR + '; SameSite=Lax' + secure;
      let changed = false;
      if (c.syn_v !== '1') { s.total++; changed = true; res.append('Set-Cookie', 'syn_v=1' + base); }
      if (c.syn_d !== day) { s.days[day] = (s.days[day] || 0) + 1; changed = true; res.append('Set-Cookie', 'syn_d=' + day + base); }
      if (changed) save();

      const sid = String(req.query.s || '');
      if (/^[a-z0-9]{8,40}$/i.test(sid) && (online.has(sid) || online.size < MAX_ONLINE)) online.set(sid, now);
    }

    res.json({ online: Math.max(1, onlineNow(now)), today: s.days[day] || 0, total: s.total });
  });
};

'use strict';
// Visitor counter shown in the footer ticker: online now, visits today, visits ever.
// Every page load counts as a visit, the same person coming back included (owner, 04/11);
// the "still online" pings do not. No personal data and no list of visitors is kept -
// only three numbers, a count per day and the random ids of pages pinged in the last minutes.
// Everything lives in data/visitors.json and is re-read on every call, so it stays right when
// the host runs the app in more than one process (each process used to count only its own visitors).
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'data', 'visitors.json');
const BOT = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse|pingdom|uptime|monitor|curl|wget/i;
const ONLINE_WINDOW = 150 * 1000;  // a page that pinged within the last 150s counts as online (background tabs ping about once a minute)
const MAX_ONLINE = 3000;
const KEEP_DAYS = 120;

let last = { total: 0, days: {}, online: {} };   // used only if the file cannot be read

function read() {
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    last = {
      total: Number.isFinite(raw.total) ? raw.total : 0,
      days: raw.days && typeof raw.days === 'object' ? raw.days : {},
      online: raw.online && typeof raw.online === 'object' ? raw.online : {}
    };
  } catch (e) { /* missing or half-written: keep the last known numbers */ }
  return last;
}

function write(s) {
  const keys = Object.keys(s.days).sort();
  while (keys.length > KEEP_DAYS) delete s.days[keys.shift()];
  try {
    const tmp = FILE + '.' + process.pid + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(s), 'utf8');
    fs.renameSync(tmp, FILE);
  } catch (e) { /* keep counting in memory */ }
}

// today's date in Vietnam time, so "hôm nay" rolls over at local midnight
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

function prune(s, now) {
  Object.keys(s.online).forEach((id) => { if (now - s.online[id] > ONLINE_WINDOW) delete s.online[id]; });
}

module.exports = function registerVisitors(app) {
  app.post('/api/visit', (req, res) => {
    res.set('Cache-Control', 'no-store');
    const s = read();
    const now = Date.now();
    const day = today();
    const counted = !(req.session && req.session.isAdmin) && !BOT.test(String(req.headers['user-agent'] || ''));

    if (counted) {
      if (req.query.v === '1') {
        s.total++;
        s.days[day] = (s.days[day] || 0) + 1;
      }
      const sid = String(req.query.s || '');
      prune(s, now);
      if (/^[a-z0-9]{8,40}$/i.test(sid) && (s.online[sid] || Object.keys(s.online).length < MAX_ONLINE)) s.online[sid] = now;
      write(s);
    } else {
      prune(s, now);
    }

    res.json({ online: Math.max(1, Object.keys(s.online).length), today: s.days[day] || 0, total: s.total });
  });
};

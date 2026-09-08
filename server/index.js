'use strict';
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');

const { readJSON, writeJSON } = require('./data-store');
const auth = require('./auth');

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.set('trust proxy', 1);

app.use('/assets', express.static(path.join(ROOT, 'assets')));

app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('CẢNH BÁO: SESSION_SECRET chưa được đặt trong .env — dùng khóa tạm thời, mọi người sẽ bị đăng xuất khi khởi động lại server.');
}
app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// ---------- Public static-content pages (ticker pulled from data/ticker.json) ----------

const PAGES = [
  { urls: ['/', '/index.html'], view: 'index', root: '' },
  { urls: ['/du-an.html'], view: 'du-an', root: '' },
  { urls: ['/tin-tuc.html'], view: 'tin-tuc', root: '' },
  { urls: ['/tuyen-dung.html'], view: 'tuyen-dung', root: '' },
  { urls: ['/thu-vien.html'], view: 'thu-vien', root: '' },
  { urls: ['/ve-synetic/thong-diep-chu-tich-hdqt.html'], view: 've-synetic/thong-diep-chu-tich-hdqt', root: '../' },
  { urls: ['/ve-synetic/thong-diep-tong-giam-doc.html'], view: 've-synetic/thong-diep-tong-giam-doc', root: '../' },
  { urls: ['/ve-synetic/gia-tri-cot-loi.html'], view: 've-synetic/gia-tri-cot-loi', root: '../' },
  { urls: ['/ve-synetic/lich-su.html'], view: 've-synetic/lich-su', root: '../' },
  { urls: ['/ve-synetic/tam-nhin-chien-luoc.html'], view: 've-synetic/tam-nhin-chien-luoc', root: '../' },
  { urls: ['/ve-synetic/mang-luoi-hoat-dong.html'], view: 've-synetic/mang-luoi-hoat-dong', root: '../' },
  { urls: ['/ve-synetic/doi-ngu-lanh-dao.html'], view: 've-synetic/doi-ngu-lanh-dao', root: '../' },
  { urls: ['/ve-synetic/trach-nhiem-xa-hoi.html'], view: 've-synetic/trach-nhiem-xa-hoi', root: '../' },
  { urls: ['/ve-synetic/giai-thuong.html'], view: 've-synetic/giai-thuong', root: '../' },
  { urls: ['/ve-synetic/doi-tac-khach-hang.html'], view: 've-synetic/doi-tac-khach-hang', root: '../' },
  { urls: ['/thanh-vien/nutrition.html'], view: 'thanh-vien/nutrition', root: '../' },
  { urls: ['/thanh-vien/vet.html'], view: 'thanh-vien/vet', root: '../' },
  { urls: ['/thanh-vien/logistics.html'], view: 'thanh-vien/logistics', root: '../' },
  { urls: ['/thanh-vien/farm.html'], view: 'thanh-vien/farm', root: '../' },
  { urls: ['/thanh-vien/capital.html'], view: 'thanh-vien/capital', root: '../' }
];

for (const page of PAGES) {
  for (const url of page.urls) {
    app.get(url, (req, res) => {
      const ticker = readJSON('ticker');
      res.render(page.view, { root: page.root, ticker });
    });
  }
}

// ---------- Admin ----------

const adminRouter = express.Router();

adminRouter.get('/login', (req, res) => {
  if (req.session.isAdmin) return res.redirect('/admin');
  res.render('admin/login', { error: null });
});

adminRouter.post('/login', async (req, res) => {
  const ip = req.ip;
  if (auth.isRateLimited(ip)) {
    return res.status(429).render('admin/login', { error: 'Bạn thử sai quá nhiều lần. Vui lòng thử lại sau 15 phút.' });
  }
  const password = req.body.password || '';
  let ok = false;
  try {
    ok = await auth.checkPassword(password);
  } catch (err) {
    console.error(err.message);
    return res.status(500).render('admin/login', { error: 'Lỗi cấu hình máy chủ. Vui lòng liên hệ kỹ thuật.' });
  }
  if (!ok) {
    auth.recordFailure(ip);
    return res.render('admin/login', { error: 'Sai mật khẩu.' });
  }
  auth.recordSuccess(ip);
  req.session.regenerate((err) => {
    if (err) return res.status(500).render('admin/login', { error: 'Lỗi hệ thống, vui lòng thử lại.' });
    req.session.isAdmin = true;
    res.redirect('/admin');
  });
});

adminRouter.post('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

adminRouter.use(auth.requireAdmin);

adminRouter.get('/', (req, res) => {
  res.render('admin/dashboard', {});
});

adminRouter.get('/ticker', (req, res) => {
  const ticker = readJSON('ticker');
  res.render('admin/ticker', { ticker, editItem: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/ticker/:id/edit', (req, res) => {
  const ticker = readJSON('ticker');
  const editItem = ticker.items.find((i) => i.id === req.params.id);
  if (!editItem) return res.redirect('/admin/ticker');
  res.render('admin/ticker', { ticker, editItem, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/ticker/add', auth.verifyCsrf, (req, res) => {
  const ticker = readJSON('ticker');
  const text = (req.body.text || '').trim();
  const url = (req.body.url || '').trim() || 'tin-tuc.html';
  if (text) {
    ticker.items.push({ id: Date.now().toString(), text, url });
    writeJSON('ticker', ticker);
  }
  res.redirect('/admin/ticker');
});

adminRouter.post('/ticker/:id/edit', auth.verifyCsrf, (req, res) => {
  const ticker = readJSON('ticker');
  const item = ticker.items.find((i) => i.id === req.params.id);
  if (item) {
    const text = (req.body.text || '').trim();
    const url = (req.body.url || '').trim() || 'tin-tuc.html';
    if (text) {
      item.text = text;
      item.url = url;
      writeJSON('ticker', ticker);
    }
  }
  res.redirect('/admin/ticker');
});

adminRouter.post('/ticker/:id/delete', auth.verifyCsrf, (req, res) => {
  const ticker = readJSON('ticker');
  ticker.items = ticker.items.filter((i) => i.id !== req.params.id);
  writeJSON('ticker', ticker);
  res.redirect('/admin/ticker');
});

app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Synetic Group website listening on port ${PORT}`);
});

module.exports = app;

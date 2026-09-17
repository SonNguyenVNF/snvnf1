'use strict';
require('dotenv').config();

const path = require('path');
const express = require('express');
const session = require('express-session');
const FileStore = require('session-file-store')(session);
const crypto = require('crypto');

const { readJSON, writeJSON } = require('./data-store');
const auth = require('./auth');
const { slugify } = require('./slug');
const { createUploader, publicPathFor, deleteUploadedFile } = require('./upload');
const { siteLockMiddleware } = require('./site-lock');

const newsUpload = createUploader('news');
const projectsUpload = createUploader('projects');
const teamUpload = createUploader('team');
const partnersUpload = createUploader('partners');
const siteImageUpload = createUploader('site');

const EDITABLE_PAGES = [
  { key: 'thong-diep-chu-tich-hdqt', label: 'Thông điệp Chủ tịch HĐQT', hasSign: true },
  { key: 'thong-diep-tong-giam-doc', label: 'Thông điệp Tổng giám đốc', hasSign: true },
  { key: 'doi-ngu-lanh-dao-intro', label: 'Đội ngũ lãnh đạo (đoạn giới thiệu)', hasChairmanNote: true },
  { key: 'lich-su', label: 'Lịch sử' },
  { key: 'tam-nhin-chien-luoc', label: 'Tầm nhìn chiến lược' },
  { key: 'trach-nhiem-xa-hoi', label: 'Trách nhiệm xã hội' },
  { key: 'giai-thuong', label: 'Giải thưởng' }
];

const EDITABLE_IMAGES = [
  { key: 'logo', label: 'Logo (hiển thị ở đầu trang và chân trang)' },
  { key: 'hero-1', label: 'Ảnh nền trang chủ — 1' },
  { key: 'hero-2', label: 'Ảnh nền trang chủ — 2' },
  { key: 'hero-3', label: 'Ảnh nền trang chủ — 3' },
  { key: 'member-nutrition', label: 'Logo — Synetic Dinh Dưỡng' },
  { key: 'member-vet', label: 'Logo — Synetic Thú Y' },
  { key: 'member-logistics', label: 'Logo — Synetic Logistics' },
  { key: 'member-farm', label: 'Logo — Synetic Nông Trại' },
  { key: 'member-capital', label: 'Logo — Synetic Capital' }
];

function commonLocals() {
  return { ticker: readJSON('ticker'), siteImages: readJSON('site-images'), footer: readJSON('footer') };
}

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.set('trust proxy', 1);

app.use(siteLockMiddleware());

app.use('/assets', express.static(path.join(ROOT, 'assets')));

app.use(express.urlencoded({ extended: false }));

const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
if (!process.env.SESSION_SECRET) {
  console.warn('CẢNH BÁO: SESSION_SECRET chưa được đặt trong .env — dùng khóa tạm thời, mọi người sẽ bị đăng xuất khi khởi động lại server.');
}
app.use(session({
  store: new FileStore({ path: path.join(ROOT, 'data', 'sessions'), logFn: () => {} }),
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
  { urls: ['/thu-vien.html'], view: 'thu-vien', root: '' },
  { urls: ['/ve-synetic/thong-diep-chu-tich-hdqt.html'], view: 've-synetic/thong-diep-chu-tich-hdqt', root: '../' },
  { urls: ['/ve-synetic/thong-diep-tong-giam-doc.html'], view: 've-synetic/thong-diep-tong-giam-doc', root: '../' },
  { urls: ['/ve-synetic/gia-tri-cot-loi.html'], view: 've-synetic/gia-tri-cot-loi', root: '../' },
  { urls: ['/ve-synetic/lich-su.html'], view: 've-synetic/lich-su', root: '../' },
  { urls: ['/ve-synetic/tam-nhin-chien-luoc.html'], view: 've-synetic/tam-nhin-chien-luoc', root: '../' },
  { urls: ['/ve-synetic/mang-luoi-hoat-dong.html'], view: 've-synetic/mang-luoi-hoat-dong', root: '../' },
  { urls: ['/ve-synetic/trach-nhiem-xa-hoi.html'], view: 've-synetic/trach-nhiem-xa-hoi', root: '../' },
  { urls: ['/ve-synetic/giai-thuong.html'], view: 've-synetic/giai-thuong', root: '../' },
  { urls: ['/thanh-vien/nutrition.html'], view: 'thanh-vien/nutrition', root: '../' },
  { urls: ['/thanh-vien/vet.html'], view: 'thanh-vien/vet', root: '../' },
  { urls: ['/thanh-vien/logistics.html'], view: 'thanh-vien/logistics', root: '../' },
  { urls: ['/thanh-vien/farm.html'], view: 'thanh-vien/farm', root: '../' },
  { urls: ['/thanh-vien/capital.html'], view: 'thanh-vien/capital', root: '../' }
];

for (const page of PAGES) {
  for (const url of page.urls) {
    app.get(url, (req, res) => {
      const pages = readJSON('pages');
      res.render(page.view, { root: page.root, ...commonLocals(), pages });
    });
  }
}

// ---------- Tin tức (News) ----------

function publishedNewsSorted() {
  const news = readJSON('news');
  return news.items
    .filter((i) => i.published)
    .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

app.get('/tin-tuc.html', (req, res) => {
  res.render('tin-tuc', { root: '', ...commonLocals(), items: publishedNewsSorted() });
});

app.get('/tin-tuc/:slug.html', (req, res) => {
  const news = readJSON('news');
  const item = news.items.find((i) => i.slug === req.params.slug && i.published);
  if (!item) {
    return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
  }
  res.render('tin-tuc-chi-tiet', { root: '../', ...commonLocals(), item });
});

// ---------- Dự án, Tuyển dụng, Đội ngũ, Đối tác (public) ----------

app.get('/du-an.html', (req, res) => {
  const projects = readJSON('projects');
  res.render('du-an', { root: '', ...commonLocals(), items: projects.items.filter((i) => i.published) });
});

app.get('/tuyen-dung.html', (req, res) => {
  const jobs = readJSON('jobs');
  res.render('tuyen-dung', { root: '', ...commonLocals(), items: jobs.items.filter((i) => i.published) });
});

app.get('/ve-synetic/doi-ngu-lanh-dao.html', (req, res) => {
  const team = readJSON('team');
  const pages = readJSON('pages');
  res.render('ve-synetic/doi-ngu-lanh-dao', { root: '../', ...commonLocals(), team, pages });
});

app.get('/ve-synetic/doi-tac-khach-hang.html', (req, res) => {
  const partners = readJSON('partners');
  res.render('ve-synetic/doi-tac-khach-hang', { root: '../', ...commonLocals(), partners });
});

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

// ---------- Admin: Tin tức (News) ----------

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

adminRouter.get('/tin-tuc', (req, res) => {
  const news = readJSON('news');
  res.render('admin/news-list', { items: news.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/tin-tuc/new', (req, res) => {
  res.render('admin/news-form', { item: null, error: null, today: todayStr(), csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/tin-tuc/new', (req, res) => {
  newsUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/news-form', { item: null, error: err.message, today: todayStr(), csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).render('admin/news-form', { item: null, error: 'Vui lòng nhập tiêu đề.', today: todayStr(), csrfToken: auth.ensureCsrfToken(req) });
    }
    const news = readJSON('news');
    news.items.push({
      id: Date.now().toString(),
      slug: slugify(title),
      title,
      excerpt: (req.body.excerpt || '').trim(),
      body: (req.body.body || '').replace(/\r\n/g, '\n').trim(),
      image: req.file ? publicPathFor('news', req.file.filename) : null,
      publishedAt: req.body.publishedAt || todayStr(),
      published: req.body.published === '1'
    });
    writeJSON('news', news);
    res.redirect('/admin/tin-tuc');
  });
});

adminRouter.get('/tin-tuc/:id/edit', (req, res) => {
  const news = readJSON('news');
  const item = news.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/tin-tuc');
  res.render('admin/news-form', { item, error: null, today: todayStr(), csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/tin-tuc/:id/edit', (req, res) => {
  const news = readJSON('news');
  const item = news.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/tin-tuc');

  newsUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/news-form', { item, error: err.message, today: todayStr(), csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).render('admin/news-form', { item, error: 'Vui lòng nhập tiêu đề.', today: todayStr(), csrfToken: auth.ensureCsrfToken(req) });
    }
    item.title = title;
    item.excerpt = (req.body.excerpt || '').trim();
    item.body = (req.body.body || '').replace(/\r\n/g, '\n').trim();
    item.publishedAt = req.body.publishedAt || item.publishedAt;
    item.published = req.body.published === '1';
    if (req.file) {
      deleteUploadedFile(item.image);
      item.image = publicPathFor('news', req.file.filename);
    }
    writeJSON('news', news);
    res.redirect('/admin/tin-tuc');
  });
});

adminRouter.post('/tin-tuc/:id/delete', auth.verifyCsrf, (req, res) => {
  const news = readJSON('news');
  const item = news.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.image);
    news.items = news.items.filter((i) => i.id !== req.params.id);
    writeJSON('news', news);
  }
  res.redirect('/admin/tin-tuc');
});

// ---------- Admin: Dự án ----------

adminRouter.get('/du-an', (req, res) => {
  const projects = readJSON('projects');
  res.render('admin/projects-list', { items: projects.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/du-an/new', (req, res) => {
  res.render('admin/projects-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/du-an/new', (req, res) => {
  projectsUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/projects-form', { item: null, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).render('admin/projects-form', { item: null, error: 'Vui lòng nhập tên dự án.', csrfToken: auth.ensureCsrfToken(req) });
    }
    const projects = readJSON('projects');
    projects.items.push({
      id: Date.now().toString(),
      title,
      location: (req.body.location || '').trim(),
      excerpt: (req.body.excerpt || '').trim(),
      image: req.file ? publicPathFor('projects', req.file.filename) : null,
      published: req.body.published === '1'
    });
    writeJSON('projects', projects);
    res.redirect('/admin/du-an');
  });
});

adminRouter.get('/du-an/:id/edit', (req, res) => {
  const projects = readJSON('projects');
  const item = projects.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/du-an');
  res.render('admin/projects-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/du-an/:id/edit', (req, res) => {
  const projects = readJSON('projects');
  const item = projects.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/du-an');

  projectsUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/projects-form', { item, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).render('admin/projects-form', { item, error: 'Vui lòng nhập tên dự án.', csrfToken: auth.ensureCsrfToken(req) });
    }
    item.title = title;
    item.location = (req.body.location || '').trim();
    item.excerpt = (req.body.excerpt || '').trim();
    item.published = req.body.published === '1';
    if (req.file) {
      deleteUploadedFile(item.image);
      item.image = publicPathFor('projects', req.file.filename);
    }
    writeJSON('projects', projects);
    res.redirect('/admin/du-an');
  });
});

adminRouter.post('/du-an/:id/delete', auth.verifyCsrf, (req, res) => {
  const projects = readJSON('projects');
  const item = projects.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.image);
    projects.items = projects.items.filter((i) => i.id !== req.params.id);
    writeJSON('projects', projects);
  }
  res.redirect('/admin/du-an');
});

// ---------- Admin: Tuyển dụng ----------

adminRouter.get('/tuyen-dung', (req, res) => {
  const jobs = readJSON('jobs');
  res.render('admin/jobs-list', { items: jobs.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/tuyen-dung/new', (req, res) => {
  res.render('admin/jobs-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/tuyen-dung/new', auth.verifyCsrf, (req, res) => {
  const title = (req.body.title || '').trim();
  if (!title) {
    return res.status(400).render('admin/jobs-form', { item: null, error: 'Vui lòng nhập vị trí tuyển dụng.', csrfToken: auth.ensureCsrfToken(req) });
  }
  const jobs = readJSON('jobs');
  jobs.items.push({
    id: Date.now().toString(),
    title,
    department: (req.body.department || '').trim(),
    location: (req.body.location || '').trim(),
    type: (req.body.type || '').trim(),
    description: (req.body.description || '').replace(/\r\n/g, '\n').trim(),
    deadline: (req.body.deadline || '').trim(),
    published: req.body.published === '1'
  });
  writeJSON('jobs', jobs);
  res.redirect('/admin/tuyen-dung');
});

adminRouter.get('/tuyen-dung/:id/edit', (req, res) => {
  const jobs = readJSON('jobs');
  const item = jobs.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/tuyen-dung');
  res.render('admin/jobs-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/tuyen-dung/:id/edit', auth.verifyCsrf, (req, res) => {
  const jobs = readJSON('jobs');
  const item = jobs.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/tuyen-dung');
  const title = (req.body.title || '').trim();
  if (!title) {
    return res.status(400).render('admin/jobs-form', { item, error: 'Vui lòng nhập vị trí tuyển dụng.', csrfToken: auth.ensureCsrfToken(req) });
  }
  item.title = title;
  item.department = (req.body.department || '').trim();
  item.location = (req.body.location || '').trim();
  item.type = (req.body.type || '').trim();
  item.description = (req.body.description || '').replace(/\r\n/g, '\n').trim();
  item.deadline = (req.body.deadline || '').trim();
  item.published = req.body.published === '1';
  writeJSON('jobs', jobs);
  res.redirect('/admin/tuyen-dung');
});

adminRouter.post('/tuyen-dung/:id/delete', auth.verifyCsrf, (req, res) => {
  const jobs = readJSON('jobs');
  jobs.items = jobs.items.filter((i) => i.id !== req.params.id);
  writeJSON('jobs', jobs);
  res.redirect('/admin/tuyen-dung');
});

// ---------- Admin: Đội ngũ lãnh đạo ----------

adminRouter.get('/doi-ngu-lanh-dao', (req, res) => {
  const team = readJSON('team');
  res.render('admin/team-list', { items: team.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/doi-ngu-lanh-dao/new', (req, res) => {
  res.render('admin/team-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/doi-ngu-lanh-dao/new', (req, res) => {
  teamUpload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/team-form', { item: null, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).render('admin/team-form', { item: null, error: 'Vui lòng nhập họ tên.', csrfToken: auth.ensureCsrfToken(req) });
    }
    const team = readJSON('team');
    team.items.push({
      id: Date.now().toString(),
      name,
      title: (req.body.title || '').trim(),
      bio: (req.body.bio || '').trim(),
      photo: req.file ? publicPathFor('team', req.file.filename) : null
    });
    writeJSON('team', team);
    res.redirect('/admin/doi-ngu-lanh-dao');
  });
});

adminRouter.get('/doi-ngu-lanh-dao/:id/edit', (req, res) => {
  const team = readJSON('team');
  const item = team.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/doi-ngu-lanh-dao');
  res.render('admin/team-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/doi-ngu-lanh-dao/:id/edit', (req, res) => {
  const team = readJSON('team');
  const item = team.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/doi-ngu-lanh-dao');

  teamUpload.single('photo')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/team-form', { item, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).render('admin/team-form', { item, error: 'Vui lòng nhập họ tên.', csrfToken: auth.ensureCsrfToken(req) });
    }
    item.name = name;
    item.title = (req.body.title || '').trim();
    item.bio = (req.body.bio || '').trim();
    if (req.file) {
      deleteUploadedFile(item.photo);
      item.photo = publicPathFor('team', req.file.filename);
    }
    writeJSON('team', team);
    res.redirect('/admin/doi-ngu-lanh-dao');
  });
});

adminRouter.post('/doi-ngu-lanh-dao/:id/delete', auth.verifyCsrf, (req, res) => {
  const team = readJSON('team');
  const item = team.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.photo);
    team.items = team.items.filter((i) => i.id !== req.params.id);
    writeJSON('team', team);
  }
  res.redirect('/admin/doi-ngu-lanh-dao');
});

// ---------- Admin: Đối tác ----------

adminRouter.get('/doi-tac-khach-hang', (req, res) => {
  const partners = readJSON('partners');
  res.render('admin/partners-list', { items: partners.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/doi-tac-khach-hang/new', (req, res) => {
  res.render('admin/partners-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/doi-tac-khach-hang/new', (req, res) => {
  partnersUpload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/partners-form', { item: null, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).render('admin/partners-form', { item: null, error: 'Vui lòng nhập tên đối tác.', csrfToken: auth.ensureCsrfToken(req) });
    }
    const partners = readJSON('partners');
    partners.items.push({
      id: Date.now().toString(),
      name,
      url: (req.body.url || '').trim(),
      logo: req.file ? publicPathFor('partners', req.file.filename) : null
    });
    writeJSON('partners', partners);
    res.redirect('/admin/doi-tac-khach-hang');
  });
});

adminRouter.get('/doi-tac-khach-hang/:id/edit', (req, res) => {
  const partners = readJSON('partners');
  const item = partners.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/doi-tac-khach-hang');
  res.render('admin/partners-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/doi-tac-khach-hang/:id/edit', (req, res) => {
  const partners = readJSON('partners');
  const item = partners.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/doi-tac-khach-hang');

  partnersUpload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/partners-form', { item, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).render('admin/partners-form', { item, error: 'Vui lòng nhập tên đối tác.', csrfToken: auth.ensureCsrfToken(req) });
    }
    item.name = name;
    item.url = (req.body.url || '').trim();
    if (req.file) {
      deleteUploadedFile(item.logo);
      item.logo = publicPathFor('partners', req.file.filename);
    }
    writeJSON('partners', partners);
    res.redirect('/admin/doi-tac-khach-hang');
  });
});

adminRouter.post('/doi-tac-khach-hang/:id/delete', auth.verifyCsrf, (req, res) => {
  const partners = readJSON('partners');
  const item = partners.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.logo);
    partners.items = partners.items.filter((i) => i.id !== req.params.id);
    writeJSON('partners', partners);
  }
  res.redirect('/admin/doi-tac-khach-hang');
});

// ---------- Admin: Nội dung trang Về Synetic ----------

adminRouter.get('/noi-dung', (req, res) => {
  res.render('admin/pages-list', { pageList: EDITABLE_PAGES });
});

adminRouter.get('/noi-dung/:key/edit', (req, res) => {
  const def = EDITABLE_PAGES.find((p) => p.key === req.params.key);
  if (!def) return res.redirect('/admin/noi-dung');
  const pages = readJSON('pages');
  const data = pages[def.key] || {};
  res.render('admin/pages-form', {
    key: def.key,
    label: def.label,
    hasSign: Boolean(def.hasSign),
    hasChairmanNote: Boolean(def.hasChairmanNote),
    data: { body: data.body || '', signName: data.signName || '', signTitle: data.signTitle || '', chairmanNote: data.chairmanNote || '' },
    error: null,
    csrfToken: auth.ensureCsrfToken(req)
  });
});

adminRouter.post('/noi-dung/:key/edit', auth.verifyCsrf, (req, res) => {
  const def = EDITABLE_PAGES.find((p) => p.key === req.params.key);
  if (!def) return res.redirect('/admin/noi-dung');
  const body = (req.body.body || '').replace(/\r\n/g, '\n').trim();
  if (!body) {
    return res.status(400).render('admin/pages-form', {
      key: def.key,
      label: def.label,
      hasSign: Boolean(def.hasSign),
      hasChairmanNote: Boolean(def.hasChairmanNote),
      data: { body, signName: req.body.signName || '', signTitle: req.body.signTitle || '', chairmanNote: req.body.chairmanNote || '' },
      error: 'Vui lòng nhập nội dung.',
      csrfToken: auth.ensureCsrfToken(req)
    });
  }
  const pages = readJSON('pages');
  const entry = pages[def.key] || {};
  entry.body = body;
  if (def.hasSign) {
    entry.signName = (req.body.signName || '').trim();
    entry.signTitle = (req.body.signTitle || '').trim();
  }
  if (def.hasChairmanNote) {
    entry.chairmanNote = (req.body.chairmanNote || '').trim();
  }
  pages[def.key] = entry;
  writeJSON('pages', pages);
  res.redirect('/admin/noi-dung');
});

// ---------- Admin: Thông tin liên hệ (chân trang) ----------

adminRouter.get('/lien-he', (req, res) => {
  const footer = readJSON('footer');
  res.render('admin/footer-form', { footer, csrfToken: auth.ensureCsrfToken(req), error: null });
});

adminRouter.post('/lien-he', (req, res) => {
  if (!auth.csrfOk(req)) {
    return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
  }
  const footer = {
    companyName: (req.body.companyName || '').trim(),
    address: (req.body.address || '').trim(),
    taxCode: (req.body.taxCode || '').trim(),
    phone: (req.body.phone || '').trim(),
    email: (req.body.email || '').trim(),
    tagline: (req.body.tagline || '').trim()
  };
  writeJSON('footer', footer);
  res.redirect('/admin/lien-he');
});

// ---------- Admin: Ảnh cố định của website ----------

adminRouter.get('/hinh-anh', (req, res) => {
  const siteImages = readJSON('site-images');
  res.render('admin/site-images-list', { imageList: EDITABLE_IMAGES, siteImages });
});

adminRouter.get('/hinh-anh/:key/edit', (req, res) => {
  const def = EDITABLE_IMAGES.find((i) => i.key === req.params.key);
  if (!def) return res.redirect('/admin/hinh-anh');
  const siteImages = readJSON('site-images');
  res.render('admin/site-images-form', {
    key: def.key,
    label: def.label,
    currentImage: siteImages[def.key] || null,
    error: null,
    csrfToken: auth.ensureCsrfToken(req)
  });
});

adminRouter.post('/hinh-anh/:key/edit', (req, res) => {
  const def = EDITABLE_IMAGES.find((i) => i.key === req.params.key);
  if (!def) return res.redirect('/admin/hinh-anh');
  const siteImages = readJSON('site-images');

  siteImageUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/site-images-form', {
        key: def.key,
        label: def.label,
        currentImage: siteImages[def.key] || null,
        error: err.message,
        csrfToken: auth.ensureCsrfToken(req)
      });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    if (!req.file) {
      return res.status(400).render('admin/site-images-form', {
        key: def.key,
        label: def.label,
        currentImage: siteImages[def.key] || null,
        error: 'Vui lòng chọn một ảnh để tải lên.',
        csrfToken: auth.ensureCsrfToken(req)
      });
    }
    const oldImage = siteImages[def.key];
    siteImages[def.key] = publicPathFor('site', req.file.filename);
    writeJSON('site-images', siteImages);
    deleteUploadedFile(oldImage);
    res.redirect('/admin/hinh-anh');
  });
});

app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
});

app.listen(PORT, () => {
  console.log(`Synetic Group website listening on port ${PORT}`);
});

module.exports = app;

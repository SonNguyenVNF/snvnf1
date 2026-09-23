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
const jobsUpload = createUploader('jobs');
const teamUpload = createUploader('team');
const partnersUpload = createUploader('partners');
const siteImageUpload = createUploader('site');
const heroUpload = createUploader('hero');
const memberUpload = createUploader('members');

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
  { key: 'logo', label: 'Logo (hiển thị ở đầu trang và chân trang)' }
];

// Default content for the 5 members that already existed as hardcoded pages,
// used once to seed data/members.json (or to migrate the older flat-object
// format from an earlier version of this feature) the first time it's read.
// Logos are pulled live from data/site-images.json at migration time so any
// logo already uploaded through the old /admin/hinh-anh flow isn't lost.
const MEMBER_SEED = [
  { slug: 'nutrition', name: 'Synetic Dinh Dưỡng', brand: 'Synetic', brandSub: 'NUTRITION', accent: 'emerald',
    tagline: 'Chuẩn dinh dưỡng, bền tăng trưởng', legalName: 'Công ty Cổ phần Synetic Dinh Dưỡng', siteImageKey: 'member-nutrition',
    body: 'Synetic Dinh Dưỡng phát triển và sản xuất thức ăn chăn nuôi, premix và các dòng bổ sung dinh dưỡng theo tiêu chuẩn cơ sở nghiêm ngặt, giúp vật nuôi tăng trưởng đều và khoẻ mạnh qua từng giai đoạn.\n\nDanh mục sản phẩm trải dài từ thức ăn hỗn hợp cho heo thịt, premix cho gia cầm đến multi-vitamin cho vật nuôi — mỗi công thức được kiểm soát chất lượng từ đầu vào đến đầu ra, theo đúng tiêu chuẩn cơ sở đã công bố.\n\nLà mắt xích dinh dưỡng của hệ sinh thái, Synetic Dinh Dưỡng phối hợp chặt chẽ với Synetic Nông Trại để kiểm chứng hiệu quả thực tế trước khi đưa sản phẩm ra thị trường.\n\nVận hành trong hệ sinh thái Synetic Group, công ty sử dụng chung hệ thống nhận diện thương hiệu và được hỗ trợ bởi khối dịch vụ dùng chung của Tập đoàn — tài chính, nhân sự, logistics — để tập trung nguồn lực vào chuyên môn cốt lõi là nghiên cứu và sản xuất dinh dưỡng vật nuôi.',
    factsTitle: 'SẢN PHẨM TIÊU BIỂU',
    facts: [
      { label: 'SN-312 · Thức ăn hỗn hợp', value: 'Cho heo thịt · 25kg · TCCS 01:2026/SNT-NUTRITION' },
      { label: 'SN-PMX · Premix', value: 'Cho gia cầm · 1kg · TCCS 02:2026/SNT-NUTRITION' },
      { label: 'SN-MV · Multi Vitamin', value: 'Cho vật nuôi · 1L · TCCS 03:2026/SNT-NUTRITION' }
    ] },
  { slug: 'vet', name: 'Synetic Thú Y', brand: 'Synetic', brandSub: 'VET', accent: 'jade',
    tagline: 'Chủ động phòng, bền sức khoẻ', legalName: 'Công ty Cổ phần Synetic Thú Y', siteImageKey: 'member-vet',
    body: 'Synetic Thú Y cung cấp vắc-xin, thuốc thú y và giải pháp phòng bệnh chủ động cho trang trại, giúp giảm thiểu rủi ro dịch bệnh và chi phí điều trị về lâu dài.\n\nĐội ngũ kỹ thuật đồng hành cùng người chăn nuôi từ khâu tư vấn phác đồ, giám sát sức khoẻ đàn đến hỗ trợ xử lý tình huống dịch bệnh tại hiện trường.\n\nTriết lý "phòng hơn chống" được áp dụng xuyên suốt, phối hợp cùng Synetic Nông Trại để theo dõi sức khoẻ đàn nuôi theo thời gian thực.\n\nĐội ngũ kỹ thuật của công ty được đào tạo và cập nhật chuyên môn thường xuyên qua Học viện Synetic — chương trình đào tạo dùng chung của Tập đoàn cho cán bộ nhân viên và hệ thống đại lý trong toàn hệ sinh thái.',
    factsTitle: 'THÔNG TIN NHANH',
    facts: [
      { label: 'Lĩnh vực', value: 'Vắc-xin & thuốc thú y' },
      { label: 'Mô hình', value: 'Phòng bệnh chủ động' },
      { label: 'Đồng hành', value: 'Tư vấn kỹ thuật tại trang trại' }
    ] },
  { slug: 'logistics', name: 'Synetic Logistics', brand: 'Synetic', brandSub: 'LOGISTICS', accent: 'ocean',
    tagline: 'Kết nối chuẩn, vận hành nhanh', legalName: 'Công ty Cổ phần Synetic Logistics', siteImageKey: 'member-logistics',
    body: 'Synetic Logistics vận hành chuỗi cung ứng cho toàn hệ sinh thái — từ kho vận nguyên liệu, vận chuyển thành phẩm đến giao nhận tận trang trại — đảm bảo hàng hoá lưu thông đúng chuẩn, đúng thời gian.\n\nHệ thống kho bãi và đội xe được chuẩn hoá theo quy trình chung của tập đoàn, tối ưu chi phí vận hành cho các đơn vị thành viên và đối tác.\n\nLà mắt xích kết nối giữa Synetic Dinh Dưỡng, Synetic Thú Y và Synetic Nông Trại, đảm bảo nguyên liệu và sản phẩm luôn đến đúng nơi, đúng lúc.\n\nSynetic Logistics vận hành hạ tầng kho bãi và vận chuyển theo đúng định hướng "dịch vụ dùng chung" mà Synetic Group xây dựng, giúp các công ty thành viên không phải tự đầu tư đội xe và kho riêng lẻ, tối ưu chi phí cho toàn hệ sinh thái.',
    factsTitle: 'THÔNG TIN NHANH',
    facts: [
      { label: 'Lĩnh vực', value: 'Kho vận & vận chuyển' },
      { label: 'Phạm vi', value: 'Nguyên liệu – thành phẩm – trang trại' },
      { label: 'Cam kết', value: 'Đúng chuẩn, đúng thời gian' }
    ] },
  { slug: 'farm', name: 'Synetic Nông Trại', brand: 'Synetic', brandSub: 'FARM', accent: 'emerald',
    tagline: 'Nuôi bằng tâm, lớn bằng chuẩn', legalName: 'Công ty Cổ phần Synetic Nông Trại', siteImageKey: 'member-farm',
    body: 'Synetic Nông Trại vận hành các trang trại chăn nuôi theo tiêu chuẩn an toàn sinh học, kết hợp kinh nghiệm thực tế với quy trình giám sát chặt chẽ ở từng giai đoạn nuôi.\n\nĐây cũng là nơi thử nghiệm và chứng minh hiệu quả thực tế của sản phẩm dinh dưỡng và giải pháp thú y trong hệ sinh thái, trước khi nhân rộng ra thị trường.\n\nToàn bộ dữ liệu sức khoẻ và tăng trưởng đàn nuôi được ghi nhận xuyên suốt, làm cơ sở để Synetic Dinh Dưỡng và Synetic Thú Y liên tục cải tiến sản phẩm.\n\nSynetic Nông Trại vận hành trên hạ tầng đất đai, nhà xưởng do Tập đoàn đầu tư và quản lý tập trung, đồng thời là nơi thực chứng hiệu quả của công nghệ chăn nuôi thông minh mà Synetic Group đang từng bước ứng dụng.',
    factsTitle: 'THÔNG TIN NHANH',
    facts: [
      { label: 'Lĩnh vực', value: 'Chăn nuôi trang trại' },
      { label: 'Tiêu chuẩn', value: 'An toàn sinh học' },
      { label: 'Vai trò', value: 'Thực chứng giải pháp trong hệ sinh thái' }
    ] },
  { slug: 'capital', name: 'Synetic Capital', brand: 'Synetic', brandSub: 'CAPITAL', accent: 'gold',
    tagline: 'Dẫn vốn hiệu quả, mở lối tăng trưởng', legalName: 'Công ty Cổ phần Synetic Capital', siteImageKey: 'member-capital',
    body: 'Synetic Capital giữ vai trò dẫn vốn và điều phối tài chính cho hệ sinh thái, thẩm định và rót vốn cho các dự án mở rộng của các công ty thành viên.\n\nNgoài đầu tư nội bộ, Synetic Capital tìm kiếm và hợp tác với các đối tác tài chính bên ngoài để mở rộng năng lực sản xuất và mạng lưới của toàn tập đoàn.\n\nMọi quyết định rót vốn đều gắn với hiệu quả thực tế đã được kiểm chứng tại Synetic Nông Trại và nhu cầu mở rộng của các đơn vị sản xuất, vận hành.\n\nSynetic Capital phối hợp chặt chẽ với khối Quản trị – Điều hành của Tập đoàn trong việc thẩm định các dự án bất động sản, hạ tầng và mở rộng sản xuất, đảm bảo dòng vốn được phân bổ đúng ưu tiên chiến lược của toàn hệ sinh thái.',
    factsTitle: 'THÔNG TIN NHANH',
    facts: [
      { label: 'Lĩnh vực', value: 'Đầu tư & tài chính' },
      { label: 'Vai trò', value: 'Dẫn vốn cho hệ sinh thái' },
      { label: 'Định hướng', value: 'Mở rộng năng lực sản xuất & mạng lưới' }
    ] }
];

// Reads data/members.json as a proper array-based list, seeding it from
// MEMBER_SEED (+ any logo already uploaded via the old fixed image slots)
// on first use, or migrating it if it's still in the older flat-object shape.
function getMembersData() {
  const current = readJSON('members');
  if (Array.isArray(current.items)) return current;

  const siteImages = readJSON('site-images');
  const items = MEMBER_SEED.map((m, i) => ({
    id: (Date.now() + i).toString(),
    slug: m.slug,
    name: m.name,
    brand: m.brand,
    brandSub: m.brandSub,
    accent: m.accent,
    tagline: (current[m.slug] && current[m.slug].tagline) || m.tagline,
    legalName: (current[m.slug] && current[m.slug].legalName) || m.legalName,
    logo: siteImages[m.siteImageKey] || null,
    body: m.body,
    factsTitle: m.factsTitle,
    facts: m.facts,
    published: true
  }));
  const migrated = { items };
  writeJSON('members', migrated);
  return migrated;
}

function commonLocals() {
  return {
    ticker: readJSON('ticker'),
    siteImages: readJSON('site-images'),
    footer: readJSON('footer'),
    coreValues: readJSON('core-values').items,
    homepage: readJSON('homepage'),
    members: getMembersData().items.filter((m) => m.published)
  };
}

// Lets an admin bold part of a hero slide title with **like this** instead of
// needing to know HTML — rendered as the existing gold <span> highlight.
function renderHeroTitle(title) {
  return (title || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<span>$1</span>');
}

const ROOT = path.join(__dirname, '..');
const PORT = process.env.PORT || 3000;

const app = express();
app.set('view engine', 'ejs');
app.set('views', path.join(ROOT, 'views'));
app.set('trust proxy', 1);

// Cache-busting query string for CSS/JS, so every restart forces browsers
// to fetch fresh assets instead of serving a stale cached copy.
const ASSET_VERSION = Date.now();
app.locals.assetVersion = ASSET_VERSION;

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
  { urls: ['/thu-vien.html'], view: 'thu-vien', root: '' },
  { urls: ['/ve-synetic/thong-diep-chu-tich-hdqt.html'], view: 've-synetic/thong-diep-chu-tich-hdqt', root: '../' },
  { urls: ['/ve-synetic/thong-diep-tong-giam-doc.html'], view: 've-synetic/thong-diep-tong-giam-doc', root: '../' },
  { urls: ['/ve-synetic/gia-tri-cot-loi.html'], view: 've-synetic/gia-tri-cot-loi', root: '../' },
  { urls: ['/ve-synetic/lich-su.html'], view: 've-synetic/lich-su', root: '../' },
  { urls: ['/ve-synetic/tam-nhin-chien-luoc.html'], view: 've-synetic/tam-nhin-chien-luoc', root: '../' },
  { urls: ['/ve-synetic/mang-luoi-hoat-dong.html'], view: 've-synetic/mang-luoi-hoat-dong', root: '../' },
  { urls: ['/ve-synetic/trach-nhiem-xa-hoi.html'], view: 've-synetic/trach-nhiem-xa-hoi', root: '../' },
  { urls: ['/ve-synetic/giai-thuong.html'], view: 've-synetic/giai-thuong', root: '../' }
];

for (const page of PAGES) {
  for (const url of page.urls) {
    app.get(url, (req, res) => {
      const pages = readJSON('pages');
      res.render(page.view, { root: page.root, ...commonLocals(), pages });
    });
  }
}

app.get(['/', '/index.html'], (req, res) => {
  const pages = readJSON('pages');
  const heroSlides = readJSON('hero-slides').items.filter((i) => i.published);
  res.render('index', {
    root: '',
    ...commonLocals(),
    pages,
    news: publishedNewsSorted().slice(0, 6),
    heroSlides,
    renderHeroTitle
  });
});

// ---------- Thành viên hệ sinh thái (public detail page) ----------

app.get('/thanh-vien/:slug.html', (req, res) => {
  const members = getMembersData().items.filter((i) => i.published);
  const item = members.find((i) => i.slug === req.params.slug);
  if (!item) {
    return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
  }
  const otherMembers = members.filter((i) => i.slug !== item.slug);
  res.render('thanh-vien-chi-tiet', { root: '../', ...commonLocals(), item, otherMembers });
});

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

// Turns a news article's body text + gallery images into an ordered list of
// blocks (paragraphs and images), so an admin can place an image mid-article
// by typing a placeholder like "[ảnh 1]" on its own line. Any gallery image
// with no matching placeholder is appended at the end, so nothing uploaded
// is ever silently dropped from the page.
function renderNewsBlocks(body, images) {
  images = Array.isArray(images) ? images : [];
  const used = new Set();
  const placeholderRe = /^\[\s*ảnh\s*(\d+)\s*\]$/i;
  const blocks = [];
  (body || '').replace(/\r\n/g, '\n').split(/\n{2,}/).forEach((raw) => {
    const text = raw.trim();
    if (!text) return;
    const m = text.match(placeholderRe);
    const idx = m ? parseInt(m[1], 10) - 1 : -1;
    if (m && images[idx]) {
      blocks.push({ type: 'img', src: images[idx] });
      used.add(idx);
    } else {
      blocks.push({ type: 'p', text });
    }
  });
  images.forEach((src, i) => {
    if (!used.has(i)) blocks.push({ type: 'img', src });
  });
  return blocks;
}

app.get('/tin-tuc/:slug.html', (req, res) => {
  const news = readJSON('news');
  const item = news.items.find((i) => i.slug === req.params.slug && i.published);
  if (!item) {
    return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
  }
  const blocks = renderNewsBlocks(item.body, item.images);
  res.render('tin-tuc-chi-tiet', { root: '../', ...commonLocals(), item, blocks });
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
  newsUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 10 }])(req, res, (err) => {
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
    const coverFile = req.files && req.files.image && req.files.image[0];
    const galleryFiles = (req.files && req.files.images) || [];
    const news = readJSON('news');
    news.items.push({
      id: Date.now().toString(),
      slug: slugify(title),
      title,
      excerpt: (req.body.excerpt || '').trim(),
      body: (req.body.body || '').replace(/\r\n/g, '\n').trim(),
      image: coverFile ? publicPathFor('news', coverFile.filename) : null,
      images: galleryFiles.map((f) => publicPathFor('news', f.filename)),
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

  newsUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 10 }])(req, res, (err) => {
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

    const coverFile = req.files && req.files.image && req.files.image[0];
    if (coverFile) {
      deleteUploadedFile(item.image);
      item.image = publicPathFor('news', coverFile.filename);
    }

    if (!Array.isArray(item.images)) item.images = [];
    const removeSet = new Set([].concat(req.body.removeImages || []));
    if (removeSet.size) {
      item.images = item.images.filter((p) => {
        if (removeSet.has(p)) {
          deleteUploadedFile(p);
          return false;
        }
        return true;
      });
    }
    const galleryFiles = (req.files && req.files.images) || [];
    for (const f of galleryFiles) {
      item.images.push(publicPathFor('news', f.filename));
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
    (item.images || []).forEach(deleteUploadedFile);
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

adminRouter.post('/tuyen-dung/new', (req, res) => {
  jobsUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/jobs-form', { item: null, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
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
      image: req.file ? publicPathFor('jobs', req.file.filename) : null,
      published: req.body.published === '1'
    });
    writeJSON('jobs', jobs);
    res.redirect('/admin/tuyen-dung');
  });
});

adminRouter.get('/tuyen-dung/:id/edit', (req, res) => {
  const jobs = readJSON('jobs');
  const item = jobs.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/tuyen-dung');
  res.render('admin/jobs-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/tuyen-dung/:id/edit', (req, res) => {
  const jobs = readJSON('jobs');
  const item = jobs.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/tuyen-dung');

  jobsUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/jobs-form', { item, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
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
    if (req.file) {
      deleteUploadedFile(item.image);
      item.image = publicPathFor('jobs', req.file.filename);
    }
    writeJSON('jobs', jobs);
    res.redirect('/admin/tuyen-dung');
  });
});

adminRouter.post('/tuyen-dung/:id/delete', auth.verifyCsrf, (req, res) => {
  const jobs = readJSON('jobs');
  const item = jobs.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.image);
    jobs.items = jobs.items.filter((i) => i.id !== req.params.id);
    writeJSON('jobs', jobs);
  }
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

// ---------- Admin: Giá trị cốt lõi (trang chủ) ----------

adminRouter.get('/gia-tri', (req, res) => {
  const coreValues = readJSON('core-values');
  res.render('admin/core-values-form', { items: coreValues.items, csrfToken: auth.ensureCsrfToken(req), error: null });
});

adminRouter.post('/gia-tri', (req, res) => {
  if (!auth.csrfOk(req)) {
    return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
  }
  const titles = [].concat(req.body.title || []);
  const descriptions = [].concat(req.body.description || []);
  const items = titles.map((title, i) => ({
    title: (title || '').trim(),
    description: (descriptions[i] || '').trim()
  }));
  writeJSON('core-values', { items });
  res.redirect('/admin/gia-tri');
});

// ---------- Admin: Nội dung khác trang chủ (giới thiệu, tầm nhìn, sứ mệnh) ----------

adminRouter.get('/noi-dung-trang-chu', (req, res) => {
  const homepage = readJSON('homepage');
  res.render('admin/homepage-form', { homepage, csrfToken: auth.ensureCsrfToken(req), error: null });
});

adminRouter.post('/noi-dung-trang-chu', (req, res) => {
  if (!auth.csrfOk(req)) {
    return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
  }
  const homepage = {
    introHeading: (req.body.introHeading || '').trim(),
    introText: (req.body.introText || '').trim(),
    visionTitle: (req.body.visionTitle || '').trim(),
    visionText: (req.body.visionText || '').trim(),
    missionTitle: (req.body.missionTitle || '').trim(),
    missionText: (req.body.missionText || '').trim()
  };
  writeJSON('homepage', homepage);
  res.redirect('/admin/noi-dung-trang-chu');
});

// ---------- Admin: Thành viên hệ sinh thái ----------

adminRouter.get('/thanh-vien', (req, res) => {
  const members = getMembersData();
  res.render('admin/members-list', { items: members.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/thanh-vien/new', (req, res) => {
  res.render('admin/members-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/thanh-vien/new', (req, res) => {
  memberUpload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/members-form', { item: null, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).render('admin/members-form', { item: null, error: 'Vui lòng nhập tên thành viên.', csrfToken: auth.ensureCsrfToken(req) });
    }
    const facts = [1, 2, 3].map((i) => ({
      label: (req.body['factLabel' + i] || '').trim(),
      value: (req.body['factValue' + i] || '').trim()
    })).filter((f) => f.label || f.value);
    const members = getMembersData();
    members.items.push({
      id: Date.now().toString(),
      slug: slugify(name),
      name,
      brand: (req.body.brand || 'Synetic').trim(),
      brandSub: (req.body.brandSub || '').trim().toUpperCase(),
      accent: req.body.accent || 'emerald',
      tagline: (req.body.tagline || '').trim(),
      legalName: (req.body.legalName || '').trim(),
      logo: req.file ? publicPathFor('members', req.file.filename) : null,
      body: (req.body.body || '').replace(/\r\n/g, '\n').trim(),
      factsTitle: (req.body.factsTitle || '').trim(),
      facts,
      published: req.body.published === '1'
    });
    writeJSON('members', members);
    res.redirect('/admin/thanh-vien');
  });
});

adminRouter.get('/thanh-vien/:id/edit', (req, res) => {
  const members = getMembersData();
  const item = members.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/thanh-vien');
  res.render('admin/members-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/thanh-vien/:id/edit', (req, res) => {
  const members = getMembersData();
  const item = members.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/thanh-vien');

  memberUpload.single('logo')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/members-form', { item, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const name = (req.body.name || '').trim();
    if (!name) {
      return res.status(400).render('admin/members-form', { item, error: 'Vui lòng nhập tên thành viên.', csrfToken: auth.ensureCsrfToken(req) });
    }
    item.name = name;
    item.slug = slugify(name);
    item.brand = (req.body.brand || 'Synetic').trim();
    item.brandSub = (req.body.brandSub || '').trim().toUpperCase();
    item.accent = req.body.accent || 'emerald';
    item.tagline = (req.body.tagline || '').trim();
    item.legalName = (req.body.legalName || '').trim();
    item.body = (req.body.body || '').replace(/\r\n/g, '\n').trim();
    item.factsTitle = (req.body.factsTitle || '').trim();
    item.facts = [1, 2, 3].map((i) => ({
      label: (req.body['factLabel' + i] || '').trim(),
      value: (req.body['factValue' + i] || '').trim()
    })).filter((f) => f.label || f.value);
    item.published = req.body.published === '1';
    if (req.file) {
      deleteUploadedFile(item.logo);
      item.logo = publicPathFor('members', req.file.filename);
    }
    writeJSON('members', members);
    res.redirect('/admin/thanh-vien');
  });
});

adminRouter.post('/thanh-vien/:id/delete', auth.verifyCsrf, (req, res) => {
  const members = getMembersData();
  const item = members.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.logo);
    members.items = members.items.filter((i) => i.id !== req.params.id);
    writeJSON('members', members);
  }
  res.redirect('/admin/thanh-vien');
});

adminRouter.post('/thanh-vien/:id/move', auth.verifyCsrf, (req, res) => {
  const members = getMembersData();
  const idx = members.items.findIndex((i) => i.id === req.params.id);
  const dir = req.body.direction === 'up' ? -1 : 1;
  const swapWith = idx + dir;
  if (idx !== -1 && swapWith >= 0 && swapWith < members.items.length) {
    const tmp = members.items[idx];
    members.items[idx] = members.items[swapWith];
    members.items[swapWith] = tmp;
    writeJSON('members', members);
  }
  res.redirect('/admin/thanh-vien');
});

// ---------- Admin: Slide trang chủ (ảnh nền + tiêu đề) ----------

adminRouter.get('/hero', (req, res) => {
  const heroSlides = readJSON('hero-slides');
  res.render('admin/hero-list', { items: heroSlides.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/hero/new', (req, res) => {
  res.render('admin/hero-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/hero/new', (req, res) => {
  heroUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/hero-form', { item: null, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).render('admin/hero-form', { item: null, error: 'Vui lòng nhập tiêu đề.', csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!req.file) {
      return res.status(400).render('admin/hero-form', { item: null, error: 'Vui lòng chọn ảnh nền.', csrfToken: auth.ensureCsrfToken(req) });
    }
    const heroSlides = readJSON('hero-slides');
    heroSlides.items.push({
      id: Date.now().toString(),
      image: publicPathFor('hero', req.file.filename),
      eyebrow: (req.body.eyebrow || '').trim(),
      title,
      description: (req.body.description || '').trim(),
      published: req.body.published === '1'
    });
    writeJSON('hero-slides', heroSlides);
    res.redirect('/admin/hero');
  });
});

adminRouter.get('/hero/:id/edit', (req, res) => {
  const heroSlides = readJSON('hero-slides');
  const item = heroSlides.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/hero');
  res.render('admin/hero-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/hero/:id/edit', (req, res) => {
  const heroSlides = readJSON('hero-slides');
  const item = heroSlides.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/hero');

  heroUpload.single('image')(req, res, (err) => {
    if (err) {
      return res.status(400).render('admin/hero-form', { item, error: err.message, csrfToken: auth.ensureCsrfToken(req) });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    const title = (req.body.title || '').trim();
    if (!title) {
      return res.status(400).render('admin/hero-form', { item, error: 'Vui lòng nhập tiêu đề.', csrfToken: auth.ensureCsrfToken(req) });
    }
    item.title = title;
    item.eyebrow = (req.body.eyebrow || '').trim();
    item.description = (req.body.description || '').trim();
    item.published = req.body.published === '1';
    if (req.file) {
      deleteUploadedFile(item.image);
      item.image = publicPathFor('hero', req.file.filename);
    }
    writeJSON('hero-slides', heroSlides);
    res.redirect('/admin/hero');
  });
});

adminRouter.post('/hero/:id/delete', auth.verifyCsrf, (req, res) => {
  const heroSlides = readJSON('hero-slides');
  const item = heroSlides.items.find((i) => i.id === req.params.id);
  if (item) {
    deleteUploadedFile(item.image);
    heroSlides.items = heroSlides.items.filter((i) => i.id !== req.params.id);
    writeJSON('hero-slides', heroSlides);
  }
  res.redirect('/admin/hero');
});

adminRouter.post('/hero/:id/move', auth.verifyCsrf, (req, res) => {
  const heroSlides = readJSON('hero-slides');
  const idx = heroSlides.items.findIndex((i) => i.id === req.params.id);
  const dir = req.body.direction === 'up' ? -1 : 1;
  const swapWith = idx + dir;
  if (idx !== -1 && swapWith >= 0 && swapWith < heroSlides.items.length) {
    const tmp = heroSlides.items[idx];
    heroSlides.items[idx] = heroSlides.items[swapWith];
    heroSlides.items[swapWith] = tmp;
    writeJSON('hero-slides', heroSlides);
  }
  res.redirect('/admin/hero');
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
    logoHeight: siteImages.logoHeight || 52,
    logoHeightMobile: siteImages.logoHeightMobile || 58,
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
        logoHeight: siteImages.logoHeight || 52,
        logoHeightMobile: siteImages.logoHeightMobile || 58,
        error: err.message,
        csrfToken: auth.ensureCsrfToken(req)
      });
    }
    if (!auth.csrfOk(req)) {
      return res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
    }
    if (!req.file && !siteImages[def.key]) {
      return res.status(400).render('admin/site-images-form', {
        key: def.key,
        label: def.label,
        currentImage: null,
        logoHeight: siteImages.logoHeight || 52,
        logoHeightMobile: siteImages.logoHeightMobile || 58,
        error: 'Vui lòng chọn một ảnh để tải lên.',
        csrfToken: auth.ensureCsrfToken(req)
      });
    }
    if (req.file) {
      const oldImage = siteImages[def.key];
      siteImages[def.key] = publicPathFor('site', req.file.filename);
      deleteUploadedFile(oldImage);
    }
    if (def.key === 'logo') {
      const h1 = parseInt(req.body.logoHeight, 10);
      const h2 = parseInt(req.body.logoHeightMobile, 10);
      siteImages.logoHeight = (h1 >= 16 && h1 <= 200) ? h1 : 52;
      siteImages.logoHeightMobile = (h2 >= 16 && h2 <= 200) ? h2 : 58;
    }
    writeJSON('site-images', siteImages);
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

'use strict';
const crypto = require('crypto');
const { readJSON, writeJSON } = require('./data-store');
const sd = require('./site-data');

const DEFAULT_HEADINGS = {
  'lich-su': { label: 'Lịch sử', heading: 'LỊCH SỬ HÌNH THÀNH' },
  'giai-thuong': { label: 'Giải thưởng', heading: 'CÁC GIẢI THƯỞNG' }
};

const THEME_BY_ACCENT = { emerald: 'green', jade: 'green', ocean: 'blue', gold: 'gold' };

// Placeholder photos used until an admin uploads one for a member's info cards.
const FACT_IMAGES = {
  nutrition: ['assets/img/prod-bag.jpg', 'assets/img/prod-bag.jpg', 'assets/img/prod-bag.jpg'],
  vet: ['assets/img/info-vet.jpg', 'assets/img/info-cat.jpg', 'assets/img/info-pig.jpg'],
  farm: ['assets/img/info-vet.jpg', 'assets/img/info-cat.jpg', 'assets/img/info-pig.jpg'],
  logistics: ['assets/img/info-warehouse.jpg', 'assets/img/info-box.jpg', 'assets/img/info-clock.jpg'],
  capital: ['assets/img/info-warehouse.jpg', 'assets/img/info-box.jpg', 'assets/img/info-clock.jpg']
};

function headingFor(p) {
  const d = DEFAULT_HEADINGS[p.slug];
  if (d && p.label === d.label) return d.heading;
  return (p.label || '').toUpperCase();
}

function splitDash(text) {
  const i = text.indexOf(' — ');
  if (i === -1) return null;
  return { head: text.slice(0, i).trim(), rest: text.slice(i + 3).trim() };
}

function buildAbout(vePages) {
  const bySlug = {};
  vePages.forEach((p) => { bySlug[p.slug] = p; });
  const used = new Set();
  const take = (slug) => { if (bySlug[slug]) { used.add(slug); return bySlug[slug]; } return null; };

  const out = { chair: null, history: null, strategy: null, csr: null, awards: null, extras: [] };

  const chair = take('thong-diep-chu-tich-hdqt');
  if (chair) {
    const m = /^(Thông điệp)\s+(.+)$/i.exec(chair.label || '');
    out.chair = {
      slug: chair.slug,
      t1: m ? m[1] : '',
      t2: (m ? m[2] : chair.label || '').toUpperCase(),
      paras: sd.paragraphs(chair.body),
      sign: chair.hasSign && chair.signName ? { name: chair.signName, title: chair.signTitle } : null
    };
  }

  const history = take('lich-su');
  if (history) out.history = { slug: history.slug, heading: headingFor(history), paras: sd.paragraphs(history.body) };

  const strategy = take('tam-nhin-chien-luoc');
  if (strategy) {
    const paras = sd.paragraphs(strategy.body);
    const pillars = [];
    let vision = null;
    const rest = [];
    paras.forEach((p, i) => {
      if (i > 0 && /^Tầm nhìn/i.test(p)) {
        const m = /Tầm nhìn\s*[“"']([^”"']+)[”"']/i.exec(p);
        vision = { title: m ? 'TẦM NHÌN “' + m[1].toUpperCase() + '”' : 'TẦM NHÌN', text: p };
      } else if (i > 0 && pillars.length < 3 && splitDash(p)) {
        const d = splitDash(p);
        pillars.push({ title: d.head, text: d.rest.charAt(0).toUpperCase() + d.rest.slice(1) });
      } else if (i > 0) {
        rest.push(p);
      }
    });
    out.strategy = { slug: strategy.slug, heading: headingFor(strategy), intro: paras[0] || '', pillars, vision, rest };
  }

  const csr = take('trach-nhiem-xa-hoi');
  if (csr) {
    const paras = sd.paragraphs(csr.body);
    const items = [];
    const plain = [];
    paras.forEach((p, i) => {
      const d = i > 0 ? splitDash(p) : null;
      if (d && /^Với\s/i.test(d.head)) items.push({ title: d.head.toUpperCase(), text: d.rest });
      else plain.push(p);
    });
    out.csr = { slug: csr.slug, heading: headingFor(csr), plain, items };
  }

  const awards = take('giai-thuong');
  if (awards) out.awards = { slug: awards.slug, heading: headingFor(awards), paras: sd.paragraphs(awards.body) };

  out.extras = vePages.filter((p) => !used.has(p.slug)).map((p) => ({
    slug: p.slug,
    heading: headingFor(p),
    paras: sd.paragraphs(p.body),
    sign: p.hasSign && p.signName ? { name: p.signName, title: p.signTitle } : null
  }));

  return out;
}

// ---------- contact form (footer + project page) ----------

const contactHits = new Map();
function limited(ip) {
  const now = Date.now();
  const hits = (contactHits.get(ip) || []).filter((t) => now - t < 10 * 60 * 1000);
  if (hits.length >= 5) { contactHits.set(ip, hits); return true; }
  hits.push(now);
  contactHits.set(ip, hits);
  return false;
}

function safeBack(back) {
  return typeof back === 'string' && /^\/[A-Za-z0-9_\-./]*$/.test(back) && !back.startsWith('//') ? back : '/';
}

module.exports = function registerPublic(app, deps) {
  const { getMembersData, getVeSyneticPages, commonLocals, renderHeroTitle, renderHeroWords } = deps;

  function publishedNewsSorted() {
    return readJSON('news').items
      .filter((i) => i.published)
      .sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : a.publishedAt > b.publishedAt ? -1 : 0));
  }
  deps.publishedNewsSorted = publishedNewsSorted;

  // Turns a news article's body text + gallery images into ordered blocks so an
  // admin can drop an image mid-article by typing "[ảnh 1]" on its own line.
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
      if (m && images[idx]) { blocks.push({ type: 'img', src: images[idx] }); used.add(idx); }
      else blocks.push({ type: 'p', text });
    });
    images.forEach((src, i) => { if (!used.has(i)) blocks.push({ type: 'img', src }); });
    return blocks;
  }

  // ----- old multi-page "Về Synetic" URLs now live on one page -----
  app.get('/ve-synetic/:slug.html', (req, res) => {
    if (req.params.slug === 'doi-tac-khach-hang') return res.redirect(301, '/doi-tac.html');
    res.redirect(301, '/ve-chung-toi.html#' + encodeURIComponent(req.params.slug));
  });

  // ----- home -----
  app.get(['/', '/index.html'], (req, res) => {
    res.render('index', {
      root: '',
      ...commonLocals(),
      homepage: sd.getHomepage(),
      heroSlides: readJSON('hero-slides').items.filter((i) => i.published),
      news: publishedNewsSorted().slice(0, 9),
      renderHeroTitle,
      renderHeroWords
    });
  });

  // ----- ecosystem members -----
  app.get('/thanh-vien/:slug.html', (req, res) => {
    const members = getMembersData().items.filter((i) => i.published)
      .map((m) => (m.logo === 'assets/logos/vinafeed-logo.jpg' ? Object.assign({}, m, { logo: null }) : m));
    const item = members.find((i) => i.slug === req.params.slug);
    if (!item) return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
    const defaults = FACT_IMAGES[item.slug] || [];
    const facts = (item.facts || []).map((f, i) => Object.assign({}, f, { image: f.image || defaults[i] || null }));
    res.render('thanh-vien-chi-tiet', {
      root: '../',
      ...commonLocals(),
      item,
      facts,
      homepage: sd.getHomepage(),
      theme: THEME_BY_ACCENT[item.accent] || 'blue',
      otherMembers: members.filter((i) => i.slug !== item.slug)
    });
  });

  // ----- news -----
  app.get('/tin-tuc.html', (req, res) => {
    const all = publishedNewsSorted();
    const market = all.filter((i) => i.category === 'thi-truong');
    const groups = [];
    for (let i = 0; i < market.length; i += 3) groups.push(market.slice(i, i + 3));
    res.render('tin-tuc', {
      root: '',
      ...commonLocals(),
      groups,
      internal: all.filter((i) => i.category !== 'thi-truong')
    });
  });

  app.get('/tin-tuc/:slug.html', (req, res) => {
    const item = readJSON('news').items.find((i) => i.slug === req.params.slug && i.published);
    if (!item) return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
    const related = publishedNewsSorted().filter((i) => i.slug !== item.slug).slice(0, 3);
    res.render('tin-tuc-chi-tiet', { root: '../', ...commonLocals(), item, blocks: renderNewsBlocks(item.body, item.images), related });
  });

  // ----- projects -----
  app.get('/du-an.html', (req, res) => {
    const items = sd.getProjects().items.filter((i) => i.published);
    const uniq = (key) => Array.from(new Set(items.map((i) => i[key]).filter(Boolean)));
    res.render('du-an', {
      root: '',
      ...commonLocals(),
      items,
      featured: items.filter((i) => i.featured),
      opts: { type: uniq('type'), title: uniq('title'), location: uniq('location'), status: uniq('status') }
    });
  });

  app.get('/du-an/:slug.html', (req, res) => {
    const item = sd.getProjects().items.find((i) => i.slug === req.params.slug && i.published);
    if (!item) return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
    res.render('du-an-chi-tiet', { root: '../', ...commonLocals(), item });
  });

  // ----- jobs -----
  function jobFilters(items) {
    const uniq = (fn) => Array.from(new Set(items.map(fn).filter(Boolean)));
    return { departments: uniq((i) => i.department), locations: uniq((i) => i.area || i.location) };
  }

  app.get('/tuyen-dung.html', (req, res) => {
    const items = sd.getJobs().items.filter((i) => i.published)
      .sort((a, b) => (a.postedAt < b.postedAt ? 1 : a.postedAt > b.postedAt ? -1 : 0));
    res.render('tuyen-dung', { root: '', ...commonLocals(), items, ...jobFilters(items), recruit: sd.getRecruit() });
  });

  app.get('/tuyen-dung/:slug.html', (req, res) => {
    const all = sd.getJobs().items.filter((i) => i.published);
    const item = all.find((i) => i.slug === req.params.slug);
    if (!item) return res.status(404).type('text/plain; charset=utf-8').send('404 Not Found');
    res.render('tuyen-dung-chi-tiet', { root: '../', ...commonLocals(), item, ...jobFilters(all) });
  });

  // ----- about (all "Về Synetic" sections on one page) -----
  app.get('/ve-chung-toi.html', (req, res) => {
    const vePages = getVeSyneticPages().items.filter((p) => p.published);
    const pages = readJSON('pages');
    res.render('ve-chung-toi', {
      root: '',
      ...commonLocals(),
      about: buildAbout(vePages),
      coreValues: sd.getCoreValues(),
      network: sd.getNetwork(),
      team: readJSON('team').items,
      teamIntro: pages['doi-ngu-lanh-dao-intro'] || { body: '', chairmanNote: '' }
    });
  });

  // ----- partners / gallery -----
  app.get('/doi-tac.html', (req, res) => {
    res.render('doi-tac', { root: '', ...commonLocals(), homepage: sd.getHomepage(), partners: readJSON('partners').items });
  });

  app.get('/thu-vien.html', (req, res) => {
    res.render('thu-vien', { root: '', ...commonLocals() });
  });

  // ----- contact form -----
  app.post('/lien-he', (req, res) => {
    const back = safeBack(req.body.back);
    const to = (status) => res.redirect(303, back + '?gui=' + status + '#lien-he');
    if (req.body.company_site) return to('ok');
    const name = String(req.body.name || '').trim().slice(0, 120);
    const phone = String(req.body.phone || '').trim().slice(0, 40);
    const email = String(req.body.email || '').trim().slice(0, 120);
    const message = String(req.body.message || '').trim().slice(0, 3000);
    if (!name || !message || (!phone && !email)) return to('err');
    if (limited(req.ip)) return to('limit');
    const data = readJSON('contacts');
    data.items.unshift({
      id: Date.now().toString() + crypto.randomBytes(2).toString('hex'),
      name, phone, email, message,
      page: back,
      createdAt: new Date().toISOString(),
      read: false
    });
    data.items = data.items.slice(0, 2000);
    writeJSON('contacts', data);
    to('ok');
  });
};

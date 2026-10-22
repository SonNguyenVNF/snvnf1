'use strict';
const { readJSON, writeJSON } = require('./data-store');
const auth = require('./auth');
const { slugify } = require('./slug');
const { createUploader, publicPathFor, deleteUploadedFile } = require('./upload');
const sd = require('./site-data');

// Admin screens for the sections redesigned in the new site layout:
// projects, jobs, leadership team, contact messages, recruitment texts,
// network, homepage texts, footer and core values.
module.exports = function registerAdminExtra(adminRouter) {
  const projectsUpload = createUploader('projects');
  const teamUpload = createUploader('team');
  const csrf = (req) => auth.ensureCsrfToken(req);
  const expired = (res) => res.status(403).send('Phiên làm việc đã hết hạn, vui lòng tải lại trang và thử lại.');
  const clean = (v) => String(v == null ? '' : v).replace(/\r\n/g, '\n').trim();
  const one = (v) => String(v == null ? '' : v).trim();
  const arr = (v) => [].concat(v == null ? [] : v);
  const fileOf = (req, field) => (req.files && req.files[field] && req.files[field][0]) || null;
  const filesOf = (req, field) => (req.files && req.files[field]) || [];

  function moveItem(list, id, direction) {
    const idx = list.findIndex((i) => i.id === id);
    const swap = idx + (direction === 'up' ? -1 : 1);
    if (idx !== -1 && swap >= 0 && swap < list.length) {
      const tmp = list[idx]; list[idx] = list[swap]; list[swap] = tmp;
      return true;
    }
    return false;
  }

  // ---------- Dự án ----------
  const projectFields = [{ name: 'image', maxCount: 1 }, { name: 'images', maxCount: 12 }];
  const renderProjectForm = (res, req, item, error, status) =>
    res.status(status || 200).render('admin/projects-form', { item, error, csrfToken: csrf(req) });

  adminRouter.get('/du-an', (req, res) => {
    res.render('admin/projects-list', { items: sd.getProjects().items, csrfToken: csrf(req) });
  });
  adminRouter.get('/du-an/new', (req, res) => renderProjectForm(res, req, null, null));
  adminRouter.post('/du-an/new', (req, res) => {
    projectsUpload.fields(projectFields)(req, res, (err) => {
      if (err) return renderProjectForm(res, req, null, err.message, 400);
      if (!auth.csrfOk(req)) return expired(res);
      const title = one(req.body.title);
      if (!title) return renderProjectForm(res, req, null, 'Vui lòng nhập tên dự án.', 400);
      const data = sd.getProjects();
      const cover = fileOf(req, 'image');
      data.items.push({
        id: Date.now().toString(),
        slug: slugify(title),
        title,
        type: one(req.body.type),
        location: one(req.body.location),
        status: one(req.body.status),
        excerpt: one(req.body.excerpt),
        body: clean(req.body.body),
        image: cover ? publicPathFor('projects', cover.filename) : null,
        images: filesOf(req, 'images').map((f) => publicPathFor('projects', f.filename)),
        featured: req.body.featured === '1',
        published: req.body.published === '1'
      });
      writeJSON('projects', data);
      res.redirect('/admin/du-an');
    });
  });
  adminRouter.get('/du-an/:id/edit', (req, res) => {
    const item = sd.getProjects().items.find((i) => i.id === req.params.id);
    if (!item) return res.redirect('/admin/du-an');
    renderProjectForm(res, req, item, null);
  });
  adminRouter.post('/du-an/:id/edit', (req, res) => {
    const data = sd.getProjects();
    const item = data.items.find((i) => i.id === req.params.id);
    if (!item) return res.redirect('/admin/du-an');
    projectsUpload.fields(projectFields)(req, res, (err) => {
      if (err) return renderProjectForm(res, req, item, err.message, 400);
      if (!auth.csrfOk(req)) return expired(res);
      const title = one(req.body.title);
      if (!title) return renderProjectForm(res, req, item, 'Vui lòng nhập tên dự án.', 400);
      item.title = title;
      item.type = one(req.body.type);
      item.location = one(req.body.location);
      item.status = one(req.body.status);
      item.excerpt = one(req.body.excerpt);
      item.body = clean(req.body.body);
      item.featured = req.body.featured === '1';
      item.published = req.body.published === '1';
      const cover = fileOf(req, 'image');
      if (cover) { deleteUploadedFile(item.image); item.image = publicPathFor('projects', cover.filename); }
      const remove = new Set(arr(req.body.removeImages));
      item.images = (item.images || []).filter((p) => { if (remove.has(p)) { deleteUploadedFile(p); return false; } return true; });
      filesOf(req, 'images').forEach((f) => item.images.push(publicPathFor('projects', f.filename)));
      writeJSON('projects', data);
      res.redirect('/admin/du-an');
    });
  });
  adminRouter.post('/du-an/:id/delete', auth.verifyCsrf, (req, res) => {
    const data = sd.getProjects();
    const item = data.items.find((i) => i.id === req.params.id);
    if (item) {
      deleteUploadedFile(item.image);
      (item.images || []).forEach(deleteUploadedFile);
      data.items = data.items.filter((i) => i.id !== req.params.id);
      writeJSON('projects', data);
    }
    res.redirect('/admin/du-an');
  });
  adminRouter.post('/du-an/:id/move', auth.verifyCsrf, (req, res) => {
    const data = sd.getProjects();
    if (moveItem(data.items, req.params.id, req.body.direction)) writeJSON('projects', data);
    res.redirect('/admin/du-an');
  });

  // ---------- Tuyển dụng ----------
  const renderJobForm = (res, req, item, error, status) =>
    res.status(status || 200).render('admin/jobs-form', { item, error, today: new Date().toISOString().slice(0, 10), csrfToken: csrf(req) });

  adminRouter.get('/tuyen-dung', (req, res) => {
    res.render('admin/jobs-list', { items: sd.getJobs().items, csrfToken: csrf(req) });
  });
  adminRouter.get('/tuyen-dung/new', (req, res) => renderJobForm(res, req, null, null));
  adminRouter.post('/tuyen-dung/new', auth.verifyCsrf, (req, res) => {
    const title = one(req.body.title);
    if (!title) return renderJobForm(res, req, null, 'Vui lòng nhập vị trí tuyển dụng.', 400);
    const data = sd.getJobs();
    data.items.push({
      id: Date.now().toString(),
      slug: slugify(title),
      title,
      department: one(req.body.department),
      location: one(req.body.location),
      postedAt: one(req.body.postedAt) || new Date().toISOString().slice(0, 10),
      body: clean(req.body.body),
      published: req.body.published === '1'
    });
    writeJSON('jobs', data);
    res.redirect('/admin/tuyen-dung');
  });
  adminRouter.get('/tuyen-dung/:id/edit', (req, res) => {
    const item = sd.getJobs().items.find((i) => i.id === req.params.id);
    if (!item) return res.redirect('/admin/tuyen-dung');
    renderJobForm(res, req, item, null);
  });
  adminRouter.post('/tuyen-dung/:id/edit', auth.verifyCsrf, (req, res) => {
    const data = sd.getJobs();
    const item = data.items.find((i) => i.id === req.params.id);
    if (!item) return res.redirect('/admin/tuyen-dung');
    const title = one(req.body.title);
    if (!title) return renderJobForm(res, req, item, 'Vui lòng nhập vị trí tuyển dụng.', 400);
    item.title = title;
    item.department = one(req.body.department);
    item.location = one(req.body.location);
    item.postedAt = one(req.body.postedAt) || item.postedAt;
    item.body = clean(req.body.body);
    item.published = req.body.published === '1';
    writeJSON('jobs', data);
    res.redirect('/admin/tuyen-dung');
  });
  adminRouter.post('/tuyen-dung/:id/delete', auth.verifyCsrf, (req, res) => {
    const data = sd.getJobs();
    data.items = data.items.filter((i) => i.id !== req.params.id);
    writeJSON('jobs', data);
    res.redirect('/admin/tuyen-dung');
  });

  // ---------- Đội ngũ lãnh đạo ----------
  const renderTeamForm = (res, req, item, error, status) =>
    res.status(status || 200).render('admin/team-form', { item, error, csrfToken: csrf(req) });
  const teamPayload = (req) => ({
    name: one(req.body.name),
    title: one(req.body.title),
    subtitle: one(req.body.subtitle),
    bio: one(req.body.bio),
    phone: one(req.body.phone),
    email: one(req.body.email)
  });

  adminRouter.get('/doi-ngu-lanh-dao', (req, res) => {
    res.render('admin/team-list', { items: readJSON('team').items, csrfToken: csrf(req) });
  });
  adminRouter.get('/doi-ngu-lanh-dao/new', (req, res) => renderTeamForm(res, req, null, null));
  adminRouter.post('/doi-ngu-lanh-dao/new', (req, res) => {
    teamUpload.single('photo')(req, res, (err) => {
      if (err) return renderTeamForm(res, req, null, err.message, 400);
      if (!auth.csrfOk(req)) return expired(res);
      const p = teamPayload(req);
      if (!p.name) return renderTeamForm(res, req, null, 'Vui lòng nhập họ tên.', 400);
      const team = readJSON('team');
      team.items.push(Object.assign({ id: Date.now().toString(), photo: req.file ? publicPathFor('team', req.file.filename) : null }, p));
      writeJSON('team', team);
      res.redirect('/admin/doi-ngu-lanh-dao');
    });
  });
  adminRouter.get('/doi-ngu-lanh-dao/:id/edit', (req, res) => {
    const item = readJSON('team').items.find((i) => i.id === req.params.id);
    if (!item) return res.redirect('/admin/doi-ngu-lanh-dao');
    renderTeamForm(res, req, item, null);
  });
  adminRouter.post('/doi-ngu-lanh-dao/:id/edit', (req, res) => {
    const team = readJSON('team');
    const item = team.items.find((i) => i.id === req.params.id);
    if (!item) return res.redirect('/admin/doi-ngu-lanh-dao');
    teamUpload.single('photo')(req, res, (err) => {
      if (err) return renderTeamForm(res, req, item, err.message, 400);
      if (!auth.csrfOk(req)) return expired(res);
      const p = teamPayload(req);
      if (!p.name) return renderTeamForm(res, req, item, 'Vui lòng nhập họ tên.', 400);
      Object.assign(item, p);
      if (req.file) { deleteUploadedFile(item.photo); item.photo = publicPathFor('team', req.file.filename); }
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
  adminRouter.post('/doi-ngu-lanh-dao/:id/move', auth.verifyCsrf, (req, res) => {
    const team = readJSON('team');
    if (moveItem(team.items, req.params.id, req.body.direction)) writeJSON('team', team);
    res.redirect('/admin/doi-ngu-lanh-dao');
  });

  // ---------- Tin nhắn liên hệ (form chân trang) ----------
  adminRouter.get('/tin-nhan', (req, res) => {
    const data = readJSON('contacts');
    res.render('admin/contacts-list', { items: data.items, csrfToken: csrf(req) });
  });
  adminRouter.post('/tin-nhan/:id/read', auth.verifyCsrf, (req, res) => {
    const data = readJSON('contacts');
    const item = data.items.find((i) => i.id === req.params.id);
    if (item) { item.read = !item.read; writeJSON('contacts', data); }
    res.redirect('/admin/tin-nhan');
  });
  adminRouter.post('/tin-nhan/:id/delete', auth.verifyCsrf, (req, res) => {
    const data = readJSON('contacts');
    data.items = data.items.filter((i) => i.id !== req.params.id);
    writeJSON('contacts', data);
    res.redirect('/admin/tin-nhan');
  });

  // ---------- Chân trang ----------
  const footerKeys = ['companyName', 'address', 'phone', 'email', 'website', 'facebook', 'tiktok', 'messenger', 'zalo', 'copyright'];
  adminRouter.get('/lien-he', (req, res) => {
    res.render('admin/footer-form', { footer: sd.getFooter(), csrfToken: csrf(req), error: null, saved: req.query.saved === '1' });
  });
  adminRouter.post('/lien-he', auth.verifyCsrf, (req, res) => {
    const footer = readJSON('footer');
    footerKeys.forEach((k) => { footer[k] = one(req.body[k]); });
    writeJSON('footer', footer);
    res.redirect('/admin/lien-he?saved=1');
  });

  // ---------- Giá trị cốt lõi ----------
  adminRouter.get('/gia-tri', (req, res) => {
    const cv = sd.getCoreValues();
    res.render('admin/core-values-form', { items: cv.items, note: cv.note, csrfToken: csrf(req), error: null, saved: req.query.saved === '1' });
  });
  adminRouter.post('/gia-tri', auth.verifyCsrf, (req, res) => {
    const titles = arr(req.body.title);
    const descriptions = arr(req.body.description);
    const items = titles.map((t, i) => ({ title: one(t), description: one(descriptions[i]) })).filter((v) => v.title);
    writeJSON('core-values', { items, note: one(req.body.note) });
    res.redirect('/admin/gia-tri?saved=1');
  });

  // ---------- Nội dung trang chủ ----------
  const homeKeys = Object.keys(sd.HOMEPAGE_DEFAULTS).filter((k) => k !== 'partnerItems');
  adminRouter.get('/noi-dung-trang-chu', (req, res) => {
    res.render('admin/homepage-form', { homepage: sd.getHomepage(), csrfToken: csrf(req), error: null, saved: req.query.saved === '1' });
  });
  adminRouter.post('/noi-dung-trang-chu', auth.verifyCsrf, (req, res) => {
    const homepage = readJSON('homepage');
    homeKeys.forEach((k) => { homepage[k] = clean(req.body[k]); });
    const titles = arr(req.body.partnerTitle);
    const texts = arr(req.body.partnerText);
    homepage.partnerItems = titles.map((t, i) => ({ title: one(t), text: one(texts[i]) })).filter((p) => p.title);
    writeJSON('homepage', homepage);
    res.redirect('/admin/noi-dung-trang-chu?saved=1');
  });

  // ---------- Trang tuyển dụng (chữ) ----------
  adminRouter.get('/trang-tuyen-dung', (req, res) => {
    res.render('admin/recruit-form', { r: sd.getRecruit(), csrfToken: csrf(req), saved: req.query.saved === '1' });
  });
  adminRouter.post('/trang-tuyen-dung', auth.verifyCsrf, (req, res) => {
    const pairs = (a, b, ka, kb) => arr(req.body[a]).map((x, i) => ({ [ka]: one(x), [kb]: one(arr(req.body[b])[i]) })).filter((p) => p[ka]);
    const data = {
      heroTitle: one(req.body.heroTitle),
      heroSub: one(req.body.heroSub),
      heroText: clean(req.body.heroText),
      heroText2: clean(req.body.heroText2),
      whyTitle: one(req.body.whyTitle),
      whyHighlight: one(req.body.whyHighlight),
      stats: pairs('statValue', 'statText', 'value', 'text'),
      whyItems: pairs('whyItemTitle', 'whyItemText', 'title', 'text')
    };
    writeJSON('recruit', data);
    res.redirect('/admin/trang-tuyen-dung?saved=1');
  });

  // ---------- Mạng lưới hoạt động ----------
  adminRouter.get('/mang-luoi', (req, res) => {
    res.render('admin/network-form', { n: sd.getNetwork(), csrfToken: csrf(req), saved: req.query.saved === '1' });
  });
  adminRouter.post('/mang-luoi', auth.verifyCsrf, (req, res) => {
    const titles = arr(req.body.itemTitle);
    const descs = arr(req.body.itemText);
    writeJSON('network', {
      title: one(req.body.title),
      centerText: clean(req.body.centerText),
      items: titles.map((t, i) => ({ title: one(t), description: one(descs[i]) })).filter((p) => p.title)
    });
    res.redirect('/admin/mang-luoi?saved=1');
  });
};

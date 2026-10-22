'use strict';
const { readJSON } = require('./data-store');

// Entrance effects an admin can pick for each block of the public site.
const EFFECTS = [
  { key: 'none', label: 'Không có hiệu ứng' },
  { key: 'fade', label: 'Hiện dần' },
  { key: 'up', label: 'Trượt lên và hiện dần' },
  { key: 'down', label: 'Trượt xuống và hiện dần' },
  { key: 'left', label: 'Trượt từ trái sang' },
  { key: 'right', label: 'Trượt từ phải sang' },
  { key: 'zoom', label: 'Phóng to dần' },
  { key: 'blur', label: 'Từ mờ thành rõ' }
];

// key, label shown in admin, group, selector of the child cards that can
// appear one after another, default effect
const SECTIONS = [
  { key: 'home-intro', label: 'Giới thiệu Synetic Group (chữ + ảnh cúp)', group: 'Trang chủ', def: 'up' },
  { key: 'home-members', label: 'Dải xanh Thành viên hệ sinh thái', group: 'Trang chủ', kids: '.mcard', def: 'up' },
  { key: 'home-partners', label: 'Dải vàng Đối tác và khách hàng', group: 'Trang chủ', kids: '.pi', def: 'up' },
  { key: 'home-news', label: 'Tin tức nổi bật', group: 'Trang chủ', kids: '.ncard', def: 'up' },
  { key: 'home-cta', label: 'Dải vàng Sẵn sàng hợp tác', group: 'Trang chủ', def: 'zoom' },
  { key: 'home-map', label: 'Bản đồ', group: 'Trang chủ', def: 'fade' },

  { key: 'about-chair', label: 'Thông điệp Chủ tịch', group: 'Về chúng tôi', def: 'fade' },
  { key: 'about-history', label: 'Lịch sử hình thành', group: 'Về chúng tôi', def: 'up' },
  { key: 'about-strategy', label: 'Tầm nhìn chiến lược (3 thẻ)', group: 'Về chúng tôi', kids: '.pillar', def: 'up' },
  { key: 'about-vision', label: 'Dải vàng Tầm nhìn', group: 'Về chúng tôi', def: 'fade' },
  { key: 'about-values', label: 'Giá trị cốt lõi (sơ đồ)', group: 'Về chúng tôi', kids: '.vitem', def: 'up' },
  { key: 'about-csr', label: 'Trách nhiệm xã hội', group: 'Về chúng tôi', def: 'up' },
  { key: 'about-awards', label: 'Các giải thưởng', group: 'Về chúng tôi', def: 'up' },
  { key: 'about-network', label: 'Mạng lưới hoạt động (sơ đồ)', group: 'Về chúng tôi', kids: '.net-item', def: 'up' },
  { key: 'about-extras', label: 'Các mục thêm (thông điệp Tổng giám đốc...)', group: 'Về chúng tôi', def: 'up' },
  { key: 'about-team', label: 'Đội ngũ lãnh đạo', group: 'Về chúng tôi', kids: '.tcard', def: 'up' },

  { key: 'member-main', label: 'Phần giới thiệu và thẻ thông tin', group: 'Trang thành viên', def: 'up' },
  { key: 'member-others', label: 'Dải Các thành viên khác', group: 'Trang thành viên', kids: '.mcard', def: 'up' },
  { key: 'member-cta', label: 'Dải Sẵn sàng hợp tác', group: 'Trang thành viên', def: 'zoom' },

  { key: 'news-market', label: 'Tin tức thị trường (khung nổi bật)', group: 'Tin tức', def: 'up' },
  { key: 'news-internal', label: 'Hoạt động nội bộ - Văn hóa công ty', group: 'Tin tức', kids: '.n-row', def: 'up' },
  { key: 'news-detail', label: 'Nội dung bài viết', group: 'Tin tức', def: 'fade' },
  { key: 'news-related', label: 'Bài viết liên quan', group: 'Tin tức', def: 'up' },

  { key: 'proj-featured', label: 'Dự án nổi bật', group: 'Dự án', def: 'fade' },
  { key: 'proj-find', label: 'Dải vàng Tìm dự án', group: 'Dự án', def: 'up' },
  { key: 'proj-grid', label: 'Lưới các dự án', group: 'Dự án', kids: '.pcard', def: 'up' },
  { key: 'proj-detail', label: 'Trang chi tiết dự án', group: 'Dự án', def: 'up' },
  { key: 'proj-contact', label: 'Form Liên hệ với chúng tôi (trang dự án)', group: 'Dự án', def: 'up' },

  { key: 'job-hero', label: 'Dải xanh đầu trang tuyển dụng', group: 'Tuyển dụng', def: 'fade' },
  { key: 'job-list', label: 'Danh sách vị trí', group: 'Tuyển dụng', def: 'up' },
  { key: 'job-why', label: 'Vì sao bạn nên lựa chọn Synetic', group: 'Tuyển dụng', kids: '.why-grid > div', def: 'up' },
  { key: 'job-detail', label: 'Trang chi tiết tuyển dụng', group: 'Tuyển dụng', def: 'up' },

  { key: 'partners-cats', label: '4 nhóm đối tác', group: 'Đối tác', kids: '.pt-cat', def: 'up' },
  { key: 'partners-logos', label: 'Logo đối tác', group: 'Đối tác', kids: '.pt-logo', def: 'up' },

  { key: 'footer', label: 'Chân trang (form liên hệ)', group: 'Toàn website', def: 'none' }
];

const BY_KEY = {};
SECTIONS.forEach((s) => { BY_KEY[s.key] = s; });
const VALID = new Set(EFFECTS.map((e) => e.key));

function num(v, min, max, def) {
  const n = parseFloat(String(v).replace(',', '.'));
  return n >= min && n <= max ? n : def;
}

function getEffects() {
  let raw = {};
  try { raw = readJSON('effects'); } catch (e) { raw = {}; }
  const items = {};
  SECTIONS.forEach((s) => {
    const v = raw.items && raw.items[s.key];
    items[s.key] = VALID.has(v) ? v : s.def;
  });
  const delays = {};
  SECTIONS.forEach((s) => {
    const v = raw.delays && raw.delays[s.key];
    if (v !== undefined && v !== null && v !== '' && !isNaN(parseFloat(v))) delays[s.key] = num(v, 0, 5, 0);
  });
  return {
    duration: num(raw.duration, 0.1, 5, 0.8),
    gap: num(raw.gap, 0, 2, 0.12),
    delay: num(raw.delay, 0, 5, 0.2),
    delays,
    stagger: raw.stagger === undefined ? true : Boolean(raw.stagger),
    items
  };
}

// Used inside templates: <section ...<%- fx('home-intro') %>>
function fx(key) {
  const s = BY_KEY[key];
  if (!s) return '';
  const cfg = getEffects();
  const effect = cfg.items[key];
  if (effect === 'none') return '';
  let attr = ' data-fx="' + effect + '"';
  if (s.kids && cfg.stagger) attr += ' data-fx-kids="' + s.kids + '"';
  if (cfg.delays[key] !== undefined) attr += ' data-fx-delay="' + cfg.delays[key] + '"';
  return attr;
}

function style() {
  const cfg = getEffects();
  return '--fx-dur:' + cfg.duration + 's;--fx-gap:' + cfg.gap + 's;--fx-delay:' + cfg.delay + 's';
}

module.exports = { EFFECTS, SECTIONS, getEffects, fx, style, num };

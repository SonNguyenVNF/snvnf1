'use strict';
const { readJSON } = require('./data-store');

// Fonts shipped with the site (assets/fonts). Admin can add more by uploading.
const BUILTIN = [
  { key: 'roboto', name: 'Roboto', css: 'Roboto', kind: 'Chữ không chân (mặc định của thiết kế)', faces: [
    { file: 'Roboto-Regular.ttf', weight: 400, style: 'normal' },
    { file: 'Roboto-Medium.ttf', weight: 500, style: 'normal' },
    { file: 'Roboto-Bold.ttf', weight: 700, style: 'normal' },
    { file: 'Roboto-Black.ttf', weight: 900, style: 'normal' },
    { file: 'Roboto-Italic.ttf', weight: 400, style: 'italic' },
    { file: 'Roboto-MediumItalic.ttf', weight: 500, style: 'italic' }
  ], note: 'Có 6 kiểu: Regular, Medium, Bold, Black, Italic, Medium Italic' },
  { key: 'arial', name: 'Arial', css: 'Arial', kind: 'Chữ không chân, quen thuộc', faces: [{ file: 'Arial-Regular.ttf', weight: 400, style: 'normal' }], note: 'Chỉ có kiểu Regular (chữ đậm sẽ được trình duyệt làm đậm giả)' },
  { key: 'manrope', name: 'Manrope', css: 'Manrope', kind: 'Chữ hiện đại, tròn trịa', faces: [{ file: 'Manrope-Regular.ttf', weight: 400, style: 'normal' }], note: 'Chỉ có kiểu Regular' },
  { key: 'montserrat', name: 'Montserrat ExtraBold', css: 'Montserrat', kind: 'Chữ rất đậm, hợp tiêu đề', faces: [{ file: 'Montserrat-ExtraBold.ttf', weight: 800, style: 'normal' }], note: 'Chỉ có kiểu ExtraBold: dùng cho nội dung dài sẽ rất đậm, nên dùng cho tiêu đề' },
  { key: 'fz-photograph', name: 'Fz Photograph', css: 'Fz Photograph', kind: 'Chữ viết tay (trang trí)', faces: [{ file: 'Fz-Photograph.ttf', weight: 400, style: 'normal' }], note: 'Chữ viết tay, chỉ nên dùng cho vài từ trang trí' }
];

// Every place on the site whose font an admin can choose.
const ROLES = [
  { key: 'body', label: 'Chữ nội dung chung của toàn website', css: 'body,input,textarea,select,button' },
  { key: 'menu', label: 'Menu trên cùng (TRANG CHỦ, VỀ CHÚNG TÔI...)', css: '.mainnav a' },
  { key: 'banner', label: 'Tiêu đề trên thanh banner hoàng hôn (TIN TỨC, DỰ ÁN...)', css: '.pbanner h1' },
  { key: 'hero-title', label: 'Chữ lớn ở slide đầu trang chủ', css: '.hero-text h1' },
  { key: 'hero-text', label: 'Mô tả và nút ở slide đầu trang chủ', css: '.hero-text p,.hero-cta .btn' },
  { key: 'heading', label: 'Tiêu đề các mục (SYNETIC GROUP, THÀNH VIÊN..., TIN TỨC NỔI BẬT...)', css: '.intro h2,.intro h3,.members .t-h,.partners-band h2,.news-sec h2,.cta-band h2,.m-band .t-h,.h-line,.a-head h1,.pd-contact h2,.pd-grid h1,.j-hero h2,.j-hero h3,.why h2,.ab-split h2,.ab-strategy h2,.ab-vision h2,.ab-team h2,.pf-slide h2,.pf-slide h3,.p-find h2,.m-grid h1,.m-info h2,.jd-grid h1,.ab-card .tt b' },
  { key: 'subheading', label: 'Tiêu đề nhỏ trên thẻ (tên tin, dự án, thành viên, giá trị cốt lõi...)', css: '.ncard h3,.n-big h3,.n-sm h3,.n-row h3,.pcard h3,.icard h4,.pillar h3,.vitem h3,.net-item h4,.net-center b,.tcard h3,.csr-item h3,.why-grid h3,.pgrid h3,.pt-cat h3,.j-row .tt a,.mcard .mn,.mcard .ms,.vcenter,.j-side h4,.rich h3' },
  { key: 'button', label: 'Chữ trên các nút bấm (XEM THÊM, TÌM HIỂU THÊM...)', css: '.btn,.btn-find' },
  { key: 'number', label: 'Con số lớn (100+, 01. 02. 03...)', css: '.j-stats b,.pillar .pn,.pcard .pn b' },
  { key: 'script', label: 'Chữ trang trí (chữ "Thông điệp" ở phần Chủ tịch)', css: '.ab-card .t1', def: 'fz-photograph' },
  { key: 'article', label: 'Nội dung bài viết, dự án, tuyển dụng, giới thiệu', css: '.a-body p,.pd-text,.jd-body,.m-grid .body p,.ab-split p,.ab-card p,.rich' },
  { key: 'footer', label: 'Chân trang (tên công ty, địa chỉ, form, bản quyền)', css: '.ft,.ft h3,.copy,.ft-form input,.ft-form textarea' }
];

// ---------- per-text styles set with the on-page editor ----------
const SEL_OK = /^[A-Za-z0-9_\-#.\s>:()+~]+$/;
const WEIGHTS = ['300', '400', '500', '700', '800', '900'];

function readStyles() {
  let raw = {};
  try { raw = readJSON('text-styles'); } catch (e) { raw = {}; }
  return Array.isArray(raw.items) ? raw.items : [];
}

function clampPx(v) {
  const n = Math.round(Number(v)) || 0;
  return Math.max(-2000, Math.min(2000, n));
}

function cleanRule(b) {
  const selector = String(b.selector || '').trim();
  if (!selector || selector.length > 220 || !SEL_OK.test(selector)) return null;
  const valid = new Set(families().map((f) => f.key));
  const size = Math.round(Number(b.size)) || 0;
  const sizeMobile = Math.round(Number(b.sizeMobile)) || 0;
  const rule = {
    selector,
    label: safeName(b.label).slice(0, 40),
    font: valid.has(b.font) ? b.font : '',
    size: size >= 8 && size <= 200 ? size : 0,
    sizeMobile: sizeMobile >= 8 && sizeMobile <= 200 ? sizeMobile : 0,
    weight: WEIGHTS.includes(String(b.weight)) ? String(b.weight) : '',
    color: /^#[0-9a-fA-F]{6}$/.test(String(b.color || '')) ? String(b.color).toLowerCase() : '',
    x: clampPx(b.x),
    y: clampPx(b.y),
    moveMobile: b.moveMobile === '1' || b.moveMobile === true,
    inline: b.inline === '1' || b.inline === true
  };
  if (!rule.font && !rule.size && !rule.sizeMobile && !rule.weight && !rule.color && !rule.x && !rule.y) return null;
  return rule;
}

function ruleCss(r, byKey) {
  let d = '';
  const fam = byKey[r.font];
  if (fam) d += 'font-family:' + stackFor(fam) + '!important;';
  if (r.size) d += 'font-size:' + r.size + 'px!important;';
  if (r.weight) d += 'font-weight:' + r.weight + '!important;';
  if (r.color) d += 'color:' + r.color + '!important;-webkit-text-fill-color:' + r.color + '!important;background:none!important;';
  if (r.x || r.y) d += 'translate:' + (r.x || 0) + 'px ' + (r.y || 0) + 'px!important;' + (r.inline ? 'display:inline-block!important;' : '');
  let out = d ? r.selector + '{' + d + '}' : '';
  if ((r.x || r.y) && !r.moveMobile) out += '@media(max-width:860px){' + r.selector + '{translate:none!important}}';
  if (r.sizeMobile) out += '@media(max-width:860px){' + r.selector + '{font-size:' + r.sizeMobile + 'px!important}}';
  return out;
}

function read() {
  let raw = {};
  try { raw = readJSON('typography'); } catch (e) { raw = {}; }
  return { roles: raw.roles || {}, custom: Array.isArray(raw.custom) ? raw.custom : [] };
}

function safeName(s) { return String(s || '').replace(/["'\\<>{};]/g, '').trim().slice(0, 60); }

function families() {
  const { custom } = read();
  const list = BUILTIN.map((f) => Object.assign({ custom: false }, f));
  custom.forEach((c) => list.push({
    key: 'c-' + c.id, name: safeName(c.name) || 'Phông tải lên', css: safeName(c.name) || ('Custom ' + c.id), kind: 'Phông bạn đã tải lên',
    faces: [{ url: '/' + c.file, weight: Number(c.weight) || 400, style: c.style === 'italic' ? 'italic' : 'normal' }], custom: true, id: c.id, note: ''
  }));
  return list;
}

function stackFor(fam) {
  if (!fam || fam.key === 'roboto') return '"Roboto",Arial,sans-serif';
  return '"' + fam.css + '","Roboto",Arial,sans-serif';
}

function getSettings() {
  const { roles } = read();
  const fams = families();
  const byKey = {};
  fams.forEach((f) => { byKey[f.key] = f; });
  const out = {};
  ROLES.forEach((r) => { out[r.key] = byKey[roles[r.key]] ? roles[r.key] : (byKey[r.def] ? r.def : 'roboto'); });
  return { roles: out, families: fams, byKey };
}

// <style> content: @font-face for every font + one CSS variable per role + the rules using them
function buildCss() {
  const s = getSettings();
  let css = '';
  s.families.forEach((f) => {
    f.faces.forEach((face) => {
      const src = face.url || ('/assets/fonts/' + face.file);
      const fmt = /\.woff2$/i.test(src) ? 'woff2' : /\.woff$/i.test(src) ? 'woff' : /\.otf$/i.test(src) ? 'opentype' : 'truetype';
      css += '@font-face{font-family:"' + f.css + '";src:url("' + src + '") format("' + fmt + '");font-weight:' + face.weight + ';font-style:' + face.style + ';font-display:swap}';
    });
  });
  let vars = '';
  let rules = '';
  ROLES.forEach((r) => {
    vars += '--f-' + r.key + ':' + stackFor(s.byKey[s.roles[r.key]]) + ';';
    rules += r.css + '{font-family:var(--f-' + r.key + ')}';
  });
  // handwriting fonts run small, so enlarge the decorative "Thông điệp" word when one is chosen
  const script = s.byKey[s.roles.script];
  if (script && script.key === 'fz-photograph') rules += '.ab-card .t1{font-size:clamp(44px,5vw,76px);line-height:1;letter-spacing:.01em;font-weight:400}';
  const custom = readStyles().map((r) => ruleCss(r, s.byKey)).join('');
  return css + ':root{' + vars + '}' + rules + custom;
}

module.exports = { BUILTIN, ROLES, families, getSettings, buildCss, read, safeName, readStyles, cleanRule };

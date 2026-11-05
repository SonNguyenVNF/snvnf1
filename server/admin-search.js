'use strict';
const { readJSON } = require('./data-store');
const sd = require('./site-data');

// Search index for the admin box: every screen, every list item (news, projects, jobs...),
// every fixed image slot and the texts of the single-page forms. The browser filters it.
const SCREENS = [
  ['Tin nhắn khách gửi từ biểu mẫu', '/admin/tin-nhan', 'liên hệ khách hàng gửi thông tin'],
  ['Nhận thông tin khách qua email', '/admin/gui-email', 'mail smtp thư hộp thư doanh nghiệp'],
  ['Slide đầu trang chủ', '/admin/hero', 'banner ảnh nền tiêu đề mô tả trang chủ'],
  ['Chữ trên trang chủ', '/admin/noi-dung-trang-chu', 'giới thiệu đối tác lời kêu gọi tầm nhìn'],
  ['Thành viên hệ sinh thái', '/admin/thanh-vien', 'công ty thành viên logo thêm xoá'],
  ['Về chúng tôi — thông điệp, lịch sử, tầm nhìn, CSR, giải thưởng', '/admin/ve-synetic', 'chủ tịch lịch sử trách nhiệm xã hội'],
  ['Tầm nhìn, 5 mục tiêu và Sứ mệnh', '/admin/tam-nhin-su-menh', 'về chúng tôi mục tiêu thẻ khách hàng đối tác cổ đông cộng đồng'],
  ['Giá trị cốt lõi (6 ô)', '/admin/gia-tri', 'khát vọng tiên phong vòng tròn'],
  ['Mạng lưới hoạt động (sơ đồ 8 ô)', '/admin/mang-luoi', 'sơ đồ lĩnh vực'],
  ['Đội ngũ lãnh đạo', '/admin/doi-ngu-lanh-dao', 'ban lãnh đạo thẻ người'],
  ['Đoạn giới thiệu trên thẻ đội ngũ lãnh đạo', '/admin/noi-dung/doi-ngu-lanh-dao-intro/edit', ''],
  ['Tin tức', '/admin/tin-tuc', 'bài viết'],
  ['Dự án', '/admin/du-an', ''],
  ['Tuyển dụng — danh sách vị trí', '/admin/tuyen-dung', 'việc làm'],
  ['Tuyển dụng — chữ đầu trang, 3 con số, Vì sao chọn Synetic', '/admin/trang-tuyen-dung', ''],
  ['Chữ trang Đối tác (tiêu đề, 3 con số, nhóm lọc)', '/admin/trang-doi-tac', ''],
  ['Đối tác (thẻ đối tác, bài chi tiết)', '/admin/doi-tac-khach-hang', 'khách hàng'],
  ['Yêu cầu đăng nhập khi vào website (bật / tắt khóa bảo trì)', '/admin/khoa-website', 'khóa mật khẩu bảo trì công khai đăng nhập'],
  ['Google Analytics', '/admin/analytics', 'thống kê người xem'],
  ['Chỉnh chữ trực tiếp trên web', '/admin/chinh-chu', 'phông cỡ chữ màu ẩn chữ xoá chữ'],
  ['Phông chữ', '/admin/phong-chu', 'font'],
  ['Hiệu ứng xuất hiện', '/admin/hieu-ung', 'trượt hiện dần phóng to'],
  ['Nhập nội dung mẫu', '/admin/nhap-mau', 'demo'],
  ['Chữ cố định (menu, nút bấm, tiêu đề, thông báo...)', '/admin/chu-co-dinh', 'chữ menu nút bấm tiêu đề placeholder thông báo tab trình duyệt'],
  ['Ảnh cố định (logo, ảnh nền, bản đồ...)', '/admin/hinh-anh', 'hình ảnh'],
  ['Thông tin chân trang', '/admin/lien-he', 'địa chỉ số điện thoại email mạng xã hội facebook zalo youtube bản đồ map footer']
];

const uiTexts = require('./ui-texts');
// titles stay short; the searchable text (n >= 200) keeps everything so any sentence can be found
const clip = (v, n) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim().slice(0, n >= 200 ? 6000 : n);
const items = (name) => { try { return (readJSON(name).items || []); } catch (e) { return []; } };

// all readable strings of a settings object, each with the admin form it is edited in
function flatten(obj, url, group, out, prefix) {
  if (!obj || typeof obj !== 'object') return;
  Object.keys(obj).forEach((k) => {
    const v = obj[k];
    if (typeof v === 'string') {
      if (v.length < 3 || /^[\d.,:%\s-]+$/.test(v) || /^(assets|\/)/.test(v) || /^https?:/.test(v)) return;
      out.push({ t: clip(v, 90), s: group, u: url, k: clip(v, 500) });
    } else if (v && typeof v === 'object') flatten(v, url, group, out, (prefix || '') + k + '.');
  });
}

function build() {
  const out = [];
  SCREENS.forEach((s) => out.push({ t: s[0], s: 'Trang quản trị', u: s[1], k: s[2] }));

  items('news').forEach((n) => out.push({ t: clip(n.title, 90), s: 'Tin tức', u: '/admin/tin-tuc/' + n.id + '/edit', k: clip(n.excerpt || n.summary || n.body, 300) }));
  items('projects').forEach((p) => out.push({ t: clip(p.title || p.name, 90), s: 'Dự án', u: '/admin/du-an/' + p.id + '/edit', k: clip((p.location || '') + ' ' + (p.summary || p.body || ''), 300) }));
  items('jobs').forEach((j) => out.push({ t: clip(j.title, 90), s: 'Tuyển dụng', u: '/admin/tuyen-dung/' + j.id + '/edit', k: clip((j.department || '') + ' ' + (j.location || ''), 200) }));
  items('members').forEach((m) => out.push({ t: clip(m.name, 90), s: 'Thành viên hệ sinh thái', u: '/admin/thanh-vien/' + m.id + '/edit', k: clip((m.legalName || '') + ' ' + (m.tagline || '') + ' ' + (m.netName || '') + ' ' + (m.netDesc || '') + ' ' + (m.brand || '') + ' ' + (m.pageTitle || '') + ' ' + (m.facts || []).map((x) => x.label + ' ' + x.value).join(' ') + ' ' + (m.units || []).map((x) => x.name).join(' ') + ' ' + (m.body || ''), 900) }));
  items('partners').forEach((p) => out.push({ t: clip(p.name, 90), s: 'Đối tác', u: '/admin/doi-tac-khach-hang/' + p.id + '/edit', k: clip((p.category || '') + ' ' + (p.summary || ''), 300) }));
  items('team').forEach((p) => out.push({ t: clip(p.name, 90), s: 'Đội ngũ lãnh đạo', u: '/admin/doi-ngu-lanh-dao/' + p.id + '/edit', k: clip((p.role || p.title || '') + ' ' + (p.bio || ''), 300) }));
  items('hero-slides').forEach((h) => out.push({ t: clip((h.title || '').replace(/\*/g, ''), 90), s: 'Slide trang chủ', u: '/admin/hero/' + h.id + '/edit', k: clip(h.description, 300) }));
  items('ve-synetic-pages').forEach((p) => out.push({ t: clip(p.label, 90), s: 'Về chúng tôi', u: '/admin/ve-synetic/' + p.id + '/edit', k: clip(p.body, 400) }));

  uiTexts.REGISTRY.forEach((r) => out.push({ t: clip(r[3], 90), s: 'Chữ cố định — ' + r[0], u: '/admin/chu-co-dinh', k: r[2] + ' ' + r[3] }));
  sd.IMAGE_SLOTS.forEach((s) => out.push({ t: clip(s.label, 110), s: 'Ảnh cố định', u: '/admin/hinh-anh/' + s.key + '/edit', k: 'ảnh hình logo ' + s.key }));

  // texts that live in single forms: finding a sentence leads straight to the form that holds it
  const forms = [
    [sd.getHomepage, '/admin/noi-dung-trang-chu', 'Chữ trang chủ'],
    [sd.getRecruit, '/admin/trang-tuyen-dung', 'Chữ trang Tuyển dụng'],
    [sd.getNetwork, '/admin/mang-luoi', 'Mạng lưới hoạt động'],
    [sd.getCoreValues, '/admin/gia-tri', 'Giá trị cốt lõi'],
    [sd.getVision, '/admin/tam-nhin-su-menh', 'Tầm nhìn – Sứ mệnh'],
    [sd.getFooter, '/admin/lien-he', 'Thông tin chân trang'],
    [sd.getPartnersPage, '/admin/trang-doi-tac', 'Chữ trang Đối tác']
  ];
  forms.forEach((f) => { try { flatten(f[0](), f[1], f[2], out); } catch (e) { /* skip a broken file */ } });
  const seen = {};
  return out.filter((i) => i.t && !seen[i.u + '|' + i.t] && (seen[i.u + '|' + i.t] = 1));
}

module.exports = function registerAdminSearch(adminRouter) {
  adminRouter.get('/tim-kiem.json', (req, res) => {
    res.set('Cache-Control', 'no-store');
    res.json(build());
  });
};

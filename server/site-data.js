'use strict';
const { readJSON, writeJSON } = require('./data-store');
const { slugify } = require('./slug');

// ---------- text helpers ----------

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// **bold** inside already-escaped text
function renderInline(s) {
  return esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
}

// Lightweight markup for long text typed in admin:
//   blank line = new paragraph, "# Title" = small heading, "- item" = bullet, **bold**
function renderRich(text) {
  const blocks = String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/);
  const out = [];
  blocks.forEach((block) => {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let list = [];
    const flush = () => {
      if (list.length) { out.push('<ul>' + list.map((li) => '<li>' + renderInline(li) + '</li>').join('') + '</ul>'); list = []; }
    };
    let para = [];
    const flushPara = () => {
      if (para.length) { out.push('<p>' + para.map(renderInline).join('<br>') + '</p>'); para = []; }
    };
    lines.forEach((line) => {
      if (/^#\s+/.test(line)) { flush(); flushPara(); out.push('<h3>' + renderInline(line.replace(/^#\s+/, '')) + '</h3>'); }
      else if (/^[-•]\s+/.test(line)) { flushPara(); list.push(line.replace(/^[-•]\s+/, '')); }
      else { flush(); para.push(line); }
    });
    flush(); flushPara();
  });
  return out.join('\n');
}

function formatDateVi(str) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(str || '');
  if (!m) return str || '';
  return `${parseInt(m[3], 10)} Tháng ${parseInt(m[2], 10)} năm ${m[1]}`;
}

function paragraphs(text) {
  return String(text || '').replace(/\r\n/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

// ---------- fixed site images (admin: Ảnh cố định) ----------

const OLD_DEFAULT_LOGO = 'assets/logos/synetic-logo.jpg';

const IMAGE_SLOTS = [
  { key: 'logo', label: 'Logo công ty (đầu trang và chân trang)', def: 'assets/img/logo.png' },
  { key: 'banner', label: 'Ảnh nền thanh tiêu đề các trang trong (hoàng hôn)', def: 'assets/img/banner.jpg' },
  { key: 'intro', label: 'Trang chủ — ảnh giới thiệu Synetic Group', def: 'assets/img/trophy.jpg' },
  { key: 'map', label: 'Trang chủ — ảnh bản đồ phía trên chân trang', def: 'assets/img/map.jpg' },
  { key: 'footerBg', label: 'Chân trang — ảnh nền (phủ màu xanh)', def: 'assets/img/footer-bg.jpg' },
  { key: 'jobsBg', label: 'Trang Tuyển dụng — ảnh nền dải xanh đầu trang', def: 'assets/img/jobs-bg.jpg' },
  { key: 'chairman', label: 'Về chúng tôi — ảnh Chủ tịch HĐQT', def: 'assets/img/chairman.png' },
  { key: 'history', label: 'Về chúng tôi — ảnh Lịch sử hình thành', def: 'assets/img/history.jpg' },
  { key: 'csr', label: 'Về chúng tôi — ảnh Trách nhiệm xã hội', def: 'assets/img/csr.jpg' },
  { key: 'award', label: 'Về chúng tôi — ảnh Các giải thưởng', def: 'assets/img/trophy.jpg' }
];

function getSiteImages() {
  const raw = readJSON('site-images');
  // The new horizontal logo needs different sizes than the old square one.
  if (!raw.logoSizeV2) {
    if (!raw.logo || raw.logo === OLD_DEFAULT_LOGO) {
      delete raw.logoHeight;
      delete raw.logoHeightMobile;
      raw.logo = null;
    }
    raw.logoSizeV2 = true;
    writeJSON('site-images', raw);
  }
  const out = Object.assign({}, raw);
  IMAGE_SLOTS.forEach((s) => {
    const v = raw[s.key];
    out[s.key] = v && !(s.key === 'logo' && v === OLD_DEFAULT_LOGO) ? v : s.def;
  });
  return out;
}

// ---------- footer ----------

const FOOTER_DEFAULTS = {
  companyName: 'CÔNG TY CỔ PHẦN TẬP ĐOÀN SYNETIC',
  address: 'Tầng 17, Tòa nhà Charmvit Tower, 117 Trần Duy Hưng, P. Yên Hòa, TP. Hà Nội',
  email: 'info@synetic.vn',
  phone: '094 103 18 81',
  website: 'https://synetic.vn',
  taxCode: '',
  tagline: 'KIẾN TẠO GIÁ TRỊ VƯỢT TRỘI',
  copyright: '© Copyright to Synetic Group, designed and developed by DtmChinh23',
  facebook: '#',
  tiktok: '#',
  messenger: '#',
  zalo: '#'
};

function isPlaceholder(v) {
  return !v || /…|xxx/i.test(v);
}

function getFooter() {
  const raw = readJSON('footer');
  const out = Object.assign({}, FOOTER_DEFAULTS);
  const SOCIAL = ['facebook', 'tiktok', 'messenger', 'zalo'];
  Object.keys(raw).forEach((k) => {
    if (typeof raw[k] !== 'string') return;
    if (SOCIAL.includes(k)) out[k] = raw[k];
    else if (!isPlaceholder(raw[k])) out[k] = raw[k];
  });
  return out;
}

// ---------- homepage texts ----------

const HOMEPAGE_DEFAULTS = {
  heroAnimEvery: '1',
  heroWordDuration: '1',
  heroWordGap: '0.2',
  heroStartDelay: '0.2',
  heroSlideSeconds: '8',
  heroBtn1: 'Khám phá hệ sinh thái',
  heroBtn2: 'Về Synetic Group',
  introTitle: 'SYNETIC GROUP',
  introSubtitle: 'KIẾN TẠO GIÁ TRỊ VƯỢT TRỘI',
  introText: 'Synetic Group hoạt động trong các lĩnh vực cốt lõi: nông nghiệp, dinh dưỡng, thú y, chuỗi cung ứng và đầu tư — cam kết mang đến các giải pháp và dịch vụ chất lượng, góp phần thúc đẩy sự phát triển bền vững của cộng đồng và xã hội.',
  introButton: 'Tìm hiểu thêm',
  membersTitle: 'THÀNH VIÊN TRONG HỆ SINH THÁI',
  partnersTitle: 'ĐỐI TÁC VÀ KHÁCH HÀNG',
  partnersText: 'Synetic Group phục vụ đa dạng nhóm khách hàng và đối tác trong chuỗi giá trị nông nghiệp – chăn nuôi:',
  partnerItems: [
    { title: 'Người chăn nuôi & trang trại', text: 'Khách hàng trực tiếp sử dụng sản phẩm dinh dưỡng, thuốc thú y và dịch vụ kỹ thuật từ Synetic Dinh Dưỡng và Synetic Thú Y.' },
    { title: 'Đại lý & nhà phân phối', text: 'Đối tác phân phối sản phẩm của các công ty thành viên đến người chăn nuôi trên nhiều địa phương.' },
    { title: 'Đối tác vận chuyển & kho vận', text: 'Phối hợp cùng Synetic Logistics trong việc lưu thông nguyên liệu và thành phẩm giữa các đơn vị trong hệ sinh thái.' },
    { title: 'Nhà đầu tư & đối tác tài chính', text: 'Hợp tác cùng Synetic Capital trong các dự án đầu tư mở rộng năng lực sản xuất và mạng lưới của Tập đoàn.' }
  ],
  partnersClosing: 'Synetic Group cam kết xây dựng quan hệ hợp tác lâu dài, minh bạch và cùng có lợi với tất cả đối tác trong hệ sinh thái.',
  newsTitle: 'TIN TỨC NỔI BẬT',
  ctaTitle: 'SẴN SÀNG HỢP TÁC CÙNG',
  ctaHighlight: 'SYNETIC?',
  ctaText: 'Đội ngũ của chúng tôi luôn sẵn sàng đồng hành và mang đến giải pháp tốt nhất cho doanh nghiệp của bạn.',
  ctaButton: 'Khám phá hệ sinh thái'
};

function getHomepage() {
  const raw = readJSON('homepage');
  const out = Object.assign({}, HOMEPAGE_DEFAULTS);
  Object.keys(HOMEPAGE_DEFAULTS).forEach((k) => {
    if (k === 'partnerItems') {
      if (Array.isArray(raw.partnerItems) && raw.partnerItems.length) out.partnerItems = raw.partnerItems;
    } else if (typeof raw[k] === 'string' && raw[k].trim()) {
      out[k] = raw[k];
    }
  });
  return out;
}

// ---------- recruitment page texts ----------

const RECRUIT_DEFAULTS = {
  heroTitle: 'XÂY DỰNG THƯƠNG HIỆU BẰNG KẾT QUẢ',
  heroSub: 'KHẲNG ĐỊNH GIÁ TRỊ BẰNG CON NGƯỜI',
  heroText: 'Synetic không ngừng khẳng định vị thế bằng những thành tựu rõ ràng và khác biệt.\nTự hào đồng hành cùng người chăn nuôi, đối tác và nhà đầu tư với hệ sinh thái giải pháp trọn vẹn từ dinh dưỡng, thú y, logistics đến tài chính.',
  stats: [
    { value: '100+', text: 'Dự án, điểm phân phối triển khai thành công trên toàn quốc' },
    { value: '30+', text: 'Đối tác, nhà đầu tư uy tín lựa chọn đồng hành chiến lược' },
    { value: '250+', text: 'Nhân sự chuyên nghiệp hoạt động theo hệ thống bài bản, hiệu quả và bền vững' }
  ],
  heroText2: 'Không chỉ sở hữu quy mô nhân sự lớn, Synetic còn tiên phong xây dựng đội ngũ chuyên gia am hiểu thị trường.\nMỗi chuyên viên không đơn thuần là người tư vấn, mà là người đồng hành tin cậy, với kiến thức chuyên môn sâu và khả năng xây dựng lòng tin bền vững từ khách hàng.',
  whyTitle: 'VÌ SAO BẠN NÊN LỰA CHỌN',
  whyHighlight: 'SYNETIC GROUP',
  whyItems: [
    { title: 'Danh tiếng công ty', text: 'Tầm vóc và danh tiếng của một hệ sinh thái doanh nghiệp đa lĩnh vực, góp phần xây dựng giá trị lâu dài cho từng cá nhân.' },
    { title: 'Lãnh đạo khai mở', text: 'Đội ngũ lãnh đạo là những người dẫn dắt bằng tầm nhìn, đào tạo và phát triển con người bằng sự tận tâm.' },
    { title: 'Chế độ đãi ngộ', text: 'Chính sách lương, thưởng, phúc lợi hấp dẫn, giữ chân hiền tài, đánh giá và ghi nhận xứng đáng với năng lực và kết quả đóng góp.' },
    { title: 'Văn hóa môi trường', text: 'Xây dựng môi trường làm việc chuyên nghiệp, đề cao Giá trị cốt lõi của Synetic để gắn kết và thúc đẩy kinh doanh.' },
    { title: 'Cơ hội phát triển', text: 'Lộ trình thăng tiến rõ ràng, được đào tạo bài bản qua Học viện Synetic và tham gia các dự án quy mô lớn của Tập đoàn.' }
  ]
};

function getRecruit() {
  const raw = readJSON('recruit');
  const out = Object.assign({}, RECRUIT_DEFAULTS);
  Object.keys(RECRUIT_DEFAULTS).forEach((k) => {
    if (k === 'stats' || k === 'whyItems') {
      if (Array.isArray(raw[k]) && raw[k].length) out[k] = raw[k];
    } else if (typeof raw[k] === 'string' && raw[k].trim()) {
      out[k] = raw[k];
    }
  });
  return out;
}

// ---------- network (Mạng lưới hoạt động) ----------

const NETWORK_DEFAULTS = {
  title: 'MẠNG LƯỚI HOẠT ĐỘNG',
  centerText: 'Mô hình vận hành theo nhóm chức năng dùng chung giúp các công ty thành viên tập trung nguồn lực vào chuyên môn cốt lõi, trong khi vẫn được hỗ trợ đồng bộ về thương hiệu, công nghệ, tài chính và vận hành từ Tập đoàn.',
  items: [
    { title: 'Thương mại – Hỗ trợ', description: 'Dịch vụ xuất nhập khẩu, mua sắm tập trung và hỗ trợ kinh doanh khác cho các đơn vị thành viên.' },
    { title: 'Đào tạo', description: 'Học viện Synetic — đào tạo kỹ năng quản trị, bán hàng, kỹ thuật cho cán bộ nhân viên và hệ thống đại lý, đối tác.' },
    { title: 'Đổi mới sáng tạo', description: 'Nghiên cứu, ứng dụng công nghệ số, tự động hoá, trí tuệ nhân tạo vào chuỗi cung ứng và chăn nuôi thông minh; tư vấn phát triển bền vững, ESG và truy xuất nguồn gốc.' },
    { title: 'Thị trường – Truyền thông', description: 'Tổ chức sự kiện, hội nghị khách hàng – nhà phân phối, quản lý truyền thông thương hiệu và quan hệ nhà đầu tư (IR) cho toàn Tập đoàn.' },
    { title: 'Quản trị – Điều hành', description: 'Tư vấn chiến lược, tái cấu trúc, quản trị tài chính – ngân sách và quản trị chuỗi cung ứng cho các công ty thành viên trong hệ sinh thái.' },
    { title: 'Thương hiệu – Sở hữu trí tuệ', description: 'Quản lý và cấp quyền sử dụng hệ thống nhận diện thương hiệu "Synetic" cho các đơn vị thành viên và đối tác nhượng quyền.' },
    { title: 'Dịch vụ dùng chung', description: 'Trung tâm dịch vụ dùng chung phụ trách hành chính, nhân sự, kế toán – tài chính, mua sắm tập trung và quản lý vận hành cơ sở vật chất cho các trụ sở, nhà máy, kho vận.' },
    { title: 'Bất động sản – Hạ tầng', description: 'Đầu tư, vận hành nhà xưởng, kho bãi, văn phòng và mặt bằng phục vụ hoạt động sản xuất – kinh doanh của các công ty thành viên.' }
  ]
};

function getNetwork() {
  const raw = readJSON('network');
  return {
    title: (typeof raw.title === 'string' && raw.title.trim()) || NETWORK_DEFAULTS.title,
    centerText: (typeof raw.centerText === 'string' && raw.centerText.trim()) || NETWORK_DEFAULTS.centerText,
    items: Array.isArray(raw.items) && raw.items.length ? raw.items : NETWORK_DEFAULTS.items
  };
}

// ---------- core values ----------

const VALUES_NOTE_DEFAULT = 'Sáu giá trị này là kim chỉ nam cho mọi quyết định và hành động của Synetic Group — từ chiến lược đầu tư đến từng tương tác với khách hàng, đối tác và người lao động.';

function getCoreValues() {
  const raw = readJSON('core-values');
  return { items: raw.items || [], note: (typeof raw.note === 'string' && raw.note.trim()) || VALUES_NOTE_DEFAULT };
}

// ---------- projects / jobs (add slugs + new fields to older records) ----------

function getProjects() {
  const data = readJSON('projects');
  let dirty = false;
  data.items.forEach((p) => {
    if (!p.slug) { p.slug = slugify(p.title || 'du-an'); dirty = true; }
    if (!Array.isArray(p.images)) { p.images = []; dirty = true; }
    ['type', 'status', 'body'].forEach((k) => { if (typeof p[k] !== 'string') { p[k] = ''; dirty = true; } });
    if (typeof p.featured !== 'boolean') { p.featured = false; dirty = true; }
  });
  if (dirty) writeJSON('projects', data);
  return data;
}

function getJobs() {
  const data = readJSON('jobs');
  let dirty = false;
  data.items.forEach((j) => {
    if (!j.slug) { j.slug = slugify(j.title || 'tuyen-dung'); dirty = true; }
    if (typeof j.body !== 'string') { j.body = j.description || ''; dirty = true; }
    if (typeof j.postedAt !== 'string') { j.postedAt = j.deadline && /^\d{4}-/.test(j.deadline) ? j.deadline : new Date().toISOString().slice(0, 10); dirty = true; }
  });
  if (dirty) writeJSON('jobs', data);
  return data;
}

module.exports = {
  esc, renderInline, renderRich, formatDateVi, paragraphs,
  IMAGE_SLOTS, getSiteImages, getFooter, FOOTER_DEFAULTS,
  HOMEPAGE_DEFAULTS, getHomepage, RECRUIT_DEFAULTS, getRecruit,
  NETWORK_DEFAULTS, getNetwork, getCoreValues, VALUES_NOTE_DEFAULT,
  getProjects, getJobs
};

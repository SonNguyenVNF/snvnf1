'use strict';
const { readJSON, writeJSON } = require('./data-store');

// Every fixed piece of wording on the public site (menu, buttons, headings that are not part of a content
// record, form hints, browser-tab titles...). Templates call t('key'); /admin/chu-co-dinh edits the values.
// To add a new fixed text: add a line here and use t('key') in the template — it shows up in admin by itself.
// [group, key, what it is, default wording]
const REGISTRY = [
  ['Menu trên cùng', 'nav.home', 'Menu — Trang chủ', 'Trang chủ'],
  ['Menu trên cùng', 'nav.about', 'Menu — Về chúng tôi', 'Về chúng tôi'],
  ['Menu trên cùng', 'nav.eco', 'Menu — Hệ sinh thái', 'Hệ sinh thái'],
  ['Menu trên cùng', 'nav.projects', 'Menu — Dự án', 'Dự án'],
  ['Menu trên cùng', 'nav.news', 'Menu — Tin tức', 'Tin tức'],
  ['Menu trên cùng', 'nav.partners', 'Menu — Đối tác', 'Đối tác'],
  ['Menu trên cùng', 'nav.jobs', 'Menu — Cơ hội việc làm', 'Cơ hội việc làm'],
  ['Menu trên cùng', 'sub.history', 'Menu con Về chúng tôi — Lịch sử hình thành', 'Lịch sử hình thành'],
  ['Menu trên cùng', 'sub.vision', 'Menu con Về chúng tôi — Tầm nhìn', 'Tầm nhìn'],
  ['Menu trên cùng', 'sub.mission', 'Menu con Về chúng tôi — Sứ mệnh', 'Sứ mệnh'],
  ['Menu trên cùng', 'sub.values', 'Menu con Về chúng tôi — Giá trị cốt lõi', 'Giá trị cốt lõi'],
  ['Menu trên cùng', 'sub.strategy', 'Menu con Về chúng tôi — Chiến lược phát triển', 'Chiến lược phát triển'],
  ['Menu trên cùng', 'sub.csr', 'Menu con Về chúng tôi — Trách nhiệm xã hội', 'Trách nhiệm xã hội'],
  ['Menu trên cùng', 'sub.awards', 'Menu con Về chúng tôi — Các giải thưởng', 'Các giải thưởng'],
  ['Menu trên cùng', 'sub.network', 'Menu con Về chúng tôi — Mạng lưới hoạt động', 'Mạng lưới hoạt động'],
  ['Menu trên cùng', 'sub.team', 'Menu con Về chúng tôi — Đội ngũ lãnh đạo', 'Đội ngũ lãnh đạo'],
  ['Menu trên cùng', 'logo.alt', 'Chữ mô tả logo (khi ảnh không hiện)', 'Synetic Group'],
  ['Menu trên cùng', 'aria.menu', 'Chữ đọc cho người khiếm thị — Menu chính', 'Menu chính'],
  ['Menu trên cùng', 'aria.openmenu', 'Chữ đọc cho người khiếm thị — Nút mở menu điện thoại', 'Mở menu'],
  ['Menu trên cùng', 'flag.title', 'Chữ khi rê chuột vào cờ', 'Tiếng Việt'],

  ['Tiêu đề thanh ảnh đầu mỗi trang', 'banner.about', 'Trang Về chúng tôi', 'VỀ CHÚNG TÔI'],
  ['Tiêu đề thanh ảnh đầu mỗi trang', 'banner.projects', 'Trang Dự án (và chi tiết dự án)', 'DỰ ÁN'],
  ['Tiêu đề thanh ảnh đầu mỗi trang', 'banner.news', 'Trang Tin tức (và chi tiết tin)', 'TIN TỨC'],
  ['Tiêu đề thanh ảnh đầu mỗi trang', 'banner.partners', 'Trang Đối tác', 'ĐỐI TÁC'],
  ['Tiêu đề thanh ảnh đầu mỗi trang', 'banner.jobs', 'Trang Cơ hội việc làm', 'CƠ HỘI VIỆC LÀM'],
  ['Tiêu đề thanh ảnh đầu mỗi trang', 'banner.library', 'Trang Thư viện', 'THƯ VIỆN'],

  ['Tên trên tab trình duyệt / Google', 'title.home', 'Trang chủ', 'Synetic Group — Kiến tạo giá trị vượt trội'],
  ['Tên trên tab trình duyệt / Google', 'title.about', 'Về chúng tôi', 'Về chúng tôi — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'desc.about', 'Mô tả Google của trang Về chúng tôi', 'Thông điệp, lịch sử, tầm nhìn chiến lược, giá trị cốt lõi và đội ngũ lãnh đạo của Synetic Group.'],
  ['Tên trên tab trình duyệt / Google', 'title.projects', 'Dự án', 'Dự án — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'title.news', 'Tin tức', 'Tin tức — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'title.partners', 'Đối tác', 'Đối tác — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'title.jobs', 'Cơ hội việc làm', 'Cơ hội việc làm — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'title.library', 'Thư viện', 'Thư viện — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'title.suffix', 'Đuôi thêm sau tên bài viết / dự án / thành viên / vị trí tuyển dụng', ' — Synetic Group'],
  ['Tên trên tab trình duyệt / Google', 'desc.member', 'Đuôi mô tả Google của trang thành viên', 'Thành viên hệ sinh thái Synetic Group.'],

  ['Các nút bấm', 'btn.more', 'Nút "Xem thêm" (tin tức, dự án, trang chủ)', 'Xem thêm'],
  ['Các nút bấm', 'btn.learn', 'Nút "Tìm hiểu thêm" (thẻ thành viên, dự án)', 'Tìm hiểu thêm'],
  ['Các nút bấm', 'btn.detail', 'Nút "Xem chi tiết" (đối tác)', 'Xem chi tiết'],
  ['Các nút bấm', 'btn.explore', 'Nút "Khám phá hệ sinh thái"', 'Khám phá hệ sinh thái'],
  ['Các nút bấm', 'btn.apply', 'Nút "Ứng tuyển ngay"', 'Ứng tuyển ngay'],
  ['Các nút bấm', 'btn.search', 'Nút "Tìm kiếm" (lọc dự án)', 'Tìm kiếm'],
  ['Các nút bấm', 'btn.send', 'Nút "Gửi thông tin" (biểu mẫu liên hệ)', 'Gửi thông tin'],
  ['Các nút bấm', 'btn.findjob', 'Nút "Tìm việc làm" (cột trái trang tuyển dụng)', 'Tìm việc làm'],
  ['Các nút bấm', 'aria.slideprev', 'Chữ đọc — nút slide trước', 'Slide trước'],
  ['Các nút bấm', 'aria.slidenext', 'Chữ đọc — nút slide sau', 'Slide sau'],
  ['Các nút bấm', 'aria.close', 'Chữ đọc — nút đóng cửa sổ', 'Đóng'],
  ['Các nút bấm', 'aria.totop', 'Chữ đọc — nút lên đầu trang', 'Lên đầu trang'],

  ['Chân trang', 'footer.addr', 'Chữ nhỏ trên địa chỉ', 'Địa chỉ trụ sở'],
  ['Chân trang', 'foot.home', 'Liên kết — Trang chủ', 'Trang chủ'],
  ['Chân trang', 'foot.about', 'Liên kết — Về chúng tôi', 'Về chúng tôi'],
  ['Chân trang', 'foot.eco', 'Liên kết — Hệ sinh thái', 'Hệ sinh thái'],
  ['Chân trang', 'foot.news', 'Liên kết — Tin tức', 'Tin tức'],
  ['Chân trang', 'foot.jobs', 'Liên kết — Tuyển dụng', 'Tuyển dụng'],
  ['Chân trang', 'foot.contact', 'Liên kết — Liên hệ', 'Liên hệ'],
  ['Chân trang', 'stats.online', 'Dòng chữ chạy — số người đang xem', 'Đang trực tuyến'],
  ['Chân trang', 'stats.today', 'Dòng chữ chạy — số người truy cập trong ngày', 'Truy cập hôm nay'],
  ['Chân trang', 'stats.total', 'Dòng chữ chạy — tổng số người truy cập', 'Tổng truy cập'],
  ['Chân trang', 'stats.aria', 'Chữ đọc — dòng thống kê truy cập', 'Thống kê truy cập website'],

  ['Biểu mẫu liên hệ', 'ft.ph.name', 'Ô họ tên — chân trang', 'Họ và tên (*):'],
  ['Biểu mẫu liên hệ', 'ft.ph.phone', 'Ô số điện thoại — chân trang', 'Số điện thoại (*):'],
  ['Biểu mẫu liên hệ', 'ft.ph.email', 'Ô email — chân trang', 'Email (*):'],
  ['Biểu mẫu liên hệ', 'ft.ph.message', 'Ô nội dung — chân trang', 'Nội dung liên hệ (*):'],
  ['Biểu mẫu liên hệ', 'pd.ph.name', 'Ô họ tên — trang chi tiết dự án', 'Họ và tên:'],
  ['Biểu mẫu liên hệ', 'pd.ph.phone', 'Ô số điện thoại — trang chi tiết dự án', 'Số điện thoại:'],
  ['Biểu mẫu liên hệ', 'pd.ph.message', 'Ô nội dung — trang chi tiết dự án', 'Nội dung liên hệ / Dự án quan tâm (Nếu có)'],
  ['Biểu mẫu liên hệ', 'form.ok', 'Thông báo gửi thành công', 'Cảm ơn bạn! Synetic đã nhận được thông tin và sẽ liên hệ lại sớm nhất.'],
  ['Biểu mẫu liên hệ', 'form.err', 'Thông báo thiếu thông tin', 'Vui lòng nhập họ tên, số điện thoại hoặc email và nội dung liên hệ.'],
  ['Biểu mẫu liên hệ', 'form.limit', 'Thông báo gửi quá nhiều lần', 'Bạn gửi quá nhiều lần, vui lòng thử lại sau ít phút.'],

  ['Trang chủ', 'home.map', 'Chữ mô tả bản đồ', 'Bản đồ trụ sở Synetic Group'],

  ['Trang Về chúng tôi', 'ab.values1', 'Chữ giữa vòng tròn Giá trị cốt lõi — dòng 1', 'GIÁ TRỊ'],
  ['Trang Về chúng tôi', 'ab.values2', 'Chữ giữa vòng tròn Giá trị cốt lõi — dòng 2', 'CỐT LÕI'],
  ['Trang Về chúng tôi', 'ab.team', 'Tiêu đề dải xanh Đội ngũ lãnh đạo', 'ĐỘI NGŨ LÃNH ĐẠO'],
  ['Trang Về chúng tôi', 'ab.chairnote', 'Chữ đậm trước ghi chú Chủ tịch', 'Chủ tịch Hội đồng Quản trị:'],
  ['Trang Về chúng tôi', 'ab.teamsoon', 'Dòng dưới các thẻ lãnh đạo', 'Thông tin chi tiết về từng thành viên Ban lãnh đạo sẽ được cập nhật đầy đủ trong thời gian tới.'],

  ['Trang thành viên', 'member.facts', 'Tiêu đề cột phải khi chưa đặt riêng', 'THÔNG TIN NHANH'],

  ['Trang Dự án', 'proj.featured', 'Tiêu đề dự án nổi bật', 'DỰ ÁN NỔI BẬT'],
  ['Trang Dự án', 'proj.status', 'Chữ tình trạng khi dự án chưa ghi', 'ĐANG TRIỂN KHAI'],
  ['Trang Dự án', 'proj.find', 'Tiêu đề khung tìm dự án', 'TÌM DỰ ÁN'],
  ['Trang Dự án', 'proj.type', 'Ô lọc — Loại hình (chữ đọc)', 'Loại hình'],
  ['Trang Dự án', 'proj.type.ph', 'Ô lọc — Loại hình (gợi ý)', 'Chọn loại hình'],
  ['Trang Dự án', 'proj.name', 'Ô lọc — Tên dự án (chữ đọc)', 'Tên dự án'],
  ['Trang Dự án', 'proj.name.ph', 'Ô lọc — Tên dự án (gợi ý)', 'Chọn tên dự án'],
  ['Trang Dự án', 'proj.loc', 'Ô lọc — Địa điểm (chữ đọc)', 'Địa điểm'],
  ['Trang Dự án', 'proj.loc.ph', 'Ô lọc — Địa điểm (gợi ý)', 'Chọn địa điểm'],
  ['Trang Dự án', 'proj.stat', 'Ô lọc — Tình trạng (chữ đọc)', 'Tình trạng'],
  ['Trang Dự án', 'proj.stat.ph', 'Ô lọc — Tình trạng (gợi ý)', 'Chọn tình trạng'],
  ['Trang Dự án', 'proj.empty', 'Khi lọc không có dự án', 'Không tìm thấy dự án phù hợp.'],
  ['Trang Dự án', 'proj.none', 'Khi chưa có dự án nào', 'Nội dung đang được cập nhật. Phần này sẽ sớm giới thiệu các dự án tiêu biểu của Synetic Group.'],
  ['Trang Dự án', 'proj.contact', 'Tiêu đề biểu mẫu ở trang chi tiết dự án', 'LIÊN HỆ VỚI CHÚNG TÔI'],

  ['Trang Tin tức', 'news.market', 'Tiêu đề nhóm Tin tức thị trường', 'TIN TỨC THỊ TRƯỜNG'],
  ['Trang Tin tức', 'news.internal', 'Tiêu đề nhóm Hoạt động nội bộ', 'HOẠT ĐỘNG NỘI BỘ - VĂN HÓA CÔNG TY'],
  ['Trang Tin tức', 'news.related', 'Tiêu đề Bài viết liên quan', 'BÀI VIẾT LIÊN QUAN'],
  ['Trang Tin tức', 'news.none', 'Khi chưa có tin nào', 'Nội dung đang được cập nhật. Tin tức của Synetic Group sẽ sớm xuất hiện tại đây.'],

  ['Trang Tuyển dụng', 'job.none', 'Khi chưa có vị trí nào', 'Hiện chưa có vị trí tuyển dụng nào. Vui lòng quay lại sau.'],
  ['Trang Tuyển dụng', 'job.dept', 'Cột trái — tiêu đề Các phòng ban', 'Các phòng ban'],
  ['Trang Tuyển dụng', 'job.deptsearch', 'Cột trái — chữ đọc ô tìm phòng ban', 'Tìm phòng ban'],
  ['Trang Tuyển dụng', 'job.loc', 'Cột trái — tiêu đề Địa điểm làm việc', 'Địa điểm làm việc'],
  ['Trang Tuyển dụng', 'job.locsearch', 'Cột trái — chữ đọc ô tìm địa điểm', 'Tìm địa điểm'],
  ['Trang Tuyển dụng', 'job.videoalt', 'Mô tả ảnh bìa clip tuyển dụng', 'Clip tuyển dụng Synetic'],
  ['Trang Tuyển dụng', 'job.videoplay', 'Chữ đọc — nút phát clip', 'Phát clip tuyển dụng'],

  ['Trang Đối tác', 'pt.focus', 'Chữ trên các hạng mục hợp tác', 'Các hạng mục hợp tác trọng tâm:'],
  ['Trang Đối tác', 'pt.all', 'Nút lọc Tất cả', 'Tất cả'],
  ['Trang Đối tác', 'pt.empty', 'Khi nhóm chưa có đối tác', 'Chưa có đối tác trong nhóm này.'],
  ['Trang Đối tác', 'pt.intro', 'Cửa sổ chi tiết — mục 1', '1.Giới thiệu Đối tác'],
  ['Trang Đối tác', 'pt.coop', 'Cửa sổ chi tiết — mục 2', '2.Nội dung hợp tác trọng tâm'],
  ['Trang Đối tác', 'pt.web', 'Cửa sổ chi tiết — nút Website', 'Truy cập Website Đối tác'],
  ['Trang Đối tác', 'pt.fan', 'Cửa sổ chi tiết — nút Fanpage', 'Xem bài viết trên Fanpage'],

  ['Trang Thư viện', 'lib.none', 'Chữ khi thư viện chưa có nội dung', 'Nội dung đang được cập nhật. Phần này sẽ sớm lưu trữ hình ảnh, video và tài liệu của Synetic Group.'],

  ['Chữ trong trình chiếu ảnh', 'js.project', 'Chữ đọc — chấm chọn dự án (thêm số phía sau)', 'Dự án '],
  ['Chữ trong trình chiếu ảnh', 'js.photo', 'Chữ đọc — chấm / ảnh nhỏ (thêm số phía sau)', 'Ảnh '],
  ['Chữ trong trình chiếu ảnh', 'js.prev', 'Chữ đọc — nút ảnh trước', 'Ảnh trước'],
  ['Chữ trong trình chiếu ảnh', 'js.next', 'Chữ đọc — nút ảnh sau', 'Ảnh sau']
];

const DEF = {};
REGISTRY.forEach((r) => { DEF[r[1]] = r[3]; });

let cache = null;
function overrides() {
  if (!cache) {
    let raw = {};
    try { raw = readJSON('ui-texts'); } catch (e) { raw = {}; }
    cache = (raw && raw.values && typeof raw.values === 'object') ? raw.values : {};
  }
  return cache;
}

// the wording shown on the site for a key: the admin's text if there is one, else the default
function t(key) {
  const v = overrides()[key];
  if (typeof v === 'string' && v.trim()) return v;
  return DEF[key] !== undefined ? DEF[key] : key;
}

function save(values) {
  const clean = {};
  Object.keys(values || {}).forEach((k) => {
    const v = String(values[k] == null ? '' : values[k]).replace(/\r\n/g, '\n').trim();
    if (DEF[k] !== undefined && v && v !== DEF[k].trim()) clean[k] = v;
  });
  writeJSON('ui-texts', { values: clean });
  cache = clean;
}

// the few texts that JavaScript on the page needs (photo slider labels...)
function clientTexts() {
  return { project: t('js.project'), photo: t('js.photo'), prev: t('js.prev'), next: t('js.next') };
}

function groups() {
  const out = [];
  const idx = {};
  REGISTRY.forEach((r) => {
    if (idx[r[0]] === undefined) { idx[r[0]] = out.length; out.push({ name: r[0], items: [] }); }
    out[idx[r[0]]].items.push({ key: r[1], label: r[2], def: r[3], value: (overrides()[r[1]] || '') });
  });
  return out;
}

module.exports = { REGISTRY, t, save, groups, clientTexts };

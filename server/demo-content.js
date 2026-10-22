'use strict';
const { readJSON, writeJSON } = require('./data-store');
const sd = require('./site-data');

const ADDRESS = 'Tầng 17, Tòa nhà Charmvit Tower, 117 Trần Duy Hưng, P. Yên Hòa, TP. Hà Nội';
const img = (f) => 'assets/demo/' + f;
const plainSlug = (t) => 'job-' + t.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const NEWS = [
  { slug: 'vinhomes-sgc-ky-hop-dong-5-tuyen-metro', category: 'thi-truong', publishedAt: '2026-10-15', image: img('news-1.jpg'),
    title: 'VINHOMES – SGC KÝ HỢP ĐỒNG GẦN 900.000 TỶ XÂY 5 TUYẾN METRO Ở HÀ NỘI: HUY ĐỘNG HƠN 100 DÂY CHUYỀN THI CÔNG HẦM METRO',
    excerpt: 'Ngày 15/10/2026, Ban Quản lý Đường sắt đô thị Hà Nội và Liên danh tổng thầu Công ty Cổ phần Vinhomes – Công ty Cổ phần Đầu tư và Xây dựng SGC đã ký kết hợp đồng triển khai 5 tuyến đường sắt đô thị số 1, 2, 8, 10 và 14, tổng mức đầu tư lên đến gần 900.000 tỷ đồng theo hình thức chìa khóa trao tay.' },
  { slug: 'du-thao-luat-buu-chinh-sua-doi', category: 'thi-truong', publishedAt: '2026-10-15', image: img('news-2.jpg'),
    title: 'DỰ THẢO LUẬT BƯU CHÍNH (SỬA ĐỔI): LÀM RÕ RANH GIỚI VỚI VẬN TẢI, LOGISTICS',
    excerpt: 'Trong quá trình hoàn thiện dự thảo Luật Bưu chính (sửa đổi), đã rà soát phạm vi điều chỉnh, làm rõ ranh giới giữa dịch vụ bưu chính với hoạt động vận tải hàng hóa, logistics...' },
  { slug: 'nong-dan-lam-nong-nghiep-huu-co', category: 'thi-truong', publishedAt: '2026-10-15', image: img('news-3.jpg'),
    title: 'NÔNG DÂN LÀM NÔNG NGHIỆP HỮU CƠ, CHINH PHỤC THỊ TRƯỜNG BẰNG CHẤT LƯỢNG',
    excerpt: 'Từ vườn nho ở Vu Gia đến rau hữu cơ tại Tam Xuân, nông dân Đà Nẵng đang tạo đầu ra cho nông sản sạch bằng quy trình canh tác minh bạch...' },
  { slug: 'chuc-mung-ngay-doanh-nhan-viet-nam-13-10', category: 'noi-bo', publishedAt: '2026-10-13', image: img('news-4.jpg'),
    title: 'CHÚC MỪNG NGÀY DOANH NHÂN VIỆT NAM 13/10 - TRI ÂN "VỊ THUYỀN TRƯỞNG" ĐÁNG KÍNH!',
    excerpt: 'Nhân kỷ niệm Ngày Doanh nhân Việt Nam 13/10, đại diện tập thể Cán bộ Nhân viên đã chuẩn bị những lẵng hoa tươi thắm nhất để gửi tặng đến Sếp - người "thuyền trưởng" tài ba luôn vững tay chèo lái con thuyền doanh nghiệp của chúng ta.\n\nĐằng sau mỗi bước tiến và thành công của công ty chính là tầm nhìn chiến lược, sự quyết đoán và cả những tâm huyết không ngừng nghỉ của người lãnh đạo. Những lẵng hoa rực rỡ hôm nay không chỉ là món quà tinh thần, mà còn là lời tri ân sâu sắc, lòng biết ơn chân thành nhất từ toàn thể đội ngũ nhân viên gửi đến Sếp. Cảm ơn Sếp vì đã luôn là người truyền lửa, dẫn dắt và tạo ra một môi trường làm việc tuyệt vời để tất cả cùng nhau gắn kết và phát triển.' },
  { slug: 'synetic-chuc-mung-ngay-phu-nu-viet-nam-20-10-a', category: 'noi-bo', publishedAt: '2026-10-17', image: img('news-5.jpg'),
    title: 'SYNETIC CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10 - "BẢN LĨNH KIÊU SA – VỮNG VÀNG TỎA SÁNG"',
    excerpt: 'Phụ nữ hiện đại không chỉ mang trong mình nét dịu dàng, tinh tế mà còn sở hữu bản lĩnh kiên cường, trí tuệ sắc sảo – là nguồn cảm hứng và là nhân tố quan trọng kiến tạo nên những giá trị vượt trội trong cả công việc lẫn cuộc sống.\nNhân ngày Phụ nữ Việt Nam 20/10, thay mặt Ban Lãnh đạo Công ty Cổ phần Tập đoàn Synetic (Synetic Group), Chủ tịch HĐQT Bùi Nhật Phong cùng toàn thể anh em trong Tập đoàn xin gửi những lời chúc tốt đẹp và trân quý nhất tới Quý Đối tác, Quý Khách hàng nữ cùng toàn thể phái đẹp của Hội Chị Em Synetic.\n\nCảm ơn Quý Đối tác và Quý Khách hàng đã luôn tin tưởng, đồng hành cùng Synetic Group trên hành trình phát triển bền vững.' },
  { slug: 'synetic-chuc-mung-ngay-phu-nu-viet-nam-20-10-b', category: 'noi-bo', publishedAt: '2026-10-20', image: img('news-6.jpg'),
    title: 'SYNETIC CHÚC MỪNG NGÀY PHỤ NỮ VIỆT NAM 20/10 - "BẢN LĨNH KIÊU SA – VỮNG VÀNG TỎA SÁNG"',
    excerpt: 'Nhân ngày tôn vinh Phụ nữ Việt Nam 20/10, Ban Lãnh đạo Synetic Group cùng Chủ tịch HĐQT Bùi Nhật Phong thân gửi tới toàn thể các "bông hồng" của Hội Chị Em Synetic lời chúc trân quý nhất:\n "Bản lĩnh kiêu sa – Vững vàng tỏa sáng"\n\nCảm ơn các chị, các em vì đã luôn là nguồn năng lượng tuyệt vời, vừa duyên dáng, tinh tế lại vừa quyết đoán, bản lĩnh trên hành trình kiến tạo những giá trị vượt trội cùng Tập đoàn. Mến chúc phái đẹp Synetic luôn xinh đẹp rạng ngời, tâm hồn an nhiên, hạnh phúc viên mãn và vươn tầm thành công trong cả sự nghiệp lẫn cuộc sống!' },
  { slug: 'happy-vietnamese-womens-day-20-10', category: 'noi-bo', publishedAt: '2026-10-20', image: null, images: [img('news-poster.jpg')],
    title: "HAPPY VIETNAMESE WOMEN'S DAY 20/10!",
    excerpt: 'Tháng Mười thu dịu dàng gõ cửa cũng là lúc chúng ta cùng nhau hướng về Ngày Phụ nữ Việt Nam 20/10 – một dịp đặc biệt để tôn vinh và gửi trao những tình cảm trân quý nhất đến một nửa yêu thương của thế giới.',
    body: 'Tháng Mười thu dịu dàng gõ cửa cũng là lúc chúng ta cùng nhau hướng về Ngày Phụ nữ Việt Nam 20/10 – một dịp đặc biệt để tôn vinh và gửi trao những tình cảm trân quý nhất đến một nửa yêu thương của thế giới.\n\nTrong hành trình xây dựng và phát triển không ngừng nghỉ, các chị em luôn là những mảnh ghép vô cùng quan trọng và đầy tự hào. Không chỉ mang đến sự mềm mại, tinh tế và gắn kết trong văn hóa tập thể, phái đẹp còn khẳng định bản lĩnh vững vàng, trí tuệ sắc bén và sự cống hiến bền bỉ trong từng dự án, từng mục tiêu chung.\n\nMỗi thành tựu đạt được ngày hôm nay đều mang đậm dấu ấn từ những nỗ lực thầm lặng nhưng phi thường của các bà, các mẹ, các chị và các em – những người phụ nữ hiện đại vừa giỏi việc chuyên môn, vừa khéo léo giữ lửa ấm gia đình. Nhân ngày Phụ nữ Việt Nam 20/10, xin được gửi lời tri ân sâu sắc cùng những lời chúc tốt đẹp nhất đến toàn thể chị em phụ nữ.\n\nChúc phái đẹp luôn dồi dào sức khỏe, giữ mãi nét thanh xuân rạng rỡ, tâm hồn luôn bình yên và trái tim luôn tràn đầy nhiệt huyết. Mong rằng trên mọi chặng đường phía trước, chị em sẽ luôn được yêu thương, trân trọng và tiếp tục tỏa sáng rực rỡ với những ước mơ, hoài bão của chính mình!' }
];

const PROJECT_EXCERPT = 'Synetic Group hoạt động trong các lĩnh vực cốt lõi: nông nghiệp, dinh dưỡng, thú y, chuỗi cung ứng và đầu tư — cam kết mang đến các giải pháp và dịch vụ chất lượng, góp phần thúc đẩy sự phát triển bền vững của cộng đồng và xã hội.';

const PROJECTS = [
  { slug: 'hi-lifeshop-picity-highpark', title: 'HI-LIFESHOP PICITY HIGHPARK', type: 'Dự án thuộc chữa PARVO', location: 'Thạnh Xuân 13 - Phường Thới An (Quận 12 cũ) - TP Hồ Chí Minh', status: 'Đang triển khai', featured: true },
  { slug: 'ak-tower', title: 'A&K TOWER', type: 'CĂN HỘ CAO CẤP', location: 'TP Hồ Chí Minh', status: 'Đang triển khai' },
  { slug: 'the-felix', title: 'THE FELIX', type: 'CĂN HỘ CAO CẤP', location: 'Bình Dương', status: 'Đang triển khai' },
  { slug: 'setia-edenia', title: 'SETIA EDENIA', type: 'CĂN HỘ CAO CẤP', location: 'Bình Dương', status: 'Đang triển khai' },
  { slug: 'sunshine-legend-city', title: 'SUNSHINE LEGEND CITY', type: 'CĂN HỘ CAO CẤP', location: 'Hà Nội', status: 'Đang triển khai' },
  { slug: 'homie-city', title: 'HOMIE CITY', type: 'CĂN HỘ CAO CẤP', location: 'Hà Nội', status: 'Đang triển khai' }
].map((p) => Object.assign({ excerpt: PROJECT_EXCERPT, body: '', image: 'assets/img/trophy.jpg', images: [], featured: false }, p));

const FACTORY = {
  slug: 'to-hop-nghien-cuu-san-xuat-dinh-duong-vat-nuoi-cong-nghe-cao-synetic',
  title: 'TỔ HỢP NGHIÊN CỨU & SẢN XUẤT DINH DƯỠNG VẬT NUÔI CÔNG NGHỆ CAO SYNETIC (SYNETIC HIGH-TECH ANIMAL NUTRITION COMPLEX)',
  type: 'Nhà máy', location: 'Việt Nam', status: 'Đang triển khai', featured: true,
  excerpt: PROJECT_EXCERPT,
  image: img('project-factory.jpg'), images: [],
  body: '# 1. GIỚI THIỆU & QUY MÔ DỰ ÁN\n- Đơn vị phát triển: **Synetic Dinh Dưỡng** (thành viên trực thuộc hệ sinh thái Synetic Group), dưới sự dẫn dắt của Chủ tịch HĐQT **Bà Lê Thanh Hà** với thương hiệu SNT-NUTRITION.\n- Năng lực sản xuất: Tổ hợp nhà máy công nghệ cao quy mô 12,5 ha, tổng vốn đầu tư 1.200 tỷ VNĐ, công suất 350.000 tấn/năm đạt chuẩn quốc tế ISO 22000, HACCP và GMP+.\n\n# 2. BA DÒNG SẢN PHẨM CHỦ LỰC\n- SN-312 • Thức ăn hỗn hợp: Dành cho heo thịt (Bao 25kg • TCCS 01:2026/SNT-NUTRITION) – Tối ưu chuyển hóa thức ăn, giúp heo tăng trọng nhanh và tỷ lệ nạc cao.\n- SN-PMX • Premix: Dành cho gia cầm (Túi 1kg • TCCS 02:2026/SNT-NUTRITION) – Bổ sung vi khoáng hữu cơ và enzyme giúp gia cầm khỏe mạnh, tăng năng suất trứng và thịt.\n- SN-MV • Multi Vitamin: Dành cho vật nuôi (Chai 1L • TCCS 03:2026/SNT-NUTRITION) – Vitamin tổng hợp dạng lỏng hòa tan 100%, giúp tăng đề kháng và chống stress nhiệt tức thì.\n\n# 3. LỢI THẾ CẠNH TRANH & MỤC TIÊU\n- Cam kết "3 Không": Không kháng sinh kích thích tăng trưởng – Không độc tố nấm mốc, tích hợp mã QR truy xuất nguồn gốc trên từng bao bì.\n- Sức mạnh Hệ sinh thái: Kết nối khép kín từ R&D đến **Synetic Nông Trại, Synetic Thú Y và Synetic Logistics**, hướng tới mạng lưới 800 đại lý toàn quốc và xuất khẩu sang Đông Nam Á.'
};

const DEPT = { design: 'Pr - Marketing', sales: 'Kinh doanh Bất Động Sản', acct: 'Kế toán / Kiểm toán', intern: 'Thực tập sinh / bán thời gian', hr: 'Tuyển dụng' };
const AREA = ['Văn phòng Thành phố Hà Nội', 'Chi nhánh Ocean Park 1', 'Chi nhánh Ocean Park 2&3'];

const JOBS = [
  ['Chuyên viên Thiết kế đồ họa', DEPT.design, AREA[0]],
  ['Giám đốc Kinh doanh', DEPT.sales, AREA[0]],
  ['Admin dự án', DEPT.acct, AREA[1]],
  ['Giám đốc điều hành', DEPT.hr, AREA[0]],
  ['Trưởng phòng Kinh doanh', DEPT.sales, AREA[1]],
  ['Chuyên viên Marketing tổng hợp', DEPT.intern, AREA[2]],
  ['Media editor', DEPT.design, AREA[0]]
].map((j) => ({ title: j[0], department: j[1], area: j[2], body: '' }));

const SALE_ADMIN_BODY = '# MÔ TẢ CÔNG VIỆC\n\n1. Hỗ trợ bộ phận kinh doanh, đối tác lock căn, lập biên nhận cọc, giữ chỗ, và các chứng từ liên quan\n\n2. Soạn thảo hợp đồng, chính sách, các văn bản của bộ phận kinh doanh\n\n3. Cập nhật tình trạng sản phẩm, giỏ hàng, giải quyết những vấn đề liên quan đến sản phẩm.\n\n4. Theo dõi, kiểm tra, báo cáo kết quả kinh doanh hàng tháng.\n\n5. Quản lý, lưu trữ dữ liệu/ tài liệu.\n\n6. Tham gia các sự kiện do công ty và CĐT tổ chức.\n\n7. Một số công việc phát sinh khác theo sự phân công của quản lý trực tiếp.\n\n8. Có trách nhiệm bảo mật số liệu, dữ liệu theo quy định của công ty.\n\n9. Các công việc khác theo sự phân công của Trưởng bộ phận và Ban Lãnh đạo.\n\n# YÊU CẦU ỨNG VIÊN\n\n1. Trình độ: Tốt nghiệp Đại học, Cao đẳng.\n\n2. Kinh nghiệm: ít nhất 1 năm ở vị trí sale admin cho mảng bất động sản\n\n3. Năng động, sáng tạo, chịu khó không ngại việc\n\n# THU NHẬP\n\n- Thu nhập khi đạt 100% KPI: Thoả thuận\n- Thu nhập tính theo tỷ lệ đạt KPI\n- Lương cứng: 12 – 14 triệu VND\n- Lương cứng không phụ thuộc doanh số\n\n# QUYỀN LỢI ỨNG VIÊN\n\n1. Lương cứng: 12.000.000 – 14.000.000 đồng + Hoa hồng + Thưởng.\n\n2. Môi trường làm việc trẻ trung, năng động, tăng trưởng nhanh, sáng tạo, chuyên nghiệp, được đào tạo bài bản phát huy tối đa năng lực bản thân.\n\n3. Được hưởng đầy đủ các chế độ : BHXH, BHYT, lễ tết, sinh nhật, cưới hỏi,....\n\n4. Được tham gia các chương trình gắn kết, teambuilding, du lịch hàng năm.\n\n# ĐỊA ĐIỂM VÀ THỜI GIAN\n\nĐịa điểm làm việc\n- Hà Nội: Tầng 2, Toà nhà Housinco Premium, số 288 Nguyễn Xiển,, Phường Thanh Liệt (huyện Thanh Trì cũ)\nThời gian làm việc\n- Thứ 2 – Thứ 7 (từ 08:30 đến 17:30)\n- Từ T2 đến sáng T7';

function importDemo() {
  const counts = { news: 0, projects: 0, jobs: 0 };
  let n = 0;
  const nextId = () => (Date.now() + (n++)).toString();

  const news = readJSON('news');
  NEWS.forEach((d) => {
    if (news.items.some((i) => i.slug === d.slug)) return;
    news.items.push(Object.assign({ id: nextId(), images: [], body: d.excerpt, published: true }, d));
    counts.news++;
  });
  writeJSON('news', news);

  const projects = sd.getProjects();
  PROJECTS.concat([FACTORY]).forEach((d) => {
    if (projects.items.some((i) => i.slug === d.slug)) return;
    projects.items.push(Object.assign({ id: nextId(), published: true }, d));
    counts.projects++;
  });
  writeJSON('projects', projects);

  const jobs = sd.getJobs();
  JOBS.map((j) => Object.assign({ slug: plainSlug(j.title) }, j)).concat([{
    slug: 'sale-admin-du-an', title: 'Sale Admin dự án', department: DEPT.acct, area: AREA[0], body: SALE_ADMIN_BODY
  }]).forEach((d) => {
    if (jobs.items.some((i) => i.slug === d.slug)) return;
    jobs.items.push(Object.assign({ id: nextId(), location: ADDRESS, postedAt: '2025-11-10', published: true }, d));
    counts.jobs++;
  });
  writeJSON('jobs', jobs);

  return counts;
}

module.exports = { importDemo };

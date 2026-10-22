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
const sd = require('./site-data');
const registerPublic = require('./public');
const registerAdminExtra = require('./admin-extra');

const newsUpload = createUploader('news');
const projectsUpload = createUploader('projects');
const jobsUpload = createUploader('jobs');
const teamUpload = createUploader('team');
const partnersUpload = createUploader('partners');
const siteImageUpload = createUploader('site');
const heroUpload = createUploader('hero');
const memberUpload = createUploader('members');
const MEMBER_FIELDS = [{ name: 'logo', maxCount: 1 }, { name: 'factImage1', maxCount: 1 }, { name: 'factImage2', maxCount: 1 }, { name: 'factImage3', maxCount: 1 }];
function fileOf(req, field) {
  return (req.files && req.files[field] && req.files[field][0]) || null;
}
// Builds the 3 "thông tin nhanh" cards of a member page, keeping an existing
// photo unless a new one is uploaded or "remove" is ticked for that row.
function buildFacts(req, existing) {
  const out = [];
  [1, 2, 3].forEach((i) => {
    const old = (existing || [])[i - 1] || {};
    const label = (req.body['factLabel' + i] || '').trim();
    const value = (req.body['factValue' + i] || '').trim();
    let image = old.image || null;
    const up = fileOf(req, 'factImage' + i);
    if (up) { deleteUploadedFile(image); image = publicPathFor('members', up.filename); }
    else if (req.body['factImageRemove' + i] === '1') { deleteUploadedFile(image); image = null; }
    if (label || value) out.push({ label, value, image });
  });
  return out;
}

const EDITABLE_PAGES = [
  { key: 'doi-ngu-lanh-dao-intro', label: 'Đội ngũ lãnh đạo (đoạn giới thiệu)', hasChairmanNote: true }
];

// The 6 "Về Synetic" pages that used to be EDITABLE_PAGES entries tied to a
// fixed template file each. Used once to seed/migrate data/ve-synetic-pages.json
// into the new addable/deletable list the first time it's read.
const VE_SYNETIC_SEED = [
  { slug: 'thong-diep-chu-tich-hdqt', label: 'Thông điệp Chủ tịch HĐQT', hasSign: true, signName: 'BÙI NHẬT PHONG', signTitle: 'Chủ tịch Hội đồng Quản trị',
    body: 'Kính gửi Quý đối tác, khách hàng và toàn thể cán bộ nhân viên,\n\nSynetic Group được hình thành từ khát vọng xây dựng một hệ sinh thái kinh doanh tích hợp, nơi nông nghiệp, dinh dưỡng, thú y, chuỗi cung ứng và đầu tư cùng vận hành trong một hệ thống hợp lực — đúng như tên gọi SYNETIC ghép từ SYN (hợp lực) và -ETIC (chuyển động).\n\nChúng tôi tin rằng giá trị bền vững chỉ đến từ sự kết nối thực chất: giữa các công ty thành viên trong hệ sinh thái, giữa doanh nghiệp với người chăn nuôi và đối tác, và giữa tăng trưởng hôm nay với trách nhiệm cho tương lai. Đó là lý do Hội đồng Quản trị luôn đặt quản trị minh bạch, đầu tư bài bản và phát triển con người làm nền tảng cho mọi quyết định chiến lược của Tập đoàn.\n\nThay mặt Hội đồng Quản trị, tôi trân trọng cảm ơn sự tin tưởng của Quý đối tác, khách hàng trong suốt thời gian qua, và cam kết đồng hành cùng toàn thể cán bộ nhân viên Synetic Group trên hành trình kiến tạo giá trị vượt trội.' },
  { slug: 'thong-diep-tong-giam-doc', label: 'Thông điệp Tổng giám đốc', hasSign: true, signName: 'BAN TỔNG GIÁM ĐỐC', signTitle: 'Synetic Group',
    body: 'Kính gửi Quý đối tác, khách hàng và toàn thể cán bộ nhân viên,\n\nTrên cương vị điều hành, chúng tôi xác định sứ mệnh của Synetic Group là "Phụng sự khách hàng — Kiến tạo thành công — Lan toả thịnh vượng". Đây không chỉ là khẩu hiệu mà là kim chỉ nam cho cách chúng tôi vận hành từng công ty thành viên: lấy chất lượng sản phẩm và hiệu quả thực tế tại trang trại làm thước đo, thay vì chỉ dựa trên cam kết trên giấy.\n\nBan Tổng Giám đốc tập trung nguồn lực vào ba trọng tâm: chuẩn hoá vận hành và chuỗi cung ứng giữa các công ty thành viên thông qua mô hình dịch vụ dùng chung, đầu tư vào nghiên cứu – ứng dụng công nghệ số và trí tuệ nhân tạo trong chăn nuôi và quản trị, và xây dựng đội ngũ nhân sự vững chuyên môn, vững đạo đức nghề nghiệp.\n\nChúng tôi cam kết tiếp tục lắng nghe, cải tiến và đồng hành cùng Quý đối tác trên từng chặng đường phát triển của hệ sinh thái Synetic.' },
  { slug: 'lich-su', label: 'Lịch sử', hasSign: false, signName: '', signTitle: '',
    body: 'Synetic Group được thành lập từ năm 2026 với xuất phát điểm là hoạt động trong lĩnh vực nông nghiệp và dinh dưỡng vật nuôi. Từ nền tảng ban đầu đó, Tập đoàn từng bước mở rộng sang các lĩnh vực liên quan mật thiết trong chuỗi giá trị chăn nuôi: thú y, logistics – chuỗi cung ứng, và đầu tư tài chính, hình thành nên hệ sinh thái năm thành viên như hiện nay — Synetic Dinh Dưỡng, Synetic Thú Y, Synetic Logistics, Synetic Nông Trại và Synetic Capital.\n\nQuá trình phát triển của Synetic Group gắn liền với định hướng "hợp lực" — thay vì phát triển từng mảng kinh doanh riêng lẻ, Tập đoàn xây dựng các công ty thành viên để bổ trợ lẫn nhau trong cùng một chuỗi giá trị khép kín: từ dinh dưỡng đầu vào, chăm sóc sức khoẻ vật nuôi, vận chuyển – lưu kho, đến chăn nuôi thực tế và nguồn vốn đầu tư.\n\nSynetic Group hiện tiếp tục đầu tư vào chuẩn hoá thương hiệu, quản trị và công nghệ để phát triển hệ sinh thái theo hướng chuyên nghiệp, bền vững và có khả năng mở rộng dài hạn.' },
  { slug: 'tam-nhin-chien-luoc', label: 'Tầm nhìn chiến lược', hasSign: false, signName: '', signTitle: '',
    body: 'Chiến lược phát triển của Synetic Group được xây dựng trên ba trụ cột chính.\n\nMở rộng và chuẩn hoá hệ sinh thái — tiếp tục củng cố năng lực của từng công ty thành viên (dinh dưỡng, thú y, logistics, nông trại, đầu tư), đồng thời chuẩn hoá vận hành theo mô hình dịch vụ dùng chung để tối ưu chi phí và tốc độ ra quyết định trên toàn hệ thống.\n\nĐầu tư vào công nghệ và đổi mới sáng tạo — ứng dụng số hoá, tự động hoá và trí tuệ nhân tạo (AI) vào quản trị chuỗi cung ứng và chăn nuôi thông minh, hướng tới nâng cao năng suất và giảm rủi ro dịch bệnh trong toàn chuỗi.\n\nPhát triển bền vững và có trách nhiệm — chủ động tiếp cận các tiêu chuẩn ESG, truy xuất nguồn gốc và giảm phát thải, đón đầu các yêu cầu ngày càng khắt khe của chuỗi thực phẩm – chăn nuôi xuất khẩu.\n\nTầm nhìn "Mở lối phồn vinh" của Synetic Group không dừng lại ở quy mô tăng trưởng, mà hướng đến việc trở thành hệ sinh thái kinh doanh tích hợp đáng tin cậy hàng đầu Việt Nam trong lĩnh vực nông nghiệp, dinh dưỡng, dịch vụ chuỗi cung ứng và đầu tư.' },
  { slug: 'trach-nhiem-xa-hoi', label: 'Trách nhiệm xã hội', hasSign: false, signName: '', signTitle: '',
    body: 'Trách nhiệm xã hội tại Synetic Group được triển khai gắn liền với lĩnh vực hoạt động cốt lõi là nông nghiệp, dinh dưỡng và thú y — nơi doanh nghiệp có tác động trực tiếp đến sinh kế của người chăn nuôi, sức khoẻ vật nuôi và an toàn thực phẩm cho cộng đồng.\n\nVới con người — Synetic Group đầu tư vào đào tạo nội bộ thông qua Học viện Synetic, chương trình đào tạo kỹ năng quản trị, bán hàng và kỹ thuật cho cán bộ nhân viên, hệ thống đại lý và khách hàng, góp phần nâng cao năng lực cho toàn chuỗi giá trị, không chỉ trong nội bộ Tập đoàn.\n\nVới môi trường và chuỗi cung ứng — Tập đoàn từng bước tiếp cận các tiêu chuẩn phát triển bền vững (ESG), truy xuất nguồn gốc và giảm phát thải trong hoạt động sản xuất – chăn nuôi, nhằm đáp ứng yêu cầu ngày càng cao của thị trường trong nước và xuất khẩu.\n\nVới cộng đồng — Synetic Group hướng tới đồng hành lâu dài cùng người chăn nuôi và đối tác đại lý tại các địa phương nơi Tập đoàn đầu tư nhà máy, trang trại và cơ sở vận hành, thông qua chuyển giao kỹ thuật, hỗ trợ đầu ra sản phẩm và tạo việc làm tại chỗ.' },
  { slug: 'giai-thuong', label: 'Giải thưởng', hasSign: false, signName: '', signTitle: '',
    body: 'Synetic Group xác định uy tín thương hiệu được xây dựng bền vững thông qua chất lượng sản phẩm, dịch vụ và cam kết thực tế với khách hàng — thay vì chỉ dựa trên danh hiệu, giải thưởng.\n\nCác công ty thành viên trong hệ sinh thái đang trong quá trình chuẩn hoá theo các tiêu chuẩn chất lượng và quản lý phù hợp với từng lĩnh vực (dinh dưỡng vật nuôi, thú y, logistics), làm nền tảng để hướng tới các chứng nhận và ghi nhận chính thức từ các tổ chức trong và ngoài nước trong thời gian tới.\n\nDanh sách giải thưởng và chứng nhận cụ thể sẽ được cập nhật khi Synetic Group chính thức nhận được.' }
];

function getVeSyneticPages() {
  const current = readJSON('ve-synetic-pages');
  if (Array.isArray(current.items)) return current;
  const items = VE_SYNETIC_SEED.map((p, i) => ({
    id: (Date.now() + i).toString(),
    slug: p.slug,
    label: p.label,
    hasSign: p.hasSign,
    signName: p.signName,
    signTitle: p.signTitle,
    body: p.body,
    published: true
  }));
  const migrated = { items };
  writeJSON('ve-synetic-pages', migrated);
  return migrated;
}

const EDITABLE_IMAGES = sd.IMAGE_SLOTS;

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
    siteImages: sd.getSiteImages(),
    footer: sd.getFooter(),
    members: getMembersData().items.filter((m) => m.published).map((m) => (m.logo === 'assets/logos/vinafeed-logo.jpg' ? Object.assign({}, m, { logo: null }) : m))
  };
}

// Lets an admin bold part of a hero slide title with **like this** instead of
// needing to know HTML — rendered as the existing gold <span> highlight.
function renderHeroTitle(title) {
  return (title || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<span>$1</span>');
}

// Same **bold** markup as renderHeroTitle, but every word is wrapped so the
// hero title can fly in word by word (see .hero-text .w in style.css).
function renderHeroWords(title) {
  let i = 0;
  const words = (text) => text.split(/\s+/).filter(Boolean)
    .map((w) => '<span class="w" style="--i:' + (i++) + '">' + w + '</span>').join(' ');
  return (title || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .split(/(\*\*.+?\*\*)/)
    .map((seg) => (/^\*\*.+\*\*$/.test(seg) ? '<span>' + words(seg.slice(2, -2)) + '</span>' : words(seg)))
    .filter(Boolean).join(' ');
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

// ---------- Public pages ----------

app.use((req, res, next) => {
  res.locals.contactStatus = ['ok', 'err', 'limit'].includes(req.query.gui) ? req.query.gui : '';
  res.locals.back = req.path;
  next();
});
app.locals.tagBreak = (t) => String(t || '').replace(/,\s+/, ',\n');
app.locals.renderRich = sd.renderRich;
app.locals.renderInline = sd.renderInline;
app.locals.formatDateVi = sd.formatDateVi;

const publicDeps = { getMembersData, getVeSyneticPages, commonLocals, renderHeroTitle, renderHeroWords };
registerPublic(app, publicDeps);

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
  res.render('admin/dashboard', { unread: readJSON('contacts').items.filter((i) => !i.read).length });
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
      category: req.body.category === 'thi-truong' ? 'thi-truong' : 'noi-bo',
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
    item.category = req.body.category === 'thi-truong' ? 'thi-truong' : 'noi-bo';
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

// ---------- Admin: Các trang "Về Synetic" (thêm/xoá được) ----------

adminRouter.get('/ve-synetic', (req, res) => {
  const vePages = getVeSyneticPages();
  res.render('admin/ve-synetic-list', { items: vePages.items, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.get('/ve-synetic/new', (req, res) => {
  res.render('admin/ve-synetic-form', { item: null, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/ve-synetic/new', auth.verifyCsrf, (req, res) => {
  const label = (req.body.label || '').trim();
  const body = (req.body.body || '').replace(/\r\n/g, '\n').trim();
  if (!label || !body) {
    return res.status(400).render('admin/ve-synetic-form', { item: null, error: 'Vui lòng nhập tiêu đề và nội dung.', csrfToken: auth.ensureCsrfToken(req) });
  }
  const vePages = getVeSyneticPages();
  vePages.items.push({
    id: Date.now().toString(),
    slug: slugify(label),
    label,
    hasSign: req.body.hasSign === '1',
    signName: (req.body.signName || '').trim(),
    signTitle: (req.body.signTitle || '').trim(),
    body,
    published: req.body.published === '1'
  });
  writeJSON('ve-synetic-pages', vePages);
  res.redirect('/admin/ve-synetic');
});

adminRouter.get('/ve-synetic/:id/edit', (req, res) => {
  const vePages = getVeSyneticPages();
  const item = vePages.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/ve-synetic');
  res.render('admin/ve-synetic-form', { item, error: null, csrfToken: auth.ensureCsrfToken(req) });
});

adminRouter.post('/ve-synetic/:id/edit', auth.verifyCsrf, (req, res) => {
  const vePages = getVeSyneticPages();
  const item = vePages.items.find((i) => i.id === req.params.id);
  if (!item) return res.redirect('/admin/ve-synetic');
  const label = (req.body.label || '').trim();
  const body = (req.body.body || '').replace(/\r\n/g, '\n').trim();
  if (!label || !body) {
    return res.status(400).render('admin/ve-synetic-form', { item, error: 'Vui lòng nhập tiêu đề và nội dung.', csrfToken: auth.ensureCsrfToken(req) });
  }
  item.label = label;
  item.hasSign = req.body.hasSign === '1';
  item.signName = (req.body.signName || '').trim();
  item.signTitle = (req.body.signTitle || '').trim();
  item.body = body;
  item.published = req.body.published === '1';
  writeJSON('ve-synetic-pages', vePages);
  res.redirect('/admin/ve-synetic');
});

adminRouter.post('/ve-synetic/:id/delete', auth.verifyCsrf, (req, res) => {
  const vePages = getVeSyneticPages();
  vePages.items = vePages.items.filter((i) => i.id !== req.params.id);
  writeJSON('ve-synetic-pages', vePages);
  res.redirect('/admin/ve-synetic');
});

adminRouter.post('/ve-synetic/:id/move', auth.verifyCsrf, (req, res) => {
  const vePages = getVeSyneticPages();
  const idx = vePages.items.findIndex((i) => i.id === req.params.id);
  const dir = req.body.direction === 'up' ? -1 : 1;
  const swapWith = idx + dir;
  if (idx !== -1 && swapWith >= 0 && swapWith < vePages.items.length) {
    const tmp = vePages.items[idx];
    vePages.items[idx] = vePages.items[swapWith];
    vePages.items[swapWith] = tmp;
    writeJSON('ve-synetic-pages', vePages);
  }
  res.redirect('/admin/ve-synetic');
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
  memberUpload.fields(MEMBER_FIELDS)(req, res, (err) => {
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
    const facts = buildFacts(req, []);
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
      logo: fileOf(req, 'logo') ? publicPathFor('members', fileOf(req, 'logo').filename) : null,
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

  memberUpload.fields(MEMBER_FIELDS)(req, res, (err) => {
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
    item.brand = (req.body.brand || 'Synetic').trim();
    item.brandSub = (req.body.brandSub || '').trim().toUpperCase();
    item.accent = req.body.accent || 'emerald';
    item.tagline = (req.body.tagline || '').trim();
    item.legalName = (req.body.legalName || '').trim();
    item.body = (req.body.body || '').replace(/\r\n/g, '\n').trim();
    item.factsTitle = (req.body.factsTitle || '').trim();
    item.facts = buildFacts(req, item.facts);
    item.published = req.body.published === '1';
    if (fileOf(req, 'logo')) {
      deleteUploadedFile(item.logo);
      item.logo = publicPathFor('members', fileOf(req, 'logo').filename);
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

registerAdminExtra(adminRouter);

// ---------- Admin: Ảnh cố định của website ----------

adminRouter.get('/hinh-anh', (req, res) => {
  const siteImages = readJSON('site-images');
  res.render('admin/site-images-list', { imageList: EDITABLE_IMAGES, siteImages: sd.getSiteImages() });
});

adminRouter.get('/hinh-anh/:key/edit', (req, res) => {
  const def = EDITABLE_IMAGES.find((i) => i.key === req.params.key);
  if (!def) return res.redirect('/admin/hinh-anh');
  const siteImages = readJSON('site-images');
  res.render('admin/site-images-form', {
    key: def.key,
    label: def.label,
    currentImage: sd.getSiteImages()[def.key] || null,
    logoHeight: siteImages.logoHeight || 52,
    logoHeightMobile: siteImages.logoHeightMobile || 44,
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
        logoHeightMobile: siteImages.logoHeightMobile || 44,
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
        logoHeightMobile: siteImages.logoHeightMobile || 44,
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
      siteImages.logoHeightMobile = (h2 >= 16 && h2 <= 200) ? h2 : 44;
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

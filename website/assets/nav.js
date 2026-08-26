(function(){
  function siteRoot(){
    var p = window.location.pathname;
    if(/\/thanh-vien\//.test(p) || /\/ve-synetic\//.test(p)) return '../';
    return '';
  }

  var NAV_GROUPS = [
    { label: null, items: [
      { title: 'Trang chủ', path: 'index.html' }
    ]},
    { label: 'VỀ SYNETIC', items: [
      { title: 'Thông điệp Chủ tịch HĐQT', path: 've-synetic/thong-diep-chu-tich-hdqt.html' },
      { title: 'Thông điệp Tổng giám đốc', path: 've-synetic/thong-diep-tong-giam-doc.html' },
      { title: 'Giá trị cốt lõi', path: 've-synetic/gia-tri-cot-loi.html' },
      { title: 'Lịch sử', path: 've-synetic/lich-su.html' },
      { title: 'Tầm nhìn chiến lược', path: 've-synetic/tam-nhin-chien-luoc.html' },
      { title: 'Mạng lưới hoạt động', path: 've-synetic/mang-luoi-hoat-dong.html' },
      { title: 'Đội ngũ lãnh đạo', path: 've-synetic/doi-ngu-lanh-dao.html' },
      { title: 'Trách nhiệm xã hội', path: 've-synetic/trach-nhiem-xa-hoi.html' },
      { title: 'Giải thưởng', path: 've-synetic/giai-thuong.html' },
      { title: 'Đối tác và khách hàng', path: 've-synetic/doi-tac-khach-hang.html' }
    ]},
    { label: 'HỆ SINH THÁI', items: [
      { title: 'Synetic Dinh Dưỡng', path: 'thanh-vien/nutrition.html' },
      { title: 'Synetic Thú Y', path: 'thanh-vien/vet.html' },
      { title: 'Synetic Logistics', path: 'thanh-vien/logistics.html' },
      { title: 'Synetic Nông Trại', path: 'thanh-vien/farm.html' },
      { title: 'Synetic Capital', path: 'thanh-vien/capital.html' }
    ]},
    { label: null, items: [
      { title: 'Dự án', path: 'du-an.html' },
      { title: 'Tin tức', path: 'tin-tuc.html' },
      { title: 'Thư viện', path: 'thu-vien.html' },
      { title: 'Liên hệ', path: 'index.html#lien-he' }
    ]}
  ];

  var NAV_INDEX = [];
  NAV_GROUPS.forEach(function(g){ g.items.forEach(function(it){ NAV_INDEX.push(it); }); });

  document.addEventListener('DOMContentLoaded', function(){
    var root = siteRoot();

    /* ---- dropdowns (Về Synetic + language switch) ---- */
    var ddItems = document.querySelectorAll('.has-dropdown');
    function closeAllDropdowns(){
      ddItems.forEach(function(li){
        li.classList.remove('open');
        var t = li.querySelector('.dropdown-toggle');
        if(t) t.setAttribute('aria-expanded','false');
      });
    }
    ddItems.forEach(function(li){
      var toggle = li.querySelector('.dropdown-toggle');
      if(!toggle) return;
      toggle.setAttribute('aria-haspopup','true');
      toggle.setAttribute('aria-expanded','false');
      toggle.addEventListener('click', function(e){
        e.preventDefault();
        var willOpen = !li.classList.contains('open');
        closeAllDropdowns();
        if(willOpen){ li.classList.add('open'); toggle.setAttribute('aria-expanded','true'); }
      });
    });
    document.addEventListener('click', function(e){
      ddItems.forEach(function(li){ if(!li.contains(e.target)) li.classList.remove('open'); });
    });

    /* ---- full menu panel ---- */
    var menuToggle = document.getElementById('menuToggle');
    var menuPanel = document.getElementById('menuPanel');
    if(menuPanel){
      var wrap = document.createElement('div');
      wrap.className = 'wrap';
      NAV_GROUPS.forEach(function(g){
        var col = document.createElement('div');
        col.className = 'col';
        if(g.label){ var h = document.createElement('h6'); h.textContent = g.label; col.appendChild(h); }
        g.items.forEach(function(it){
          var a = document.createElement('a');
          a.href = root + it.path;
          a.textContent = it.title;
          col.appendChild(a);
        });
        wrap.appendChild(col);
      });
      menuPanel.appendChild(wrap);
    }
    if(menuToggle && menuPanel){
      menuToggle.addEventListener('click', function(){
        var willOpen = !menuPanel.classList.contains('open');
        menuPanel.classList.toggle('open', willOpen);
        menuToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
    }

    /* ---- search ---- */
    var searchToggle = document.getElementById('searchToggle');
    var searchOverlay = document.getElementById('searchOverlay');
    var searchInput = document.getElementById('searchInput');
    var searchClose = document.getElementById('searchClose');
    var searchResults = document.getElementById('searchResults');

    function renderResults(query){
      if(!searchResults) return;
      searchResults.innerHTML = '';
      var q = query.trim().toLowerCase();
      if(!q) return;
      var matches = NAV_INDEX.filter(function(it){ return it.title.toLowerCase().indexOf(q) !== -1; }).slice(0, 8);
      if(matches.length === 0){
        var empty = document.createElement('p');
        empty.className = 'empty';
        empty.textContent = 'Không tìm thấy kết quả phù hợp với "' + query + '".';
        searchResults.appendChild(empty);
        return;
      }
      matches.forEach(function(it){
        var a = document.createElement('a');
        a.href = root + it.path;
        a.textContent = it.title;
        searchResults.appendChild(a);
      });
    }

    function openSearch(){
      if(!searchOverlay) return;
      searchOverlay.classList.add('open');
      if(searchToggle) searchToggle.setAttribute('aria-expanded','true');
      if(searchInput){ searchInput.value = ''; searchInput.focus(); }
      if(searchResults) searchResults.innerHTML = '';
    }
    function closeSearch(){
      if(!searchOverlay) return;
      searchOverlay.classList.remove('open');
      if(searchToggle) searchToggle.setAttribute('aria-expanded','false');
    }

    if(searchToggle) searchToggle.addEventListener('click', openSearch);
    if(searchClose) searchClose.addEventListener('click', closeSearch);
    if(searchOverlay) searchOverlay.addEventListener('click', function(e){ if(e.target === searchOverlay) closeSearch(); });
    if(searchInput) searchInput.addEventListener('input', function(){ renderResults(searchInput.value); });

    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape'){
        closeAllDropdowns();
        closeSearch();
        if(menuPanel){ menuPanel.classList.remove('open'); if(menuToggle) menuToggle.setAttribute('aria-expanded','false'); }
      }
    });
  });
})();

/* Ô tìm kiếm trong trang quản trị: gõ chữ -> ra mục cần sửa. Phím tắt: "/" hoặc Ctrl+K */
(function () {
  var bar = document.querySelector('.admin-topbar');
  if (!bar) return;

  var box = document.createElement('div');
  box.className = 'as-box';
  box.innerHTML =
    '<input type="search" class="as-in" placeholder="Tìm để sửa nhanh… (phím /)" autocomplete="off" aria-label="Tìm trong trang quản trị">' +
    '<div class="as-res" hidden></div>';
  var logout = bar.querySelector('form');
  bar.insertBefore(box, logout || null);

  var input = box.querySelector('.as-in');
  var res = box.querySelector('.as-res');
  var data = null, loading = false, sel = -1, shown = [];

  // bỏ dấu tiếng Việt để gõ "tin tuc" cũng ra "Tin tức"
  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function load(cb) {
    if (data) return cb();
    if (loading) return;
    loading = true;
    fetch('/admin/tim-kiem.json', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        data = j.map(function (i) { return { i: i, nt: norm(i.t), nk: norm(i.s + ' ' + i.k) }; });
        loading = false; cb();
      })
      .catch(function () { loading = false; res.hidden = false; res.innerHTML = '<div class="as-empty">Không tải được dữ liệu tìm kiếm, hãy tải lại trang.</div>'; });
  }

  function score(e, words) {
    var s = 0;
    for (var w = 0; w < words.length; w++) {
      var t = e.nt.indexOf(words[w]);
      if (t === 0) s += 6;
      else if (t > 0) s += 4;
      else if (e.nk.indexOf(words[w]) >= 0) s += 1;
      else return 0;
    }
    return s;
  }

  function render() {
    var q = norm(input.value).trim();
    if (!q) { res.hidden = true; res.innerHTML = ''; shown = []; return; }
    var words = q.split(/\s+/);
    shown = data.map(function (e) { return { e: e, s: score(e, words) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 30).map(function (x) { return x.e.i; });
    sel = shown.length ? 0 : -1;
    res.hidden = false;
    if (!shown.length) { res.innerHTML = '<div class="as-empty">Không thấy mục nào khớp “' + esc(input.value) + '”.</div>'; return; }
    res.innerHTML = shown.map(function (i, n) {
      return '<a class="as-it' + (n === sel ? ' on' : '') + '" href="' + esc(i.u) + '"><b>' + esc(i.t) + '</b><span>' + esc(i.s) + '</span></a>';
    }).join('');
  }

  function mark() {
    var els = res.querySelectorAll('.as-it');
    for (var n = 0; n < els.length; n++) els[n].classList.toggle('on', n === sel);
    if (els[sel]) els[sel].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', function () { load(render); });
  input.addEventListener('focus', function () { load(function () { if (input.value) render(); }); });
  input.addEventListener('keydown', function (ev) {
    if (ev.key === 'ArrowDown') { ev.preventDefault(); if (shown.length) { sel = (sel + 1) % shown.length; mark(); } }
    else if (ev.key === 'ArrowUp') { ev.preventDefault(); if (shown.length) { sel = (sel - 1 + shown.length) % shown.length; mark(); } }
    else if (ev.key === 'Enter') { if (shown[sel]) { ev.preventDefault(); location.href = shown[sel].u; } }
    else if (ev.key === 'Escape') { input.value = ''; res.hidden = true; input.blur(); }
  });
  document.addEventListener('click', function (ev) { if (!box.contains(ev.target)) res.hidden = true; });
  document.addEventListener('keydown', function (ev) {
    var tag = (ev.target.tagName || '').toLowerCase();
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select' || ev.target.isContentEditable;
    if ((ev.key === '/' && !typing) || ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k')) {
      ev.preventDefault(); input.focus(); input.select();
    }
  });
})();

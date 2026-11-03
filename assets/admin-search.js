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
        data = j.map(function (i) { return { i: i, nt: norm(i.t), ng: norm(i.s), nk: norm(i.k || '') }; });
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
      else if (e.nk.indexOf(words[w]) >= 0 || e.ng.indexOf(words[w]) >= 0) s += 1;
      else return 0;
    }
    if (e.nk.indexOf(words.join(' ')) >= 0 || e.nt.indexOf(words.join(' ')) >= 0) s += 20;
    return s;
  }

  // the line shown under a result: the words around the match, taken from the item's own text
  function snippet(e, q) {
    var raw = e.i.k || '';
    var at = e.nk.indexOf(q), len = q.length;
    if (at < 0) { var w = q.split(' ')[0]; at = e.nk.indexOf(w); len = w.length; }
    if (at < 0 || raw.length !== e.nk.length) return '';
    var from = Math.max(0, at - 28), to = Math.min(raw.length, at + len + 48);
    return (from > 0 ? '… ' : '') + esc(raw.slice(from, at)) + '<mark>' + esc(raw.slice(at, at + len)) + '</mark>' + esc(raw.slice(at + len, to)) + (to < raw.length ? ' …' : '');
  }

  // opening a result carries the typed words so the edit page can jump to the right box
  function hrefFor(i) { return i.u + (i.u.indexOf('?') >= 0 ? '&' : '?') + 'find=' + encodeURIComponent(input.value.trim()); }

  function render() {
    var q = norm(input.value).trim();
    if (!q) { res.hidden = true; res.innerHTML = ''; shown = []; return; }
    var words = q.split(/\s+/);
    var hits = data.map(function (e) { return { e: e, s: score(e, words) }; })
      .filter(function (x) { return x.s > 0; })
      .sort(function (a, b) { return b.s - a.s; })
      .slice(0, 30);
    shown = hits.map(function (x) { return x.e.i; });
    sel = shown.length ? 0 : -1;
    res.hidden = false;
    if (!shown.length) { res.innerHTML = '<div class="as-empty">Không thấy mục nào khớp “' + esc(input.value) + '”.</div>'; return; }
    res.innerHTML = hits.map(function (h, n) {
      var i = h.e.i, sn = snippet(h.e, q);
      return '<a class="as-it' + (n === sel ? ' on' : '') + '" href="' + esc(hrefFor(i)) + '"><b>' + esc(i.t) + '</b><span>' + esc(i.s) + '</span>' + (sn ? '<small>' + sn + '</small>' : '') + '</a>';
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
    else if (ev.key === 'Enter') { if (shown[sel]) { ev.preventDefault(); location.href = hrefFor(shown[sel]); } }
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

  /* arrived from a search result (?find=...): scroll to the box holding those words and highlight it */
  (function () {
    var m = /[?&]find=([^&]*)/.exec(location.search);
    if (!m) return;
    var raw = decodeURIComponent(m[1].replace(/\+/g, ' ')).trim();
    var q = norm(raw).trim();
    if (!q) return;
    function jump() {
      var fields = [].slice.call(document.querySelectorAll('input[type=text],input[type=search],input[type=url],input:not([type]),textarea'));
      var best = null, bs = 0, words = q.split(' ');
      fields.forEach(function (f) {
        if (f.classList.contains('as-in') || f.id === 'utq') return;
        var val = norm(f.value || ''), ph = norm(f.getAttribute('placeholder') || '');
        var s = 0;
        if (val.indexOf(q) >= 0) s = 3000 - Math.min(val.length, 2900); // the shortest box that holds the words is the most specific one
        else if (ph.indexOf(q) >= 0) s = 200;
        else { var both = val + ' ' + ph, c = 0; words.forEach(function (w) { if (both.indexOf(w) >= 0) c++; }); s = c === words.length ? 500 : 0; }
        if (s > bs) { bs = s; best = f; }
      });
      if (!best) return;
      best.scrollIntoView({ block: 'center' });
      best.focus({ preventScroll: true });
      var at = norm(best.value || '').indexOf(q);
      try { if (at >= 0) best.setSelectionRange(at, at + q.length); } catch (e) {}
      best.classList.add('as-hit');
      var bar = document.createElement('div');
      bar.className = 'as-found';
      bar.textContent = 'Đây là chỗ chứa “' + raw + '” — sửa ở ô đang được tô cam rồi bấm Lưu.';
      document.body.appendChild(bar);
      setTimeout(function () { bar.remove(); best.classList.remove('as-hit'); }, 9000);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', jump); else jump();
  })();
})();

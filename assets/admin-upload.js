/* Admin: ảnh to được thu nhỏ ngay trong trình duyệt trước khi gửi lên, để khỏi bị máy chủ chặn (413 Request Entity Too Large) */
(function () {
  var LIMIT = 400 * 1024;   // ảnh nhỏ hơn mức này thì giữ nguyên
  var MAX_SIDE = 2000;      // cạnh dài tối đa (px)

  function ext(name) { var m = /\.([a-z0-9]+)$/i.exec(name || ''); return m ? m[1].toLowerCase() : ''; }
  function baseName(name) { return String(name || 'anh').replace(/\.[a-z0-9]+$/i, ''); }

  function load(file) {
    return new Promise(function (ok, fail) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); ok(img); };
      img.onerror = function () { URL.revokeObjectURL(url); fail(new Error('decode')); };
      img.src = url;
    });
  }
  function toBlob(canvas, type, q) {
    return new Promise(function (ok) { canvas.toBlob(ok, type, q); });
  }
  function hasAlpha(ctx, w, h) {
    var d = ctx.getImageData(0, 0, w, h).data;
    for (var i = 3; i < d.length; i += 16) if (d[i] < 250) return true;
    return false;
  }

  function shrink(file) {
    var e = ext(file.name);
    if (!/^(jpe?g|png|webp)$/.test(e) || file.size <= LIMIT) return Promise.resolve(file);
    return load(file).then(function (img) {
      var scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      var w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
      var step = 0, best = null;
      function attempt() {
        var c = document.createElement('canvas');
        c.width = w; c.height = h;
        var ctx = c.getContext('2d');
        var alpha = false;
        if (e !== 'jpg' && e !== 'jpeg') { ctx.drawImage(img, 0, 0, w, h); alpha = hasAlpha(ctx, w, h); }
        if (!alpha) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h); }
        ctx.drawImage(img, 0, 0, w, h);
        var type = alpha ? 'image/webp' : 'image/jpeg';
        var q = [0.86, 0.78, 0.7, 0.6][Math.min(step, 3)];
        return toBlob(c, type, q).then(function (b) {
          if (!b) return best;
          // trình duyệt cũ không có webp sẽ trả png: vẫn dùng được
          if (!best || b.size < best.size) best = b;
          if (b.size <= LIMIT || step >= 6) return best;
          step++;
          if (step > 3) { w = Math.round(w * 0.82); h = Math.round(h * 0.82); }
          return attempt();
        });
      }
      return attempt().then(function (b) {
        if (!b || b.size >= file.size) return file;
        var ne = b.type === 'image/webp' ? 'webp' : b.type === 'image/png' ? 'png' : 'jpg';
        return new File([b], baseName(file.name) + '.' + ne, { type: b.type, lastModified: Date.now() });
      });
    }).catch(function () { return file; });
  }

  function handle(input) {
    var files = [].slice.call(input.files || []);
    if (!files.length || !files.some(function (f) { return f.size > LIMIT; })) return;
    var form = input.form, btns = form ? [].slice.call(form.querySelectorAll('button[type=submit],input[type=submit]')) : [];
    btns.forEach(function (b) { b.disabled = true; });
    var note = document.createElement('div');
    note.className = 'as-found';
    note.textContent = 'Đang thu nhỏ ảnh cho nhẹ…';
    document.body.appendChild(note);
    Promise.all(files.map(shrink)).then(function (out) {
      try {
        var dt = new DataTransfer();
        out.forEach(function (f) { dt.items.add(f); });
        input.files = dt.files;
      } catch (e) {}
    }).then(function () {
      note.remove();
      btns.forEach(function (b) { b.disabled = false; });
    });
  }

  document.addEventListener('change', function (ev) {
    var t = ev.target;
    if (t && t.tagName === 'INPUT' && t.type === 'file' && /image|\.jpg|\.png/i.test(t.accept || '')) handle(t);
  });
})();

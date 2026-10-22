/* Visual text editor — only loaded for a signed-in admin. Click any text on the page to change its font, size and colour. */
(function(){
  var cfg = window.__TE; if(!cfg) return;
  var on = false, current = null, scope = 'kind', rules = (cfg.rules || []).slice();
  var SKIP = /^(SCRIPT|STYLE|HTML|HEAD|BODY|MAIN|SECTION|HEADER|FOOTER|NAV|UL|OL|DL|FORM|SVG|PATH|IMG)$/;
  function el(tag, attrs, html){ var e = document.createElement(tag); for(var k in (attrs||{})) e.setAttribute(k, attrs[k]); if(html != null) e.innerHTML = html; return e; }
  function inEditor(n){ return n && n.closest && n.closest('#te-panel, #te-btn'); }

  /* ---- UI ---- */
  var css = el('style', {id: 'te-css'}, '' +
    '#te-btn{position:fixed;left:16px;bottom:16px;z-index:2147483000;background:#0b47c9;color:#fff;border:0;border-radius:30px;padding:12px 20px;font:600 14px/1 Arial,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}' +
    '#te-btn.on{background:#cb9029}' +
    '#te-panel{position:fixed;right:16px;top:16px;bottom:16px;width:310px;z-index:2147483001;background:#fff;color:#222;border-radius:12px;box-shadow:0 8px 30px rgba(0,0,0,.4);font:14px/1.4 Arial,sans-serif;display:none;flex-direction:column;overflow:hidden}' +
    '#te-panel header{background:#0b47c9;color:#fff;padding:12px 14px;font-weight:700;display:flex;justify-content:space-between;align-items:center}' +
    '#te-panel header button{background:none;border:0;color:#fff;font-size:20px;cursor:pointer;line-height:1}' +
    '#te-body{padding:14px;overflow:auto;flex:1}' +
    '#te-body label{display:block;font-weight:700;font-size:12.5px;margin:12px 0 5px;color:#333}' +
    '#te-body select,#te-body input[type=number],#te-body input[type=text]{width:100%;padding:8px 9px;border:1px solid #c9ccd4;border-radius:7px;font:14px Arial,sans-serif;box-sizing:border-box}' +
    '#te-body .row{display:flex;gap:8px;align-items:center}' +
    '#te-body input[type=color]{width:46px;height:36px;padding:0;border:1px solid #c9ccd4;border-radius:7px;background:#fff;cursor:pointer;flex:none}' +
    '#te-body input[type=range]{width:100%}' +
    '#te-sample{background:#f2f2f2;border-radius:7px;padding:8px 10px;font-size:12.5px;color:#555;margin-bottom:4px;word-break:break-word}' +
    '#te-foot{padding:12px 14px;border-top:1px solid #eee;display:flex;gap:8px;flex-wrap:wrap}' +
    '#te-foot button{flex:1;border:0;border-radius:8px;padding:10px 8px;font:700 13px Arial,sans-serif;cursor:pointer}' +
    '#te-save{background:#1d8a47;color:#fff}#te-reset{background:#eee;color:#333}' +
    '#te-msg{font-size:12.5px;padding:0 14px 10px;color:#1d8a47;min-height:16px}' +
    '.te-hover{outline:2px dashed #cb9029!important;outline-offset:2px;cursor:pointer!important}' +
    '.te-sel{outline:2px solid #0b47c9!important;outline-offset:2px}' +
    '.te-drag{cursor:move!important;user-select:none!important}' +
    '.te-sw{width:26px;height:26px;border-radius:50%;border:1px solid #bbb;cursor:pointer;flex:none}');
  document.head.appendChild(css);
  var live = el('style', {id: 'te-live'}); document.head.appendChild(live);

  var btn = el('button', {id: 'te-btn', type: 'button'}, 'Chỉnh chữ');
  var famOpts = '<option value="">(giữ nguyên)</option>' + cfg.families.map(function(f){ return '<option value="' + f.key + '">' + f.name + '</option>'; }).join('');
  var weights = '<option value="">(giữ nguyên)</option><option value="300">Mảnh</option><option value="400">Thường</option><option value="500">Vừa</option><option value="700">Đậm</option><option value="800">Rất đậm</option><option value="900">Cực đậm</option>';
  var swatches = ['#ffffff','#fdfcfc','#ffbd45','#cb9029','#0b47c9','#123f9b','#1d8a47','#222222','#555555'].map(function(c){ return '<span class="te-sw" data-c="' + c + '" style="background:' + c + '"></span>'; }).join('');
  var panel = el('div', {id: 'te-panel'}, '' +
    '<header><span>Chỉnh chữ</span><button type="button" id="te-close" aria-label="Đóng">×</button></header>' +
    '<div id="te-body">' +
      '<div id="te-hint" style="color:#555">Bấm vào chữ bất kỳ trên trang để chỉnh. Bấm lại nút cam bên trái để thoát.</div>' +
      '<div id="te-form" style="display:none">' +
        '<div id="te-sample"></div>' +
        '<label>Áp dụng cho</label>' +
        '<select id="te-scope"><option value="kind">Mọi chữ cùng loại (khuyên dùng)</option><option value="one">Chỉ chữ này</option></select>' +
        '<label>Phông chữ</label><select id="te-font">' + famOpts + '</select>' +
        '<label>Cỡ chữ máy tính: <b id="te-sz-v"></b></label><input type="range" id="te-size" min="10" max="120" step="1">' +
        '<div class="row"><input type="number" id="te-size-n" min="8" max="200" style="width:90px"><button type="button" id="te-size-x" style="border:0;background:#eee;border-radius:7px;padding:8px 10px;cursor:pointer;font-size:12.5px">Giữ cỡ gốc</button></div>' +
        '<label>Cỡ chữ điện thoại (để trống = tự co theo)</label><input type="number" id="te-size-m" min="8" max="120" placeholder="ví dụ 28">' +
        '<label>Độ đậm</label><select id="te-weight">' + weights + '</select>' +
        '<label>Vị trí (kéo chữ bằng chuột, hoặc dùng phím mũi tên)</label>' +
        '<div class="row"><span style="font-size:12.5px;width:46px">Ngang</span><input type="number" id="te-x" step="1" value="0"><span style="font-size:12.5px;width:34px;text-align:right">Dọc</span><input type="number" id="te-y" step="1" value="0"></div>' +
        '<div class="row" style="margin-top:8px"><button type="button" id="te-pos-x" style="border:0;background:#eee;border-radius:7px;padding:8px 10px;cursor:pointer;font-size:12.5px">Về vị trí gốc</button></div>' +
        '<label style="font-weight:400;display:flex;gap:6px;align-items:center;margin-top:8px"><input type="checkbox" id="te-mm" style="width:auto"> Áp dụng cả trên điện thoại (bỏ tick = chỉ dời trên máy tính)</label>' +
        '<label>Màu chữ</label>' +
        '<div class="row"><input type="color" id="te-color" value="#ffffff"><input type="text" id="te-color-t" placeholder="#ffffff"><button type="button" id="te-color-x" style="border:0;background:#eee;border-radius:7px;padding:8px 10px;cursor:pointer;font-size:12.5px;flex:none">Giữ màu gốc</button></div>' +
        '<div class="row" style="margin-top:8px;flex-wrap:wrap">' + swatches + '</div>' +
      '</div>' +
    '</div>' +
    '<div id="te-msg"></div>' +
    '<div id="te-foot" style="display:none"><button type="button" id="te-save">Lưu</button><button type="button" id="te-reset">Khôi phục mặc định</button></div>');
  document.body.appendChild(btn); document.body.appendChild(panel);
  function $(id){ return document.getElementById(id); }

  /* ---- selectors ---- */
  var BAD = /^(fx-|te-|active|on$|open|nav-open|hero-played|js$)/;
  function classes(e){ return Array.prototype.slice.call(e.classList || []).filter(function(c){ return !BAD.test(c); }); }
  function esc(s){ return window.CSS && CSS.escape ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, ''); }
  function part(e){ var c = classes(e).slice(0, 2); return e.tagName.toLowerCase() + c.map(function(x){ return '.' + esc(x); }).join(''); }
  var GENERIC = /^(wrap|grid|row|art|body|rich|two|car|car-item|car-track|car-viewport|dots|full|center|sub|t|hp)$/;
  // "same kind" = this element's own class, or the nearest meaningful parent class + this tag (e.g. ".intro h2")
  function kindSelector(t){
    var own = part(t);
    if(classes(t).length) return own;
    var e = t.parentElement, depth = 0;
    while(e && e !== document.body && depth < 6){
      var cs = classes(e).filter(function(c){ return !GENERIC.test(c); });
      if(cs.length) return '.' + esc(cs[0]) + ' ' + own;
      e = e.parentElement; depth++;
    }
    return oneSelector(t);
  }
  function oneSelector(t){
    var path = [], e = t;
    while(e && e !== document.body && e !== document.documentElement){
      if(e.id && /^[A-Za-z][\w-]*$/.test(e.id)){ path.unshift('#' + e.id); break; }
      var tag = e.tagName.toLowerCase(), idx = 1, s = e;
      while((s = s.previousElementSibling)){ if(s.tagName === e.tagName) idx++; }
      path.unshift(tag + ':nth-of-type(' + idx + ')');
      e = e.parentElement;
    }
    return path.join(' > ');
  }
  function textTarget(n){
    var e = n, tries = 0;
    while(e && e !== document.body && tries < 3){
      if(!SKIP.test(e.tagName)){
        for(var i = 0; i < e.childNodes.length; i++){ var c = e.childNodes[i]; if(c.nodeType === 3 && c.textContent.trim()) return e; }
      }
      e = e.parentElement; tries++;
    }
    return null;
  }

  /* ---- rule → css (same as the server) ---- */
  function famCss(key){ for(var i = 0; i < cfg.families.length; i++) if(cfg.families[i].key === key) return cfg.families[i].css; return null; }
  function decl(r){
    var d = '';
    var f = famCss(r.font); if(f) d += 'font-family:"' + f + '","Roboto",Arial,sans-serif!important;';
    if(r.size) d += 'font-size:' + r.size + 'px!important;';
    if(r.weight) d += 'font-weight:' + r.weight + '!important;';
    if(r.color) d += 'color:' + r.color + '!important;-webkit-text-fill-color:' + r.color + '!important;background:none!important;';
    if(r.x || r.y) d += 'translate:' + (r.x || 0) + 'px ' + (r.y || 0) + 'px!important;' + (r.inline ? 'display:inline-block!important;' : '');
    return d;
  }
  function ruleCss(r){
    var s = decl(r) ? r.selector + '{' + decl(r) + '}' : '';
    if((r.x || r.y) && !r.moveMobile) s += '@media(max-width:860px){' + r.selector + '{translate:none!important}}';
    if(r.sizeMobile) s += '@media(max-width:860px){' + r.selector + '{font-size:' + r.sizeMobile + 'px!important}}';
    return s;
  }
  function renderLive(extra){
    var all = rules.filter(function(r){ return !extra || r.selector !== extra.selector; }).concat(extra ? [extra] : []);
    live.textContent = all.map(ruleCss).join('');
    // moving back to the original place must also cancel a position that is already saved
    if(extra && !extra.x && !extra.y && extra.selector) live.textContent += extra.selector + '{translate:none!important}';
  }

  /* ---- panel logic ---- */
  var cur = { selector: '', label: '' };
  function readForm(){
    var size = parseFloat($('te-size-n').value) || 0;
    var m = parseFloat($('te-size-m').value) || 0;
    return {
      selector: cur.selector, font: $('te-font').value, size: size ? Math.round(size) : 0, sizeMobile: m ? Math.round(m) : 0,
      weight: $('te-weight').value, color: $('te-color-t').value.trim() ? $('te-color-t').value.trim() : '',
      x: Math.round(parseFloat($('te-x').value) || 0), y: Math.round(parseFloat($('te-y').value) || 0),
      moveMobile: $('te-mm').checked, inline: current && getComputedStyle(current).display === 'inline'
    };
  }
  var sizeSet = false, colorSet = false;
  function updateSelector(){
    scope = $('te-scope').value;
    cur.selector = scope === 'kind' ? kindSelector(current) : oneSelector(current);
    var r = rules.filter(function(x){ return x.selector === cur.selector; })[0];
    var cs = getComputedStyle(current);
    var px = Math.round(parseFloat(cs.fontSize));
    $('te-font').value = r ? (r.font || '') : '';
    sizeSet = !!(r && r.size);
    $('te-size').value = r && r.size ? r.size : px; $('te-size-n').value = r && r.size ? r.size : px; $('te-sz-v').textContent = (r && r.size ? r.size : px) + 'px' + (sizeSet ? '' : ' (gốc)');
    $('te-size-m').value = r && r.sizeMobile ? r.sizeMobile : '';
    $('te-x').value = r && r.x ? r.x : 0; $('te-y').value = r && r.y ? r.y : 0; $('te-mm').checked = !!(r && r.moveMobile);
    $('te-weight').value = r ? (r.weight || '') : '';
    colorSet = !!(r && r.color);
    var hex = r && r.color ? r.color : rgb2hex(cs.color);
    $('te-color').value = hex; $('te-color-t').value = colorSet ? hex : '';
    $('te-color-t').placeholder = colorSet ? '' : hex + ' (gốc)';
    $('te-msg').textContent = '';
  }
  function rgb2hex(c){ var m = c.match(/\d+/g); if(!m) return '#000000'; return '#' + m.slice(0, 3).map(function(x){ return ('0' + parseInt(x, 10).toString(16)).slice(-2); }).join(''); }
  function preview(){
    var r = readForm();
    if(!sizeSet) r.size = 0;
    renderLive(r);
  }
  function openFor(t){
    if(current) current.classList.remove('te-sel');
    current = t; t.classList.add('te-sel');
    $('te-hint').style.display = 'none'; $('te-form').style.display = 'block'; $('te-foot').style.display = 'flex'; panel.style.display = 'flex';
    $('te-sample').textContent = '“' + t.textContent.trim().slice(0, 60) + '”';
    $('te-scope').value = 'kind';
    updateSelector();
  }
  function setOn(v){
    on = v; btn.classList.toggle('on', v); btn.textContent = v ? 'Thoát chỉnh chữ' : 'Chỉnh chữ';
    if(v){ panel.style.display = 'flex'; $('te-hint').style.display = 'block'; $('te-form').style.display = 'none'; $('te-foot').style.display = 'none'; }
    else { panel.style.display = 'none'; if(current) current.classList.remove('te-sel'); current = null; renderLive(null); document.querySelectorAll('.te-hover').forEach(function(x){ x.classList.remove('te-hover'); }); }
  }
  btn.addEventListener('click', function(){ setOn(!on); });
  $('te-close').addEventListener('click', function(){ setOn(false); });
  document.addEventListener('mouseover', function(e){ if(!on || inEditor(e.target)) return; var t = textTarget(e.target); document.querySelectorAll('.te-hover').forEach(function(x){ x.classList.remove('te-hover'); }); if(t) t.classList.add('te-hover'); }, true);
  document.addEventListener('click', function(e){
    if(!on || inEditor(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    var t = textTarget(e.target); if(t && t !== current) openFor(t);
  }, true);

  $('te-scope').addEventListener('change', function(){ updateSelector(); preview(); });
  $('te-font').addEventListener('change', preview);
  $('te-weight').addEventListener('change', preview);
  $('te-size').addEventListener('input', function(){ sizeSet = true; $('te-size-n').value = this.value; $('te-sz-v').textContent = this.value + 'px'; preview(); });
  $('te-size-n').addEventListener('input', function(){ sizeSet = true; $('te-size').value = this.value; $('te-sz-v').textContent = this.value + 'px'; preview(); });
  $('te-size-x').addEventListener('click', function(){ sizeSet = false; var px = Math.round(parseFloat(getComputedStyle(current).fontSize)); renderLive({ selector: cur.selector }); updateSelectorKeepScope(); });
  $('te-size-m').addEventListener('input', preview);
  function setColor(c){ colorSet = true; $('te-color').value = c; $('te-color-t').value = c; preview(); }
  $('te-color').addEventListener('input', function(){ setColor(this.value); });
  $('te-color-t').addEventListener('input', function(){ if(/^#[0-9a-fA-F]{6}$/.test(this.value.trim())){ $('te-color').value = this.value.trim(); } preview(); });
  $('te-color-x').addEventListener('click', function(){ $('te-color-t').value = ''; colorSet = false; preview(); });
  panel.addEventListener('click', function(e){ var c = e.target.getAttribute && e.target.getAttribute('data-c'); if(c) setColor(c); });
  function updateSelectorKeepScope(){ var sc = $('te-scope').value; updateSelector(); $('te-scope').value = sc; }

  $('te-x').addEventListener('input', preview); $('te-y').addEventListener('input', preview); $('te-mm').addEventListener('change', preview);
  $('te-pos-x').addEventListener('click', function(){ $('te-x').value = 0; $('te-y').value = 0; preview(); });

  /* drag the selected text with the mouse or a finger */
  var drag = null;
  document.addEventListener('pointerdown', function(e){
    if(!on || !current || inEditor(e.target) || e.button > 0) return;
    if(!(current === e.target || current.contains(e.target))) return;
    e.preventDefault(); e.stopPropagation();
    drag = { sx: e.clientX, sy: e.clientY, x0: parseFloat($('te-x').value) || 0, y0: parseFloat($('te-y').value) || 0 };
    current.classList.add('te-drag');
    try { current.setPointerCapture(e.pointerId); } catch(err) {}
  }, true);
  document.addEventListener('pointermove', function(e){
    if(!drag) return;
    $('te-x').value = Math.round(drag.x0 + e.clientX - drag.sx); $('te-y').value = Math.round(drag.y0 + e.clientY - drag.sy);
    preview();
  });
  function endDrag(){ if(!drag) return; drag = null; if(current) current.classList.remove('te-drag'); }
  document.addEventListener('pointerup', endDrag); document.addEventListener('pointercancel', endDrag);
  /* arrow keys nudge by 1px (Shift = 10px) when the focus is not inside a field */
  document.addEventListener('keydown', function(e){
    if(!on || !current || !/^Arrow/.test(e.key)) return;
    var t = e.target; if(t && /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName)) return;
    var step = e.shiftKey ? 10 : 1, x = parseFloat($('te-x').value) || 0, y = parseFloat($('te-y').value) || 0;
    if(e.key === 'ArrowLeft') x -= step; if(e.key === 'ArrowRight') x += step; if(e.key === 'ArrowUp') y -= step; if(e.key === 'ArrowDown') y += step;
    $('te-x').value = x; $('te-y').value = y; preview(); e.preventDefault();
  });

  function post(url, data){
    var body = new URLSearchParams(); body.append('_csrf', cfg.csrf);
    for(var k in data) body.append(k, data[k]);
    return fetch(url, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' }, body: body }).then(function(r){ return r.json(); });
  }
  $('te-save').addEventListener('click', function(){
    var r = readForm(); if(!sizeSet) r.size = 0;
    if(!/^#[0-9a-fA-F]{6}$/.test(r.color)) r.color = '';
    r.label = (current.textContent || '').trim().slice(0, 40);
    r.moveMobile = r.moveMobile ? '1' : ''; r.inline = r.inline ? '1' : '';
    post('/admin/chinh-chu/save', r).then(function(res){
      if(res && res.ok){
        rules = res.rules; renderLive(null);
        $('te-msg').style.color = '#1d8a47'; $('te-msg').textContent = 'Đã lưu. Tải lại trang để kiểm tra.';
      } else { $('te-msg').style.color = '#b3261e'; $('te-msg').textContent = (res && res.error) || 'Không lưu được, thử lại.'; }
    }).catch(function(){ $('te-msg').style.color = '#b3261e'; $('te-msg').textContent = 'Mất kết nối, thử lại.'; });
  });
  $('te-reset').addEventListener('click', function(){
    post('/admin/chinh-chu/delete', { selector: cur.selector }).then(function(res){
      if(res && res.ok){ rules = res.rules; renderLive(null); updateSelectorKeepScope(); $('te-msg').style.color = '#1d8a47'; $('te-msg').textContent = 'Đã khôi phục mặc định.'; }
    });
  });
})();

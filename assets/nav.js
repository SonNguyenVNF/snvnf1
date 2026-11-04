(function(){
  // labels edited in admin (Chữ cố định) arrive in window.SYN_T; these are only the fallbacks
  function T(k){ var d = { project: 'Dự án ', photo: 'Ảnh ', prev: 'Ảnh trước', next: 'Ảnh sau' }; return (window.SYN_T && window.SYN_T[k]) || d[k]; }
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* swipe a finger (or drag the mouse) left / right over an element: cb(1) = next, cb(-1) = previous */
  function swipe(el, cb){
    var sx = 0, sy = 0, down = false, done = false;
    el.style.touchAction = 'pan-y';
    el.style.userSelect = 'none';
    el.addEventListener('pointerdown', function(e){
      if(e.pointerType === 'mouse' && e.button !== 0) return;
      down = true; done = false; sx = e.clientX; sy = e.clientY;
    });
    el.addEventListener('pointermove', function(e){
      if(!down || done) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.3){ done = true; cb(dx < 0 ? 1 : -1); }
    });
    function end(){ down = false; }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('pointerleave', end);
    el.addEventListener('click', function(e){ if(done){ e.preventDefault(); e.stopPropagation(); done = false; } }, true);
    el.addEventListener('dragstart', function(e){ e.preventDefault(); });
  }

  document.addEventListener('DOMContentLoaded', function(){
    /* ---- entrance effects (chosen per section in admin) ---- */
    (function(){
      var targets = $$('[data-fx]');
      if(!targets.length) return;
      if(reduce){
        document.documentElement.classList.add('fx-off');
        $$('[data-fx-kids]').forEach(function(p){ p.classList.add('fx-ready'); });
        return;
      }
      var cs = getComputedStyle(document.documentElement);
      var gap = parseFloat(cs.getPropertyValue('--fx-gap')) || 0.12;
      var delayAll = parseFloat(cs.getPropertyValue('--fx-delay'));
      if(isNaN(delayAll)) delayAll = 0.2;
      var items = targets.map(function(el){
        var own = parseFloat(el.getAttribute('data-fx-delay'));
        var delay = isNaN(own) ? delayAll : own;
        var sel = el.getAttribute('data-fx-kids');
        var kids = sel ? $$(sel, el) : [];
        if(sel && !kids.length){ el.removeAttribute('data-fx-kids'); }
        if(kids.length){
          kids.forEach(function(k, i){ k.classList.add('fx-k'); k.setAttribute('data-fxe', el.getAttribute('data-fx')); k.style.transitionDelay = (delay + i * gap) + 's'; });
          el.classList.add('fx-ready');
        } else {
          el.style.transitionDelay = delay + 's';
        }
        return { el: el, kids: kids, shown: false };
      });
      function setShown(it, on){
        it.shown = on;
        if(it.kids.length) it.kids.forEach(function(k){ k.classList.toggle('fx-in', on); });
        else it.el.classList.toggle('fx-in', on);
      }
      var ticking = false;
      function check(){
        ticking = false;
        var vh = window.innerHeight;
        items.forEach(function(it){
          var r = it.el.getBoundingClientRect();
          if(!it.shown && r.top < vh * 0.92 && r.bottom > 0) setShown(it, true);
          else if(it.shown && (r.top >= vh || r.bottom <= 0)) setShown(it, false); // left the screen: replay next time
        });
      }
      function onScroll(){ if(!ticking){ ticking = true; requestAnimationFrame(check); } }
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll);
      window.addEventListener('load', check);
      setTimeout(check, 50);
    })();

    /* ---- mobile menu ---- */
    var hd = $('.hd'), toggle = $('.menu-toggle');
    if(hd && toggle){
      toggle.addEventListener('click', function(){
        var open = !hd.classList.contains('nav-open');
        hd.classList.toggle('nav-open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      window.addEventListener('resize', function(){ if(window.innerWidth > 860) hd.classList.remove('nav-open'); });
    }

    /* ---- hero slider ---- */
    var hero = $('.hero');
    if(hero){
      var slides = $$('.hslide', hero), texts = $$('.hero-text', hero), dotsBox = $('.hero-dots', hero), cur = 0, timer;
      var started = false;
      function go(i){
        // the title animation plays only on the first slide shown after the page loads
        if(started && hero.getAttribute('data-once') === '1') hero.classList.add('hero-played');
        started = true;
        cur = (i + slides.length) % slides.length;
        slides.forEach(function(s,k){ s.classList.toggle('active', k === cur); });
        texts.forEach(function(s,k){ s.classList.toggle('active', k === cur); });
        if(dotsBox) $$('button', dotsBox).forEach(function(b,k){ b.classList.toggle('on', k === cur); });
      }
      function play(){ if(reduce || slides.length < 2) return; clearInterval(timer); timer = setInterval(function(){ go(cur + 1); }, (parseFloat(hero.getAttribute('data-interval')) || 8) * 1000); }
      if(slides.length > 1){
        if(dotsBox){ slides.forEach(function(_,k){ var b = document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Slide ' + (k+1)); b.addEventListener('click', function(){ go(k); play(); }); dotsBox.appendChild(b); }); }
        var pv = $('.hero-prev', hero), nx = $('.hero-next', hero);
        if(pv) pv.addEventListener('click', function(){ go(cur - 1); play(); });
        if(nx) nx.addEventListener('click', function(){ go(cur + 1); play(); });
        go(0); play();
        swipe(hero, function(dir){ go(cur + dir); play(); });
      }
    }

    /* ---- carousels (news cards, project gallery) ---- */
    $$('[data-car]').forEach(function(car){
      var viewport = $('.car-viewport, .gal-v', car), track = $('.car-track, .gal-t', car), dots = $('.dots', car), items = $$('.car-item, .gal-t > img', car);
      var page = 0, pages = 1, per = 1, w = 1, timer = null;
      if(!viewport || !track || !items.length) return;
      var auto = car.getAttribute('data-car') === 'auto';
      function offsetFor(p){ return -(Math.min(p * per, Math.max(0, items.length - per)) * w); }
      function build(){
        w = items[0].getBoundingClientRect().width || 1;
        per = Math.max(1, Math.round(viewport.getBoundingClientRect().width / w));
        pages = Math.max(1, Math.ceil(items.length / per));
        if(page >= pages) page = pages - 1;
        // fewer cards than fit on screen: centre them instead of leaving a gap on the right
        track.classList.toggle('car-center', items.length <= per);
        track.style.transform = 'translateX(' + offsetFor(page) + 'px)';
        if(dots){
          dots.innerHTML = '';
          if(pages > 1){ for(var i = 0; i < pages; i++){ (function(i){ var b = document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Trang ' + (i+1)); if(i === page) b.className = 'on'; b.addEventListener('click', function(){ page = i; build(); play(); }); dots.appendChild(b); })(i); } }
        }
      }
      function play(){
        if(!auto || reduce) return;
        clearInterval(timer);
        timer = setInterval(function(){ if(pages > 1){ page = (page + 1) % pages; build(); } }, 6000);
      }
      build();
      window.addEventListener('resize', build);
      play();

      /* swipe with a finger or drag with the mouse; the cards follow the pointer */
      var startX = 0, dx = 0, down = false, moved = false, justDragged = false;
      viewport.addEventListener('pointerdown', function(e){
        if(pages < 2 || (e.pointerType === 'mouse' && e.button !== 0)) return;
        down = true; moved = false; startX = e.clientX; dx = 0;
      });
      viewport.addEventListener('pointermove', function(e){
        if(!down) return;
        dx = e.clientX - startX;
        if(!moved && Math.abs(dx) > 6){
          moved = true;
          track.style.transition = 'none';
          clearInterval(timer);
          try { viewport.setPointerCapture(e.pointerId); } catch(err) {}
        }
        if(moved){
          track.style.transform = 'translateX(' + (offsetFor(page) + dx) + 'px)';
        }
      });
      function end(){
        if(!down) return;
        down = false;
        track.style.transition = '';
        if(moved){
          var limit = Math.min(80, viewport.getBoundingClientRect().width * 0.15);
          // wraps around: past the last news comes the first, before the first comes the last
          if(dx < -limit) page = (page + 1) % pages;
          else if(dx > limit) page = (page - 1 + pages) % pages;
          build(); play();
          justDragged = true;
          setTimeout(function(){ justDragged = false; }, 60);
        }
      }
      viewport.addEventListener('pointerup', end);
      viewport.addEventListener('pointercancel', end);
      viewport.addEventListener('click', function(e){ if(justDragged){ e.preventDefault(); e.stopPropagation(); } }, true);
      viewport.addEventListener('dragstart', function(e){ e.preventDefault(); });
    });

    /* ---- network on phones: tap an icon to read that function ---- */
    $$('[data-nettabs]').forEach(function(box){
      var tabs = $$('.nm-tab', box), cards = $$('.nm-card', box);
      tabs.forEach(function(t){
        t.addEventListener('click', function(){
          var i = t.getAttribute('data-i');
          tabs.forEach(function(x){ x.classList.toggle('on', x === t); });
          cards.forEach(function(c){ c.classList.toggle('on', c.getAttribute('data-i') === i); });
          if(t.scrollIntoView) t.scrollIntoView({ inline: 'center', block: 'nearest', behavior: reduce ? 'auto' : 'smooth' });
        });
      });
    });

    /* ---- footer ticker: visitors online / today / all time ---- */
    var statsBox = $$('[data-stats]');
    if(statsBox.length){
      /* a new id on every page load, so every time the site is opened it adds one (100 tabs = 100) */
      var sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
      var paintStats = function(d){
        $$('[data-k]').forEach(function(el){ var n = d[el.getAttribute('data-k')]; if(typeof n === 'number') el.textContent = n.toLocaleString('vi-VN'); });
      };
      // v=1 only on the first call of a page load: that is the visit. The pings every 15s just keep "online" fresh.
      var pingStats = function(visit){
        fetch('/api/visit?s=' + sid + (visit ? '&v=1' : ''), { method: 'POST', credentials: 'same-origin' }).then(function(r){ return r.json(); }).then(paintStats).catch(function(){});
      };
      pingStats(true);
      /* a tab left open in the background still counts as online (browsers slow its timer to about once a minute) */
      setInterval(function(){ pingStats(false); }, 15000);
      document.addEventListener('visibilitychange', function(){ if(!document.hidden) pingStats(false); });
    }

    /* ---- featured project slider ---- */
    $$('[data-pfeat]').forEach(function(box){
      var slides = $$('.pf-slide', box), dots = $('.dots', box), cur = 0;
      function go(i){ cur = i; slides.forEach(function(s,k){ s.classList.toggle('active', k === i); }); if(dots) $$('button', dots).forEach(function(b,k){ b.classList.toggle('on', k === i); }); }
      if(dots && slides.length > 1){ slides.forEach(function(_,k){ var b = document.createElement('button'); b.type='button'; b.setAttribute('aria-label',T('project') + (k+1)); b.addEventListener('click', function(){ go(k); }); dots.appendChild(b); }); }
      go(0);
      if(slides.length > 1 && !reduce){ setInterval(function(){ go((cur + 1) % slides.length); }, 7000); }
      if(slides.length > 1) swipe(box, function(dir){ go((cur + dir + slides.length) % slides.length); });
    });

    /* ---- filter + pagination (projects grid, job list) ---- */
    $$('[data-list]').forEach(function(box){
      var per = parseInt(box.getAttribute('data-per'), 10) || 6;
      var items = $$('[data-item]', box), pagerEl = $(box.getAttribute('data-pager') || '.pager', box.parentNode) || $('.pager', box) || $('.pager'), page = 0;
      var filters = $$(box.getAttribute('data-filters') || '[data-filter]', document);
      var query = {};
      function matches(it){
        for(var key in query){
          var vals = query[key]; if(!vals.length) continue;
          var v = (it.getAttribute('data-' + key) || '').toLowerCase();
          if(key === 'q'){ if(v.indexOf(vals[0].toLowerCase()) === -1) return false; }
          else if(vals.map(function(x){return x.toLowerCase();}).indexOf(v) === -1) return false;
        }
        return true;
      }
      function readFilters(){
        query = {};
        filters.forEach(function(f){
          var key = f.getAttribute('data-filter');
          if(!key) return;
          if(f.type === 'checkbox'){ if(f.checked){ (query[key] = query[key] || []).push(f.value); } }
          else if(f.value){ (query[key] = query[key] || []).push(f.value); }
        });
      }
      function render(){
        var shown = items.filter(matches);
        var pages = Math.max(1, Math.ceil(shown.length / per));
        if(page >= pages) page = 0;
        items.forEach(function(it){ it.style.display = 'none'; });
        shown.forEach(function(it, i){ if(i >= page * per && i < (page + 1) * per) it.style.display = ''; });
        var empty = $('[data-empty]', box); if(empty) empty.style.display = shown.length ? 'none' : '';
        if(pagerEl){
          pagerEl.innerHTML = '';
          if(pages > 1){
            var dotMode = pagerEl.classList.contains('dots');
            for(var i = 0; i < pages; i++){ (function(i){ var b = document.createElement('button'); b.type='button'; b.textContent = dotMode ? '' : (i + 1); b.setAttribute('aria-label','Trang ' + (i+1)); if(i === page) b.className = 'on'; b.addEventListener('click', function(){ page = i; render(); }); pagerEl.appendChild(b); })(i); }
          }
        }
      }
      filters.forEach(function(f){ f.addEventListener(f.type === 'checkbox' || f.tagName === 'SELECT' ? 'change' : 'input', function(){ if(f.getAttribute('data-live') !== 'off'){ readFilters(); page = 0; render(); } }); });
      var go = $('[data-filter-go]');
      if(go) go.addEventListener('click', function(){ readFilters(); page = 0; render(); });
      try {
        var params = new URLSearchParams(window.location.search);
        filters.forEach(function(f){
          var key = f.getAttribute('data-filter');
          if(f.type === 'checkbox' && key && params.getAll(key).indexOf(f.value) !== -1) f.checked = true;
        });
      } catch(e) {}
      readFilters(); render();
    });

    /* ---- back to top ---- */
    var fab = $('#fabTop');
    if(fab) fab.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); });

    /* ---- count-up numbers (counts again each time they scroll into view) ---- */
    $$('[data-count]').forEach(function(el){
      var raw = el.getAttribute('data-count') || el.textContent;
      var m = /^(\D*)([\d.,]+)(.*)$/.exec(raw);
      if(!m) return;
      var pre = m[1], num = parseFloat(m[2].replace(/,/g, '')), post = m[3], thousands = m[2].indexOf(',') !== -1;
      if(isNaN(num)) return;
      function fmt(n){ n = Math.round(n); return pre + (thousands ? n.toLocaleString('en-US') : n) + post; }
      var running = false;
      function run(){
        if(running) return; running = true;
        if(reduce){ el.textContent = raw; return; }
        var t0 = null, dur = 1600;
        function step(t){ if(t0 === null) t0 = t; var p = Math.min(1, (t - t0) / dur); el.textContent = fmt(num * (1 - Math.pow(1 - p, 3))); if(p < 1) requestAnimationFrame(step); else el.textContent = raw; }
        requestAnimationFrame(step);
      }
      if('IntersectionObserver' in window){
        new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting) run(); else { running = false; } }); }, { threshold: 0.4 }).observe(el);
      } else { el.textContent = raw; }
    });

    /* ---- typewriter (chairman message) ---- */
    $$('[data-typing]').forEach(function(box){
      if(reduce || !('IntersectionObserver' in window)) return;
      var nodes = $$('p', box), full = nodes.map(function(p){ return p.textContent; }), done = false;
      function type(){
        if(done) return; done = true;
        nodes.forEach(function(p){ p.textContent = ''; });
        var i = 0, pos = 0;
        (function tick(){
          if(i >= nodes.length) return;
          pos += 3; nodes[i].textContent = full[i].slice(0, pos);
          if(pos >= full[i].length){ nodes[i].textContent = full[i]; i++; pos = 0; setTimeout(tick, 120); } else setTimeout(tick, 18);
        })();
      }
      nodes.forEach(function(p){ p.style.minHeight = p.offsetHeight + 'px'; });
      new IntersectionObserver(function(es, ob){ es.forEach(function(e){ if(e.isIntersecting){ type(); ob.disconnect(); } }); }, { threshold: 0.3 }).observe(box);
    });

    /* ---- image gallery: swipe / arrows on the big picture, thumbnails strip scrolls and picks ---- */
    $$('[data-gal]').forEach(function(g){
      var box = $('.pm-big', g), big = $('img', box || g);
      if(!box || !big) return;
      var imgs = [big.getAttribute('src')].concat($$('.pm-th img', g).map(function(i){ return i.getAttribute('src'); }));
      if(imgs.length < 2) return;
      var cur = 0, tt = $('.pm-tt', g), strip = $('.pm-thumbs', g);
      function drawThumbs(){
        if(!tt) return;
        tt.innerHTML = '';
        imgs.forEach(function(s, i){
          if(i === cur) return;
          var b = document.createElement('button'); b.type = 'button'; b.className = 'pm-th'; b.setAttribute('aria-label', T('photo') + (i + 1));
          var im = document.createElement('img'); im.src = s; im.alt = ''; im.draggable = false; b.appendChild(im);
          b.addEventListener('click', function(){ if(strip && strip.getAttribute('data-moved') === '1') return; go(i); });
          tt.appendChild(b);
        });
      }
      var dotsBox = document.createElement('div'); dotsBox.className = 'dots pm-dots'; g.appendChild(dotsBox);
      function drawDots(){
        dotsBox.innerHTML = '';
        imgs.forEach(function(_, i){
          var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', T('photo') + (i + 1));
          if(i === cur) b.className = 'on';
          b.addEventListener('click', function(){ go(i); });
          dotsBox.appendChild(b);
        });
      }
      function go(i){
        cur = (i + imgs.length) % imgs.length;
        drawDots();
        big.style.opacity = '0';
        setTimeout(function(){ big.setAttribute('src', imgs[cur]); big.style.opacity = ''; }, 120);
        drawThumbs();
        if(strip) strip.scrollLeft = 0;
      }
      ['prev', 'next'].forEach(function(d){
        var b = document.createElement('button'); b.type = 'button'; b.className = 'pm-nav ' + d; b.setAttribute('aria-label', d === 'prev' ? T('prev') : T('next'));
        b.textContent = d === 'prev' ? '‹' : '›';
        b.addEventListener('click', function(e){ e.stopPropagation(); go(cur + (d === 'prev' ? -1 : 1)); });
        box.appendChild(b);
      });
      // swipe or drag the big picture
      var sx = 0, sy = 0, down = false;
      box.addEventListener('pointerdown', function(e){ if(e.target.closest('.pm-nav')) return; down = true; sx = e.clientX; sy = e.clientY; });
      box.addEventListener('pointerup', function(e){
        if(!down) return; down = false;
        var dx = e.clientX - sx, dy = e.clientY - sy;
        if(Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) go(cur + (dx < 0 ? 1 : -1));
      });
      box.addEventListener('pointercancel', function(){ down = false; });
      box.addEventListener('dragstart', function(e){ e.preventDefault(); });
      // drag the thumbnails strip with the mouse (touch scrolls natively)
      if(strip){
        var px = 0, sl = 0, pd = false;
        strip.addEventListener('pointerdown', function(e){ if(e.pointerType !== 'mouse') return; pd = true; px = e.clientX; sl = strip.scrollLeft; strip.setAttribute('data-moved', '0'); });
        window.addEventListener('pointermove', function(e){ if(!pd) return; var d = e.clientX - px; if(Math.abs(d) > 4) strip.setAttribute('data-moved', '1'); strip.scrollLeft = sl - d; });
        window.addEventListener('pointerup', function(){ if(!pd) return; pd = false; setTimeout(function(){ strip.setAttribute('data-moved', '0'); }, 0); });
      }
      drawThumbs(); drawDots();
    });

    /* ---- partners: one row with every partner, chips pick one group, detail pop-up ----
       A row with more cards than fit across (more than 4 on a computer) glides slowly to the left on its own,
       looping, and pauses while the mouse is over it. Reduced motion: no gliding, the row can be swiped. */
    $$('[data-ptlist]').forEach(function(box){
      var rows = $$('[data-row]', box), empty = $('[data-empty]', box), cat = '';
      function fits(row){ return parseInt(getComputedStyle(row).getPropertyValue('--cols'), 10) || 4; }
      /* one row holds every partner; the chips only choose which cards of it are shown */
      function setup(row){
        var track = $('.pt-track', row);
        $$('[data-clone]', track).forEach(function(c){ c.remove(); });
        var cards = $$('.pt-card', track), shown = [];
        cards.forEach(function(c){ var on = !cat || c.getAttribute('data-cat') === cat; c.style.display = on ? '' : 'none'; if(on) shown.push(c); });
        var auto = shown.length > fits(row) && !reduce;
        row.classList.toggle('is-auto', auto);
        row.classList.toggle('is-swipe', shown.length > fits(row) && reduce);
        row.scrollLeft = 0;
        if(auto){
          /* a second copy of the cards right after the first: sliding by half the track loops seamlessly */
          shown.forEach(function(c){
            var k = c.cloneNode(true); k.setAttribute('data-clone', ''); k.setAttribute('aria-hidden', 'true');
            /* the entrance effect only knows the original cards: a copy must not wait hidden for it */
            k.classList.remove('fx-k', 'fx-in'); k.removeAttribute('data-fxe'); k.style.transitionDelay = '';
            $$('button, a', k).forEach(function(b){ b.tabIndex = -1; });
            track.appendChild(k);
          });
          track.style.setProperty('--dur', (shown.length * 4.5) + 's');
        }
        return shown.length;
      }
      function render(){
        var n = 0;
        rows.forEach(function(r){ n += setup(r); });
        if(empty) empty.style.display = n ? 'none' : '';
      }
      var lastCols = '';
      window.addEventListener('resize', function(){
        var c = rows.map(fits).join(',');   /* only redo the rows when the cards per screen change */
        if(c !== lastCols){ lastCols = c; render(); }
      });
      var chips = $$('.chip', box);
      chips.forEach(function(c){ c.addEventListener('click', function(){ chips.forEach(function(x){ x.classList.toggle('on', x === c); }); cat = c.getAttribute('data-chip') || ''; render(); }); });
      lastCols = rows.map(fits).join(',');
      render();
    });
    function closeModal(m){ m.hidden = true; document.body.classList.remove('modal-open'); }
    /* one listener for every "Xem chi tiết", including the copies in a gliding row */
    document.addEventListener('click', function(e){
      var b = e.target.closest && e.target.closest('[data-pmodal]');
      if(!b) return;
      var m = document.getElementById('pm-' + b.getAttribute('data-pmodal'));
      if(!m) return;
      m.hidden = false; document.body.classList.add('modal-open');
    });
    $$('.pmodal').forEach(function(m){
      m.addEventListener('click', function(e){ if(e.target === m || e.target.classList.contains('pm-x')) closeModal(m); });
    });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') $$('.pmodal').forEach(function(m){ if(!m.hidden) closeModal(m); }); });

    /* ---- recruitment video: poster turns into the player when clicked ---- */
    $$('.jvideo').forEach(function(box){
      var btn = $('.jbtn', box);
      if(!btn) return;
      btn.addEventListener('click', function(){
        var src = box.getAttribute('data-video'), yt = box.getAttribute('data-yt') === '1', el;
        if(yt){ el = document.createElement('iframe'); el.src = src; el.allow = 'autoplay; encrypted-media; fullscreen'; el.allowFullscreen = true; }
        else { el = document.createElement('video'); el.src = src; el.controls = true; el.autoplay = true; el.playsInline = true; }
        var img = $('img', box); box.style.aspectRatio = img ? (img.naturalWidth + '/' + img.naturalHeight) : '16/9';
        box.innerHTML = ''; box.appendChild(el); box.style.cursor = 'default';
      });
    });

    /* ---- sidebar option search (jobs) ---- */
    $$('[data-optsearch]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var q = inp.value.toLowerCase();
        $$('label', inp.closest('.grp')).forEach(function(l){ l.style.display = l.textContent.toLowerCase().indexOf(q) === -1 ? 'none' : ''; });
      });
    });
  });
})();

(function(){
  function $(s,c){return (c||document).querySelector(s);}
  function $$(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));}
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.addEventListener('DOMContentLoaded', function(){
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
      function go(i){
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
      }
    }

    /* ---- carousels (news cards, project gallery) ---- */
    $$('[data-car]').forEach(function(car){
      var viewport = $('.car-viewport, .gal-v', car), track = $('.car-track, .gal-t', car), dots = $('.dots', car), items = $$('.car-item, .gal-t > img', car), page = 0, pages = 1;
      if(!viewport || !track || !items.length) return;
      function build(){
        var w = items[0].getBoundingClientRect().width || 1;
        var per = Math.max(1, Math.round(viewport.getBoundingClientRect().width / w));
        pages = Math.max(1, Math.ceil(items.length / per));
        if(page >= pages) page = pages - 1;
        track.style.transform = 'translateX(' + (-(Math.min(page * per, items.length - per) * w)) + 'px)';
        if(dots){
          dots.innerHTML = '';
          if(pages > 1){ for(var i = 0; i < pages; i++){ (function(i){ var b = document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Trang ' + (i+1)); if(i === page) b.className = 'on'; b.addEventListener('click', function(){ page = i; build(); }); dots.appendChild(b); })(i); } }
        }
      }
      build();
      window.addEventListener('resize', build);
      var auto = car.getAttribute('data-car') === 'auto';
      if(auto && !reduce){ setInterval(function(){ if(pages > 1){ page = (page + 1) % pages; build(); } }, 6000); }
    });

    /* ---- featured project slider ---- */
    $$('[data-pfeat]').forEach(function(box){
      var slides = $$('.pf-slide', box), dots = $('.dots', box), cur = 0;
      function go(i){ cur = i; slides.forEach(function(s,k){ s.classList.toggle('active', k === i); }); if(dots) $$('button', dots).forEach(function(b,k){ b.classList.toggle('on', k === i); }); }
      if(dots && slides.length > 1){ slides.forEach(function(_,k){ var b = document.createElement('button'); b.type='button'; b.setAttribute('aria-label','Dự án ' + (k+1)); b.addEventListener('click', function(){ go(k); }); dots.appendChild(b); }); }
      go(0);
      if(slides.length > 1 && !reduce){ setInterval(function(){ go((cur + 1) % slides.length); }, 7000); }
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

    /* ---- sidebar option search (jobs) ---- */
    $$('[data-optsearch]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var q = inp.value.toLowerCase();
        $$('label', inp.closest('.grp')).forEach(function(l){ l.style.display = l.textContent.toLowerCase().indexOf(q) === -1 ? 'none' : ''; });
      });
    });
  });
})();

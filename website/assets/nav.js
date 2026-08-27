(function(){
  document.addEventListener('DOMContentLoaded', function(){
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
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') closeAllDropdowns();
    });

    /* ---- back-to-top floating button ---- */
    var fabTop = document.getElementById('fabTop');
    if(fabTop){
      window.addEventListener('scroll', function(){
        fabTop.classList.toggle('show', window.scrollY > 400);
      });
      fabTop.addEventListener('click', function(){
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    /* ---- top loading-bar + fade/scale transition between pages ---- */
    var bar = document.createElement('div');
    bar.id = 'page-progress';
    document.body.appendChild(bar);

    if(!reduceMotion){
      requestAnimationFrame(function(){
        bar.classList.add('active');
        bar.style.width = '70%';
        setTimeout(function(){
          bar.classList.add('done');
        }, 260);
      });

      document.addEventListener('click', function(e){
        var a = e.target.closest('a[href]');
        if(!a) return;
        var href = a.getAttribute('href');
        if(!href || href.charAt(0) === '#') return;
        if(href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
        if(a.target === '_blank' || a.hasAttribute('download')) return;
        if(a.origin && a.origin !== window.location.origin) return;
        e.preventDefault();
        bar.classList.remove('done');
        bar.style.width = '0';
        void bar.offsetWidth;
        bar.classList.add('active');
        bar.style.width = '85%';
        document.body.classList.add('page-leaving');
        setTimeout(function(){ window.location.href = href; }, 300);
      });
    }

    /* ---- scroll-reveal for cards and panels ---- */
    var revealEls = document.querySelectorAll('.val, .ucard, .vm .bx, .arel a, .afacts');
    if(revealEls.length && !reduceMotion && 'IntersectionObserver' in window){
      revealEls.forEach(function(el, i){
        el.classList.add('reveal-init');
        el.style.transitionDelay = (Math.min(i % 6, 5) * 70) + 'ms';
      });
      var pending = Array.prototype.slice.call(revealEls);
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('reveal-in');
            io.unobserve(entry.target);
            var idx = pending.indexOf(entry.target);
            if(idx !== -1) pending.splice(idx, 1);
          }
        });
      }, { threshold: 0, rootMargin: '150px 0px 150px 0px' });
      revealEls.forEach(function(el){ io.observe(el); });

      /* safety net: a fast fling/jump-scroll can skip elements without IO
         ever reporting an intersecting frame, leaving them stuck invisible */
      var checking = false;
      function sweepPending(){
        checking = false;
        for(var i = pending.length - 1; i >= 0; i--){
          var el = pending[i];
          var r = el.getBoundingClientRect();
          if(r.top < window.innerHeight && r.bottom > 0){
            el.classList.add('reveal-in');
            io.unobserve(el);
            pending.splice(i, 1);
          }
        }
      }
      function onScrollOrResize(){
        if(!pending.length || checking) return;
        checking = true;
        requestAnimationFrame(sweepPending);
      }
      window.addEventListener('scroll', onScrollOrResize, { passive: true });
      window.addEventListener('resize', onScrollOrResize);
    }

    /* ---- hero background slideshow ---- */
    var slides = document.querySelectorAll('.hero-bg .hslide');
    if(slides.length > 1 && !reduceMotion){
      var idx = 0;
      setInterval(function(){
        slides[idx].classList.remove('active');
        idx = (idx + 1) % slides.length;
        slides[idx].classList.add('active');
      }, 5000);
    }
  });
})();

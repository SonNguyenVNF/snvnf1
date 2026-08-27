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

    /* ---- smooth fade transition between pages ---- */
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if(!reduceMotion){
      document.addEventListener('click', function(e){
        var a = e.target.closest('a[href]');
        if(!a) return;
        var href = a.getAttribute('href');
        if(!href || href.charAt(0) === '#') return;
        if(href.indexOf('mailto:') === 0 || href.indexOf('tel:') === 0) return;
        if(a.target === '_blank' || a.hasAttribute('download')) return;
        if(a.origin && a.origin !== window.location.origin) return;
        e.preventDefault();
        document.body.classList.add('page-leaving');
        setTimeout(function(){ window.location.href = href; }, 180);
      });
    }

    /* ---- hero background slideshow ---- */
    var slides = document.querySelectorAll('.hero-bg .hslide');
    if(slides.length > 1 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      var idx = 0;
      setInterval(function(){
        slides[idx].classList.remove('active');
        idx = (idx + 1) % slides.length;
        slides[idx].classList.add('active');
      }, 5000);
    }
  });
})();

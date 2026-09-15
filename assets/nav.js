(function(){
  document.addEventListener('DOMContentLoaded', function(){
    /* ---- mobile hamburger menu ---- */
    var header = document.querySelector('header');
    var menuToggle = document.querySelector('.menu-toggle');
    if(header && menuToggle){
      menuToggle.addEventListener('click', function(){
        var willOpen = !header.classList.contains('nav-open');
        header.classList.toggle('nav-open', willOpen);
        menuToggle.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      });
      var mainNav = header.querySelector('header > .wrap > nav') || header.querySelector('nav');
      if(mainNav){
        mainNav.addEventListener('click', function(e){
          if(e.target.tagName === 'A'){
            header.classList.remove('nav-open');
            menuToggle.setAttribute('aria-expanded', 'false');
          }
        });
      }
      window.addEventListener('resize', function(){
        if(window.innerWidth > 900){
          header.classList.remove('nav-open');
          menuToggle.setAttribute('aria-expanded', 'false');
        }
      });
    }

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

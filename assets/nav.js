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

    /* ---- back-to-top button (in-flow at page bottom) ---- */
    var fabTop = document.getElementById('fabTop');
    if(fabTop){
      fabTop.addEventListener('click', function(){
        window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      });
    }

    /* ---- featured news slider (homepage) ---- */
    var nfTrack = document.querySelector('.nf-track');
    if (nfTrack) {
      var nfSlides = nfTrack.querySelectorAll('.nf-slide');
      var nfDotsWrap = document.querySelector('.nf-dots');
      var nfIdx = 0;
      nfSlides.forEach(function(s, i){
        var dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'nf-dot' + (i === 0 ? ' active' : '');
        dot.setAttribute('aria-label', 'Tin ' + (i + 1));
        dot.addEventListener('click', function(){ nfGoTo(i); });
        nfDotsWrap.appendChild(dot);
      });
      var nfDots = nfDotsWrap.querySelectorAll('.nf-dot');
      function nfGoTo(i){
        nfSlides[nfIdx].classList.remove('active');
        nfDots[nfIdx].classList.remove('active');
        nfIdx = (i + nfSlides.length) % nfSlides.length;
        nfSlides[nfIdx].classList.add('active');
        nfDots[nfIdx].classList.add('active');
      }
      var nfPrev = document.querySelector('.nf-prev');
      var nfNext = document.querySelector('.nf-next');
      if (nfPrev) nfPrev.addEventListener('click', function(){ nfGoTo(nfIdx - 1); });
      if (nfNext) nfNext.addEventListener('click', function(){ nfGoTo(nfIdx + 1); });
    }

    /* ---- hero slider (background + title/description move together) ---- */
    var heroBgSlides = document.querySelectorAll('.hero-bg .hslide');
    var heroTextSlides = document.querySelectorAll('.hero-text');
    if (heroBgSlides.length > 1) {
      var heroDotsWrap = document.querySelector('.hero-dots');
      var heroIdx = 0;
      if (heroDotsWrap) {
        heroBgSlides.forEach(function(s, i){
          var dot = document.createElement('button');
          dot.type = 'button';
          dot.className = 'hero-dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', 'Slide ' + (i + 1));
          dot.addEventListener('click', function(){ heroGoTo(i); });
          heroDotsWrap.appendChild(dot);
        });
      }
      var heroDots = heroDotsWrap ? heroDotsWrap.querySelectorAll('.hero-dot') : [];
      function heroGoTo(i){
        heroBgSlides[heroIdx].classList.remove('active');
        heroTextSlides[heroIdx].classList.remove('active');
        if (heroDots[heroIdx]) heroDots[heroIdx].classList.remove('active');
        heroIdx = (i + heroBgSlides.length) % heroBgSlides.length;
        heroBgSlides[heroIdx].classList.add('active');
        heroTextSlides[heroIdx].classList.add('active');
        if (heroDots[heroIdx]) heroDots[heroIdx].classList.add('active');
      }
      var heroPrev = document.querySelector('.hero-prev');
      var heroNext = document.querySelector('.hero-next');
      if (heroPrev) heroPrev.addEventListener('click', function(){ heroGoTo(heroIdx - 1); });
      if (heroNext) heroNext.addEventListener('click', function(){ heroGoTo(heroIdx + 1); });
      if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        setInterval(function(){ heroGoTo(heroIdx + 1); }, 6000);
      }
    }
  });
})();

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

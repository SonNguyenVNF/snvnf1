document.addEventListener('DOMContentLoaded', function(){
  var items = document.querySelectorAll('.has-dropdown');
  function closeAll(){
    items.forEach(function(li){
      li.classList.remove('open');
      var t = li.querySelector('.dropdown-toggle');
      if(t) t.setAttribute('aria-expanded','false');
    });
  }
  items.forEach(function(li){
    var toggle = li.querySelector('.dropdown-toggle');
    if(!toggle) return;
    toggle.setAttribute('aria-haspopup','true');
    toggle.setAttribute('aria-expanded','false');
    toggle.addEventListener('click', function(e){
      e.preventDefault();
      var willOpen = !li.classList.contains('open');
      closeAll();
      if(willOpen){ li.classList.add('open'); toggle.setAttribute('aria-expanded','true'); }
    });
  });
  document.addEventListener('click', function(e){
    items.forEach(function(li){ if(!li.contains(e.target)) li.classList.remove('open'); });
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape') closeAll();
  });
});

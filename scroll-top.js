/* Nach oben Button: erscheint nach dem Scrollen, sitzt unten rechts und bleibt oberhalb des Footers. */
(function () {
  'use strict';
  if (document.querySelector('.scroll-top')) return;

  var css =
    '.scroll-top{--st-base:24px;position:fixed;right:24px;bottom:var(--st-base);z-index:950;width:52px;height:52px;padding:0;border:0;border-radius:50%;' +
    'background:#0F1F3D;color:#C9A84C;cursor:pointer;display:flex;align-items:center;justify-content:center;' +
    'box-shadow:0 8px 24px rgba(15,31,61,.28);opacity:0;visibility:hidden;transform:translateY(16px) scale(.9);' +
    'transition:opacity .3s ease,visibility .3s ease,transform .35s cubic-bezier(.34,1.56,.64,1),background-color .2s ease,color .2s ease;' +
    '-webkit-tap-highlight-color:transparent}' +
    '.scroll-top.is-visible{opacity:1;visibility:visible;transform:translateY(0) scale(1)}' +
    '.scroll-top:hover{background:#C9A84C;color:#0F1F3D}' +
    '.scroll-top:focus-visible{outline:2px solid #C9A84C;outline-offset:3px}' +
    '.scroll-top__ring{position:absolute;inset:0;width:100%;height:100%;transform:rotate(-90deg);pointer-events:none}' +
    '.scroll-top__track{fill:none;stroke:rgba(201,168,76,.22);stroke-width:2}' +
    '.scroll-top__bar{fill:none;stroke:#C9A84C;stroke-width:2;stroke-linecap:round}' +
    '.scroll-top:hover .scroll-top__bar{stroke:#0F1F3D}' +
    '.scroll-top__icon{position:relative;width:20px;height:20px;transition:transform .25s ease}' +
    '.scroll-top:hover .scroll-top__icon{transform:translateY(-2px)}' +
    '@media (max-width:640px){.scroll-top{right:16px;width:46px;height:46px;--st-base:16px}' +
    'body:has(.fab-audit) .scroll-top{--st-base:84px}}' +
    'body:has(.nav__mobile-overlay.open) .scroll-top,body:has(.callback-backdrop.open) .scroll-top{opacity:0;visibility:hidden;pointer-events:none}' +
    '@media (prefers-reduced-motion:reduce){.scroll-top,.scroll-top__icon{transition:opacity .2s ease,visibility .2s ease}}';

  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  var R = 24, C = 2 * Math.PI * R;
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'scroll-top';
  btn.setAttribute('aria-label', 'Nach oben scrollen');
  btn.innerHTML =
    '<svg class="scroll-top__ring" viewBox="0 0 52 52" aria-hidden="true">' +
    '<circle class="scroll-top__track" cx="26" cy="26" r="' + R + '"/>' +
    '<circle class="scroll-top__bar" cx="26" cy="26" r="' + R + '" stroke-dasharray="' + C + '" stroke-dashoffset="' + C + '"/></svg>' +
    '<svg class="scroll-top__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 19V5"/><path d="M5 12l7-7 7 7"/></svg>';
  document.body.appendChild(btn);

  var bar = btn.querySelector('.scroll-top__bar');
  var footers = document.querySelectorAll('footer');
  var footer = footers.length ? footers[footers.length - 1] : null;
  var ticking = false;

  function update() {
    ticking = false;
    var doc = document.documentElement;
    var y = window.pageYOffset || doc.scrollTop;
    var max = doc.scrollHeight - window.innerHeight;
    var progress = max > 0 ? Math.min(y / max, 1) : 0;

    btn.classList.toggle('is-visible', y > Math.min(600, window.innerHeight * 0.8));
    bar.style.strokeDashoffset = String(C * (1 - progress));

    /* Oberhalb des Footers halten */
    var lift = 0;
    if (footer) {
      var top = footer.getBoundingClientRect().top;
      if (top < window.innerHeight) lift = window.innerHeight - top;
    }
    /* Nicht in den Mini Audit Button hineinschieben */
    var fab = document.querySelector('.fab-audit');
    if (fab && lift) {
      var fr = fab.getBoundingClientRect();
      var base = parseFloat(getComputedStyle(btn).getPropertyValue('--st-base')) || 24;
      var restTop = window.innerHeight - base - btn.offsetHeight;
      if (fr.bottom < restTop) lift = Math.min(lift, Math.max(0, restTop - fr.bottom - 16));
    }
    btn.style.bottom = lift ? 'calc(var(--st-base) + ' + lift + 'px)' : '';
  }

  function onScroll() {
    if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
  }

  btn.addEventListener('click', function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  update();
})();

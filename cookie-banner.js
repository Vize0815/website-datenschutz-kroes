(function () {
  'use strict';

  var STORAGE_KEY = 'dsk_cookie_consent_v1';
  var CONSENT_VERSION = 1;

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== CONSENT_VERSION) return null;
      return data;
    } catch (e) {
      return null;
    }
  }

  function setConsent(status) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: CONSENT_VERSION,
        status: status,
        timestamp: new Date().toISOString()
      }));
    } catch (e) { /* storage blocked – banner only */ }
  }

  function hasYoutubeEmbed() {
    return !!document.querySelector('.yt-embed, [data-yt-placeholder]');
  }

  function buildBanner() {
    var wrap = document.createElement('div');
    wrap.className = 'cc-banner';
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-live', 'polite');
    wrap.setAttribute('aria-label', 'Cookie-Einstellungen');
    wrap.setAttribute('aria-hidden', 'true');

    var ytNote = hasYoutubeEmbed()
      ? ' Bei Zustimmung können auf dieser Seite eingebettete YouTube-Videos (Google Ireland Ltd.) geladen werden, die ggf. Cookies setzen.'
      : '';

    wrap.innerHTML =
      '<div class="cc-banner__body">' +
        '<h2 class="cc-banner__title">Wir respektieren Ihre Privatsphäre</h2>' +
        '<p class="cc-banner__text">' +
          'Diese Website verwendet ausschließlich <strong>technisch notwendige Cookies</strong>, die für den Betrieb erforderlich sind (z.B. zum Speichern Ihrer Cookie-Entscheidung). Es findet <strong>kein Tracking, keine Analyse und keine Werbung</strong> statt.' + ytNote +
        '</p>' +
        '<p class="cc-banner__meta">' +
          'Verantwortlicher: Datenschutz Kroes, Alexander Kroes, 6322 Kirchbichl. ' +
          'Weitere Informationen in der <a href="datenschutz.html">Datenschutzerklärung</a>. ' +
          'Sie können Ihre Entscheidung jederzeit in der Datenschutzerklärung widerrufen.' +
        '</p>' +
      '</div>' +
      '<div class="cc-banner__actions">' +
        '<button type="button" class="cc-btn" data-cc-action="reject">Ablehnen</button>' +
        '<button type="button" class="cc-btn" data-cc-action="accept">Akzeptieren</button>' +
      '</div>';

    return wrap;
  }

  function applyConsent(status) {
    document.documentElement.setAttribute('data-cc-consent', status);
    window.dispatchEvent(new CustomEvent('cookieconsentchange', { detail: { status: status } }));
  }

  function hideBanner(banner) {
    banner.setAttribute('aria-hidden', 'true');
    setTimeout(function () { if (banner.parentNode) banner.parentNode.removeChild(banner); }, 220);
  }

  function showBanner() {
    if (document.querySelector('.cc-banner')) return;
    var banner = buildBanner();
    document.body.appendChild(banner);
    requestAnimationFrame(function () { banner.setAttribute('aria-hidden', 'false'); });

    banner.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cc-action]');
      if (!btn) return;
      var action = btn.getAttribute('data-cc-action');
      setConsent(action === 'accept' ? 'accepted' : 'rejected');
      applyConsent(action === 'accept' ? 'accepted' : 'rejected');
      hideBanner(banner);
    });
  }

  function init() {
    var existing = getConsent();
    if (existing) {
      applyConsent(existing.status);
      return;
    }
    showBanner();
  }

  window.DSKCookieConsent = {
    get: getConsent,
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      var existing = document.querySelector('.cc-banner');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      document.documentElement.removeAttribute('data-cc-consent');
      showBanner();
    },
    accept: function () { setConsent('accepted'); applyConsent('accepted'); var b = document.querySelector('.cc-banner'); if (b) hideBanner(b); },
    reject: function () { setConsent('rejected'); applyConsent('rejected'); var b = document.querySelector('.cc-banner'); if (b) hideBanner(b); }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

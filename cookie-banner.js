(function () {
  'use strict';

  var STORAGE_KEY = 'dsk_cookie_consent_v2';
  var CONSENT_VERSION = 2;
  var CONSENT_TTL_DAYS = 365; /* DSGVO: Erneuerung mind. einmal pro Jahr */

  var CATEGORIES = [
    {
      id: 'necessary',
      label: 'Notwendig',
      required: true,
      description: 'Technisch notwendige Cookies bzw. localStorage-Einträge, die für den Betrieb der Website unerlässlich sind (z.B. Speichern Ihrer Cookie-Entscheidung).',
      items: [
        { name: 'dsk_cookie_consent_v2', purpose: 'Speichert Ihre Cookie-Einstellungen inkl. Kategorie-Auswahl und Zeitstempel als Einwilligungsnachweis.', storage: 'localStorage', duration: '1 Jahr' }
      ]
    },
    {
      id: 'preferences',
      label: 'Präferenzen',
      required: false,
      description: 'Ermöglichen der Website, sich an Informationen zu erinnern, die die Verhaltensweise oder das Aussehen der Website verändern (z.B. bevorzugte Sprache oder Region).',
      items: []
    },
    {
      id: 'statistics',
      label: 'Statistiken',
      required: false,
      description: 'Helfen zu verstehen, wie Besucher mit der Website interagieren, indem Informationen anonym gesammelt und gemeldet werden.',
      items: []
    },
    {
      id: 'marketing',
      label: 'Marketing',
      required: false,
      description: 'Werden verwendet, um Besuchern auf Websites zu folgen. Ermöglicht eingebettete Drittinhalte wie YouTube-Videos, die beim Abspielen eigene Cookies setzen können.',
      items: [
        { name: 'YouTube-Embed', purpose: 'Bei Zustimmung werden auf Unterseiten (DSGVO-Seminar, NIS2-Seminar) eingebettete YouTube-Videos (youtube-nocookie.com) geladen. Anbieter: Google Ireland Ltd., Irland.', storage: 'Drittanbieter-Cookies', duration: 'Bis zu 2 Jahre (Google)' }
      ]
    }
  ];

  /* ---------- Storage ---------- */

  function getConsent() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || data.v !== CONSENT_VERSION) return null;
      if (data.expires && new Date(data.expires).getTime() < Date.now()) return null;
      return data;
    } catch (e) { return null; }
  }

  function saveConsent(categories, method) {
    var now = new Date();
    var expires = new Date(now.getTime() + CONSENT_TTL_DAYS * 24 * 60 * 60 * 1000);
    var record = {
      v: CONSENT_VERSION,
      timestamp: now.toISOString(),
      expires: expires.toISOString(),
      method: method, /* 'accept-all' | 'reject-all' | 'custom' */
      categories: categories,
      url: location.href,
      userAgent: navigator.userAgent
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (e) {}
    return record;
  }

  /* ---------- Apply ---------- */

  function applyConsent(categories) {
    var root = document.documentElement;
    CATEGORIES.forEach(function (cat) {
      root.setAttribute('data-cc-' + cat.id, categories[cat.id] ? 'granted' : 'denied');
    });
    window.dispatchEvent(new CustomEvent('cookieconsentchange', { detail: { categories: categories } }));
  }

  /* ---------- DOM helpers ---------- */

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'text') node.textContent = attrs[k];
      else if (k === 'html') node.innerHTML = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  function buildToggle(id, checked, disabled) {
    var label = el('label', { class: 'cc-toggle', 'aria-label': 'Kategorie ' + id + ' aktivieren' });
    var input = el('input', { type: 'checkbox', 'data-cc-cat': id });
    input.checked = !!checked;
    if (disabled) input.disabled = true;
    var track = el('span', { class: 'cc-toggle__track' });
    var thumb = el('span', { class: 'cc-toggle__thumb' });
    label.appendChild(input);
    label.appendChild(track);
    label.appendChild(thumb);
    return label;
  }

  /* ---------- Build UI ---------- */

  function buildBanner(current) {
    var overlay = el('div', { class: 'cc-overlay', 'aria-hidden': 'true' });

    var banner = el('div', {
      class: 'cc-banner',
      role: 'dialog',
      'aria-modal': 'true',
      'aria-labelledby': 'cc-title',
      'aria-hidden': 'true'
    });

    /* Header */
    var logoText = document.createElement('span');
    logoText.innerHTML = 'Datenschutz <span>Kroes</span>';
    logoText.className = 'cc-logo';
    var header = el('div', { class: 'cc-header' }, [logoText]);

    /* Tabs */
    var tabs = el('div', { class: 'cc-tabs', role: 'tablist' });
    var tabDefs = [
      { id: 'consent', label: 'Zustimmung' },
      { id: 'details', label: 'Details' },
      { id: 'about', label: 'Über Cookies' }
    ];
    tabDefs.forEach(function (t, i) {
      var btn = el('button', {
        type: 'button',
        class: 'cc-tab',
        role: 'tab',
        'data-cc-tab': t.id,
        'aria-selected': i === 0 ? 'true' : 'false',
        'aria-controls': 'cc-panel-' + t.id
      });
      btn.textContent = t.label;
      tabs.appendChild(btn);
    });

    /* Panels container */
    var panels = el('div', { class: 'cc-panels' });

    /* Consent panel */
    var consentPanel = el('div', {
      class: 'cc-panel',
      id: 'cc-panel-consent',
      role: 'tabpanel',
      'aria-hidden': 'false'
    });
    consentPanel.innerHTML =
      '<h3 id="cc-title">Diese Website verwendet Cookies</h3>' +
      '<p>Wir verwenden technisch notwendige Cookies, damit diese Website funktioniert. ' +
      'Darüber hinaus würden wir optional Funktionen wie eingebettete YouTube-Videos anbieten, die erst nach Ihrer ausdrücklichen Zustimmung geladen werden. ' +
      'Sie können einzelne Kategorien gezielt aktivieren oder deaktivieren.</p>' +
      '<p class="cc-meta"><strong>Verantwortlicher:</strong> Datenschutz Kroes, Alexander Kroes, 6322 Kirchbichl, Österreich. ' +
      'Rechtsgrundlage: Art. 6 Abs. 1 lit. a DSGVO (Einwilligung) bzw. Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse bei technisch notwendigen Cookies). ' +
      'Details und Ihre Rechte finden Sie in der <a href="datenschutz.html">Datenschutzerklärung</a>.</p>';

    var catGrid = el('div', { class: 'cc-categories', role: 'group', 'aria-label': 'Cookie-Kategorien' });
    CATEGORIES.forEach(function (cat) {
      var wrap = el('div', { class: 'cc-category' });
      var label = el('span', { class: 'cc-category__label', text: cat.label });
      var checked = cat.required ? true : !!(current && current.categories && current.categories[cat.id]);
      var toggle = buildToggle(cat.id, checked, cat.required);
      wrap.appendChild(label);
      wrap.appendChild(toggle);
      catGrid.appendChild(wrap);
    });
    consentPanel.appendChild(catGrid);

    /* Details panel */
    var detailsPanel = el('div', {
      class: 'cc-panel',
      id: 'cc-panel-details',
      role: 'tabpanel',
      'aria-hidden': 'true'
    });
    var detailsList = el('div', { class: 'cc-details-list' });
    CATEGORIES.forEach(function (cat) {
      var row = el('div', { class: 'cc-details-row' });
      var info = el('div');
      info.appendChild(el('h4', { text: cat.label + (cat.required ? ' (immer aktiv)' : '') }));
      info.appendChild(el('p', { text: cat.description }));

      if (cat.items.length) {
        var itemList = el('ul', { style: 'margin: 8px 0 0; padding-left: 18px; font-size: 13px; color: #5C6B82; line-height: 1.55;' });
        cat.items.forEach(function (it) {
          var li = el('li', { style: 'margin-bottom: 6px;' });
          li.innerHTML = '<strong>' + it.name + '</strong> – ' + it.purpose + ' <em>(Speicher: ' + it.storage + ', Dauer: ' + it.duration + ')</em>';
          itemList.appendChild(li);
        });
        info.appendChild(itemList);
      } else {
        info.appendChild(el('div', { class: 'cc-empty-note', text: 'Aktuell werden in dieser Kategorie keine Cookies oder Tracking-Technologien eingesetzt. Die Einstellung ist nur für künftige Erweiterungen relevant.' }));
      }

      var toggleWrap = el('div');
      var checked = cat.required ? true : !!(current && current.categories && current.categories[cat.id]);
      toggleWrap.appendChild(buildToggle(cat.id, checked, cat.required));

      row.appendChild(info);
      row.appendChild(toggleWrap);
      detailsList.appendChild(row);
    });
    detailsPanel.appendChild(detailsList);

    /* About panel */
    var aboutPanel = el('div', {
      class: 'cc-panel',
      id: 'cc-panel-about',
      role: 'tabpanel',
      'aria-hidden': 'true'
    });
    aboutPanel.innerHTML =
      '<h3>Über Cookies und localStorage</h3>' +
      '<p>Cookies sind kleine Textdateien, die Websites auf Ihrem Endgerät speichern. Sie dienen dazu, Webseiten funktionsfähig zu machen, sie sicherer zu gestalten, eine bessere Benutzererfahrung zu bieten und zu verstehen, wie die Website genutzt wird.</p>' +
      '<p>Diese Website nutzt zusätzlich den <strong>localStorage</strong> des Browsers, um Ihre Cookie-Entscheidung zu speichern, ohne dabei Daten an unseren Server zu übertragen. Ihre Einwilligung wird ausschließlich lokal in Ihrem Browser abgelegt.</p>' +
      '<p><strong>Ihre Einwilligung wird dokumentiert:</strong> Zeitstempel, gewählte Kategorien und Einwilligungsmethode werden gemeinsam mit einer Versions-ID gespeichert. Nach einem Jahr erlischt die Einwilligung automatisch und der Banner erscheint erneut (DSGVO-Konformität).</p>' +
      '<p><strong>Widerruf und Änderung:</strong> Sie können Ihre Einwilligung jederzeit über den Link in der <a href="datenschutz.html#cookies">Datenschutzerklärung (Abschnitt 11)</a> widerrufen oder anpassen. Der Widerruf ist genauso einfach wie die Zustimmung.</p>' +
      '<p class="cc-meta">Diese Website verwendet derzeit <strong>keine Analyse-, Tracking- oder Werbe-Cookies</strong>. Die Kategorien Präferenzen, Statistiken und Marketing sind ohne Ihre Zustimmung deaktiviert und werden erst bei entsprechender Erweiterung der Website aktiv.</p>';

    panels.appendChild(consentPanel);
    panels.appendChild(detailsPanel);
    panels.appendChild(aboutPanel);

    /* Actions */
    var actions = el('div', { class: 'cc-actions' });
    var btnReject = el('button', { type: 'button', class: 'cc-btn', 'data-cc-action': 'reject' });
    btnReject.textContent = 'Ablehnen';
    var btnCustom = el('button', { type: 'button', class: 'cc-btn', 'data-cc-action': 'custom' });
    btnCustom.textContent = 'Auswahl erlauben';
    var btnAccept = el('button', { type: 'button', class: 'cc-btn cc-btn--primary', 'data-cc-action': 'accept' });
    btnAccept.textContent = 'Alle zulassen';
    actions.appendChild(btnReject);
    actions.appendChild(btnCustom);
    actions.appendChild(btnAccept);

    banner.appendChild(header);
    banner.appendChild(tabs);
    banner.appendChild(panels);
    banner.appendChild(actions);

    return { overlay: overlay, banner: banner };
  }

  /* ---------- Behavior ---------- */

  function wireBanner(nodes, onDecide) {
    var banner = nodes.banner;

    /* Tab switching */
    banner.querySelectorAll('[data-cc-tab]').forEach(function (tab) {
      tab.addEventListener('click', function () {
        var target = tab.getAttribute('data-cc-tab');
        banner.querySelectorAll('[data-cc-tab]').forEach(function (t) {
          t.setAttribute('aria-selected', t === tab ? 'true' : 'false');
        });
        banner.querySelectorAll('.cc-panel').forEach(function (p) {
          p.setAttribute('aria-hidden', p.id === 'cc-panel-' + target ? 'false' : 'true');
        });
      });
    });

    /* Sync toggles between consent and details panel */
    banner.addEventListener('change', function (e) {
      var input = e.target.closest('input[data-cc-cat]');
      if (!input) return;
      var catId = input.getAttribute('data-cc-cat');
      banner.querySelectorAll('input[data-cc-cat="' + catId + '"]').forEach(function (other) {
        if (other !== input) other.checked = input.checked;
      });
    });

    /* Action buttons */
    banner.querySelectorAll('[data-cc-action]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var action = btn.getAttribute('data-cc-action');
        var categories = {};

        if (action === 'accept') {
          CATEGORIES.forEach(function (c) { categories[c.id] = true; });
        } else if (action === 'reject') {
          CATEGORIES.forEach(function (c) { categories[c.id] = c.required; });
        } else {
          CATEGORIES.forEach(function (c) {
            if (c.required) { categories[c.id] = true; return; }
            var input = banner.querySelector('input[data-cc-cat="' + c.id + '"]');
            categories[c.id] = !!(input && input.checked);
          });
        }

        onDecide(categories, action === 'accept' ? 'accept-all' : action === 'reject' ? 'reject-all' : 'custom');
      });
    });
  }

  function openBanner(current) {
    closeBanner();
    var nodes = buildBanner(current);
    document.body.appendChild(nodes.overlay);
    document.body.appendChild(nodes.banner);
    requestAnimationFrame(function () {
      nodes.overlay.setAttribute('aria-hidden', 'false');
      nodes.banner.setAttribute('aria-hidden', 'false');
    });

    wireBanner(nodes, function (categories, method) {
      saveConsent(categories, method);
      applyConsent(categories);
      closeBanner();
    });

    var firstFocusable = nodes.banner.querySelector('.cc-tab');
    if (firstFocusable) firstFocusable.focus();
  }

  function closeBanner() {
    document.querySelectorAll('.cc-banner, .cc-overlay').forEach(function (n) {
      n.setAttribute('aria-hidden', 'true');
      setTimeout(function () { if (n.parentNode) n.parentNode.removeChild(n); }, 220);
    });
  }

  /* ---------- Init ---------- */

  function init() {
    var existing = getConsent();
    if (existing) {
      applyConsent(existing.categories);
      return;
    }
    /* no valid consent → show banner with defaults (only necessary = true) */
    openBanner(null);
  }

  window.DSKCookieConsent = {
    get: getConsent,
    open: function () { openBanner(getConsent()); },
    reset: function () {
      try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
      CATEGORIES.forEach(function (c) { document.documentElement.removeAttribute('data-cc-' + c.id); });
      openBanner(null);
    },
    acceptAll: function () {
      var cats = {};
      CATEGORIES.forEach(function (c) { cats[c.id] = true; });
      saveConsent(cats, 'accept-all');
      applyConsent(cats);
      closeBanner();
    },
    rejectAll: function () {
      var cats = {};
      CATEGORIES.forEach(function (c) { cats[c.id] = c.required; });
      saveConsent(cats, 'reject-all');
      applyConsent(cats);
      closeBanner();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

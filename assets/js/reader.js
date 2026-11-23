/* Demon Lord's Apostle web reader. No network calls, no tracking: state lives in localStorage only. */
(function () {
  'use strict';
  var d = document.documentElement, body = document.body;
  var KEY_P = 'dla-prefs', KEY_LAST = 'dla-last', KEY_READ = 'dla-read', KEY_SPOIL = 'dla-guardians-revealed';
  var DEF = { theme: 'dark', font: 'serif', width: 'medium', leading: 'normal', size: null };
  function load(k, f) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? f : v; } catch (e) { return f; } }
  function save(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  var prefs = Object.assign({}, DEF, load(KEY_P, {}));
  function baseSize() { return window.matchMedia('(max-width:560px)').matches ? 18 : 19; }
  var MIN = 14, MAX = 28;

  function applyPrefs() {
    ['theme', 'font', 'width', 'leading'].forEach(function (k) { d.setAttribute('data-' + k, prefs[k]); });
    if (prefs.size) d.style.setProperty('--fs', prefs.size + 'px'); else d.style.removeProperty('--fs');
    var out = document.getElementById('sizeOut');
    if (out) out.textContent = (prefs.size || baseSize()) + 'px';
    document.querySelectorAll('[data-set]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(prefs[b.getAttribute('data-set')] === b.getAttribute('data-val')));
    });
    var meta = document.querySelector('meta[name=theme-color]');
    if (meta) meta.setAttribute('content', prefs.theme === 'dark' ? '#a0142c' : prefs.theme === 'sepia' ? '#f3ead6' : '#fbfaf7');
  }

  /* panels */
  var scrim = document.getElementById('scrim');
  var openPanel = null, opener = null;
  function show(id, btn) {
    hide();
    var p = document.getElementById(id); if (!p) return;
    p.hidden = false; scrim.hidden = false; openPanel = p; opener = btn || null;
    if (btn) btn.setAttribute('aria-expanded', 'true');
    var f = p.querySelector('button, a'); if (f) f.focus({ preventScroll: true });
    if (id === 'tocDrawer') {
      var cur = p.querySelector('li.current'); if (cur) cur.scrollIntoView({ block: 'center' });
    }
  }
  function hide() {
    if (!openPanel) return;
    openPanel.hidden = true; scrim.hidden = true;
    if (opener) { opener.setAttribute('aria-expanded', 'false'); opener.focus({ preventScroll: true }); }
    openPanel = null; opener = null;
  }
  var sBtn = document.getElementById('settingsBtn'), tBtn = document.getElementById('tocBtn');
  if (sBtn) sBtn.addEventListener('click', function () { openPanel && openPanel.id === 'settingsPanel' ? hide() : show('settingsPanel', sBtn); });
  if (tBtn) tBtn.addEventListener('click', function () { openPanel && openPanel.id === 'tocDrawer' ? hide() : show('tocDrawer', tBtn); });
  if (scrim) scrim.addEventListener('click', hide);
  document.querySelectorAll('[data-close]').forEach(function (b) { b.addEventListener('click', hide); });
  document.querySelectorAll('[data-set]').forEach(function (b) {
    b.addEventListener('click', function () { prefs[b.getAttribute('data-set')] = b.getAttribute('data-val'); save(KEY_P, prefs); applyPrefs(); });
  });
  document.querySelectorAll('[data-step=size]').forEach(function (b) {
    b.addEventListener('click', function () {
      var cur = prefs.size || baseSize();
      prefs.size = Math.max(MIN, Math.min(MAX, cur + Number(b.getAttribute('data-dir'))));
      save(KEY_P, prefs); applyPrefs();
    });
  });
  var reset = document.getElementById('resetPrefs');
  if (reset) reset.addEventListener('click', function () { prefs = Object.assign({}, DEF); save(KEY_P, prefs); applyPrefs(); });
  applyPrefs();
  if (location.hash === '#settings') show('settingsPanel', sBtn);
  if (location.hash === '#toc') show('tocDrawer', tBtn);

  /* keyboard */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { hide(); return; }
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    var t = e.target; if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (openPanel) return;
    var sel = e.key === 'ArrowLeft' ? 'a[data-nav=prev]' : e.key === 'ArrowRight' ? 'a[data-nav=next]' : null;
    if (!sel) return;
    var a = document.querySelector(sel); if (a) { e.preventDefault(); location.href = a.href; }
  });

  /* read-state in tables of contents */
  var read = load(KEY_READ, {}), last = load(KEY_LAST, null);
  var slug = body.getAttribute('data-slug');
  function markToc() {
    document.querySelectorAll('.toc li').forEach(function (li) {
      var s = li.getAttribute('data-slug');
      li.classList.toggle('read', !!read[s]);
      li.classList.toggle('current', s === slug);
    });
  }
  markToc();

  /* chapter page: progress, remember place */
  if (body.classList.contains('page-chapter')) {
    var fill = document.getElementById('progressFill'), text = document.getElementById('text'), bar = document.getElementById('topbar');
    var title = body.getAttribute('data-title');
    var lastY = window.scrollY, ticking = false, saveT = null;
    function frac() {
      var top = text.offsetTop, h = text.offsetHeight - window.innerHeight * 0.6;
      return Math.max(0, Math.min(1, (window.scrollY + window.innerHeight * 0.4 - top) / Math.max(1, h)));
    }
    function update() {
      ticking = false;
      var f = frac();
      fill.style.transform = 'scaleX(' + f.toFixed(4) + ')';
      var y = window.scrollY;
      if (!openPanel && y > 200 && y > lastY + 6) bar.classList.add('hide'); else if (y < lastY - 6 || y < 200) bar.classList.remove('hide');
      lastY = y;
      clearTimeout(saveT);
      saveT = setTimeout(function () {
        save(KEY_LAST, { slug: slug, title: title, pos: Number(f.toFixed(4)), t: Date.now() });
        if (f > 0.97 && !read[slug]) { read[slug] = 1; save(KEY_READ, read); markToc(); }
      }, 250);
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    if (location.hash === '#resume' && last && last.slug === slug && last.pos > 0.01) {
      var go = function () {
        var top = text.offsetTop, h = text.offsetHeight - window.innerHeight * 0.6;
        window.scrollTo(0, Math.max(0, top + last.pos * h - window.innerHeight * 0.4));
      };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go); else go();
    } else {
      save(KEY_LAST, { slug: slug, title: title, pos: (last && last.slug === slug) ? last.pos : 0, t: Date.now() });
    }
    update();
  }
  if (slug === 'end') { read.end = 1; save(KEY_READ, read); markToc(); }

  /* landing: continue reading */
  var cont = document.getElementById('continueBtn');
  if (cont && last && last.slug) {
    cont.href = 'chapters/' + last.slug + '.html#resume';
    cont.hidden = false;
    cont.textContent = 'Continue reading';
    var note = document.getElementById('continueNote');
    if (note) { note.textContent = 'Last read: ' + last.title + (last.pos > 0.02 ? ' (' + Math.round(last.pos * 100) + '%)' : ''); note.hidden = false; }
    var start = document.getElementById('startBtn');
    if (start) { start.textContent = 'Start from Chapter 1'; start.className = 'btn btn-ghost btn-lg'; cont.className = 'btn btn-accent btn-lg'; cont.parentNode.insertBefore(cont, start); }
  }

  /* guardians: spoiler veil */
  var grid = document.getElementById('ancientGrid'), gate = document.getElementById('spoilerGate'), rb = document.getElementById('revealBtn');
  var swAll = document.getElementById('swornAll'), swAllBtn = document.getElementById('swornAllBtn');
  function reveal() { if (grid) grid.classList.remove('veiled'); if (gate) gate.hidden = true; if (swAll) swAll.hidden = false; }
  function setSworn(card, on) {
    card.classList.toggle('sworn', on);
    var b = card.querySelector('.sworn-btn');
    if (b) { b.setAttribute('aria-pressed', String(on)); b.textContent = on ? 'Show original form' : 'Sneak peek: sworn form'; }
  }
  document.querySelectorAll('.gcard.has-sworn .sworn-btn').forEach(function (b) {
    b.addEventListener('click', function () { var c = b.closest('.gcard'); setSworn(c, !c.classList.contains('sworn')); });
  });
  if (swAllBtn) swAllBtn.addEventListener('click', function () {
    var on = swAllBtn.getAttribute('aria-pressed') !== 'true';
    swAllBtn.setAttribute('aria-pressed', String(on));
    swAllBtn.textContent = on ? 'Show all original forms' : 'Sneak peek: show all sworn forms';
    document.querySelectorAll('.gcard.has-sworn').forEach(function (c) { setSworn(c, on); });
  });
  if (location.hash === '#sworn') { reveal(); if (swAllBtn) swAllBtn.click(); }
  if (grid && (load(KEY_SPOIL, false) || location.hash === '#reveal')) reveal();
  if (rb) rb.addEventListener('click', function () { save(KEY_SPOIL, true); reveal(); });
})();

/* Applies saved reading preferences before first paint. Local only. */
(function () {
  var d = document.documentElement, p = {};
  d.className += ' js';
  try { p = JSON.parse(localStorage.getItem('dla-prefs') || '{}') || {}; } catch (e) {}
  d.setAttribute('data-theme', p.theme || 'dark');
  d.setAttribute('data-font', p.font || 'serif');
  d.setAttribute('data-width', p.width || 'medium');
  d.setAttribute('data-leading', p.leading || 'normal');
  if (p.size) d.style.setProperty('--fs', p.size + 'px');
})();

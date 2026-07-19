/* Case study page — theme toggle, scroll reveal, copy button */
(function () {
  'use strict';

  // Enable reveal styling only when JS is active (content stays visible if JS fails)
  document.documentElement.classList.add('cs-ready');

  // ---- Theme ----
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  root.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
    });
  }

  // ---- Scroll reveal ----
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }
  // Safety net: ensure nothing stays hidden if an observer miss occurs
  setTimeout(function () {
    document.querySelectorAll('.reveal:not(.in)').forEach(function (el) { el.classList.add('in'); });
  }, 1200);

  // ---- Copy prompt ----
  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-copy-target');
      var target = document.getElementById(targetId);
      if (!target) return;
      var text = target.innerText;
      var done = function () {
        var prev = btn.textContent;
        btn.textContent = 'Copied';
        btn.classList.add('copied');
        setTimeout(function () { btn.textContent = prev; btn.classList.remove('copied'); }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, done);
      } else {
        var ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(ta); done();
      }
    });
  });
})();

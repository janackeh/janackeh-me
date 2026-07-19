/* ============================================================
   janackeh.me — app.js
   theme toggle · sticky header · scroll reveal · footer year
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Theme toggle ---------- */
  var root = document.documentElement;
  var toggle = document.querySelector('[data-theme-toggle]');

  var sunSVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
  var moonSVG =
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  var stored = (function () {
    try {
      return false; // sandboxed iframes block localStorage; kept in-memory only
    } catch (e) {
      return false;
    }
  })();

  var initial =
    window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  root.setAttribute('data-theme', initial);
  setToggle(initial);

  function setToggle(theme) {
    if (!toggle) return;
    toggle.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' mode');
    toggle.innerHTML = theme === 'dark' ? sunSVG : moonSVG;
  }

  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      setToggle(next);
    });
  }

  /* ---------- Sticky header scroll state ---------- */
  var header = document.getElementById('header');
  var lastY = 0;
  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) {
      if (y > 8) {
        header.classList.add('header--scrolled');
      } else {
        header.classList.remove('header--scrolled');
      }
    }
    lastY = y;
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Scroll reveal (IntersectionObserver) ---------- */
  var reveals = document.querySelectorAll('.reveal');
  var prefersReduced =
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (prefersReduced || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) {
      el.classList.add('is-visible');
    });
  } else {
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' }
    );
    // small stagger for grouped elements
    reveals.forEach(function (el, i) {
      el.style.transitionDelay = Math.min((i % 4) * 70, 280) + 'ms';
      io.observe(el);
    });
  }

  /* ---------- Footer year ---------- */
  var yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
})();

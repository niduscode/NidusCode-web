/* Zenta · scripts compartidos */
(function () {
  // Nav: cambia a "scrolled" tras pasar 30px (a menos que sea always-scrolled)
  const nav = document.getElementById('nav');
  if (nav && !nav.classList.contains('always-scrolled')) {
    window.addEventListener('scroll', () => {
      nav.classList.toggle('scrolled', window.scrollY > 30);
    }, { passive: true });
  }

  // Menú mobile
  const toggle = document.getElementById('nav-toggle');
  const panel = document.getElementById('mobile-panel');
  const close = document.getElementById('mobile-close');
  if (toggle && panel && close) {
    toggle.addEventListener('click', () => panel.classList.add('open'));
    close.addEventListener('click', () => panel.classList.remove('open'));
    panel.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => panel.classList.remove('open'))
    );
  }

  // Reveal al entrar en viewport
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Counters (data-count)
  const counterIO = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      const target = parseInt(el.dataset.count, 10);
      const duration = 1600;
      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.floor(eased * target).toLocaleString('es-AR');
        if (p < 1) requestAnimationFrame(tick);
        else el.textContent = target.toLocaleString('es-AR');
      }
      requestAnimationFrame(tick);
      counterIO.unobserve(el);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]').forEach(el => counterIO.observe(el));

  // Smooth anchor con offset
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const y = target.getBoundingClientRect().top + window.scrollY - 70;
      window.scrollTo({ top: y, behavior: 'smooth' });
    });
  });

  // Año dinámico en footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
})();

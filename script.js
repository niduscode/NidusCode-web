/* ===== NidusCode — JS ===== */
(function () {
  'use strict';

  // Año actual en footer
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ===== Scroll progress bar =====
  const progressEl = document.getElementById('scrollProgress');
  const navbar = document.getElementById('navbar');

  const onScroll = () => {
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    const pct = docH > 0 ? (scrollTop / docH) * 100 : 0;
    if (progressEl) progressEl.style.width = pct + '%';
    if (navbar) {
      if (scrollTop > 12) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ===== Menú móvil =====
  const menuToggle = document.getElementById('menuToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  if (menuToggle && mobileMenu) {
    menuToggle.addEventListener('click', () => {
      const isOpen = !mobileMenu.classList.contains('hidden');
      mobileMenu.classList.toggle('hidden');
      menuToggle.setAttribute('aria-expanded', String(!isOpen));
    });
    mobileMenu.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
  }

  // ===== Reveal animations =====
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry, idx) => {
          if (entry.isIntersecting) {
            entry.target.style.transitionDelay = `${Math.min(idx * 70, 280)}ms`;
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  }

  // ===== Counter animado =====
  const counters = document.querySelectorAll('.counter');
  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const el = entry.target;
          const target = parseInt(el.dataset.target || '0', 10);
          const suffixEl = el.querySelector('span');
          const suffix = suffixEl ? suffixEl.outerHTML : '';
          const duration = 1600;
          const start = performance.now();

          const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            const eased = 1 - Math.pow(1 - progress, 3);
            const value = Math.floor(eased * target);
            el.innerHTML = value + suffix;
            if (progress < 1) requestAnimationFrame(tick);
            else el.innerHTML = target + suffix;
          };
          requestAnimationFrame(tick);
          counterObserver.unobserve(el);
        });
      },
      { threshold: 0.5 }
    );
    counters.forEach((c) => counterObserver.observe(c));
  }

  // ===== Smooth scroll =====
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      const offset = (navbar ? navbar.offsetHeight : 0) + 12;
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    });
  });

  // ===== Spotlight hover en tarjetas =====
  const spotlights = document.querySelectorAll('.spotlight-card');
  spotlights.forEach((card) => {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mx', x + 'px');
      card.style.setProperty('--my', y + 'px');
    });
  });

  // ===== FAQ accordion =====
  document.querySelectorAll('.faq-item').forEach((item) => {
    const btn = item.querySelector('.faq-question');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      // Cerrar todos los demás
      document.querySelectorAll('.faq-item.open').forEach((i) => {
        if (i !== item) i.classList.remove('open');
      });
      item.classList.toggle('open', !isOpen);
      btn.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  // ===== Lightbox / galería de portafolio =====
  const lightbox = document.getElementById('lightbox');
  if (lightbox) {
    const lbImg = lightbox.querySelector('.lb-img');
    const lbTitle = lightbox.querySelector('.lb-title');
    const lbCounter = lightbox.querySelector('.lb-counter');
    const lbClose = lightbox.querySelector('.lb-close');
    const lbPrev = lightbox.querySelector('.lb-prev');
    const lbNext = lightbox.querySelector('.lb-next');
    let gallery = [];
    let idx = 0;

    const show = (i) => {
      if (!gallery.length) return;
      idx = (i + gallery.length) % gallery.length;
      lbImg.src = gallery[idx];
      lbCounter.textContent = (idx + 1) + ' / ' + gallery.length;
    };
    const openLb = (images, title) => {
      gallery = images;
      lbTitle.textContent = title;
      lightbox.classList.toggle('single', gallery.length <= 1);
      show(0);
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const closeLb = () => {
      lightbox.classList.remove('open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };

    document.querySelectorAll('.portfolio-trigger').forEach((btn) => {
      btn.addEventListener('click', () => {
        const imgs = (btn.dataset.images || '').split('|').filter(Boolean);
        if (imgs.length) openLb(imgs, btn.dataset.title || '');
      });
    });
    lbClose.addEventListener('click', closeLb);
    lbPrev.addEventListener('click', (e) => { e.stopPropagation(); show(idx - 1); });
    lbNext.addEventListener('click', (e) => { e.stopPropagation(); show(idx + 1); });
    lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLb(); });
    document.addEventListener('keydown', (e) => {
      if (!lightbox.classList.contains('open')) return;
      if (e.key === 'Escape') closeLb();
      else if (e.key === 'ArrowLeft') show(idx - 1);
      else if (e.key === 'ArrowRight') show(idx + 1);
    });
  }

  // ===== Botón flotante WhatsApp =====
  const waFloat = document.getElementById('waFloat');
  const waToggle = document.getElementById('waToggle');
  if (waFloat && waToggle) {
    waToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = waFloat.classList.toggle('open');
      waToggle.setAttribute('aria-expanded', String(isOpen));
      waToggle.setAttribute('aria-label', isOpen ? 'Cerrar WhatsApp' : 'Contactar por WhatsApp');
    });
    // Cerrar al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!waFloat.contains(e.target)) {
        waFloat.classList.remove('open');
        waToggle.setAttribute('aria-expanded', 'false');
      }
    });
    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        waFloat.classList.remove('open');
        waToggle.setAttribute('aria-expanded', 'false');
      }
    });
    // Cerrar al elegir un contacto
    waFloat.querySelectorAll('.wa-option').forEach((opt) => {
      opt.addEventListener('click', () => waFloat.classList.remove('open'));
    });
  }

  // ===== Parallax sutil en aurora del hero =====
  const aurora = document.querySelector('.aurora');
  if (aurora && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let ticking = false;
    window.addEventListener(
      'scroll',
      () => {
        if (ticking) return;
        requestAnimationFrame(() => {
          const y = window.scrollY * 0.3;
          aurora.style.transform = `translateY(${y}px)`;
          ticking = false;
        });
        ticking = true;
      },
      { passive: true }
    );
  }
})();

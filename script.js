'use strict';

(() => {
  const root = document.documentElement;
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const mobileLayout = window.matchMedia('(max-width: 760px)');
  const menuButton = document.querySelector('.menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const header = document.querySelector('.site-header');
  const art = document.querySelector('.hero-art');
  const cards = [...document.querySelectorAll('.tilt-card')];
  const revealElements = [...document.querySelectorAll('.reveal')];
  const animatedElements = [...document.querySelectorAll('.hero-art, .ambient, .gradient-text, .project-card')];
  const pointerControllers = [];
  const visibleAnimationTargets = new Map();
  let revealObserver;

  // The header never slides away. Only switch its quiet reading surface at the top.
  if (header) {
    const syncHeader = () => header.classList.toggle('is-scrolled', (window.scrollY || 0) > 24);
    window.addEventListener('scroll', syncHeader, { passive: true });
    window.addEventListener('pageshow', syncHeader);
    syncHeader();
  }

  // Dark from the initial HTML paint, regardless of OS theme or legacy saved choices.
  root.dataset.theme = 'dark';

  const motionEnabled = () => !reducedMotion.matches;
  const pointerEnabled = () => motionEnabled() && finePointer.matches && !document.hidden;

  function closeMenu(returnFocus = false) {
    if (!menuButton || !mobileMenu) return;
    const wasOpen = menuButton.getAttribute('aria-expanded') === 'true';
    menuButton.setAttribute('aria-expanded', 'false');
    mobileMenu.hidden = true;
    if (returnFocus && wasOpen) menuButton.focus();
  }

  if (menuButton && mobileMenu) {
    closeMenu();
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      mobileMenu.hidden = !open;
    });
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => closeMenu());
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') closeMenu(true);
    });
    document.addEventListener('click', event => {
      if (event.target instanceof Element && !event.target.closest('.site-header')) closeMenu();
    });
    mobileLayout.addEventListener('change', () => closeMenu());
  }

  // Cards schedule one frame only when the pointer actually moves.
  // The logo below interpolates briefly, then stops when it reaches its target.
  function addPointerEffect(element, update, reset) {
    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;

    function stop() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      reset();
    }

    function render() {
      frame = 0;
      if (!pointerEnabled()) return stop();
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return stop();
      const x = Math.max(0, Math.min(1, (pointerX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (pointerY - bounds.top) / bounds.height));
      update(x, y);
    }

    element.addEventListener('pointermove', event => {
      if (!pointerEnabled() || event.pointerType === 'touch') return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(render);
    }, { passive: true });
    element.addEventListener('pointerleave', stop, { passive: true });
    element.addEventListener('pointercancel', stop, { passive: true });
    pointerControllers.push({ stop });
  }

  cards.forEach(card => {
    addPointerEffect(card, (x, y) => {
      card.style.setProperty('--rx', ((0.5 - y) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--ry', ((x - 0.5) * 10).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (x * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (y * 100).toFixed(1) + '%');
    }, () => {
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
      card.style.setProperty('--mx', '50%');
      card.style.setProperty('--my', '50%');
    });
  });

  if (art) {
    const neutral = { rotationY: 0, rotationX: 0, glowX: 50, glowY: 50 };
    const current = { ...neutral };
    const target = { ...neutral };
    let frame = 0;
    let previousTime = 0;

    function paint() {
      art.style.setProperty('--art-x', current.rotationY.toFixed(3) + 'deg');
      art.style.setProperty('--art-y', current.rotationX.toFixed(3) + 'deg');
      art.style.setProperty('--pointer-x', current.glowX.toFixed(2) + '%');
      art.style.setProperty('--pointer-y', current.glowY.toFixed(2) + '%');
    }

    function stop() {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      Object.assign(current, neutral);
      Object.assign(target, neutral);
      paint();
    }

    function render(time) {
      frame = 0;
      if (!pointerEnabled() || visibleAnimationTargets.get(art) === false) return stop();
      const elapsed = previousTime ? Math.max(0, Math.min(64, time - previousTime)) : 16.67;
      previousTime = time;
      const easing = 1 - Math.exp(-elapsed / 220);
      let settled = true;
      Object.keys(current).forEach(key => {
        const tolerance = key.startsWith('rotation') ? 0.012 : 0.08;
        current[key] += (target[key] - current[key]) * easing;
        if (Math.abs(target[key] - current[key]) > tolerance) settled = false;
        else current[key] = target[key];
      });
      paint();
      if (!settled) frame = window.requestAnimationFrame(render);
      else previousTime = 0;
    }

    function animateToTarget() {
      if (!frame) frame = window.requestAnimationFrame(render);
    }

    function followPointer(event) {
      if (!pointerEnabled() || event.pointerType === 'touch') return;
      const bounds = art.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
      const y = Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height));
      target.rotationY = (x - 0.5) * 8;
      target.rotationX = (0.5 - y) * 6;
      target.glowX = x * 100;
      target.glowY = y * 100;
      animateToTarget();
    }

    function returnToCenter() {
      Object.assign(target, neutral);
      if (pointerEnabled()) animateToTarget();
      else stop();
    }

    art.addEventListener('pointerenter', followPointer, { passive: true });
    art.addEventListener('pointermove', followPointer, { passive: true });
    art.addEventListener('pointerleave', returnToCenter, { passive: true });
    art.addEventListener('pointercancel', stop, { passive: true });
    pointerControllers.push({ stop });
  }

  function stopPointerEffects() {
    pointerControllers.forEach(controller => controller.stop());
  }

  function updateAnimationPauses() {
    animatedElements.forEach(element => {
      const visible = visibleAnimationTargets.get(element) !== false;
      element.classList.toggle('is-paused', !visible || !motionEnabled() || document.hidden);
    });
  }

  function showAllReveals() {
    root.classList.remove('motion-ready');
    revealElements.forEach(element => element.classList.add('is-visible'));
    if (revealObserver) revealObserver.disconnect();
  }

  function syncMotionPreference() {
    const enabled = motionEnabled();
    root.classList.toggle('motion-off', !enabled);
    if (!enabled) {
      stopPointerEffects();
      showAllReveals();
    }
    updateAnimationPauses();
  }

  if ('IntersectionObserver' in window) {
    try {
      const animationObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => visibleAnimationTargets.set(entry.target, entry.isIntersecting));
        updateAnimationPauses();
      });
      animatedElements.forEach(element => animationObserver.observe(element));

      if (motionEnabled()) {
        revealObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-visible');
            revealObserver.unobserve(entry.target);
          });
        }, { threshold: 0.08, rootMargin: '0px 0px -12px 0px' });
        // The observer is ready before CSS hides anything: no-JS remains readable.
        revealElements.forEach(element => revealObserver.observe(element));
        root.classList.add('motion-ready');
      } else {
        showAllReveals();
      }
    } catch {
      // Enhancement failure must never make navigation or content disappear.
      showAllReveals();
    }
  } else {
    showAllReveals();
  }

  reducedMotion.addEventListener('change', syncMotionPreference);
  finePointer.addEventListener('change', stopPointerEffects);
  window.addEventListener('blur', stopPointerEffects);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopPointerEffects();
    updateAnimationPauses();
  });
  syncMotionPreference();
})();

'use strict';

// Hero-only progressive enhancement. Content and links remain usable without JS.
(() => {
  const root = document.documentElement;
  const hero = document.querySelector('section.hero');
  if (!hero || !window.requestAnimationFrame || !window.matchMedia) return;

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  const desktop = window.matchMedia('(min-width: 1001px)');
  const controllers = [];
  let heroVisible = true;
  let observedVisibility = false;
  let windowFocused = true;
  let frame = 0;
  let previousTime = 0;
  let scrollDirty = true;
  let exitLimit = 0;
  let introStarted = false;
  let lastMotionOff = root.classList.contains('motion-off');

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const motionAllowed = () => !reducedMotion.matches &&
    !root.classList.contains('motion-off') && !document.hidden &&
    windowFocused && heroVisible;
  const pointerAllowed = () => motionAllowed() && desktop.matches && finePointer.matches;

  function updateExitLimit() {
    const styles = window.getComputedStyle(hero);
    const gutter = Math.min(parseFloat(styles.paddingLeft) || 0, parseFloat(styles.paddingRight) || 0);
    // Leave a safety gutter rather than translating full-width type into overflow.
    exitLimit = Math.min(18, Math.max(0, gutter - 8));
  }

  function resetScroll() {
    hero.style.setProperty('--hero-exit-x', '0px');
    hero.style.setProperty('--hero-exit-y', '0px');
    hero.style.setProperty('--hero-exit-scale', '1');
  }

  function paint(controller) {
    const values = controller.current;
    if (controller.kind === 'ink') {
      controller.surface.style.setProperty('--ink-x', values.x.toFixed(2) + '%');
      controller.surface.style.setProperty('--ink-y', values.y.toFixed(2) + '%');
      controller.surface.style.setProperty('--ink-active', values.active.toFixed(4));
    } else {
      controller.surface.style.setProperty('--magnet-x', values.x.toFixed(3) + 'px');
      controller.surface.style.setProperty('--magnet-y', values.y.toFixed(3) + 'px');
    }
  }

  function resetController(controller) {
    Object.assign(controller.current, controller.neutral);
    Object.assign(controller.target, controller.neutral);
    paint(controller);
  }

  function resetPointers() {
    controllers.forEach(resetController);
  }

  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
    resetScroll();
    resetPointers();
  }

  function schedule() {
    if (motionAllowed() && !frame) frame = window.requestAnimationFrame(render);
  }

  function updateScroll() {
    scrollDirty = false;
    if (!desktop.matches) return resetScroll();
    const bounds = hero.getBoundingClientRect();
    const progress = clamp(-bounds.top / Math.max(1, bounds.height * 0.75), 0, 1);
    hero.style.setProperty('--hero-exit-x', (exitLimit * progress).toFixed(3) + 'px');
    hero.style.setProperty('--hero-exit-y', (-14 * progress).toFixed(3) + 'px');
    hero.style.setProperty('--hero-exit-scale', (1 - 0.03 * progress).toFixed(5));
  }

  function render(time) {
    frame = 0;
    if (!motionAllowed()) return stop();
    const elapsed = previousTime ? clamp(time - previousTime, 0, 64) : 16.67;
    previousTime = time;
    if (scrollDirty) updateScroll();
    const easing = 1 - Math.exp(-elapsed / 140);
    let unsettled = false;

    controllers.forEach(controller => {
      if (!pointerAllowed()) return resetController(controller);
      let changed = false;
      Object.keys(controller.current).forEach(key => {
        const difference = controller.target[key] - controller.current[key];
        const tolerance = key === 'active' ? 0.002 : controller.kind === 'ink' ? 0.08 : 0.015;
        if (Math.abs(difference) <= tolerance) {
          if (difference !== 0) {
            controller.current[key] = controller.target[key];
            changed = true;
          }
        } else {
          controller.current[key] += difference * easing;
          changed = true;
          unsettled = true;
        }
      });
      if (changed) paint(controller);
    });

    if (unsettled) schedule();
    else previousTime = 0;
  }

  function keyboardFocused(element) {
    try {
      return element.matches(':focus-visible');
    } catch {
      return document.activeElement === element;
    }
  }

  function createPointerController(element, surface, kind) {
    const neutral = kind === 'ink' ? { x: 50, y: 50, active: 0 } : { x: 0, y: 0 };
    const controller = { element, surface, kind, neutral, current: { ...neutral }, target: { ...neutral } };
    controllers.push(controller);
    resetController(controller);

    function follow(event) {
      if (!pointerAllowed() || event.pointerType === 'touch' || keyboardFocused(element)) return;
      // Measure the unchanged interaction area, not the translated inner surface.
      const bounds = element.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      const x = clamp((event.clientX - bounds.left) / bounds.width, 0, 1);
      const y = clamp((event.clientY - bounds.top) / bounds.height, 0, 1);
      if (kind === 'ink') {
        controller.target.x = x * 100;
        controller.target.y = y * 100;
        controller.target.active = 1;
      } else {
        controller.target.x = (x - 0.5) * 8;
        controller.target.y = (y - 0.5) * 8;
      }
      schedule();
    }

    function leave() {
      Object.assign(controller.target, neutral);
      if (pointerAllowed()) schedule();
      else resetController(controller);
    }

    element.addEventListener('pointerenter', follow, { passive: true });
    element.addEventListener('pointermove', follow, { passive: true });
    element.addEventListener('pointerleave', leave, { passive: true });
    element.addEventListener('pointercancel', () => resetController(controller), { passive: true });
    element.addEventListener('focus', () => resetController(controller));
  }

  hero.querySelectorAll('.hero-ink').forEach(ink => createPointerController(ink, ink, 'ink'));
  hero.querySelectorAll('.hero-actions a.button').forEach(button => {
    const surface = button.querySelector('.button-surface');
    if (surface) createPointerController(button, surface, 'button');
  });

  function sync() {
    const enabled = motionAllowed();
    hero.classList.toggle('hero-motion-paused', !enabled);
    if (!enabled) {
      if (introStarted) hero.classList.add('hero-intro-complete');
      return stop();
    }
    if (root.classList.contains('hero-motion-ready') && !hero.classList.contains('hero-intro-complete')) {
      introStarted = true;
    }
    if (!pointerAllowed()) resetPointers();
    if (!desktop.matches) resetScroll();
    scrollDirty = true;
    schedule();
  }

  function scroll() {
    if (!observedVisibility) {
      const bounds = hero.getBoundingClientRect();
      const visible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      if (visible !== heroVisible) {
        heroVisible = visible;
        sync();
      }
    }
    if (!motionAllowed() || !desktop.matches) return;
    scrollDirty = true;
    schedule();
  }

  window.addEventListener('scroll', scroll, { passive: true });
  window.addEventListener('resize', () => {
    updateExitLimit();
    scroll();
    sync();
  }, { passive: true });
  window.addEventListener('blur', () => {
    windowFocused = false;
    sync();
  });
  window.addEventListener('focus', () => {
    windowFocused = true;
    sync();
  });
  document.addEventListener('visibilitychange', sync);
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab' || event.key === 'Escape') resetPointers();
  });
  const secondInk = hero.querySelector('.hero-line-two .hero-ink');
  if (secondInk) {
    secondInk.addEventListener('animationend', event => {
      // The final sheen ends after the type entrance; do not cut it short.
      if (event.target === secondInk && event.animationName === 'heroInkSatin') {
        hero.classList.add('hero-intro-complete');
      }
    });
  }
  [reducedMotion, finePointer, desktop].forEach(query => query.addEventListener('change', sync));

  const initialBounds = hero.getBoundingClientRect();
  heroVisible = initialBounds.bottom > 0 && initialBounds.top < window.innerHeight;
  if ('IntersectionObserver' in window) {
    try {
      const visibilityObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target !== hero) return;
          heroVisible = entry.isIntersecting;
          sync();
        });
      }, { threshold: 0 });
      visibilityObserver.observe(hero);
      observedVisibility = true;
    } catch {
      // Scroll-based visibility is the fallback when observer setup fails.
    }
  }

  if ('MutationObserver' in window) {
    const preferenceObserver = new MutationObserver(() => {
      const motionOff = root.classList.contains('motion-off');
      if (motionOff === lastMotionOff) return;
      lastMotionOff = motionOff;
      sync();
    });
    preferenceObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  updateExitLimit();
  sync();
  // CSS entrance effects are enabled only after all safe resets are installed.
  root.classList.add('hero-motion-ready');
  introStarted = motionAllowed();
})();

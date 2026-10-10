'use strict';

// Four scenes, one native scroll area. Never intercept wheel, touch or keyboard scrolling.
(() => {
  const root = document.documentElement;
  const journey = document.querySelector('.hero-journey');
  const hero = journey && journey.querySelector('section.hero');
  if (!journey || !hero || !window.requestAnimationFrame || !window.matchMedia) return;

  const panels = Array.from(journey.querySelectorAll('.journey-panel'));
  const steps = Array.from(journey.querySelectorAll('[data-journey-step]'));
  const art = hero.querySelector('.hero-art');
  const stage = hero.querySelector('.hero-stage');
  const toggle = journey.querySelector('[data-journey-toggle]');
  const sharedToggle = document.querySelector('#motion-toggle');
  if (panels.length !== 4 || !art || !stage) return;

  const desktop = window.matchMedia('(min-width: 1001px) and (min-height: 600px)');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const ease = value => value * value * (3 - 2 * value);
  const START = 0.08;
  const SPAN = 0.78;
  // Use the existing end-of-story band, not another screen of pinned scrolling.
  const FINALE_START = START + SPAN;
  const FINALE_END = 0.98;
  let ready = false;
  let worldFailed = false;
  let visible = true;
  let observedVisibility = false;
  let lastMotionOff = root.classList.contains('motion-off');
  let frame = 0;
  let previousTime = 0;
  let layoutDirty = true;
  let scrollDirty = true;
  let progress = 0;
  let target = 0;
  let currentScene = -1;
  let currentObscured = false;
  let travel = 0;
  let finaleGeometry = { x: 0, y: 0, scale: 1, worldX: 0 };
  let geometry = { top: 0, height: 0, range: 0 };

  const scrollY = () => window.scrollY || window.pageYOffset || 0;
  // Window focus must not block a native scroll interaction. Document visibility
  // only suspends interpolation; explicit hidden scroll can still paint without RAF.
  const awake = () => !document.hidden;
  const animate = () => ready && awake() && visible;

  function stop() {
    if (frame) window.cancelAnimationFrame(frame);
    frame = 0;
    previousTime = 0;
  }

  function schedule() {
    if (animate() && !frame) frame = window.requestAnimationFrame(render);
  }

  function sceneMetadata(scene, obscured = false) {
    if (currentScene === scene && currentObscured === obscured) return;
    currentScene = scene;
    currentObscured = obscured;
    root.dataset.journeyScene = String(scene);
    panels.forEach((panel, index) => {
      const exposed = index === scene && !obscured;
      panel.classList.toggle('is-current', exposed);
      panel.inert = ready && !exposed;
      if (ready && !exposed) panel.setAttribute('aria-hidden', 'true');
      else panel.removeAttribute('aria-hidden');
    });
    steps.forEach(step => {
      if (Number(step.dataset.journeyStep) === scene) step.setAttribute('aria-current', 'step');
      else step.removeAttribute('aria-current');
    });
  }

  function paint() {
    const phase = clamp((progress - START) / SPAN, 0, 1) * 3;
    const lower = Math.min(2, Math.floor(phase));
    const blend = ease(clamp(phase - lower, 0, 1));
    const positions = [0, -travel, -travel * 0.42, 0];
    const angles = [0, -3, 2, 0];
    const x = positions[lower] + (positions[lower + 1] - positions[lower]) * blend;
    const turn = angles[lower] + (angles[lower + 1] - angles[lower]) * blend;
    const finale = ease(clamp((progress - FINALE_START) / (FINALE_END - FINALE_START), 0, 1));

    hero.style.setProperty('--journey-logo-x', (x + (finaleGeometry.x - x) * finale).toFixed(3) + 'px');
    hero.style.setProperty('--journey-logo-y', (finaleGeometry.y * finale).toFixed(3) + 'px');
    hero.style.setProperty('--journey-logo-scale', (1 + (finaleGeometry.scale - 1) * finale).toFixed(5));
    hero.style.setProperty('--journey-logo-turn', (turn * (1 - finale)).toFixed(3) + 'deg');
    hero.style.setProperty('--journey-finale', finale.toFixed(5));
    hero.style.setProperty('--journey-world-opacity', (1 - finale).toFixed(5));
    hero.style.setProperty('--journey-world-x', (finaleGeometry.worldX * finale).toFixed(3) + 'px');
    hero.style.setProperty('--journey-progress', progress.toFixed(5));
    if (window.nidusWorld) window.nidusWorld.setProgress(clamp((progress - START) / SPAN, 0, 1));
    const scene = Math.round(phase);
    panels.forEach((panel, index) => {
      // A stationary scroll position always has one complete, readable heading.
      // CSS handles the short entrance/exit, rather than tying legibility to wheel speed.
      const weight = index === scene ? 1 : 0;
      panel.style.setProperty('--scene-opacity', (weight * (index === 3 ? 1 - finale : 1)).toFixed(5));
      panel.style.setProperty('--scene-y', (index === scene ? -18 * finale : index < scene ? -42 : 42) + 'px');
      panel.style.setProperty('--scene-scale', (0.98 + weight * 0.02).toFixed(5));
      const distance = clamp(phase - index, -1, 1);
      panel.style.setProperty('--scene-distance', distance.toFixed(5));
      panel.style.setProperty('--scene-activity', (1 - Math.abs(distance)).toFixed(5));
    });
    sceneMetadata(scene, finale >= 0.99999);
  }

  function reset() {
    stop();
    if (window.nidusWorld) window.nidusWorld.setEnabled(false);
    root.classList.remove('journey-starting');
    progress = 0;
    target = 0;
    hero.style.setProperty('--journey-logo-x', '0px');
    hero.style.setProperty('--journey-logo-y', '0px');
    hero.style.setProperty('--journey-logo-scale', '1');
    hero.style.setProperty('--journey-logo-turn', '0deg');
    hero.style.setProperty('--journey-finale', '0');
    hero.style.setProperty('--journey-world-opacity', '1');
    hero.style.setProperty('--journey-world-x', '0px');
    hero.style.setProperty('--journey-progress', '0');
    panels.forEach(panel => {
      panel.inert = false;
      panel.removeAttribute('aria-hidden');
      panel.style.setProperty('--scene-opacity', '1');
      panel.style.setProperty('--scene-y', '0px');
      panel.style.setProperty('--scene-scale', '1');
      panel.style.setProperty('--scene-distance', '0');
      panel.style.setProperty('--scene-activity', '1');
    });
    sceneMetadata(0);
  }

  function measure(explicitInteraction = false) {
    if (!awake() && !explicitInteraction) return;
    const bounds = journey.getBoundingClientRect();
    const padding = window.getComputedStyle(hero);
    const stagePadding = window.getComputedStyle(stage);
    const leftPadding = parseFloat(padding.paddingLeft) || 0;
    const stageLeft = parseFloat(stagePadding.paddingLeft) || 0;
    const stageRight = parseFloat(stagePadding.paddingRight) || 0;
    let flowLeft = 0;
    let flowTop = 0;
    let node = art;
    let reachedHero = false;
    for (let depth = 0; node && depth < 8; depth++) {
      if (node === hero) {
        reachedHero = true;
        break;
      }
      flowLeft += node.offsetLeft || 0;
      flowTop += node.offsetTop || 0;
      node = node.offsetParent;
    }
    // offsetLeft is unaffected by our transform; the fallback is the dedicated flex band.
    const available = Math.max(0, stage.clientWidth - stageLeft - stageRight - art.offsetWidth - 24);
    travel = reachedHero ? Math.max(0, Math.min(available, flowLeft - leftPadding - 24)) : available;
    // Measure untransformed flow once per layout, so reversing the finale has no drift.
    const artHeight = art.offsetHeight || hero.offsetHeight * 0.21;
    // Use the base framing, not the finale's expanded absolute symbol box.
    // Reading the expanded box here would shrink the target after a resize.
    const symbolHeight = artHeight * 0.92;
    const headerHeight = document.querySelector('.site-header')?.offsetHeight || 86;
    finaleGeometry = {
      x: hero.clientWidth / 2 - flowLeft - art.offsetWidth / 2,
      y: (hero.offsetHeight + headerHeight) / 2 - flowTop - artHeight / 2,
      scale: clamp(Math.min(hero.offsetHeight * 0.52, hero.clientWidth * 0.38) / Math.max(1, symbolHeight), 1, 4),
      worldX: -hero.clientWidth * 0.22
    };
    geometry = {
      top: bounds.top + scrollY(),
      height: bounds.height,
      range: Math.max(1, bounds.height - hero.offsetHeight)
    };
    layoutDirty = false;
  }

  function updateProgress(explicitInteraction = false) {
    if (!ready || (!animate() && !explicitInteraction)) return;
    if (layoutDirty) measure(explicitInteraction);
    // The wrapper has no transforms. Only this native position is read on scroll.
    const bounds = journey.getBoundingClientRect();
    geometry.top = bounds.top + scrollY();
    target = clamp(-bounds.top / geometry.range, 0, 1);
    scrollDirty = false;
  }

  function render(time) {
    frame = 0;
    if (!animate()) return stop();
    if (scrollDirty || layoutDirty) updateProgress();
    const elapsed = previousTime ? clamp(time - previousTime, 0, 64) : 16.67;
    previousTime = time;
    const difference = target - progress;
    if (Math.abs(difference) < 0.0002) progress = target;
    else progress += difference * (1 - Math.exp(-elapsed / 160));
    paint();
    commitStarting();
    if (progress !== target) schedule();
    else previousTime = 0;
  }

  function syncToggle() {
    if (!toggle) return;
    const paused = reduced.matches || root.classList.contains('motion-off');
    toggle.disabled = reduced.matches || !sharedToggle;
    toggle.textContent = reduced.matches ? 'Movimiento reducido' : paused ? 'Reanudar movimiento' : 'Pausar movimiento';
    toggle.setAttribute('aria-pressed', String(paused));
  }

  function commitStarting() {
    if (!root.classList.contains('journey-starting')) return;
    // Initialization must not wait for RAF/visibility: Safari may report a visible
    // preview as hidden. A single style commit prevents four fallback headings overlapping.
    void window.getComputedStyle(panels[0]).opacity;
    root.classList.remove('journey-starting');
  }

  function preservePosition(before, wasReady, nextReady) {
    if (!before || wasReady === nextReady || !awake()) return;
    const after = journey.getBoundingClientRect();
    const delta = after.height - before.height;
    // The browser may already clamp or anchor scroll while computing the new layout.
    // Calculate from the captured old position, not that partially-adjusted position.
    let nextY = before.scrollY;
    if (before.bottom <= 0) {
      // Keep the section being read below the hero at the same viewport position.
      nextY += delta;
    } else if (wasReady && !nextReady && before.top < 0 && delta < 0) {
      // Removing sticky space must not throw a reader into unrelated lower sections.
      nextY -= Math.min(-before.top, -delta);
    }
    if (Math.abs(nextY - scrollY()) > 0.5) {
      window.scrollTo({ top: Math.max(0, nextY), behavior: 'instant' });
    }
  }

  function syncMode() {
    const nextReady = desktop.matches && !reduced.matches && !root.classList.contains('motion-off') && !worldFailed;
    const wasReady = ready;
    let before = null;
    if (awake() && wasReady !== nextReady) {
      const previousScrollY = scrollY();
      const bounds = journey.getBoundingClientRect();
      // DOMRect exposes inherited getters, not enumerable own fields.
      before = { top: bounds.top, bottom: bounds.bottom, height: bounds.height, scrollY: previousScrollY };
    }
    ready = nextReady;
    if (!wasReady && ready) {
      currentScene = -1;
      root.classList.add('journey-starting');
      // Install one readable scene BEFORE enabling the overlay/sticky layout.
      // paint only writes style variables; it does not measure the hidden document.
      paint();
    }
    root.classList.toggle('journey-supported', desktop.matches);
    root.classList.toggle('journey-ready', ready);
    if (window.nidusWorld) window.nidusWorld.setEnabled(ready);
    syncToggle();
    preservePosition(before, wasReady, ready);
    layoutDirty = true;
    scrollDirty = true;
    if (!ready) return reset();
    if (!awake()) {
      commitStarting();
      return stop();
    }
    measure();
    if (!observedVisibility) {
      visible = scrollY() + window.innerHeight > geometry.top && scrollY() < geometry.top + geometry.height;
    }
    if (visible) {
      updateProgress();
      // Mode changes and returning to an already-scrolled page paint immediately.
      progress = target;
      paint();
      commitStarting();
      schedule();
    } else {
      commitStarting();
      stop();
    }
  }

  function onScroll() {
    if (!ready) return;
    if (!awake()) {
      // Native scroll is explicit work, even if a browser reports this preview hidden.
      // Paint its final position synchronously, without scheduling background animation.
      stop();
      // Hidden Safari transitions can retain the previous computed opacity indefinitely.
      // Disable them for this explicit commit, also cancelling any pending old transition.
      root.classList.add('journey-starting');
      updateProgress(true);
      progress = target;
      paint();
      commitStarting();
      return;
    }
    if (!observedVisibility) {
      visible = scrollY() + window.innerHeight > geometry.top && scrollY() < geometry.top + geometry.height;
    }
    if (!visible) return stop();
    scrollDirty = true;
    schedule();
  }

  steps.forEach(step => step.addEventListener('click', () => {
    if (!ready) return;
    const index = Number(step.dataset.journeyStep);
    if (!Number.isInteger(index) || index < 0 || index > 3) return;
    measure(true);
    const sceneProgress = index === 0 ? 0 : START + SPAN * index / 3;
    window.scrollTo({ top: geometry.top + geometry.range * sceneProgress, behavior: awake() ? 'smooth' : 'instant' });
    if (!awake()) onScroll();
  }));
  if (toggle && sharedToggle) toggle.addEventListener('click', () => {
    if (!reduced.matches) sharedToggle.click();
  });

  window.addEventListener('scroll', onScroll, { passive: true });
  journey.addEventListener('nidus:world-unavailable', () => {
    worldFailed = true;
    syncMode(); // Missing/unsupported media must never leave an empty pinned scroll.
  });
  window.addEventListener('resize', syncMode, { passive: true });
  window.addEventListener('blur', stop);
  window.addEventListener('focus', syncMode);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else syncMode();
  });
  [desktop, reduced].forEach(query => query.addEventListener('change', syncMode));

  if ('IntersectionObserver' in window) {
    try {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.target !== journey) return;
          visible = entry.isIntersecting;
          if (window.nidusWorld) window.nidusWorld.setActive(visible);
          if (!visible) return stop();
          scrollDirty = true;
          schedule();
        });
      }, { threshold: 0 });
      observer.observe(journey);
      observedVisibility = true;
    } catch {
      // Cached document geometry provides a no-layout-read scroll fallback.
    }
  }
  if ('MutationObserver' in window) {
    const preferenceObserver = new MutationObserver(() => {
      const motionOff = root.classList.contains('motion-off');
      if (motionOff === lastMotionOff) return;
      lastMotionOff = motionOff;
      syncMode();
    });
    preferenceObserver.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  syncMode();
})();

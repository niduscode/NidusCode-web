/* Scroll-scrub playback adapted from oso95/scroll-world (MIT).
 * Original: vendor/scroll-world-upstream.js, license: vendor/scroll-world-LICENSE.
 * Nidus adaptation: bounded hero, one continuous local take, demand-driven seeks,
 * cancellable loads, revocable blobs, real frame/poster handoff and teardown.
 */
'use strict';

function mountNidusScrollWorld(host, options = {}) {
  const env = options.env || window;
  const doc = host.ownerDocument || document;
  const root = doc.documentElement;
  const clamp = n => Math.max(0, Math.min(1, Number(n) || 0));
  const poster = host.querySelector('img');
  const video = host.querySelector('video');
  if (!poster || !video) return null;
  const base = options.base || 'assets/world/';
  let enabled = false, active = true, destroyed = false, target = 0;
  let theme = '', blobURL = '', load = null, revision = 0, attempts = 0;
  let revealFrame = 0, paintFrame = 0, priming = false;

  function cancelReveal() {
    if (revealFrame) env.cancelAnimationFrame(revealFrame);
    if (paintFrame && video.cancelVideoFrameCallback) video.cancelVideoFrameCallback(paintFrame);
    revealFrame = paintFrame = 0;
  }
  function release() {
    revision++;
    load?.abort(); load = null;
    cancelReveal();
    video.pause(); video.removeAttribute('src'); video.load();
    if (blobURL) env.URL.revokeObjectURL(blobURL);
    blobURL = ''; priming = false;
    host.classList.remove('has-world-frame');
    host.dataset.state = 'poster';
  }
  function reveal() {
    if (!enabled || !active || doc.hidden || video.readyState < 2) return;
    host.classList.add('has-world-frame');
    host.dataset.state = 'ready';
  }
  function painted() {
    cancelReveal();
    // rVFC is tied to decoded frames, not metadata. A bounded two-frame fallback
    // also supports paused-seek Safari versions that do not deliver that callback.
    if (video.requestVideoFrameCallback) {
      paintFrame = video.requestVideoFrameCallback(() => { paintFrame = 0; reveal(); });
    }
    if (!doc.hidden) revealFrame = env.requestAnimationFrame(() => {
      revealFrame = env.requestAnimationFrame(() => { revealFrame = 0; reveal(); });
    });
  }
  function seek() {
    if (!enabled || !active || destroyed || doc.hidden || priming || video.seeking || video.readyState < 1) return;
    const duration = Number(video.duration);
    if (!Number.isFinite(duration) || duration <= 0) return;
    const time = Math.min(target * duration, Math.max(0, duration - 1 / 24));
    // No forever-RAF. The latest scroll target is sent as soon as the decoder is free.
    if (Math.abs(video.currentTime - time) > 1 / 48) {
      try { video.currentTime = time; } catch { /* poster remains visible */ }
    } else if (video.readyState >= 2 && !host.classList.contains('has-world-frame')) painted();
  }
  function onSeeked() { painted(); seek(); }
  function onData() { seek(); painted(); }
  function unavailable() {
    host.dataset.state = 'fallback';
    if (enabled && env.CustomEvent && host.dispatchEvent) {
      host.dispatchEvent(new env.CustomEvent('nidus:world-unavailable', { bubbles: true }));
    }
  }
  function onError() { if (enabled) { release(); unavailable(); } }
  async function loadTheme() {
    if (!enabled || !active || destroyed || doc.hidden || load || blobURL || attempts >= 2) return;
    const token = revision;
    load = new env.AbortController(); attempts++;
    host.dataset.state = 'loading';
    try {
      const response = await env.fetch(`${base}world-${theme}.mp4`, { signal: load.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      if (token !== revision || destroyed || !enabled) return;
      blobURL = env.URL.createObjectURL(blob);
      video.src = blobURL; video.load();
    } catch (error) {
      if (token === revision && error.name !== 'AbortError') unavailable();
    } finally { if (token === revision) load = null; }
  }
  function syncTheme() {
    const next = root.dataset.theme === 'dark' ? 'dark' : 'light';
    if (next !== theme) {
      release(); theme = next; attempts = 0;
    }
    if (enabled && active) {
      const source = `${base}world-${theme}-poster.png`;
      if (poster.getAttribute('src') !== source) poster.src = source;
      loadTheme();
    }
  }
  function setEnabled(next) {
    const changed = enabled !== Boolean(next);
    enabled = Boolean(next);
    host.hidden = !enabled;
    if (changed && !enabled) release();
    if (changed && enabled) attempts = 0;
    if (enabled) { syncTheme(); seek(); }
  }
  function setActive(next) {
    active = Boolean(next);
    if (!active) { video.pause(); cancelReveal(); }
    else if (enabled) { loadTheme(); seek(); }
  }
  function setProgress(value) { target = clamp(value); if (enabled) { loadTheme(); seek(); } }
  function prime() {
    if (!enabled || !active || priming || video.readyState < 1 || doc.hidden) return;
    priming = true;
    try {
      const promise = video.play();
      Promise.resolve(promise).then(() => { video.pause(); priming = false; seek(); painted(); })
        .catch(() => { priming = false; seek(); });
    } catch { priming = false; seek(); }
  }
  function onVisibility() { if (doc.hidden) { video.pause(); cancelReveal(); } else { syncTheme(); seek(); } }
  function destroy() {
    if (destroyed) return;
    destroyed = true; enabled = false; release();
    observer?.disconnect();
    video.removeEventListener('loadedmetadata', seek);
    video.removeEventListener('loadeddata', onData);
    video.removeEventListener('seeked', onSeeked);
    video.removeEventListener('error', onError);
    doc.removeEventListener('visibilitychange', onVisibility);
    env.removeEventListener('pointerdown', prime);
    env.removeEventListener('pageshow', onVisibility);
    env.removeEventListener('pagehide', onPageHide);
  }
  function onPageHide(event) { if (!event.persisted) destroy(); else { video.pause(); cancelReveal(); } }
  video.muted = true; video.playsInline = true;
  video.addEventListener('loadedmetadata', seek);
  video.addEventListener('loadeddata', onData);
  video.addEventListener('seeked', onSeeked);
  video.addEventListener('error', onError);
  doc.addEventListener('visibilitychange', onVisibility);
  env.addEventListener('pointerdown', prime, { passive: true });
  env.addEventListener('pageshow', onVisibility);
  env.addEventListener('pagehide', onPageHide);
  let observer = null;
  if (env.MutationObserver) {
    observer = new env.MutationObserver(syncTheme);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }
  syncTheme();
  return { setProgress, setEnabled, setActive, destroy };
}

if (typeof module !== 'undefined' && module.exports) module.exports = { mountNidusScrollWorld };
if (typeof window !== 'undefined') {
  const host = document.querySelector('.journey-world');
  if (host) window.nidusWorld = mountNidusScrollWorld(host);
}

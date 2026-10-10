'use strict';
// Run against the local server. Uses a separate, headless browser profile.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NIDUS_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NIDUS_QA_URL || 'http://127.0.0.1:8800/?v=8.3';
const output = path.resolve(__dirname, '../screenshots');

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    console.log('BOOT', await page.evaluate(() => ({ classes: document.documentElement.className,
      state: document.querySelector('.journey-world').dataset.state,
      hidden: document.hidden, viewport: [innerWidth, innerHeight],
      video: { src: document.querySelector('video').src, state: document.querySelector('video').readyState,
        error: document.querySelector('video').error?.message }, world: Boolean(window.nidusWorld) })), errors);
    await page.waitForFunction(() => document.querySelector('.journey-world').dataset.state === 'ready');

    const at = async progress => {
      await page.evaluate(value => {
        const box = document.querySelector('.hero-journey');
        const hero = box.querySelector('.hero');
        window.scrollTo({ top: box.getBoundingClientRect().top + window.scrollY +
          (box.offsetHeight - hero.offsetHeight) * value, behavior: 'instant' });
      }, progress);
      await page.waitForFunction(value => Math.abs(parseFloat(document.querySelector('.hero').style.getPropertyValue('--journey-progress')) - value) < 0.001, progress);
      // Let the existing short heading transitions and decoder settle for screenshots.
      await page.waitForTimeout(500);
      return page.evaluate(() => {
        const hero = document.querySelector('.hero');
        const art = document.querySelector('.hero-art').getBoundingClientRect();
        const logo = document.querySelector('.monogram-wrap').getBoundingClientRect();
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const world = document.querySelector('.journey-world');
        const video = world.querySelector('video');
        const number = name => parseFloat(hero.style.getPropertyValue(name));
        return { finale: number('--journey-finale'), scale: number('--journey-logo-scale'),
          x: number('--journey-logo-x'), y: number('--journey-logo-y'),
          copyOpacity: +getComputedStyle(document.querySelector('[data-scene="3"]')).opacity,
          worldOpacity: +getComputedStyle(world).opacity,
          worldTransform: getComputedStyle(world).transform,
          artCenter: { x: art.x + art.width / 2, y: art.y + art.height / 2 },
          logo: { top: logo.top, bottom: logo.bottom, height: logo.height },
          header: { top: header.top, bottom: header.bottom },
          time: video.currentTime, seekable: video.seekable.length ? video.seekable.end(0) : 0,
          overflow: document.documentElement.scrollWidth > innerWidth,
          viewport: { width: innerWidth, height: innerHeight } };
      });
    };
    const intro = await at(0);
    await page.screenshot({ path: path.join(output, 'v8.3-inicio-claro.png') });
    const optimize = await at(0.86);
    const middle = await at(0.92);
    await page.screenshot({ path: path.join(output, 'v8.3-cierre-mitad.png') });
    const finale = await at(0.99);
    await page.screenshot({ path: path.join(output, 'v8.3-cierre-claro.png') });
    assert.equal(finale.finale, 1);
    assert.equal(finale.copyOpacity, 0);
    assert.equal(finale.worldOpacity, 0);
    assert.ok(finale.scale > 2);
    assert.ok(Math.abs(finale.artCenter.x - 720) < 2, 'Logo centered horizontally');
    assert.ok(Math.abs(finale.artCenter.y - (900 + finale.header.bottom) / 2) < 2, 'Logo centered below fixed header');
    assert.ok(finale.logo.top > finale.header.bottom && finale.logo.bottom < 900, 'Logo clears header and viewport');
    assert.ok(middle.copyOpacity > 0.4 && middle.copyOpacity < 0.6);
    assert.ok(middle.worldOpacity > 0.4 && middle.worldOpacity < 0.6);
    assert.ok(optimize.seekable > 0 && optimize.time > intro.time + 8, 'Actual video seeks with scroll');
    const reverse = await at(0.86);
    assert.ok(reverse.copyOpacity > 0.999);
    assert.ok(Math.abs(reverse.scale - 1) < 0.001);
    assert.ok(reverse.worldOpacity > 0.999);

    await page.locator('#theme-toggle').click();
    await at(0.99);
    await page.screenshot({ path: path.join(output, 'v8.3-cierre-oscuro.png') });
    await page.locator('.desktop-nav a[href="#servicios"]').click();
    await page.waitForTimeout(1000);
    const nav = await page.evaluate(() => {
      const header = document.querySelector('.site-header').getBoundingClientRect();
      const target = document.querySelector('#servicios').getBoundingClientRect();
      return { headerTop: header.top, headerBottom: header.bottom, targetTop: target.top,
        fixed: getComputedStyle(document.querySelector('.site-header')).position,
        hit: document.elementFromPoint(200, 30)?.closest('.site-header') !== null };
    });
    assert.equal(nav.fixed, 'fixed');
    assert.equal(nav.headerTop, 0);
    assert.ok(nav.targetTop >= nav.headerBottom && nav.targetTop < nav.headerBottom + 40, 'Anchor clears fixed menu');
    assert.equal(nav.hit, true);
    await page.screenshot({ path: path.join(output, 'v8.3-menu-servicios.png') });

    const compactResults = [];
    for (const viewport of [{ width: 1001, height: 600 }, { width: 860, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      await page.setViewportSize(viewport);
      await page.goto(base, { waitUntil: 'networkidle' });
      if (viewport.width > 1000) {
        await at(0.99);
        await page.screenshot({ path: path.join(output, 'v8.3-cierre-compacto.png') });
      }
      const state = await page.evaluate(() => {
        const header = document.querySelector('.site-header').getBoundingClientRect();
        const video = document.querySelector('.journey-world video');
        const poster = document.querySelector('.journey-world img');
        return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
          ready: document.documentElement.classList.contains('journey-ready'),
          video: video.getAttribute('src'), poster: poster.getAttribute('src'),
          headerTop: header.top, fixed: getComputedStyle(document.querySelector('.site-header')).position };
      });
      assert.equal(state.overflow, false);
      assert.equal(state.fixed, 'fixed');
      if (viewport.width < 1001) {
        assert.equal(state.ready, false);
        assert.equal(state.video, null);
        assert.equal(state.poster, null);
      }
      if (viewport.width <= 760) {
        await page.locator('.menu-toggle').click();
        await page.locator('#mobile-menu a[href="#faq"]').click();
        await page.waitForTimeout(900);
        assert.ok(await page.locator('#mobile-menu').isHidden());
        assert.ok(await page.locator('.menu-toggle').isVisible());
        const clear = await page.evaluate(() => document.querySelector('#faq').getBoundingClientRect().top >= document.querySelector('.site-header').getBoundingClientRect().bottom - 1);
        assert.ok(clear, 'Mobile anchor clears fixed navigation');
      } else {
        assert.ok(await page.locator('.desktop-nav a[href="#faq"]').isVisible(), 'FAQ stays accessible at tablet widths too');
      }
      compactResults.push(state);
    }

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(await page.evaluate(() => document.documentElement.classList.contains('journey-ready')), false);
    assert.equal(await page.locator('.journey-world video').getAttribute('src'), null);
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ pass: true, intro, optimize, middle, finale, reverse, nav, compactResults, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

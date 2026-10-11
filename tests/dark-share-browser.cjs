'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NIDUS_PLAYWRIGHT_MODULE || 'playwright');
const base = process.env.NIDUS_QA_URL || 'http://127.0.0.1:8800/';
const imageURL = 'https://nidus-code-web.vercel.app/assets/og-niduscode-dark-logo-20261010.jpg';
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  const variants = [];
  try {
    for (const variant of [
      { colorScheme: 'light', saved: 'light', viewport: { width: 1440, height: 900 } },
      { colorScheme: 'dark', saved: 'dark', viewport: { width: 1440, height: 900 } },
      { colorScheme: 'light', saved: 'light', viewport: { width: 390, height: 844 } },
      { colorScheme: 'light', javaScriptEnabled: false, viewport: { width: 390, height: 844 } }
    ]) {
      const context = await browser.newContext({ colorScheme: variant.colorScheme, viewport: variant.viewport, javaScriptEnabled: variant.javaScriptEnabled !== false });
      await context.route('**/*.supabase.co/**', route => route.abort());
      await context.route('**/_vercel/insights/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
      if (variant.saved) await context.addInitScript(saved => localStorage.setItem('nidus-preview-theme', saved), variant.saved);
      const page = await context.newPage();
      const lightMedia = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (/world-light/.test(request.url())) lightMedia.push(request.url()); });
      await page.goto(base, { waitUntil: 'networkidle' });
      assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      assert.equal(await page.locator('#theme-toggle').count(), 0);
      assert.equal(await page.locator('#motion-toggle').count(), 0);
      assert.equal(await page.locator('[data-journey-toggle]').count(), 0);
      assert.equal(await page.getByRole('button', { name: /pausar|reanudar|reactivar/i }).count(), 0);
      assert.equal(await page.locator('footer button').count(), 0);
      const palette = await page.evaluate(() => ({
        scheme: getComputedStyle(document.documentElement).colorScheme,
        background: getComputedStyle(document.body).backgroundColor,
        overflow: document.documentElement.scrollWidth > innerWidth,
        title: document.querySelector('meta[property="og:title"]').content,
        image: document.querySelector('meta[property="og:image"]').content,
        imageType: document.querySelector('meta[property="og:image:type"]').content,
        imageAlt: document.querySelector('meta[property="og:image:alt"]').content,
        twitter: document.querySelector('meta[name="twitter:image"]').content,
        schemaImage: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent).image
      }));
      assert.equal(palette.scheme, 'dark');
      assert.equal(palette.background, 'rgb(16, 14, 24)');
      assert.equal(palette.overflow, false);
      assert.equal(palette.title, 'NidusCode — Gasta menos. Vende más.');
      assert.equal(palette.image, imageURL);
      assert.equal(palette.twitter, imageURL);
      assert.equal(palette.schemaImage, imageURL);
      assert.equal(palette.imageType, 'image/jpeg');
      assert.ok(palette.imageAlt.length > 20);
      assert.deepEqual(lightMedia, []);
      if (variant.javaScriptEnabled !== false) {
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.emulateMedia({ colorScheme: 'light' });
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
      }
      if (variant.viewport.width === 1440 && variant.saved === 'light') {
        await page.waitForFunction(() => document.documentElement.classList.contains('journey-ready'));
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.documentElement.classList.contains('motion-off'));
        assert.equal(await page.evaluate(() => document.documentElement.classList.contains('journey-ready')), false);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForFunction(() => document.documentElement.classList.contains('journey-ready'));
        await page.screenshot({ path: path.resolve(__dirname, '../screenshots/dark-only-desktop.png') });
        const asset = await context.request.get(new URL(new URL(imageURL).pathname, base).href);
        assert.equal(asset.status(), 200);
        const bytes = await asset.body();
        assert.equal(bytes.subarray(0, 3).toString('hex'), 'ffd8ff');
        assert.ok(bytes.length < 300000, 'Share image stays lightweight');
        const dimensions = await page.evaluate(url => new Promise((resolve, reject) => {
          const image = new Image(); image.onload = () => resolve([image.naturalWidth, image.naturalHeight]); image.onerror = reject; image.src = url;
        }), new URL(new URL(imageURL).pathname, base).href);
        assert.deepEqual(dimensions, [1200, 630]);
        for (const agent of ['facebookexternalhit/1.1', 'WhatsApp/2.0']) {
          const crawl = await context.request.get(base, { headers: { 'user-agent': agent } });
          assert.equal(crawl.status(), 200);
          const html = await crawl.text();
          assert.ok(html.includes(imageURL));
          assert.ok(!html.includes('og-image-chile.jpg'));
          assert.ok(html.includes('NidusCode — Gasta menos. Vende más.'));
        }
      }
      variants.push({ ...variant, ...palette });
      if (variant.javaScriptEnabled === false) {
        await page.goto(new URL('404.html', base).href, { waitUntil: 'networkidle' });
        assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(16, 14, 24)');
        assert.equal(await page.evaluate(() => getComputedStyle(document.body).color), 'rgb(247, 243, 255)');
      }
      await context.close();
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ pass: true, base, variants, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

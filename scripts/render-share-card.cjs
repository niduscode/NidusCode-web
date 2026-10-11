'use strict';
// Render the native brand typography/vector asset, without editing the previous card.
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.NIDUS_PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
    // Serve the repository on port 8800 so CSS masks use same-origin assets.
    await page.goto(process.env.NIDUS_CARD_URL || 'http://127.0.0.1:8800/scripts/share-card.html', { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.fonts.check('800 194px "Barlow Condensed"')), true);
    const fits = await page.evaluate(() => [...document.querySelectorAll('h1 span, footer')].every(element => {
      const box = element.getBoundingClientRect(); return box.right <= 1140 && box.bottom <= 600;
    }));
    assert.ok(fits, 'Share-card copy must fit inside safe margins');
    const output = path.resolve(__dirname, '../assets/og-niduscode-dark-20261010.jpg');
    await page.screenshot({ path: output, type: 'jpeg', quality: 92 });
    console.log(JSON.stringify({ output, width: 1200, height: 630 }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

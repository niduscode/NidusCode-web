'use strict';
// Intercepts every Supabase request: tests must never insert real contact data.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { chromium } = require(process.env.NIDUS_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..');
const base = process.env.NIDUS_QA_URL || 'http://127.0.0.1:8800/';
const baseline = process.env.NIDUS_BASELINE || '83f84217c39ef36cec3198a450e9f061203d648c';
const original = execFileSync('git', ['show', `${baseline}:index.html`], { cwd: root, encoding: 'utf8' });
const originalForm = execFileSync('git', ['show', `${baseline}:contact-form.js`], { cwd: root });
assert.deepEqual(fs.readFileSync(path.join(root, 'contact-form.js')), originalForm);
execFileSync('git', ['diff', '--exit-code', baseline, '--', 'demos', 'contact-form.js', 'offline-game.js', 'vercel.json', 'robots.txt', 'sitemap.xml'], { cwd: root });
fs.mkdirSync(path.join(root, 'screenshots'), { recursive: true });

(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const errors = [];
  const posts = [];
  let status = 201;
  let releaseResponse;
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await context.route('**/*.supabase.co/**', async route => {
      const request = route.request();
      const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'POST, OPTIONS' };
      if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
      assert.equal(request.method(), 'POST');
      assert.ok(request.url().endsWith('/rest/v1/contact_messages'));
      posts.push(request.postDataJSON());
      if (releaseResponse) await new Promise(resolve => { releaseResponse = resolve; });
      return route.fulfill({ status, headers, body: status === 201 ? '' : 'Simulated service failure' });
    });
    await context.route('**/_vercel/insights/**', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: '' }));
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(base, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200);
    await page.evaluate(() => document.fonts.ready);
    const documentState = await page.evaluate(oldHTML => {
      const old = new DOMParser().parseFromString(oldHTML, 'text/html');
      const plain = text => text.replace(/\s+/g, ' ').trim();
      const previousFaq = [...old.querySelectorAll('.faq-item')].map(item => ({
        question: plain(item.querySelector('.faq-question span').textContent),
        answer: plain(item.querySelector('.faq-answer').textContent)
      }));
      const currentFaq = [...document.querySelectorAll('.faq-list details')].map(item => ({
        question: plain(item.querySelector('summary').firstChild.textContent),
        answer: plain(item.querySelector('p').textContent)
      }));
      const ids = [...document.querySelectorAll('[id]')].map(element => element.id);
      return { previousFaq, currentFaq,
        duplicates: ids.filter((id, index) => ids.indexOf(id) !== index),
        missingAnchors: [...document.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(id => id && !document.getElementById(id)),
        canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(link => link.href),
        robots: document.querySelector('meta[name="robots"]').content,
        schema: JSON.parse(document.querySelector('script[type="application/ld+json"]').textContent),
        projectLinks: [...document.querySelectorAll('.project-link')].map(a => a.href),
        localAssets: [...document.querySelectorAll('script[src],link[rel="stylesheet"],img[src]')].map(element => element.src || element.href).filter(url => new URL(url).origin === location.origin && !new URL(url).pathname.startsWith('/_vercel/')),
        localWording: /Propuesta local|noindex/i.test(document.body.textContent)
      };
    }, original);
    assert.equal(documentState.previousFaq.length, 7);
    assert.equal(documentState.currentFaq.length, 8);
    for (const faq of documentState.previousFaq) assert.deepEqual(documentState.currentFaq.find(item => item.question === faq.question), faq);
    assert.deepEqual(documentState.duplicates, []);
    assert.deepEqual(documentState.missingAnchors, []);
    assert.deepEqual(documentState.canonical, ['https://nidus-code-web.vercel.app/']);
    assert.equal(documentState.robots, 'index, follow');
    assert.equal(documentState.schema.areaServed, 'CL');
    assert.equal(documentState.projectLinks.length, 9);
    assert.equal(documentState.localWording, false);
    const demoChecks = [];
    for (const link of documentState.projectLinks) {
      const url = new URL(link);
      if (url.hostname !== 'nidus-code-web.vercel.app') continue;
      const demo = await context.request.get(new URL(url.pathname, base).href);
      assert.equal(demo.status(), 200, `Demo ${url.pathname}`);
      demoChecks.push(url.pathname);
    }
    for (const url of documentState.localAssets) {
      const asset = await context.request.get(url);
      assert.equal(asset.status(), 200, `Asset ${new URL(url).pathname}`);
    }
    const publishedForm = await context.request.get(new URL('contact-form.js', base).href);
    assert.deepEqual(await publishedForm.body(), originalForm);
    await page.locator('#contacto').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('#contacto').screenshot({ path: path.join(root, 'screenshots/release-contact-light.png') });
    assert.ok(await page.locator('#empresa-wrap').isHidden());
    const submit = () => page.locator('#contact-submit').click();
    const feedback = page.locator('#contact-feedback');
    await submit();
    assert.equal(await feedback.getAttribute('data-kind'), 'error');
    assert.equal(posts.length, 0);
    const fill = async () => {
      await page.locator('#nombre').fill('Prueba local NidusCode');
      await page.locator('#email').fill('qa@example.invalid');
      await page.locator('#telefono').fill('9 1234 5678');
      await page.locator('#mensaje').fill('Prueba interceptada: no guardar en Supabase.');
      await page.locator('#servicio').selectOption('automatizacion');
    };
    await fill();
    await page.locator('#email').fill('correo-invalido');
    await submit();
    assert.equal(posts.length, 0);
    assert.match(await feedback.textContent(), /email válido/);
    await page.locator('#email').fill('qa@example.invalid');
    await page.locator('#telefono').fill('abc12');
    assert.equal(await page.locator('#telefono').inputValue(), '12');
    await submit();
    assert.equal(posts.length, 0);
    assert.match(await feedback.textContent(), /teléfono válido/);
    await fill();
    await page.locator('[data-client-type="persona"]').focus();
    await page.keyboard.press('ArrowRight');
    assert.ok(await page.locator('#empresa-wrap').isVisible());
    assert.equal(await page.locator('#empresa').getAttribute('required'), '');
    await submit();
    assert.equal(posts.length, 0);
    assert.match(await feedback.textContent(), /nombre de la empresa/);
    await page.locator('#empresa').fill('Empresa de prueba');
    await page.locator('#phone-country-btn').click();
    await page.locator('#phone-country-search').fill('Argentina');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.phone-code').textContent(), '+54');
    await page.locator('#phone-country-btn').click();
    await page.locator('#phone-country-search').fill('Chile');
    await page.keyboard.press('Enter');
    assert.equal(await page.locator('.phone-code').textContent(), '+56');
    releaseResponse = true;
    await submit();
    await page.waitForFunction(() => document.querySelector('#contact-submit').disabled);
    assert.equal(await page.locator('.contact-btn-label').textContent(), 'Enviando…');
    await page.waitForTimeout(100);
    releaseResponse();
    releaseResponse = null;
    await page.waitForFunction(() => document.querySelector('#contact-feedback').dataset.kind === 'ok');
    assert.equal(posts.length, 1);
    assert.deepEqual(Object.keys(posts[0]).sort(), ['tipo_cliente', 'empresa', 'nombre', 'email', 'telefono', 'pais', 'servicio', 'mensaje', 'user_agent', 'origen'].sort());
    assert.equal(posts[0].tipo_cliente, 'empresa');
    assert.equal(posts[0].empresa, 'Empresa de prueba');
    assert.equal(posts[0].telefono, '+56912345678');
    assert.equal(posts[0].pais, 'Chile');
    assert.equal(posts[0].servicio, 'automatizacion');
    assert.equal(await page.locator('#nombre').inputValue(), '');
    assert.ok(await page.locator('#contact-submit').isEnabled());
    await page.locator('[data-client-type="persona"]').click();
    assert.ok(await page.locator('#empresa-wrap').isHidden());
    status = 503;
    await fill();
    await submit();
    await page.waitForFunction(() => document.querySelector('#contact-feedback').dataset.kind === 'error');
    assert.equal(posts.length, 2);
    assert.equal(posts[1].empresa, null);
    assert.match(await feedback.textContent(), /No pudimos enviar/);
    assert.ok(await page.locator('#contact-submit').isEnabled());
    await page.locator('[name="website"]').evaluate(input => { input.value = 'bot'; });
    await submit();
    assert.equal(posts.length, 2);
    assert.equal(await feedback.getAttribute('data-kind'), 'ok');
    for (const details of await page.locator('.faq-list details').all()) {
      await details.locator('summary').click();
      assert.equal(await details.getAttribute('open'), '');
      await details.locator('summary').click();
    }
    await page.emulateMedia({ colorScheme: 'light' });
    assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
    await page.locator('#contacto').scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
    await page.locator('#contacto').screenshot({ path: path.join(root, 'screenshots/release-contact-dark.png') });
    const layoutChecks = [];
    for (const viewport of [{ width: 1440, height: 900 }, { width: 1001, height: 600 }, { width: 860, height: 900 }, { width: 390, height: 844 }, { width: 320, height: 740 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#contact-form').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      const geometry = await page.evaluate(() => {
        const fields = [...document.querySelectorAll('#contact-form input:not([name="website"]):not([type="search"]), #contact-form select, #contact-form textarea')].filter(element => element.offsetParent !== null);
        return { width: innerWidth, overflow: document.documentElement.scrollWidth > innerWidth,
          tooSmall: fields.filter(element => parseFloat(getComputedStyle(element).fontSize) < 16).map(element => element.id),
          clipped: fields.filter(element => { const box = element.getBoundingClientRect(); return box.left < 0 || box.right > innerWidth; }).map(element => element.id),
          header: getComputedStyle(document.querySelector('.site-header')).position };
      });
      assert.equal(geometry.overflow, false);
      assert.deepEqual(geometry.tooSmall, []);
      assert.deepEqual(geometry.clipped, []);
      assert.equal(geometry.header, 'fixed');
      await page.locator('#phone-country-btn').click();
      const panel = await page.locator('#phone-country-panel').boundingBox();
      assert.ok(panel.x >= 0 && panel.x + panel.width <= viewport.width);
      await page.keyboard.press('Escape');
      if (viewport.width === 390) await page.locator('#contact-form').screenshot({ path: path.join(root, 'screenshots/release-contact-mobile.png') });
      layoutChecks.push(geometry);
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ pass: true, url: base, faq: documentState.currentFaq.length, projects: documentState.projectLinks.length, assetsChecked: documentState.localAssets.length,
      backendUnchanged: true, demoChecks, realSubmissions: 0, simulatedSubmissions: posts.length, layoutChecks, errors }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });

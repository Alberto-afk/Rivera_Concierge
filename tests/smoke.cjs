// Run with Node.js, Python 3 and Playwright + Chromium installed. No build required.
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { once } = require('node:events');
const { existsSync } = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '..');
let server, browser;
let passed = 0;

async function check(name, run) {
    await run();
    passed++;
    console.log('PASS ' + name);
}
async function settled(page) {
    await page.waitForFunction(() => !document.querySelector('#spatialStage').classList.contains('spatial-active'));
}
async function createPage(options = {}, setup) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (setup) await page.addInitScript(setup);
    return { context, page, errors };
}

(async () => {
    const socket = net.createServer();
    socket.listen(0, '127.0.0.1');
    await once(socket, 'listening');
    const port = socket.address().port;
    await new Promise(resolve => socket.close(resolve));
    server = spawn('python3', ['-m', 'http.server', String(port), '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
    const url = 'http://127.0.0.1:' + port;
    let ready = false;
    for (let i = 0; i < 40; i++) {
        try { const response = await fetch(url); if (response.ok) { ready = true; break; } } catch {}
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'static server did not become ready');
    const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined);
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox'] });
    const { context, page, errors } = await createPage({ viewport: { width: 1440, height: 1000 } }, () => {
        Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 });
        Object.defineProperty(navigator, 'deviceMemory', { value: 8 });
        // Count actual animation callbacks to detect unnecessary idle work.
        window.__frameCount = 0;
        const nativeRAF = window.requestAnimationFrame.bind(window);
        window.requestAnimationFrame = callback => nativeRAF(time => { window.__frameCount++; callback(time); });
    });
    const external = [];
    page.on('request', request => { if (!request.url().startsWith(url)) external.push(request.url()); });
    await page.goto(url, { waitUntil: 'networkidle' });

    await check('HTML, CSS, JS, photos and local font return 200', async () => {
        const resources = await page.evaluate(() => [...new Set(Array.from(document.querySelectorAll('[src],link[href]')).map(e => e.getAttribute('src') || e.getAttribute('href')))]);
        resources.push('assets/fonts/jost-latin.woff2');
        for (const resource of resources) assert.equal((await page.request.get(url + '/' + resource)).status(), 200, resource);
        // Verify every srcset candidate, including the images hidden by the catalog filter.
        const candidates = await page.locator('img').evaluateAll(images => images.flatMap(img => img.srcset.split(',').map(src => src.trim().split(' ')[0])));
        for (const candidate of new Set(candidates)) assert.equal((await page.request.get(url + '/' + candidate)).status(), 200, candidate);
        await page.evaluate(() => document.querySelectorAll('img').forEach(img => { img.loading = 'eager'; }));
        await page.waitForFunction(() => Array.from(document.images).every(image => image.complete && image.naturalWidth > 0));
        assert.deepEqual(external, [], 'site should not depend on external assets');
    });
    await check('catalog filters, counts and expand/collapse', async () => {
        assert.equal(await page.locator('.work-card:visible').count(), 6);
        await page.locator('#showMoreBtn').click();
        assert.equal(await page.locator('.work-card:visible').count(), 12);
        assert.equal(await page.locator('#showMoreBtn').getAttribute('aria-expanded'), 'true');
        await page.locator('#showMoreBtn').click();
        assert.equal(await page.locator('.work-card:visible').count(), 6);
        await page.waitForFunction(() => { const rect = document.querySelector('#showMoreBtn').getBoundingClientRect(); return rect.top >= 0 && rect.bottom <= innerHeight; });
        assert.equal(await page.evaluate(() => document.activeElement.id), 'showMoreBtn');
        for (const filter of ['salas', 'butacas', 'terrazas', 'all']) {
            const button = page.locator('.filter-btn[data-filter="' + filter + '"]');
            await button.click();
            const total = await page.locator(filter === 'all' ? '.work-card' : '.work-card[data-category="' + filter + '"]').count();
            assert.equal(await page.locator('.work-card:visible').count(), Math.min(6, total));
            assert.equal(await button.getAttribute('aria-pressed'), 'true');
            assert.equal(await page.locator('.filter-btn[aria-pressed="true"]').count(), 1);
            assert.match(await page.locator('#catalogStatus').textContent(), new RegExp('de ' + total + ' trabajos'));
        }
    });
    await check('3D reacts, settles and resumes after toggle/visibility', async () => {
        await page.locator('#spatialStage').scrollIntoViewIfNeeded();
        await page.waitForFunction(() => document.body.classList.contains('perf-high'));
        await settled(page);
        const rect = await page.locator('#spatialStage').boundingBox();
        await page.mouse.move(rect.x + rect.width * .8, rect.y + Math.min(rect.height * .5, 300));
        await page.waitForFunction(() => Math.abs(parseFloat(document.querySelector('.spatial-plane').style.getPropertyValue('--pointer-x'))) > .05);
        await settled(page);
        const frames = await page.evaluate(() => window.__frameCount);
        await page.waitForTimeout(250);
        assert.equal(await page.evaluate(() => window.__frameCount), frames, 'idle view must not animate');
        await page.locator('#perfToggleBtn').click();
        assert.equal(await page.locator('#perfToggleBtn').getAttribute('aria-pressed'), 'false');
        assert.equal(await page.locator('.spatial-plane').first().evaluate(el => getComputedStyle(el).transform), 'none');
        await page.locator('#perfToggleBtn').click();
        assert.equal(await page.locator('#perfToggleBtn').getAttribute('aria-pressed'), 'true');
        // Emulate the browser visibility signal in a controlled way.
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
        assert.equal(await page.locator('.spatial-active').count(), 0);
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
        await settled(page);
        const currentRect = await page.locator('#spatialStage').boundingBox();
        await page.mouse.move(currentRect.x + 30, currentRect.y + 30);
        await page.waitForFunction(() => parseFloat(document.querySelector('.spatial-plane').style.getPropertyValue('--pointer-x')) < -.05);
        await settled(page);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.body.classList.contains('perf-low'));
        assert(await page.locator('#perfToggleBtn').isDisabled());
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await page.waitForFunction(() => document.body.classList.contains('perf-high'));
    });
    await check('no horizontal overflow at 320, 390, 768, 1024 and 1440 px', async () => {
        for (const width of [320, 390, 768, 1024, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow at ' + width);
            assert(await page.locator('nav a[href="#catalogo"]').isVisible());
            assert(await page.locator('.header-contact').isVisible());
        }
    });
    await check('skip link, internal anchors and contact destinations', async () => {
        await page.goto(url);
        await page.keyboard.press('Tab');
        assert.equal(await page.evaluate(() => document.activeElement.className), 'skip-link');
        await page.keyboard.press('Enter');
        assert.equal(await page.evaluate(() => document.activeElement.id), 'contenido');
        assert.equal(await page.locator('h1').count(), 1);
        const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll(anchors => anchors.filter(a => !document.getElementById(a.hash.slice(1))).map(a => a.hash));
        assert.deepEqual(brokenAnchors, []);
        const contacts = await page.locator('a[href^="https://wa.me/"]').evaluateAll(anchors => anchors.every(a => new URL(a.href).pathname === '/51997317630' && a.rel.includes('noopener')));
        assert(contacts);
        assert.equal(await page.locator('a[href="tel:+51997317630"]').count(), 1);
        assert.deepEqual(errors, []);
    });
    await context.close();

    await check('static fallbacks: weak hardware, touch, data saver, missing API', async () => {
        const variants = [
            [{}, () => { Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 }); Object.defineProperty(navigator, 'deviceMemory', { value: 2 }); }],
            [{ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } }, null],
            [{}, () => Object.defineProperty(navigator, 'connection', { value: { saveData: true } })],
            [{}, () => { window.IntersectionObserver = undefined; }]
        ];
        for (const [options, setup] of variants) {
            const run = await createPage(options, setup);
            await run.page.goto(url);
            assert(await run.page.locator('body').evaluate(body => body.classList.contains('perf-low')));
            assert.equal(await run.page.locator('.work-card:visible').count(), 6);
            assert.deepEqual(run.errors, []);
            await run.context.close();
        }
    });
    await check('without JavaScript: content, all projects and contact remain usable', async () => {
        const run = await createPage({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
        await run.page.goto(url);
        assert.equal(await run.page.locator('.work-card:visible').count(), 12);
        assert.equal(await run.page.locator('#showMoreBtn:visible').count(), 0);
        assert.equal(await run.page.locator('[role="dialog"]').count(), 0);
        assert.equal(await run.page.locator('.filter-bar:visible').count(), 0);
        assert.equal(await run.page.locator('#perfToggleBtn:visible').count(), 0);
        assert(await run.page.locator('body').evaluate(body => body.classList.contains('perf-low')));
        assert(await run.page.locator('a[href^="tel:"]').isVisible());
        await run.context.close();
    });
    console.log('\n' + passed + ' checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
});

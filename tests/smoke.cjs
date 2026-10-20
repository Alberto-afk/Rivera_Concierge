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
    await page.waitForFunction(() => !document.querySelector('#spatialStage').classList.contains('spatial-active'), null, { timeout: 15000 });
}
async function createPage(options = {}, setup) {
    // Keep software WebGL affordable in CI; CSS viewport sizes stay unchanged.
    const context = await browser.newContext({ deviceScaleFactor: .5, ...options });
    const page = await context.newPage();
    const errors = [];
    const modules = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => { if (/\/(furniture3d\.js|assets\/vendor\/)/.test(request.url())) modules.push(request.url()); });
    await page.addInitScript(() => {
        window.__frameCount = 0;
        let functionalTime = 100000;
        let previousFrameTime;
        const nativeRAF = window.requestAnimationFrame.bind(window);
        // Render with real WebGL at actual browser cadence, but keep functional
        // interpolation independent of software GPU speed. A separate test
        // supplies slow timestamps to verify the adaptive performance policy.
        window.requestAnimationFrame = callback => nativeRAF(time => {
            if (time !== previousFrameTime) { functionalTime += 16; previousFrameTime = time; }
            window.__frameCount++;
            callback(functionalTime);
        });
    });
    if (setup) await page.addInitScript(setup);
    return { context, page, errors, modules };
}
function highHardware() {
    Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 });
    Object.defineProperty(navigator, 'deviceMemory', { value: 8 });
}
async function sceneReady(page) {
    await page.locator('#spatialStage').scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('#espacio-3d').dataset.sceneState === 'ready', null, { timeout: 20000 });
    await settled(page);
    assert.equal(await page.locator('#perfToggleBtn').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('#sofaCanvas canvas').count(), 1);
}
async function idle(page) {
    await page.waitForTimeout(50); // Let queued resize, scroll and intersection events run.
    await settled(page);
    const frames = await page.evaluate(() => window.__frameCount);
    await page.waitForTimeout(300);
    assert.equal(await page.evaluate(() => window.__frameCount), frames, 'idle view must not schedule animation frames');
}
async function pixelStats(page) {
    // Decode a browser screenshot, avoiding dependence on preserveDrawingBuffer.
    const png = await page.locator('#sofaCanvas canvas').screenshot({ animations: 'disabled' });
    return page.evaluate(base64 => new Promise((resolve, reject) => {
        const image = new Image();
        image.onerror = reject;
        image.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            const context = canvas.getContext('2d');
            context.drawImage(image, 0, 0);
            const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
            let red = 0, green = 0, blue = 0, dark = 0, count = 0;
            const colors = new Set();
            for (let i = 0; i < pixels.length; i += 32) {
                red += pixels[i]; green += pixels[i + 1]; blue += pixels[i + 2]; count++;
                if (pixels[i] + pixels[i + 1] + pixels[i + 2] < 480) dark++;
                colors.add((pixels[i] >> 3) + ':' + (pixels[i + 1] >> 3) + ':' + (pixels[i + 2] >> 3));
            }
            resolve({ red: red / count, green: green / count, blue: blue / count, dark: dark / count, colors: colors.size });
        };
        image.src = 'data:image/png;base64,' + base64;
    }), png.toString('base64'));
}
async function compactStatic(page) {
    await page.waitForFunction(() => {
        const image = document.querySelector('#sofaPoster');
        return image.complete && image.naturalWidth > 0 && getComputedStyle(image).opacity === '1';
    });
    assert.equal(await page.locator('#perfToggleBtn').getAttribute('aria-pressed'), 'false');
    assert.equal(await page.locator('#sofaCanvas canvas').count(), 0);
    assert(await page.locator('#sofaPoster').isVisible());
    assert(await page.locator('body').evaluate(body => body.classList.contains('perf-low')));
    const metrics = await page.locator('#espacio-3d').evaluate(section => ({ height: section.offsetHeight, viewport: innerHeight }));
    assert(metrics.height < metrics.viewport * 2, 'static view must not reserve a long sticky scroll');
    await idle(page);
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
    browser = await chromium.launch({ executablePath, headless: true, args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'] });
    const { context, page, errors } = await createPage({ viewport: { width: 1440, height: 1000 } }, highHardware);
    const external = [];
    page.on('request', request => { if (!request.url().startsWith(url)) external.push(request.url()); });
    await page.goto(url, { waitUntil: 'networkidle' });

    await check('HTML, CSS, JS, photos and local font return 200', async () => {
        const resources = await page.evaluate(() => [...new Set(Array.from(document.querySelectorAll('[src],link[href]')).map(e => e.getAttribute('src') || e.getAttribute('href')))]);
        resources.push('assets/fonts/jost-latin.woff2', 'assets/sofa3d/sofa-terracota.webp', 'assets/sofa3d/sofa-oliva.webp');
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
    await check('real 3D pixels, material colors and three scroll chapters', async () => {
        await sceneReady(page);
        const linen = await pixelStats(page);
        assert(linen.colors > 40 && linen.dark > .005, 'WebGL should draw a shaded sofa, not an empty canvas');
        await page.locator('[data-material="terracota"]').click();
        await settled(page);
        assert.equal(await page.locator('[data-material="terracota"]').getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('[data-material][aria-pressed="true"]').count(), 1);
        assert.match(await page.locator('#materialStatus').textContent(), /terracota/i);
        const terracotta = await pixelStats(page);
        assert(Math.abs(linen.red - terracotta.red) + Math.abs(linen.green - terracotta.green) + Math.abs(linen.blue - terracotta.blue) > 4, 'material selection must change the rendered sofa');
        for (const material of ['oliva', 'lino']) {
            await page.locator('[data-material="' + material + '"]').click();
            assert.equal(await page.locator('[data-material="' + material + '"]').getAttribute('aria-pressed'), 'true');
        }
        const details = new Set();
        for (const [progress, chapter] of [[.05, '01 / La forma'], [.5, '02 / El tapizado'], [.95, '03 / Su espacio']]) {
            await page.evaluate(value => {
                const section = document.querySelector('#espacio-3d');
                const start = section.getBoundingClientRect().top + scrollY;
                const header = document.querySelector('.site-header').getBoundingClientRect().height;
                const distance = section.offsetHeight - document.querySelector('#spatialStage').offsetHeight;
                window.scrollTo({ top: start - header + distance * value, behavior: 'instant' });
            }, progress);
            await page.waitForFunction(value => Math.abs(Number(document.querySelector('#espacio-3d').dataset.progress) - value) < .08, progress);
            await settled(page);
            const state = await page.locator('#espacio-3d').evaluate(section => ({ state: section.dataset.sceneState, progress: section.dataset.progress }));
            assert.equal(state.state, 'ready', JSON.stringify(state));
            assert.equal((await page.locator('#showroomChapter').textContent()).trim(), chapter, JSON.stringify(state));
            details.add((await page.locator('#showroomDetail').textContent()).trim());
        }
        assert.equal(details.size, 3, 'each scroll chapter should explain a different detail');
        await idle(page);
    });
    await check('3D stops on idle/hidden/offscreen and resumes after toggle/resize', async () => {
        const rect = await page.locator('#sofaCanvas').boundingBox();
        await page.mouse.move(rect.x + rect.width * .8, rect.y + rect.height * .4);
        await idle(page);
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
        assert.equal(await page.locator('.spatial-active').count(), 0);
        await idle(page);
        await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
        await idle(page);
        await page.locator('#catalogo').scrollIntoViewIfNeeded();
        await idle(page);
        await page.locator('#perfToggleBtn').click();
        await compactStatic(page);
        await page.locator('#perfToggleBtn').click();
        await sceneReady(page);
        await page.setViewportSize({ width: 1024, height: 800 });
        await idle(page);
        const size = await page.locator('#sofaCanvas canvas').evaluate(canvas => ({ width: canvas.width, height: canvas.height, clientWidth: canvas.clientWidth, clientHeight: canvas.clientHeight, dpr: Math.min(devicePixelRatio, 1.5) }));
        assert(Math.abs(size.width - size.clientWidth * size.dpr) <= 2);
        assert(Math.abs(size.height - size.clientHeight * size.dpr) <= 2);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await page.waitForFunction(() => document.body.classList.contains('perf-low'));
        assert(await page.locator('#perfToggleBtn').isDisabled());
        assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
        await compactStatic(page);
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        await sceneReady(page);
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

    await check('3D modules are lazy and first render happens near the showroom', async () => {
        const run = await createPage({ viewport: { width: 1440, height: 500 } }, highHardware);
        await run.page.goto(url, { waitUntil: 'networkidle' });
        assert.equal(run.modules.length, 0, '3D modules should not download above the showroom');
        assert.equal(await run.page.locator('#sofaCanvas canvas').count(), 0);
        await sceneReady(run.page);
        assert(run.modules.some(resource => resource.endsWith('/furniture3d.js')));
        assert(run.modules.some(resource => resource.includes('/assets/vendor/')));
        assert.deepEqual(run.errors, []);
        await run.context.close();
    });
    await check('static fallbacks: weak hardware, touch, reduced motion, data saver, missing API', async () => {
        const variants = [
            [{}, () => { Object.defineProperty(navigator, 'hardwareConcurrency', { value: 2 }); Object.defineProperty(navigator, 'deviceMemory', { value: 2 }); }, true],
            [{ isMobile: true, hasTouch: true, viewport: { width: 390, height: 844 } }, highHardware, true],
            [{ reducedMotion: 'reduce' }, highHardware, false],
            [{}, () => Object.defineProperty(navigator, 'connection', { value: { saveData: true } }), false],
            [{}, () => { window.IntersectionObserver = undefined; }, false]
        ];
        for (const [options, setup, manualAllowed] of variants) {
            const run = await createPage(options, setup);
            await run.page.goto(url, { waitUntil: 'networkidle' });
            await run.page.locator('#spatialStage').scrollIntoViewIfNeeded();
            await compactStatic(run.page);
            assert.equal(run.modules.length, 0, 'static defaults must not download 3D modules');
            assert.equal(await run.page.locator('.work-card:visible').count(), 6);
            if (manualAllowed) {
                assert(!(await run.page.locator('#perfToggleBtn').isDisabled()));
                await run.page.locator('#perfToggleBtn').click();
                await sceneReady(run.page);
            } else {
                assert(await run.page.locator('#perfToggleBtn').isDisabled());
            }
            assert.deepEqual(run.errors, []);
            await run.context.close();
        }
    });
    await check('blocked 3D imports and missing WebGL leave a clean static fallback', async () => {
        for (const blocked of ['**/furniture3d.js', '**/assets/vendor/**', 'webgl']) {
            const setup = blocked === 'webgl' ? () => {
                Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 });
                Object.defineProperty(navigator, 'deviceMemory', { value: 8 });
                const nativeContext = HTMLCanvasElement.prototype.getContext;
                HTMLCanvasElement.prototype.getContext = function (type, ...args) {
                    return /webgl/i.test(type) ? null : nativeContext.call(this, type, ...args);
                };
            } : highHardware;
            const run = await createPage({}, setup);
            if (blocked !== 'webgl') await run.page.route(blocked, route => route.abort());
            await run.page.goto(url);
            await run.page.locator('#spatialStage').scrollIntoViewIfNeeded();
            await run.page.waitForFunction(() => document.querySelector('#espacio-3d').dataset.sceneState === 'failed');
            await compactStatic(run.page);
            assert.deepEqual(run.errors, [], blocked);
            await run.context.close();
        }
    });
    await check('WebGL context loss removes the renderer and restores the poster', async () => {
        const run = await createPage({}, highHardware);
        await run.page.goto(url);
        await sceneReady(run.page);
        await run.page.locator('#sofaCanvas canvas').evaluate(canvas => {
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            const extension = gl.getExtension('WEBGL_lose_context');
            if (!extension) throw new Error('test browser does not support WEBGL_lose_context');
            extension.loseContext();
        });
        await run.page.waitForFunction(() => document.querySelector('#espacio-3d').dataset.sceneState === 'failed');
        await compactStatic(run.page);
        assert.deepEqual(run.errors, []);
        await run.context.close();
    });
    await check('sustained slow frames fall back to the light view', async () => {
        const run = await createPage({}, () => {
            Object.defineProperty(navigator, 'hardwareConcurrency', { value: 8 });
            Object.defineProperty(navigator, 'deviceMemory', { value: 8 });
            const nativeRAF = window.requestAnimationFrame.bind(window);
            let time = 100000;
            // Deterministic slow-frame signal; no dependence on host CPU load.
            window.requestAnimationFrame = callback => nativeRAF(() => callback(time += 75));
        });
        await run.page.goto(url);
        await run.page.locator('#spatialStage').scrollIntoViewIfNeeded();
        await run.page.waitForFunction(() => document.querySelector('#espacio-3d').dataset.sceneState === 'ready', null, { timeout: 20000, polling: 50 });
        await run.page.evaluate(() => {
            const section = document.querySelector('#espacio-3d');
            const header = document.querySelector('.site-header').getBoundingClientRect().height;
            const stage = document.querySelector('#spatialStage');
            window.scrollTo({ top: section.getBoundingClientRect().top + scrollY - header + (section.offsetHeight - stage.offsetHeight) * .95, behavior: 'instant' });
        });
        await run.page.waitForFunction(() => document.querySelector('#showroomStatus').textContent.includes('fluidez'), null, { timeout: 20000, polling: 50 });
        await compactStatic(run.page);
        assert.equal(await run.page.locator('#espacio-3d').getAttribute('data-scene-state'), 'static');
        assert.deepEqual(run.errors, []);
        await run.context.close();
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
        assert(await run.page.locator('#sofaPoster').isVisible());
        assert.equal(await run.page.locator('#sofaCanvas canvas').count(), 0);
        assert.equal(run.modules.length, 0);
        assert(await run.page.locator('a[href^="tel:"]').isVisible());
        await run.context.close();
    });
    console.log('\n' + passed + ' checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
    if (browser) await browser.close();
    if (server) server.kill();
});

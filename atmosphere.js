/* Decorative 2.5D scene: local WebP layers, no WebGL, no idle animation loop. */
(function () {
    'use strict';
    const section = document.querySelector('.atmosphere');
    if (!section || !window.matchMedia || !window.IntersectionObserver || !window.requestAnimationFrame) return;
    const stage = section.querySelector('.atmosphere-stage');
    const mountain = section.querySelector('.atmosphere-mountain');
    const planet = section.querySelector('.atmosphere-planet');
    const clouds = Array.from(section.querySelectorAll('.atmosphere-cloud'));
    const originTitle = section.querySelector('.atmosphere-title--origin');
    const worldTitle = section.querySelector('.atmosphere-title--world');
    const progressBar = section.querySelector('.atmosphere-progress');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 761px) and (min-height: 600px) and (hover: hover) and (pointer: fine)');
    const connection = navigator.connection;
    const capable = (navigator.hardwareConcurrency || 4) >= 4 && (navigator.deviceMemory || 4) >= 4;
    let enabled = false, visible = false, near = false, frame = 0, pointerX = 0, pointerY = 0;
    const clamp = n => Math.max(0, Math.min(1, n));
    function smooth(a, b, n) { const t = clamp((n - a) / (b - a)); return t * t * (3 - 2 * t); }
    function stop() { cancelAnimationFrame(frame); frame = 0; }
    function loadLayers() {
        if (!enabled || !near) return;
        clouds.forEach(cloud => { if (!cloud.getAttribute('src')) cloud.src = cloud.dataset.src; });
    }
    function draw() {
        frame = 0;
        if (!enabled || !visible || document.hidden) return;
        const rect = section.getBoundingClientRect();
        const header = parseFloat(getComputedStyle(stage).top) || 0;
        const p = clamp((header - rect.top) / Math.max(1, section.offsetHeight - stage.offsetHeight));
        const retreat = smooth(0, .68, p);
        const space = smooth(.45, .8, p);
        mountain.style.transform = 'translate3d(' + (pointerX * -8).toFixed(2) + 'px,' + (retreat * -12).toFixed(2) + '%,0) scale(' + (1.15 - retreat * .44).toFixed(4) + ')';
        mountain.style.opacity = (1 - smooth(.48, .76, p)).toFixed(4);
        clouds.forEach((cloud, i) => {
            const side = i === 0 ? -1 : 1;
            const shift = side * retreat * 54;
            cloud.style.transform = 'translate3d(calc(' + shift.toFixed(2) + '% + ' + (pointerX * (i + 1) * 32).toFixed(2) + 'px),' + (pointerY * (i + 1) * 16 - retreat * 50).toFixed(2) + 'px,0) scale(' + (1.05 + retreat * .28).toFixed(4) + ')';
            cloud.style.opacity = ((i === 0 ? .28 : .4) * (1 - smooth(.3, .7, p))).toFixed(4);
        });
        if (p > .28 && planet.dataset.fullSrc) { planet.src = planet.dataset.fullSrc; delete planet.dataset.fullSrc; }
        planet.style.opacity = space.toFixed(4);
        planet.style.transform = 'translate3d(' + (pointerX * 6).toFixed(2) + 'px,' + ((1 - space) * 20).toFixed(2) + '%,0) scale(' + (1.28 - smooth(.5, 1, p) * .38).toFixed(4) + ') rotate(' + (smooth(.5, 1, p) * -9).toFixed(2) + 'deg)';
        originTitle.style.opacity = (1 - smooth(.24, .46, p)).toFixed(4);
        originTitle.style.transform = 'translate3d(0,' + (-retreat * 35).toFixed(2) + 'px,0)';
        worldTitle.style.opacity = smooth(.65, .88, p).toFixed(4);
        worldTitle.style.transform = 'translate3d(0,' + ((1 - smooth(.65, .88, p)) * 24).toFixed(2) + 'px,0)';
        progressBar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
        section.dataset.progress = p.toFixed(4);
    }
    function request() { if (enabled && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw); }
    function configure() {
        const wasEnabled = enabled;
        const previousTop = section.getBoundingClientRect().top;
        stop();
        enabled = desktop.matches && !reduced.matches && capable && !(connection && connection.saveData);
        section.classList.toggle('atmosphere-live', enabled);
        [mountain, planet, ...clouds, originTitle, worldTitle, progressBar].forEach(el => { el.style.removeProperty('transform'); el.style.removeProperty('opacity'); });
        pointerX = pointerY = 0;
        if (wasEnabled && !enabled && visible && previousTop < 0) window.scrollTo({ top: Math.max(0, window.scrollY + previousTop - 94), behavior: 'instant' });
        loadLayers(); request();
    }
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        section.classList.toggle('atmosphere-visible', visible);
        if (visible) request(); else stop();
    }).observe(section);
    new IntersectionObserver(entries => { near = entries[0].isIntersecting; loadLayers(); }, { rootMargin: '300px' }).observe(section);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    stage.addEventListener('pointermove', event => {
        if (!enabled || !visible || event.pointerType === 'touch') return;
        const rect = stage.getBoundingClientRect();
        pointerX = Math.max(-1, Math.min(1, (event.clientX - rect.left) / rect.width * 2 - 1));
        pointerY = Math.max(-1, Math.min(1, (event.clientY - rect.top) / rect.height * 2 - 1));
        request();
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { pointerX = pointerY = 0; request(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else request(); });
    window.addEventListener('pagehide', stop);
    window.addEventListener('pageshow', request);
    [reduced, desktop].forEach(query => { if (query.addEventListener) query.addEventListener('change', configure); else query.addListener(configure); });
    if (connection && connection.addEventListener) connection.addEventListener('change', configure);
    configure();
}());

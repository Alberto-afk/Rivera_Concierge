/* Six local photos, native scrolling, no animation engine or idle render loop. */
(function () {
    'use strict';
    const hero = document.querySelector('.hero');
    const stage = document.querySelector('.hero-stage');
    const cards = Array.from(document.querySelectorAll('.collage-card'));
    if (!hero || !stage || !cards.length || !window.matchMedia || !window.IntersectionObserver) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const desktop = matchMedia('(min-width: 761px) and (min-height: 600px) and (hover: hover) and (pointer: fine)');
    const connection = navigator.connection;
    const capable = (navigator.hardwareConcurrency || 4) >= 4 && (navigator.deviceMemory || 4) >= 4;
    let enabled = false, visible = false, frame = 0, x = 0, y = 0;
    const clamp = value => Math.max(0, Math.min(1, value));
    function stop() {
        cancelAnimationFrame(frame);
        frame = 0;
    }
    function draw() {
        frame = 0;
        if (!enabled || !visible || document.hidden) return;
        const rect = hero.getBoundingClientRect();
        const top = parseFloat(getComputedStyle(stage).top) || 0;
        const p = clamp((top - rect.top) / Math.max(1, hero.offsetHeight - stage.offsetHeight));
        const eased = p * p * (3 - 2 * p);
        const width = stage.clientWidth;
        const height = stage.clientHeight;
        cards.forEach((card, i) => {
            const spread = i - (cards.length - 1) / 2;
            const dx = spread * width * .153 * (1 - eased);
            const dy = spread * height * .075 * (1 - eased);
            const depth = (i + 1) / cards.length;
            card.style.transform = 'translate3d(' + (dx + x * 13 * depth * (1 - eased)).toFixed(2) + 'px,' + (dy + y * 9 * depth * (1 - eased)).toFixed(2) + 'px,0) rotate(' + (spread * -2 * (1 - eased)).toFixed(2) + 'deg) scale(' + (1 + eased * .32).toFixed(3) + ')';
        });
        hero.dataset.collageProgress = p.toFixed(3);
    }
    function request() {
        if (enabled && visible && !document.hidden && !frame) frame = requestAnimationFrame(draw);
    }
    function configure() {
        stop();
        enabled = desktop.matches && !reduced.matches && capable && !(connection && connection.saveData);
        hero.classList.toggle('collage-live', enabled);
        hero.dataset.collageProgress = '0';
        cards.forEach(card => card.style.removeProperty('transform'));
        x = y = 0;
        request();
    }
    new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        hero.classList.toggle('collage-visible', visible);
        if (visible) request(); else stop();
    }, { threshold: 0 }).observe(hero);
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', request, { passive: true });
    stage.addEventListener('pointermove', event => {
        if (!enabled || !visible || event.pointerType === 'touch') return;
        const rect = stage.getBoundingClientRect();
        x = (event.clientX - rect.left) / rect.width - .5;
        y = (event.clientY - rect.top) / rect.height - .5;
        request();
    }, { passive: true });
    stage.addEventListener('pointerleave', () => { x = y = 0; request(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else request(); });
    reduced.addEventListener('change', configure);
    desktop.addEventListener('change', configure);
    if (connection && connection.addEventListener) connection.addEventListener('change', configure);
    configure();
}());

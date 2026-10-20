(function () {
    'use strict';

    const section = document.getElementById('espacio-3d');
    const stage = document.getElementById('spatialStage');
    const host = document.getElementById('sofaCanvas');
    const poster = document.getElementById('sofaPoster');
    const toggle = document.getElementById('perfToggleBtn');
    const status = document.getElementById('perfStatusLabel');
    const materialButtons = Array.from(document.querySelectorAll('[data-material]'));
    const fabrics = {
        lino: { label: 'Lino claro', description: 'lino claro' },
        terracota: { label: 'Terracota', description: 'tela terracota' },
        oliva: { label: 'Verde oliva', description: 'tela verde oliva' }
    };

    if (section && stage && host && poster && toggle && status) {
        const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        const hoverQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const supported = Boolean(motionQuery && hoverQuery && window.IntersectionObserver && window.requestAnimationFrame && window.cancelAnimationFrame && window.WebGL2RenderingContext);
        const storageKey = 'rivera-furniture-motion';
        const chapterLabel = document.getElementById('showroomChapter');
        const chapterTitle = document.getElementById('showroomDetail');
        const chapterDescription = document.getElementById('showroomDescription');
        const hint = document.getElementById('showroomHint');
        const announcement = document.getElementById('showroomStatus');
        const chapters = [
            ['01 / La forma', 'Un lugar para quedarse.', 'Líneas sencillas. Proporciones que invitan a sentarse.'],
            ['02 / El tapizado', 'La diferencia se siente.', 'Una textura, un tono, una forma de hacer suyo el espacio.'],
            ['03 / Su espacio', 'Hecho para su día a día.', 'Explore la idea. Después, conversemos sobre su mueble.']
        ];
        let preference = null;
        let visible = false;
        let requested = false;
        let active = false;
        let failed = false;
        let limited = false;
        let reducedQuality = false;
        let scene = null;
        let loading = null;
        let frame = null;
        let previousTime = 0;
        let slowFrames = 0;
        let progress = 0;
        let targetProgress = 0;
        let pointerX = 0;
        let pointerY = 0;
        let targetX = 0;
        let targetY = 0;
        let bounds = null;
        let chapter = -1;
        let material = 'lino';
        let headerHeight = 94;
        let disposing = false;

        try {
            const saved = window.sessionStorage.getItem(storageKey);
            if (saved === 'on' || saved === 'off') preference = saved === 'on';
        } catch (error) {
            // Private browsing may block session storage; the controls still work.
        }

        function setState(state) {
            section.dataset.sceneState = state;
            toggle.setAttribute('aria-busy', String(state === 'loading'));
            toggle.setAttribute('aria-pressed', String(active));
            status.textContent = state === 'loading' ? 'Cargando 3D…' : active ? 'Vista 3D activa' : 'Ver en 3D';
            document.body.classList.toggle('perf-high', active);
            document.body.classList.toggle('perf-low', !active);
            section.classList.toggle('showroom-live', active);
            if (hint) hint.textContent = active ? 'Deslice para descubrir la forma ↓' : 'Elija un tono para explorar el tapizado.';
        }

        function updateChapter(value) {
            const next = Math.min(2, Math.floor(value * 3));
            if (next === chapter) return;
            chapter = next;
            if (chapterLabel) chapterLabel.textContent = chapters[next][0];
            if (chapterTitle) chapterTitle.textContent = chapters[next][1];
            if (chapterDescription) chapterDescription.textContent = chapters[next][2];
        }

        function stopAnimation() {
            if (frame !== null) window.cancelAnimationFrame(frame);
            frame = null;
            stage.classList.remove('spatial-active');
        }

        function releaseScene() {
            if (!scene) return;
            const previous = scene;
            scene = null;
            disposing = true;
            previous.dispose();
            disposing = false;
        }

        function staticView(state = 'static') {
            const wasActive = active;
            active = false;
            stopAnimation();
            // Keep the viewport inside the section when its scroll story collapses.
            const top = section.getBoundingClientRect().top;
            const inside = wasActive && top < headerHeight && section.getBoundingClientRect().bottom > headerHeight;
            setState(state);
            releaseScene();
            pointerX = pointerY = targetX = targetY = 0;
            progress = targetProgress = 0;
            section.dataset.progress = '0';
            stage.style.setProperty('--showroom-progress', '0');
            updateChapter(0);
            if (inside) {
                window.scrollTo({ top: Math.max(0, window.scrollY + section.getBoundingClientRect().top - headerHeight), behavior: 'instant' });
            }
        }

        function fail() {
            if (disposing) return;
            failed = true;
            requested = false;
            staticView('failed');
            toggle.disabled = true;
            status.textContent = 'Vista estática';
            if (announcement) announcement.textContent = 'Mostramos la vista estática porque el recorrido 3D no está disponible en este dispositivo.';
        }

        function updateBounds() {
            const header = document.querySelector('.site-header');
            headerHeight = header ? header.getBoundingClientRect().height : 0;
            section.style.setProperty('--scene-header', headerHeight + 'px');
            bounds = host.getBoundingClientRect();
        }

        function readScroll() {
            if (!active || !visible || document.hidden) return;
            const rect = section.getBoundingClientRect();
            const distance = Math.max(1, section.offsetHeight - stage.offsetHeight);
            targetProgress = Math.max(0, Math.min(1, (headerHeight - rect.top) / distance));
        }

        function render(time) {
            frame = null;
            if (!active || !scene || !visible || document.hidden) {
                stopAnimation();
                return;
            }
            if (previousTime) {
                const elapsed = time - previousTime;
                if (elapsed > 55) slowFrames++;
                else if (elapsed < 35) slowFrames = Math.max(0, slowFrames - 1);
                if (slowFrames >= 12) {
                    if (!reducedQuality && typeof scene.setQuality === 'function') {
                        reducedQuality = true;
                        scene.setQuality('low');
                        slowFrames = 0;
                    } else {
                        limited = true;
                        requested = false;
                        staticView();
                        if (announcement) announcement.textContent = 'Mostramos la vista ligera para mantener la fluidez.';
                        return;
                    }
                }
            }
            previousTime = time;
            progress += (targetProgress - progress) * 0.16;
            pointerX += (targetX - pointerX) * 0.14;
            pointerY += (targetY - pointerY) * 0.14;
            const settled = Math.abs(targetProgress - progress) < 0.0005 && Math.abs(targetX - pointerX) < 0.001 && Math.abs(targetY - pointerY) < 0.001;
            if (settled) {
                progress = targetProgress;
                pointerX = targetX;
                pointerY = targetY;
            }
            try {
                scene.setProgress(progress);
                scene.setPointer(pointerX, pointerY);
                scene.render();
            } catch (error) {
                fail();
                return;
            }
            section.dataset.progress = progress.toFixed(4);
            stage.style.setProperty('--showroom-progress', progress.toFixed(4));
            updateChapter(progress);
            if (settled) stopAnimation();
            else frame = window.requestAnimationFrame(render);
        }

        function startAnimation() {
            if (!active || !scene || !visible || document.hidden || frame !== null) return;
            previousTime = 0;
            slowFrames = 0;
            stage.classList.add('spatial-active');
            frame = window.requestAnimationFrame(render);
        }

        async function activate() {
            if (active || loading || !requested || !visible || document.hidden) return;
            setState('loading');
            loading = import('./furniture3d.js').then(async function (module) {
                if (!requested || !visible || document.hidden) return null;
                return module.createFurnitureScene(host, { onFailure: fail });
            });
            try {
                const created = await loading;
                loading = null;
                if (!created) {
                    if (requested && visible && !document.hidden) activate();
                    else if (!active) setState(failed ? 'failed' : 'static');
                    return;
                }
                if (!requested || failed) {
                    disposing = true;
                    created.dispose();
                    disposing = false;
                    return;
                }
                scene = created;
                reducedQuality = false;
                scene.setMaterial(material);
                active = true;
                setState('ready');
                updateBounds();
                scene.resize();
                readScroll();
                startAnimation();
            } catch (error) {
                loading = null;
                fail();
            }
        }

        function applyPolicy() {
            const blocked = !supported || motionQuery.matches || Boolean(connection && connection.saveData);
            const hardwareSuitable = navigator.hardwareConcurrency >= 4 && (typeof navigator.deviceMemory !== 'number' || navigator.deviceMemory >= 4);
            const automatic = hardwareSuitable && hoverQuery && hoverQuery.matches;
            requested = !blocked && !failed && !limited && (preference === null ? automatic : preference);
            toggle.disabled = blocked || failed;
            if (requested) activate();
            else staticView(failed ? 'failed' : 'static');
        }

        toggle.addEventListener('click', function () {
            preference = !requested;
            limited = false;
            try { window.sessionStorage.setItem(storageKey, preference ? 'on' : 'off'); } catch (error) {}
            applyPolicy();
        });

        materialButtons.forEach(function (button) {
            button.addEventListener('click', function () {
                const selected = button.dataset.material;
                if (!fabrics[selected]) return;
                material = selected;
                // Matching pre-rendered posters keep material selection available without WebGL.
                poster.src = 'assets/sofa3d/sofa-' + selected + '.webp';
                poster.alt = 'Modelo de un sofá de tres plazas en ' + fabrics[selected].description + ' y patas de madera';
                materialButtons.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
                const label = document.getElementById('materialStatus');
                if (label) label.textContent = fabrics[selected].label;
                if (scene) {
                    scene.setMaterial(selected);
                    startAnimation();
                }
            });
        });
        const swatches = document.querySelector('.material-swatches');
        if (swatches) swatches.hidden = false;
        toggle.hidden = false;
        updateBounds();
        updateChapter(0);

        if (supported) {
            const observer = new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                if (visible) {
                    updateBounds();
                    if (requested && !active) activate();
                    else if (active) {
                        readScroll();
                        startAnimation();
                    }
                } else {
                    stopAnimation();
                }
            }, { rootMargin: '180px 0px' });
            observer.observe(section);
            window.addEventListener('scroll', function () {
                if (!active || !visible || document.hidden) return;
                readScroll();
                startAnimation();
            }, { passive: true });
            window.addEventListener('resize', function () {
                updateBounds();
                if (scene) scene.resize();
                readScroll();
                startAnimation();
            }, { passive: true });
            host.addEventListener('pointerenter', updateBounds, { passive: true });
            host.addEventListener('pointermove', function (event) {
                if (!active || !visible || event.pointerType === 'touch') return;
                if (!bounds || !bounds.width || !bounds.height) updateBounds();
                if (!bounds.width || !bounds.height) return;
                targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
                targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
                startAnimation();
            }, { passive: true });
            host.addEventListener('pointerleave', function () {
                targetX = targetY = 0;
                startAnimation();
            }, { passive: true });
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) stopAnimation();
                else if (requested && !active) activate();
                else { readScroll(); startAnimation(); }
            });
            [motionQuery, hoverQuery].forEach(function (query) {
                if (query.addEventListener) query.addEventListener('change', applyPolicy);
                else if (query.addListener) query.addListener(applyPolicy);
            });
            if (connection && connection.addEventListener) connection.addEventListener('change', applyPolicy);
            window.addEventListener('pagehide', function () { stopAnimation(); releaseScene(); active = false; setState('static'); });
            window.addEventListener('pageshow', function (event) { if (event.persisted) applyPolicy(); });
        }
        applyPolicy();
    }

    const filterButtons = Array.from(document.querySelectorAll('.filter-btn'));
    const cards = Array.from(document.querySelectorAll('.work-card'));
    const moreButton = document.getElementById('showMoreBtn');
    const catalogStatus = document.getElementById('catalogStatus');
    const initialButton = filterButtons.find(function (button) { return button.getAttribute('aria-pressed') === 'true'; });
    let activeFilter = initialButton ? initialButton.dataset.filter : 'all';
    let expanded = false;
    const initialCount = 6;

    function updateCatalog() {
        const matching = cards.filter(function (card) {
            return activeFilter === 'all' || card.dataset.category === activeFilter;
        });
        const shown = expanded ? matching.length : Math.min(initialCount, matching.length);
        cards.forEach(function (card) { card.hidden = true; });
        matching.slice(0, shown).forEach(function (card) { card.hidden = false; });
        filterButtons.forEach(function (button) {
            const selected = button.dataset.filter === activeFilter;
            button.setAttribute('aria-pressed', String(selected));
            button.classList.toggle('is-active', selected);
        });

        if (moreButton) {
            moreButton.hidden = matching.length <= initialCount;
            moreButton.setAttribute('aria-expanded', String(expanded));
            moreButton.textContent = expanded ? 'Ver menos trabajos' : 'Ver los ' + matching.length + ' trabajos';
        }
        if (catalogStatus) {
            catalogStatus.textContent = matching.length ? 'Mostrando ' + shown + ' de ' + matching.length + ' trabajos.' : 'No hay trabajos en esta categoría.';
        }
    }

    filterButtons.forEach(function (button) {
        button.addEventListener('click', function () {
            activeFilter = button.dataset.filter;
            expanded = false;
            updateCatalog();
        });
    });
    if (moreButton) {
        moreButton.addEventListener('click', function () {
            expanded = !expanded;
            updateCatalog();
            if (!expanded) moreButton.scrollIntoView({ block: 'nearest' });
        });
    }
    if (cards.length) {
        updateCatalog();
        const filterBar = document.querySelector('.filter-bar');
        if (filterBar) filterBar.hidden = false;
    }
})();

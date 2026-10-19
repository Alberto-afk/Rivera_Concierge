(function () {
    'use strict';

    const body = document.body;
    const section = document.getElementById('espacio-3d');
    const stage = document.getElementById('spatialStage');
    const toggle = document.getElementById('perfToggleBtn');
    const status = document.getElementById('perfStatusLabel');
    const planes = Array.from(document.querySelectorAll('.spatial-plane')).map(function (element) {
        return { element: element, speed: Number(element.dataset.speed) || 0.05 };
    });

    if (section && stage && toggle && status && planes.length) {
        const motionQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
        const hoverQuery = window.matchMedia ? window.matchMedia('(hover: hover) and (pointer: fine)') : null;
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const supported = Boolean(motionQuery && hoverQuery && window.IntersectionObserver && window.requestAnimationFrame && window.cancelAnimationFrame);
        const storageKey = 'rivera-motion';
        let preference = null;
        let enabled = false;
        let visible = false;
        let runtimeLimited = false;
        let frame = null;
        let previousTime = 0;
        let slowFrames = 0;
        let bounds = null;
        let pointerX = 0;
        let pointerY = 0;
        let scrollOffset = 0;
        let targetX = 0;
        let targetY = 0;
        let targetScroll = 0;

        try {
            const saved = window.sessionStorage.getItem(storageKey);
            if (saved === 'on' || saved === 'off') preference = saved === 'on';
        } catch (error) {
            // La navegación privada puede impedir guardar esta preferencia.
        }

        function stopAnimation() {
            if (frame !== null) window.cancelAnimationFrame(frame);
            frame = null;
            stage.classList.remove('spatial-active');
        }

        function clearTransforms() {
            pointerX = pointerY = targetX = targetY = 0;
            scrollOffset = targetScroll = 0;
            planes.forEach(function (plane) {
                plane.element.style.removeProperty('--pointer-x');
                plane.element.style.removeProperty('--pointer-y');
                plane.element.style.removeProperty('--scroll-y');
            });
        }

        function updateBounds() {
            if (!enabled || !visible) return;
            bounds = stage.getBoundingClientRect();
            const center = bounds.top + bounds.height / 2;
            targetScroll = Math.max(-100, Math.min(100, (window.innerHeight / 2 - center) * 0.14));
        }

        function render(time) {
            frame = null;
            if (!enabled || !visible || document.hidden) {
                stopAnimation();
                return;
            }

            if (previousTime) {
                const elapsed = time - previousTime;
                if (elapsed > 40 && elapsed < 200) slowFrames += 1;
                else if (elapsed < 27) slowFrames = Math.max(0, slowFrames - 1);
                if (slowFrames >= 10) {
                    runtimeLimited = true;
                    applyMode();
                    return;
                }
            }
            previousTime = time;

            pointerX += (targetX - pointerX) * 0.14;
            pointerY += (targetY - pointerY) * 0.14;
            scrollOffset += (targetScroll - scrollOffset) * 0.14;
            const settled = Math.abs(targetX - pointerX) < 0.001 && Math.abs(targetY - pointerY) < 0.001 && Math.abs(targetScroll - scrollOffset) < 0.05;

            if (settled) {
                pointerX = targetX;
                pointerY = targetY;
                scrollOffset = targetScroll;
            }

            planes.forEach(function (plane) {
                plane.element.style.setProperty('--pointer-x', pointerX.toFixed(3));
                plane.element.style.setProperty('--pointer-y', pointerY.toFixed(3));
                plane.element.style.setProperty('--scroll-y', (scrollOffset * plane.speed * 4).toFixed(2) + 'px');
            });

            if (settled) stopAnimation();
            else frame = window.requestAnimationFrame(render);
        }

        function startAnimation() {
            if (!enabled || !visible || document.hidden || frame !== null) return;
            previousTime = 0;
            slowFrames = 0;
            stage.classList.add('spatial-active');
            frame = window.requestAnimationFrame(render);
        }

        function applyMode() {
            const blocked = !supported || motionQuery.matches || Boolean(connection && connection.saveData);
            const hardwareSuitable = navigator.hardwareConcurrency >= 4 && (typeof navigator.deviceMemory !== 'number' || navigator.deviceMemory >= 4);
            const automatic = hardwareSuitable && hoverQuery && hoverQuery.matches;
            enabled = !blocked && !runtimeLimited && (preference === null ? automatic : preference);
            body.classList.toggle('perf-high', enabled);
            body.classList.toggle('perf-low', !enabled);
            toggle.disabled = blocked;
            toggle.setAttribute('aria-pressed', String(enabled));
            status.textContent = enabled ? 'Movimiento activo' : 'Vista estática';

            if (enabled) {
                updateBounds();
                startAnimation();
            } else {
                stopAnimation();
                clearTransforms();
            }
        }

        toggle.addEventListener('click', function () {
            preference = !enabled;
            runtimeLimited = false;
            try {
                window.sessionStorage.setItem(storageKey, preference ? 'on' : 'off');
            } catch (error) {
                // El control sigue funcionando cuando no hay almacenamiento.
            }
            applyMode();
        });

        if (supported) {
            const observer = new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
                if (visible) {
                    updateBounds();
                    startAnimation();
                } else {
                    targetX = targetY = 0;
                    stopAnimation();
                }
            });
            observer.observe(section);

            window.addEventListener('scroll', function () {
                if (!enabled || !visible || document.hidden) return;
                updateBounds();
                startAnimation();
            }, { passive: true });

            window.addEventListener('resize', function () {
                updateBounds();
                startAnimation();
            }, { passive: true });

            stage.addEventListener('pointerenter', updateBounds, { passive: true });
            stage.addEventListener('pointermove', function (event) {
                if (!enabled || !visible || event.pointerType === 'touch') return;
                if (!bounds) updateBounds();
                if (!bounds || !bounds.width || !bounds.height) return;
                targetX = Math.max(-1, Math.min(1, ((event.clientX - bounds.left) / bounds.width - 0.5) * 2));
                targetY = Math.max(-1, Math.min(1, ((event.clientY - bounds.top) / bounds.height - 0.5) * 2));
                startAnimation();
            }, { passive: true });

            stage.addEventListener('pointerleave', function () {
                targetX = targetY = 0;
                startAnimation();
            }, { passive: true });

            document.addEventListener('visibilitychange', function () {
                if (document.hidden) stopAnimation();
                else {
                    updateBounds();
                    startAnimation();
                }
            });

            [motionQuery, hoverQuery].forEach(function (query) {
                if (query.addEventListener) query.addEventListener('change', applyMode);
                else if (query.addListener) query.addListener(applyMode);
            });
            if (connection && connection.addEventListener) connection.addEventListener('change', applyMode);
        }

        // Sólo hay trabajo de animación mientras la vista visible cambia.
        toggle.hidden = false;
        applyMode();
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

/* Apply before paint; preference survives navigation and reload. */
(function () {
    'use strict';
    const root = document.documentElement;
    let preference;
    try { preference = localStorage.getItem('rivera-theme'); } catch (_) {}
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    let theme = preference === 'light' || preference === 'dark' ? preference : (system.matches ? 'dark' : 'light');
    function apply(value) {
        theme = value;
        root.dataset.theme = theme;
        root.style.colorScheme = theme;
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.content = theme === 'dark' ? '#050505' : '#f5f2ec';
        const button = document.querySelector('.theme-toggle');
        if (button) {
            button.hidden = false;
            button.setAttribute('aria-pressed', String(theme === 'dark'));
            button.querySelector('.theme-toggle-label').textContent = theme === 'dark' ? 'Oscuro' : 'Claro';
            button.title = theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
        }
    }
    apply(theme);
    document.addEventListener('DOMContentLoaded', function () {
        apply(theme);
        document.querySelector('.theme-toggle')?.addEventListener('click', function () {
            preference = theme === 'dark' ? 'light' : 'dark';
            apply(preference);
            try { localStorage.setItem('rivera-theme', preference); } catch (_) {}
        });
    });
    system.addEventListener('change', function (event) { if (!preference) apply(event.matches ? 'dark' : 'light'); });
    window.addEventListener('storage', function (event) {
        if (event.key !== 'rivera-theme') return;
        preference = event.newValue;
        apply(preference === 'dark' || preference === 'light' ? preference : (system.matches ? 'dark' : 'light'));
    });
}());

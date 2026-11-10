const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const source = fs.readFileSync(require('node:path').join(__dirname, '../hero-collage.js'), 'utf8');
function setup({ reduced = false, desktop = true, saveData = false, cores = 8 } = {}) {
    const events = {}, media = {}, pending = new Map();
    let observer, sequence = 0, top = 95;
    const classes = new Set();
    const cards = Array.from({ length: 6 }, () => ({ style: { removeProperty() { delete this.transform; } } }));
    const hero = { classList: { toggle(key, on) { on ? classes.add(key) : classes.delete(key); } }, dataset: {}, offsetHeight: 1530, getBoundingClientRect: () => ({ top }) };
    const stage = { offsetHeight: 808, clientWidth: 1313, clientHeight: 808, addEventListener(name, fn) { events[name] = fn; }, getBoundingClientRect: () => ({ left: 56, top: 92, width: 1313, height: 808 }) };
    const document = { hidden: false, querySelector: s => s === '.hero' ? hero : stage, querySelectorAll: () => cards, addEventListener(name, fn) { events[name] = fn; } };
    const context = { document, navigator: { hardwareConcurrency: cores, deviceMemory: 8, connection: { saveData, addEventListener(name, fn) { events.connection = fn; } } }, matchMedia(query) { const key = query.includes('reduced') ? 'reduced' : 'desktop'; return media[key] = { matches: key === 'reduced' ? reduced : desktop, addEventListener(name, fn) { this.change = fn; } }; }, IntersectionObserver: class { constructor(fn) { observer = fn; } observe() {} }, requestAnimationFrame(fn) { pending.set(++sequence, fn); return sequence; }, cancelAnimationFrame(id) { pending.delete(id); }, getComputedStyle: () => ({ top: '92px' }), addEventListener(name, fn) { events[name] = fn; } };
    context.window = context;
    vm.runInNewContext(source, context);
    return { hero, cards, classes, events, media, document, pending, visible(on) { observer([{ isIntersecting: on }]); }, scroll(y) { top = 95 - y; events.scroll(); }, flush() { const tasks = [...pending.values()]; pending.clear(); tasks.forEach(fn => fn()); } };
}
const s = setup();
s.visible(true); s.flush();
const start = s.cards.map(c => c.style.transform);
assert.equal(s.pending.size, 0, 'no idle loop');
s.scroll(360); s.events.scroll(); assert.equal(s.pending.size, 1, 'coalesce scroll events'); s.flush();
assert(Number(s.hero.dataset.collageProgress) > .4);
s.scroll(725); s.flush(); assert.equal(new Set(s.cards.map(c => c.style.transform)).size, 1, 'all cards converge');
s.scroll(0); s.flush(); assert.deepEqual(s.cards.map(c => c.style.transform), start, 'reverse to original composition');
s.visible(false); s.scroll(200); assert.equal(s.pending.size, 0, 'offscreen pause');
s.visible(true); s.document.hidden = true; s.events.visibilitychange(); assert.equal(s.pending.size, 0, 'hidden tab pause');
s.document.hidden = false; s.events.visibilitychange(); s.flush();
s.media.reduced.matches = true; s.media.reduced.change(); assert(!s.classes.has('collage-live')); assert(s.cards.every(c => !c.style.transform));
for (const options of [{ reduced: true }, { desktop: false }, { saveData: true }, { cores: 2 }]) {
    const light = setup(options); light.visible(true); light.scroll(400);
    assert(!light.classes.has('collage-live')); assert.equal(light.pending.size, 0);
}
console.log('PASS: convergence, reverse, event coalescing, idle/offscreen/hidden pauses, live reduced-motion change, mobile/data/hardware fallbacks');

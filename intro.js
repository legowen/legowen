// Opening screen, like the reference site's "Cooking your ramen… 98%" then START.
// The percentage follows real loading: the page, the fonts, the 3D module and the first 3D frame
// (app.js sends `owen:progress` and `owen:ready`). If anything stalls, START appears anyway.
// Shown once per browser tab: sessionStorage remembers it. `?intro=0` skips it (used by tests).
window.__introAlive = true;
const root = document.documentElement;
const intro = document.getElementById('intro');
const KEY = 'owen-intro';

function remember() { try { sessionStorage.setItem(KEY, 'done'); } catch { /* storage can be blocked */ } }

if (!intro || !root.classList.contains('intro-open')) {
  intro?.remove();
  root.classList.remove('intro-open');
} else {
  const status = intro.querySelector('.intro-status b'), bar = intro.querySelector('.bar'), start = intro.querySelector('.intro-start');
  const behind = [...document.body.children].filter(el => el !== intro && el.tagName !== 'SCRIPT');
  behind.forEach(el => { el.inert = true; });
  let target = .06, shown = 0, ready = false, last = 0, finished = false;
  const reach = value => { target = Math.max(target, value); };
  addEventListener('owen:progress', event => reach(Number(event.detail) || 0));
  addEventListener('owen:ready', () => { ready = true; });
  if (document.readyState !== 'loading') reach(.2); else document.addEventListener('DOMContentLoaded', () => reach(.2), { once: true });
  const loaded = () => { reach(.42); document.fonts?.ready.then(() => reach(.5)); setTimeout(() => { ready = true; }, 14000); };
  if (document.readyState === 'complete') loaded(); else addEventListener('load', loaded, { once: true });
  setTimeout(() => { ready = true; }, 25000); // never keep a visitor waiting on a stuck network

  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, .1) : 0; last = now;
    if (!ready) target = Math.min(.96, target + dt * .012); // keep creeping so it never looks frozen
    const goal = ready ? 1 : Math.min(target, .96);
    shown += (goal - shown) * Math.min(1, dt * (ready ? 4 : 2.4));
    if (ready && goal - shown < .004) shown = 1;
    const pct = Math.floor(shown * 100);
    status.textContent = `${pct}%`;
    bar.setAttribute('width', String(Math.round(120 * shown)));
    if (shown >= 1) { setTimeout(showStart, 280); return; }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function showStart() {
    if (finished) return; finished = true;
    start.hidden = false; void start.offsetWidth; // let the button render once so it can fade in
    intro.classList.add('is-ready');
    intro.querySelector('.intro-sr').textContent = 'Ready. Press Start to enter.';
    start.focus({ preventScroll: true });
  }
  start.addEventListener('click', () => {
    remember();
    behind.forEach(el => { el.inert = false; });
    intro.classList.add('is-leaving');
    root.classList.remove('intro-open');
    dispatchEvent(new CustomEvent('owen:start'));
    if (location.hash.length > 1) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: 'instant' });
    setTimeout(() => intro.remove(), 800);
  });
}

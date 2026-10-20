// Bomi and Seoli at the bottom edge of the page.
// They use the same sprite sheets and poses as the 3D room (see cat-brain.js), but live on a single line:
// walk, run, sit, groom, nap and stretch, and now and then visit or play with each other.
// The layer never takes clicks, and the loop only runs while the cats are visible and allowed to move.
import { ANIM, frameAt, frameCell, mulberry32, pickWeighted } from './cat-brain.js?v=5';

const WALK = 24, RUN = 120;          // pixels per second
const between = (rng, a, b) => a + rng() * (b - a);

export function createSiteCats({ layer, getMax }) {
  const cats = [...layer.querySelectorAll('.roaming-cat')].map((el, i) => ({
    el, sprite: el.firstElementChild, rng: mulberry32(11 + i * 17), i,
    x: 70 + i * 130, flip: 1, state: 'idle', anim: 'idle', t: 0, left: 1 + i, target: 0, frame: -1, lift: 0,
  }));
  let moving = true, visible = true, raf = 0, last = 0;

  function setState(cat, state, duration = Infinity, extra = {}) {
    cat.state = state; cat.anim = ANIM[state] ? state : 'idle'; cat.t = 0; cat.left = duration;
    Object.assign(cat, extra);
  }
  const toward = (cat, x) => { if (Math.abs(x - cat.x) > 1) cat.flip = x > cat.x ? 1 : -1; };

  function decide(cat) {
    const max = getMax(), other = cats[1 - cat.i], gap = other.x - cat.x;
    const close = Math.abs(gap) < 120, awake = other.state !== 'sleep';
    const pick = pickWeighted(cat.rng, [
      ['idle', 3], ['walk', 4], ['groom', 2], ['sleep', 1.2], ['run', .7],
      ['visit', close ? 0 : 2], ['play', close && awake ? 3 : 0], ['greet', close && awake ? 2 : 0],
    ]);
    if (pick === 'walk' || pick === 'run') {
      const far = pick === 'run' ? 220 : 80;
      let target = between(cat.rng, 0, max);
      if (Math.abs(target - cat.x) < far) target = cat.x + (cat.x > max / 2 ? -1 : 1) * Math.min(far * 1.6, max);
      target = Math.max(0, Math.min(max, target));
      toward(cat, target); setState(cat, pick, Infinity, { target });
    } else if (pick === 'visit') {
      const stand = Math.max(0, Math.min(max, other.x - Math.sign(gap || 1) * 52));
      toward(cat, stand); setState(cat, 'walk', Infinity, { target: stand });
    } else if (pick === 'play') {
      toward(cat, other.x); setState(cat, 'play', between(cat.rng, 2.2, 3.6));
    } else if (pick === 'greet') {
      toward(cat, other.x); setState(cat, 'greet', 1.5);
      if (other.state === 'idle' && cat.rng() < .5) { toward(other, cat.x); setState(other, 'greet', 1.5); }
    } else if (pick === 'sleep') setState(cat, 'sleep', between(cat.rng, 9, 17));
    else if (pick === 'groom') setState(cat, 'groom', between(cat.rng, 2.2, 4.2));
    else setState(cat, 'idle', between(cat.rng, 2.4, 6));
  }

  function step(cat, dt) {
    cat.t += dt;
    const max = getMax();
    if (cat.x > max) cat.x = max;
    if (cat.state === 'walk' || cat.state === 'run') {
      cat.target = Math.min(cat.target, max);
      const dir = Math.sign(cat.target - cat.x) || 1; cat.flip = dir;
      cat.x += dir * (cat.state === 'run' ? RUN : WALK) * dt;
      if ((dir > 0 && cat.x >= cat.target) || (dir < 0 && cat.x <= cat.target)) { cat.x = cat.target; decide(cat); }
    } else if ((cat.left -= dt) <= 0) {
      if (cat.state === 'sleep') setState(cat, 'stretch', 1.7); else decide(cat);
    }
  }

  function draw(cat) {
    const { col, row } = frameCell(frameAt(cat.anim, cat.t));
    const frame = row * 4 + col;
    if (frame !== cat.frame) {
      cat.frame = frame;
      cat.sprite.style.setProperty('--frame-x', `${col * 100 / 3}%`);
      cat.sprite.style.setProperty('--frame-y', `${row * 100 / 3}%`);
    }
    cat.el.style.transform = `translate3d(${cat.x.toFixed(1)}px,0,0)`;
    cat.sprite.style.transform = cat.flip < 0 ? 'scaleX(-1)' : '';
    cat.el.style.bottom = `${7 + cat.i * 5}px`;
  }

  function tick(now) {
    raf = 0;
    if (!moving || !visible || document.hidden) return;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    for (const cat of cats) { step(cat, dt); draw(cat); }
    raf = requestAnimationFrame(tick);
  }
  function wake() { if (!raf && moving && visible && !document.hidden) { last = 0; raf = requestAnimationFrame(tick); } }
  function halt() { if (raf) cancelAnimationFrame(raf); raf = 0; }

  document.addEventListener('visibilitychange', () => (document.hidden ? halt() : wake()));

  function setMoving(value) {
    moving = !!value;
    for (const cat of cats) {
      if (moving) { if (cat.state === 'sleep') setState(cat, 'stretch', 1.4); }
      else setState(cat, 'sleep');
      draw(cat);
    }
    moving ? wake() : halt();
  }
  function setVisible(value) { visible = !!value; visible ? wake() : halt(); }

  for (const cat of cats) { cat.x = Math.min(cat.x, getMax()); draw(cat); }
  wake();
  return { setMoving, setVisible, cats };
}

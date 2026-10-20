// Photos of Bomi, Seoli and Owen that float around the two pixel cats in the About section.
// They circle the cats inside the card only, pause when the section is off screen or a photo is
// hovered, and stand still when the visitor prefers reduced motion or has paused the cats.
const PHOTOS = [
  { src: 'assets/about/seoli-fountain.webp', alt: 'Seoli sitting by the water fountain', shape: 'heart', glow: '#ff6fae' },
  { src: 'assets/about/bomi-looks-up.webp', alt: 'Bomi looking up from the floor', shape: 'star', glow: '#ffd36e' },
  { src: 'assets/about/bomi-seoli-bed.webp', alt: 'Bomi and Seoli resting together', shape: 'heart', glow: '#bfaff1' },
  { src: 'assets/about/bomi-seoli-floor.webp', alt: 'Bomi and Seoli stretched out on the floor', shape: 'star', glow: '#2ee6ff' },
  { src: 'assets/about/owen-bomi.webp', alt: 'Owen hugging Bomi on the sofa', shape: 'heart', glow: '#ff6fae' },
];
const TURN_SECONDS = 70; // one slow lap around the cats

export function mountAboutPhotos(card, { moving = true } = {}) {
  if (!card) return { setMoving() {} };
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const list = document.createElement('ul');
  list.className = 'photo-orbit';
  list.setAttribute('aria-label', 'Photos of Bomi and Seoli');
  const items = PHOTOS.map(photo => {
    const item = document.createElement('li');
    item.className = `orbit-photo is-${photo.shape}`;
    item.style.setProperty('--glow', photo.glow);
    const frame = document.createElement('span');
    frame.className = 'orbit-frame';
    const img = document.createElement('img');
    Object.assign(img, { src: photo.src, alt: photo.alt, width: 360, height: 360, loading: 'lazy', decoding: 'async' });
    frame.append(img); item.append(frame); list.append(item);
    return item;
  });
  card.append(list);

  let geo = null, angle = -Math.PI / 2, time = 0, last = 0, raf = 0, inView = false, held = false, allowed = moving;

  // The orbit is centred on the two cats and stays inside the card on every screen size.
  function measure() {
    const box = card.getBoundingClientRect();
    if (!box.width) return;
    const parts = [...card.querySelectorAll(':scope > div, :scope > span')].map(el => el.getBoundingClientRect());
    const left = Math.min(...parts.map(r => r.left)) - box.left, right = Math.max(...parts.map(r => r.right)) - box.left;
    const top = Math.min(...parts.map(r => r.top)) - box.top, bottom = Math.max(...parts.map(r => r.bottom)) - box.top;
    const size = Math.round(Math.min(112, Math.max(60, box.width * .16)));
    const cx = (left + right) / 2, cy = (top + bottom) / 2, edge = size / 2 + 6;
    geo = { size, cx, cy, rx: Math.max(0, Math.min(cx, box.width - cx) - edge), up: Math.max(0, cy - edge), down: Math.max(0, box.height - cy - edge) };
    list.style.setProperty('--photo', `${size}px`);
    place();
  }

  function place() {
    if (!geo) return;
    const still = reduced.matches || !allowed;
    items.forEach((item, i) => {
      const a = angle + i * Math.PI * 2 / items.length;
      const sin = Math.sin(a);
      const bob = still ? 0 : Math.sin(time * 1.1 + i * 1.7) * 5;
      const tilt = still ? (i % 2 ? 6 : -6) : Math.sin(time * .7 + i) * 8;
      const x = geo.cx + Math.cos(a) * geo.rx - geo.size / 2;
      const y = geo.cy + sin * (sin < 0 ? geo.up : geo.down) - geo.size / 2 + bob;
      const scale = .9 + (sin + 1) * .06; // a little larger at the front of the lap
      item.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) rotate(${tilt.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      item.style.zIndex = String(sin > 0 ? 3 : 2);
    });
  }

  function frame(now) {
    raf = 0;
    const dt = last ? Math.min((now - last) / 1000, .05) : 0; last = now;
    time += dt; angle += dt * Math.PI * 2 / TURN_SECONDS;
    place();
    schedule();
  }
  function schedule() {
    const run = inView && !held && allowed && !reduced.matches && !document.hidden;
    if (run && !raf) raf = requestAnimationFrame(frame);
    if (!run) { if (raf) cancelAnimationFrame(raf); raf = 0; last = 0; }
  }

  new ResizeObserver(measure).observe(card);
  new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; schedule(); }, { rootMargin: '80px' }).observe(card);
  list.addEventListener('pointerover', event => { if (event.pointerType === 'mouse') { held = true; schedule(); } });
  list.addEventListener('pointerout', event => { if (event.pointerType === 'mouse' && !list.contains(event.relatedTarget)) { held = false; schedule(); } });
  // Phones have no hover: a tap shows a photo larger and holds the lap until the next tap.
  let zoomed = null;
  function zoom(item) {
    zoomed?.classList.remove('is-zoomed');
    zoomed = item && item !== zoomed ? item : null;
    zoomed?.classList.add('is-zoomed');
    held = !!zoomed; schedule();
  }
  list.addEventListener('click', event => { const item = event.target.closest('.orbit-photo'); if (item && event.pointerType !== 'mouse') zoom(item); });
  document.addEventListener('click', event => { if (zoomed && !list.contains(event.target)) zoom(null); });
  document.addEventListener('visibilitychange', schedule);
  reduced.addEventListener('change', () => { place(); schedule(); });
  measure();
  list.classList.add('is-ready');

  return {
    setMoving(value) { allowed = !!value; place(); schedule(); },
  };
}

// Canvas painting for the 3D room: neon tubes, brick, floor, plaques and small sprites.
// Everything is drawn at runtime, so the room needs no image files except the cat sheets,
// the Boso screenshot and the logo SVGs.
import * as THREE from 'three';
import { mulberry32 } from './cat-brain.js?v=5';

export const NEON = {
  pink: '#ff3d9a', cyan: '#2ee6ff', amber: '#ffb347', mint: '#7dffb2',
  violet: '#a678ff', blue: '#4f8bff', red: '#ff4d5e', white: '#f4f1ff',
};

export function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}

export function toTexture(canvas, { srgb = true, repeat, wrap = false, anisotropy = 4, mip = true } = {}) {
  const texture = new THREE.CanvasTexture(canvas);
  if (srgb) texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = anisotropy;
  texture.generateMipmaps = mip;
  texture.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  if (wrap) texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  if (repeat) texture.repeat.set(repeat[0], repeat[1]);
  return texture;
}

export const rgba = (hex, alpha = 1) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};
export function mix(hexA, hexB, t) {
  const a = parseInt(hexA.slice(1), 16), b = parseInt(hexB.slice(1), 16);
  const ch = s => Math.round(((a >> s) & 255) * (1 - t) + ((b >> s) & 255) * t);
  return `#${((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1)}`;
}

export function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export const SANS = '"Space Grotesk","DM Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
export const BODY = '"DM Sans",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';
export const MONO = 'ui-monospace,"SF Mono","JetBrains Mono",Menlo,Consolas,"Liberation Mono",monospace';

/* ---------- Neon tube lettering ---------- */

// One piece of lettering. `outline` draws hollow letters like a glass tube; otherwise filled.
export function paintNeon(ctx, text, x, y, { size = 120, color = NEON.pink, weight = 700, font = SANS, tube = 7, outline = true, align = 'center', spacing = 0, glow = 1 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if ('letterSpacing' in ctx) ctx.letterSpacing = `${spacing}px`;
  const draw = () => (outline ? ctx.strokeText(text, x, y) : ctx.fillText(text, x, y));
  const passes = [[size * .5, .22 * glow, tube * 3.2], [size * .26, .42 * glow, tube * 2.1], [size * .09, .85, tube * 1.25]];
  for (const [blur, alpha, width] of passes) {
    ctx.shadowColor = color; ctx.shadowBlur = blur;
    ctx.strokeStyle = rgba(color, alpha); ctx.fillStyle = rgba(color, alpha); ctx.lineWidth = width;
    draw();
  }
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
  ctx.strokeStyle = mix(color, '#ffffff', .78); ctx.fillStyle = mix(color, '#ffffff', .78); ctx.lineWidth = Math.max(1.5, tube * .5);
  draw();
  ctx.restore();
}

export function neonCanvas(width, height, draw) {
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, width, height);
  draw(ctx, width, height);
  return canvas;
}

export function paintTubeLine(ctx, points, color, tube = 6, closed = false) {
  ctx.save();
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  const path = () => { ctx.beginPath(); points.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py))); if (closed) ctx.closePath(); };
  for (const [blur, alpha, width] of [[tube * 6, .22, tube * 3], [tube * 3, .45, tube * 2], [tube, .9, tube * 1.2]]) {
    ctx.shadowColor = color; ctx.shadowBlur = blur; ctx.strokeStyle = rgba(color, alpha); ctx.lineWidth = width; path(); ctx.stroke();
  }
  ctx.shadowBlur = 0; ctx.strokeStyle = mix(color, '#ffffff', .78); ctx.lineWidth = Math.max(1.5, tube * .5); path(); ctx.stroke();
  ctx.restore();
}

/* ---------- Surfaces ---------- */

// Dark, slightly purple brick. Returns the colour and a matching height map.
export function brickCanvases({ size = 512, columns = 6, rows = 16, seed = 3, base = '#2a2438', mortar = '#0b0a13' } = {}) {
  const color = makeCanvas(size, size), height = makeCanvas(size, size);
  const c = color.getContext('2d'), h = height.getContext('2d'), rng = mulberry32(seed);
  c.fillStyle = mortar; c.fillRect(0, 0, size, size);
  h.fillStyle = '#000'; h.fillRect(0, 0, size, size);
  const bw = size / columns, bh = size / rows, gap = Math.max(2, size / 170);
  for (let row = 0; row < rows; row++) {
    const shift = row % 2 ? bw / 2 : 0;
    for (let col = -1; col <= columns; col++) {
      const x = col * bw + shift, y = row * bh;
      const tint = (rng() - .5) * .22, warm = rng();
      const baseColor = mix(base, warm > .78 ? '#4a2f45' : warm < .2 ? '#202a40' : '#352c47', .35 + rng() * .25);
      c.fillStyle = mix(baseColor, tint > 0 ? '#6a5a8a' : '#07060d', Math.abs(tint));
      c.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
      const v = 150 + Math.round(rng() * 80);
      h.fillStyle = `rgb(${v},${v},${v})`;
      h.fillRect(x + gap / 2, y + gap / 2, bw - gap, bh - gap);
    }
  }
  const speck = (ctx, n, alpha) => { for (let i = 0; i < n; i++) { const v = rng() > .5 ? 255 : 0; ctx.fillStyle = `rgba(${v},${v},${v},${alpha * rng()})`; ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 2, 1 + rng() * 2); } };
  speck(c, size * 14, .12); speck(h, size * 8, .25);
  return { color, height };
}

// Polished dark concrete with large tile joints.
export function floorCanvas({ size = 1024, tiles = 4, seed = 9 } = {}) {
  const canvas = makeCanvas(size, size), ctx = canvas.getContext('2d'), rng = mulberry32(seed);
  ctx.fillStyle = '#17161f'; ctx.fillRect(0, 0, size, size);
  const t = size / tiles;
  for (let j = 0; j < tiles; j++) for (let i = 0; i < tiles; i++) {
    const v = rng();
    ctx.fillStyle = mix('#1b1a26', v > .5 ? '#262436' : '#12111a', Math.abs(v - .5) * .9);
    ctx.fillRect(i * t, j * t, t, t);
    const g = ctx.createLinearGradient(i * t, j * t, (i + 1) * t, (j + 1) * t);
    g.addColorStop(0, 'rgba(255,255,255,.03)'); g.addColorStop(1, 'rgba(0,0,0,.12)');
    ctx.fillStyle = g; ctx.fillRect(i * t, j * t, t, t);
  }
  for (let n = 0; n < 5200; n++) { const a = rng() * .08; ctx.fillStyle = rng() > .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 2})`; ctx.fillRect(rng() * size, rng() * size, 1 + rng() * 3, 1 + rng() * 3); }
  ctx.strokeStyle = 'rgba(0,0,0,.75)'; ctx.lineWidth = 5;
  for (let k = 0; k <= tiles; k++) { ctx.beginPath(); ctx.moveTo(k * t, 0); ctx.lineTo(k * t, size); ctx.moveTo(0, k * t); ctx.lineTo(size, k * t); ctx.stroke(); }
  ctx.strokeStyle = 'rgba(160,150,255,.07)'; ctx.lineWidth = 2;
  for (let k = 0; k <= tiles; k++) { ctx.beginPath(); ctx.moveTo(k * t + 4, 0); ctx.lineTo(k * t + 4, size); ctx.moveTo(0, k * t + 4); ctx.lineTo(size, k * t + 4); ctx.stroke(); }
  return canvas;
}

// A rug that reads as a circuit board.
export function rugCanvas({ width = 1024, height = 640, seed = 4 } = {}) {
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d'), rng = mulberry32(seed);
  const g = ctx.createLinearGradient(0, 0, width, height);
  g.addColorStop(0, '#2a1d4d'); g.addColorStop(.5, '#1d1840'); g.addColorStop(1, '#2d1a45');
  ctx.fillStyle = g; roundRect(ctx, 0, 0, width, height, 40); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,.05)'; ctx.lineWidth = 1;
  for (let i = 0; i < 4200; i++) { ctx.beginPath(); const x = rng() * width, y = rng() * height; ctx.moveTo(x, y); ctx.lineTo(x + (rng() - .5) * 8, y + (rng() - .5) * 8); ctx.stroke(); }
  const trace = (points, color, w = 5) => { ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.beginPath(); points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke(); const [ex, ey] = points[points.length - 1]; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(ex, ey, w * 1.6, 0, Math.PI * 2); ctx.fill(); };
  const palette = [NEON.pink, NEON.cyan, NEON.violet, NEON.mint];
  for (let n = 0; n < 26; n++) {
    let x = 60 + rng() * (width - 120), y = 60 + rng() * (height - 120);
    const pts = [[x, y]];
    for (let s = 0; s < 3 + Math.floor(rng() * 3); s++) {
      if (rng() > .5) x += (rng() - .5) * 280; else y += (rng() - .5) * 200;
      x = Math.max(50, Math.min(width - 50, x)); y = Math.max(50, Math.min(height - 50, y)); pts.push([x, y]);
    }
    trace(pts, rgba(palette[n % 4], .55), 3 + rng() * 3);
  }
  ctx.fillStyle = '#0f0d1d'; ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 3;
  for (const [x, y, w, h] of [[width * .36, height * .32, 220, 150], [width * .62, height * .58, 150, 110]]) {
    roundRect(ctx, x, y, w, h, 14); ctx.fill(); ctx.stroke();
    for (let k = 0; k < 9; k++) { ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fillRect(x - 14, y + 12 + k * (h - 24) / 9, 14, 5); ctx.fillRect(x + w, y + 12 + k * (h - 24) / 9, 14, 5); }
    ctx.fillStyle = '#0f0d1d';
  }
  ctx.strokeStyle = rgba(NEON.pink, .6); ctx.lineWidth = 8; roundRect(ctx, 14, 14, width - 28, height - 28, 30); ctx.stroke();
  ctx.strokeStyle = rgba(NEON.cyan, .35); ctx.lineWidth = 3; roundRect(ctx, 34, 34, width - 68, height - 68, 20); ctx.stroke();
  return canvas;
}

export function bedCanvas(color = '#6a4bb5') {
  const canvas = makeCanvas(256, 256), ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(128, 128, 6, 128, 128, 126);
  g.addColorStop(0, mix(color, '#ffffff', .22)); g.addColorStop(.6, color); g.addColorStop(1, mix(color, '#000000', .35));
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = 'rgba(255,255,255,.1)'; ctx.lineWidth = 2;
  for (let r = 14; r < 126; r += 10) { ctx.beginPath(); ctx.arc(128, 128, r, 0, Math.PI * 2); ctx.stroke(); }
  return canvas;
}

/* ---------- Sprites and decals ---------- */

let glowCache = null;
export function glowTexture() {
  if (glowCache) return glowCache;
  const canvas = makeCanvas(128, 128), ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  glowCache = toTexture(canvas, { mip: false });
  return glowCache;
}

let shadowCache = null;
export function shadowTexture() {
  if (shadowCache) return shadowCache;
  const canvas = makeCanvas(128, 128), ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(0,0,0,.85)'); g.addColorStop(.5, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
  shadowCache = toTexture(canvas, { mip: false });
  return shadowCache;
}

export function heartTexture() {
  const canvas = makeCanvas(64, 64), ctx = canvas.getContext('2d');
  ctx.translate(32, 34); ctx.scale(1.0, 1.0);
  ctx.beginPath();
  ctx.moveTo(0, 16); ctx.bezierCurveTo(-30, -4, -16, -26, 0, -10); ctx.bezierCurveTo(16, -26, 30, -4, 0, 16);
  ctx.shadowColor = NEON.pink; ctx.shadowBlur = 10; ctx.fillStyle = '#ff6fb5'; ctx.fill();
  ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(-9, -8, 4, 2.4, -.6, 0, Math.PI * 2); ctx.fill();
  return toTexture(canvas, { mip: false });
}

// Background: deep violet haze behind the room.
export function backdropTexture(width = 1024, height = 640) {
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  const base = ctx.createLinearGradient(0, 0, 0, height);
  base.addColorStop(0, '#07070f'); base.addColorStop(1, '#0c0a18');
  ctx.fillStyle = base; ctx.fillRect(0, 0, width, height);
  const blob = (x, y, r, c, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, rgba(c, a)); g.addColorStop(1, rgba(c, 0)); ctx.fillStyle = g; ctx.fillRect(0, 0, width, height); };
  blob(width * .72, height * .45, width * .5, '#5b2a8f', .28);
  blob(width * .34, height * .78, width * .34, '#0f5f8f', .16);
  blob(width * .92, height * .12, width * .3, '#a01f66', .14);
  const vignette = ctx.createRadialGradient(width * .6, height * .5, height * .25, width * .6, height * .5, width * .75);
  vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, width, height);
  return toTexture(canvas, { mip: false });
}

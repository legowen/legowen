// Everything that is drawn on a screen, sign or plaque in the 3D room.
// All figures on screens are decorative sample data.
import { NEON, SANS, BODY, MONO, makeCanvas, toTexture, rgba, mix, roundRect, paintNeon, paintTubeLine, neonCanvas } from './room-textures.js?v=5';
import { mulberry32 } from './cat-brain.js?v=5';

export function createScreen(width, height, paint, { fps = 10, state = {}, anisotropy = 4, mip = true } = {}) {
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  const texture = toTexture(canvas, { anisotropy, mip });
  let last = -1e9;
  const screen = {
    canvas, texture, state, fps,
    update(t, force = false) {
      if (!force && t - last < 1 / screen.fps) return false;
      last = t; paint(ctx, width, height, t, state); texture.needsUpdate = true; return true;
    },
  };
  screen.update(0, true);
  return screen;
}

const clamp01 = v => Math.min(1, Math.max(0, v));
const easeOut = v => 1 - Math.pow(1 - clamp01(v), 3);

function sparkline(ctx, x, y, w, h, values, color, { fill = true, width = 3, head = true } = {}) {
  const max = Math.max(...values), min = Math.min(...values), span = Math.max(1e-6, max - min);
  const pt = (v, i) => [x + (i / (values.length - 1)) * w, y + h - ((v - min) / span) * h];
  ctx.save();
  ctx.beginPath(); values.forEach((v, i) => { const [px, py] = pt(v, i); i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); });
  ctx.lineJoin = 'round'; ctx.lineCap = 'round'; ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = 8; ctx.stroke();
  ctx.shadowBlur = 0;
  if (fill) { ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath(); const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, rgba(color, .3)); g.addColorStop(1, rgba(color, 0)); ctx.fillStyle = g; ctx.fill(); }
  if (head) { const [hx, hy] = pt(values[values.length - 1], values.length - 1); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, width * 1.4, 0, Math.PI * 2); ctx.fill(); }
  ctx.restore();
}

/* ---------- Desk: endpoint dashboard ---------- */

export function paintEndpoint(ctx, w, h, t) {
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0d1226'); g.addColorStop(1, '#161034');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  // sidebar
  ctx.fillStyle = 'rgba(255,255,255,.04)'; ctx.fillRect(0, 0, 210, h);
  ctx.fillStyle = NEON.cyan; ctx.font = `700 26px ${SANS}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('ENDPOINTS', 28, 48);
  ['Overview', 'Devices', 'Apps', 'Compliance', 'Policies', 'Reports'].forEach((label, i) => {
    const y = 120 + i * 62;
    if (i === 3) { ctx.fillStyle = 'rgba(46,230,255,.14)'; roundRect(ctx, 14, y - 24, 182, 48, 12); ctx.fill(); ctx.fillStyle = NEON.cyan; ctx.fillRect(14, y - 14, 4, 28); }
    ctx.fillStyle = i === 3 ? '#e8fbff' : '#8e97b8'; roundRect(ctx, 32, y - 9, 18, 18, 5); ctx.fill();
    ctx.font = `500 22px ${BODY}`; ctx.fillText(label, 66, y);
  });
  // header
  ctx.fillStyle = '#f2f4ff'; ctx.font = `700 40px ${SANS}`; ctx.fillText('Device compliance', 250, 52);
  ctx.fillStyle = 'rgba(255,255,255,.08)'; roundRect(ctx, 250 + 336, 34, 150, 36, 18); ctx.fill();
  ctx.fillStyle = '#a9b2d6'; ctx.font = `600 15px ${BODY}`; ctx.textAlign = 'center'; ctx.fillText('SAMPLE DATA', 250 + 336 + 75, 53); ctx.textAlign = 'left';
  // donut
  const cx = 440, cy = 300, r = 118, sweep = easeOut(t / 2.2);
  const parts = [[.94, NEON.mint], [.04, NEON.amber], [.02, NEON.pink]];
  ctx.lineWidth = 30; ctx.strokeStyle = 'rgba(255,255,255,.07)'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  let a0 = -Math.PI / 2;
  for (const [share, color] of parts) {
    const a1 = a0 + share * Math.PI * 2 * sweep;
    ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 14; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(cx, cy, r, a0 + .012, Math.max(a0 + .012, a1 - .012)); ctx.stroke();
    a0 = a1;
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = `700 70px ${SANS}`; ctx.fillText(`${Math.round(94 * sweep)}%`, cx, cy - 6);
  ctx.fillStyle = '#9aa4c8'; ctx.font = `500 22px ${BODY}`; ctx.fillText('compliant', cx, cy + 46);
  ctx.textAlign = 'left';
  [['Compliant', NEON.mint], ['In grace', NEON.amber], ['Action needed', NEON.pink]].forEach(([label, color], i) => {
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(268 + i * 150, 468, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#b4bcdc'; ctx.font = `500 18px ${BODY}`; ctx.fillText(label, 282 + i * 150, 469);
  });
  // platform bars
  const platforms = [['Windows 11', 88, NEON.cyan], ['macOS', 64, NEON.violet], ['iOS / iPadOS', 46, NEON.pink], ['Android', 29, NEON.mint]];
  ctx.fillStyle = '#d7dcf4'; ctx.font = `600 24px ${SANS}`; ctx.fillText('By platform', 720, 130);
  platforms.forEach(([label, value, color], i) => {
    const y = 190 + i * 70, bw = 460 * (value / 100) * easeOut((t - .25 * i) / 1.6);
    ctx.fillStyle = '#aeb6d8'; ctx.font = `500 20px ${BODY}`; ctx.fillText(label, 720, y - 18);
    ctx.fillStyle = 'rgba(255,255,255,.07)'; roundRect(ctx, 720, y, 460, 18, 9); ctx.fill();
    ctx.fillStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 12; roundRect(ctx, 720, y, Math.max(18, bw), 18, 9); ctx.fill(); ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.font = `700 20px ${SANS}`; ctx.fillText(String(Math.round(value * easeOut((t - .25 * i) / 1.6))), 1180, y - 18); ctx.textAlign = 'left';
  });
  // enrolment sparkline
  ctx.fillStyle = '#d7dcf4'; ctx.font = `600 22px ${SANS}`; ctx.fillText('Enrolments · 7 days', 250, 540);
  const base = [3, 5, 4, 7, 6, 9, 8, 11, 10, 13, 12, 15];
  const live = base.map((v, i) => v + Math.sin(t * .8 + i) * .6);
  sparkline(ctx, 250, 560, 700, 100, live, NEON.cyan);
  // status
  ctx.fillStyle = NEON.mint; ctx.beginPath(); ctx.arc(1010, 622, 6 + Math.sin(t * 3) * 1.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#b4bcdc'; ctx.font = `500 19px ${BODY}`; ctx.fillText(`Policy sync healthy · ${String(Math.floor(t) % 60).padStart(2, '0')}s ago`, 1028, 623);
}

/* ---------- Desk: terminal ---------- */

const TERMINAL = [
  { type: 'cmd', text: 'Connect-MgGraph -Scopes "Device.Read.All"' },
  { type: 'out', text: 'Welcome to Microsoft Graph!' },
  { type: 'cmd', text: 'Get-MgDevice -All | Group-Object TrustType' },
  { type: 'out', text: '' },
  { type: 'out', text: 'Count Name      Group' },
  { type: 'out', text: '----- ----      -----' },
  { type: 'out', text: '  142 AzureAd   {…}' },
  { type: 'out', text: '   18 ServerAd  {…}' },
  { type: 'cmd', text: 'Invoke-IntuneSync -Compliance' },
  { type: 'out', text: '✔ policy sync queued for 3 groups' },
];

export function paintTerminal(ctx, w, h, t) {
  ctx.fillStyle = '#0a0d17'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#151a2c'; ctx.fillRect(0, 0, w, 54);
  ['#ff5f6d', '#ffc371', '#7dffb2'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(30 + i * 28, 27, 8, 0, Math.PI * 2); ctx.fill(); });
  ctx.fillStyle = '#8f98ba'; ctx.font = `600 20px ${MONO}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('PowerShell 7  ·  admin', 130, 28);
  const speed = 26, pause = 2.6;
  const total = TERMINAL.reduce((n, l) => n + (l.type === 'cmd' ? l.text.length : 0), 0);
  const cycle = total / speed + 1.2 + pause;
  let chars = Math.min(total, Math.floor((t % cycle) * speed));
  ctx.font = `500 25px ${MONO}`;
  let y = 96;
  for (const line of TERMINAL) {
    if (line.type === 'cmd') {
      const n = Math.min(line.text.length, chars); chars -= n;
      ctx.fillStyle = NEON.cyan; ctx.fillText('PS C:\\>', 24, y);
      const words = line.text.slice(0, n);
      ctx.fillStyle = '#f2f4ff';
      const [first, ...rest] = words.split(' ');
      ctx.fillStyle = NEON.pink; ctx.fillText(first, 140, y);
      ctx.fillStyle = '#f2f4ff'; ctx.fillText(rest.length ? ` ${rest.join(' ')}` : '', 140 + ctx.measureText(first).width, y);
      if (n < line.text.length) { const cw = ctx.measureText(words).width; if (Math.floor(t * 2.4) % 2 === 0) { ctx.fillStyle = NEON.mint; ctx.fillRect(140 + cw + 3, y - 14, 13, 28); } return; }
    } else {
      ctx.fillStyle = line.text.startsWith('✔') ? NEON.mint : '#9ea8cc'; ctx.fillText(line.text, 24, y);
    }
    y += 38;
  }
  if (Math.floor(t * 2.4) % 2 === 0) { ctx.fillStyle = NEON.mint; ctx.fillRect(24, y - 14, 13, 28); }
}

/* ---------- Desk: laptop (Jamf-style) ---------- */

export function paintLaptop(ctx, w, h, t) {
  ctx.fillStyle = '#10142a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = NEON.violet; ctx.font = `700 22px ${SANS}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.fillText('MAC FLEET', 22, 30);
  const rows = [['Smart groups', 128], ['Policies', 42], ['Config profiles', 36], ['Patch titles', 19]];
  rows.forEach(([label, value], i) => {
    const y = 78 + i * 52;
    ctx.fillStyle = 'rgba(255,255,255,.06)'; roundRect(ctx, 18, y - 20, w - 36, 42, 10); ctx.fill();
    ctx.fillStyle = '#c7cdee'; ctx.font = `500 19px ${BODY}`; ctx.fillText(label, 34, y);
    ctx.fillStyle = [NEON.violet, NEON.cyan, NEON.pink, NEON.mint][i]; ctx.textAlign = 'right'; ctx.font = `700 22px ${SANS}`; ctx.fillText(String(value), w - 34, y); ctx.textAlign = 'left';
  });
  ctx.fillStyle = NEON.mint; ctx.beginPath(); ctx.arc(w - 30, 30, 5 + Math.sin(t * 3), 0, Math.PI * 2); ctx.fill();
}

/* ---------- Rack: network wall display ---------- */

export function paintNetwork(ctx, w, h, t, s) {
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#07101e'); g.addColorStop(1, '#10122c');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
  ctx.fillStyle = NEON.cyan; ctx.font = `700 34px ${SANS}`; ctx.fillText('NETWORK & IDENTITY', 40, 48);
  ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.font = `600 16px ${BODY}`; ctx.textAlign = 'right'; ctx.fillText('SAMPLE DATA', w - 40, 48); ctx.textAlign = 'left';
  s.series ||= { wan: [], sign: [], vpn: [] };
  const push = (arr, v, n = 40) => { arr.push(v); while (arr.length > n) arr.shift(); };
  if (s.series.wan.length === 0) { const rng = mulberry32(7); for (let i = 0; i < 40; i++) { push(s.series.wan, 400 + rng() * 300); push(s.series.sign, 20 + rng() * 40); push(s.series.vpn, 14 + rng() * 10); } }
  if (Math.floor(t * 2) !== s.tick) { s.tick = Math.floor(t * 2); push(s.series.wan, 420 + Math.sin(t * .9) * 160 + Math.sin(t * 3.1) * 70 + 120); push(s.series.sign, 40 + Math.sin(t * .6) * 18 + Math.sin(t * 2.3) * 6); push(s.series.vpn, 20 + Math.sin(t * .35) * 6 + Math.cos(t * 1.7) * 2); }
  const tile = (x, y, tw, th, title, big, unit, color, series) => {
    ctx.fillStyle = 'rgba(255,255,255,.05)'; roundRect(ctx, x, y, tw, th, 18); ctx.fill();
    ctx.strokeStyle = rgba(color, .35); ctx.lineWidth = 2; roundRect(ctx, x, y, tw, th, 18); ctx.stroke();
    ctx.fillStyle = '#9fa9cf'; ctx.font = `600 18px ${BODY}`; ctx.fillText(title, x + 22, y + 30);
    ctx.fillStyle = '#fff'; ctx.font = `700 46px ${SANS}`; ctx.fillText(big, x + 22, y + 80);
    const bw = ctx.measureText(big).width; ctx.fillStyle = color; ctx.font = `600 20px ${BODY}`; ctx.fillText(unit, x + 30 + bw, y + 86);
    if (series) sparkline(ctx, x + 22, y + 104, tw - 44, th - 130, series, color, { width: 3 });
  };
  const last = a => a[a.length - 1];
  tile(40, 96, 380, 230, 'WAN THROUGHPUT', String(Math.round(last(s.series.wan))), 'Mbps', NEON.cyan, s.series.wan);
  tile(450, 96, 380, 230, 'ENTRA SIGN-INS / HR', String(Math.round(last(s.series.sign))), 'ok', NEON.violet, s.series.sign);
  tile(860, 96, 380, 230, 'VPN SESSIONS', String(Math.round(last(s.series.vpn))), 'active', NEON.pink, s.series.vpn);
  // topology
  const nodes = [['Internet', 120, 520], ['Firewall', 380, 520], ['Core switch', 640, 520], ['Servers', 940, 440], ['Wi-Fi APs', 940, 600], ['Clients', 1180, 520]];
  const links = [[0, 1], [1, 2], [2, 3], [2, 4], [3, 5], [4, 5]];
  ctx.lineWidth = 3;
  links.forEach(([a, b], i) => {
    const [, ax, ay] = nodes[a], [, bx, by] = nodes[b];
    ctx.strokeStyle = 'rgba(46,230,255,.35)'; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    const p = ((t * .45 + i * .21) % 1); ctx.fillStyle = i % 2 ? NEON.pink : NEON.cyan; ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 12;
    ctx.beginPath(); ctx.arc(ax + (bx - ax) * p, ay + (by - ay) * p, 6, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
  });
  nodes.forEach(([label, x, y], i) => {
    ctx.fillStyle = '#10142b'; ctx.strokeStyle = [NEON.amber, NEON.pink, NEON.cyan, NEON.violet, NEON.mint, NEON.blue][i]; ctx.lineWidth = 3;
    roundRect(ctx, x - 62, y - 26, 124, 52, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#e4e8ff'; ctx.font = `600 19px ${BODY}`; ctx.textAlign = 'center'; ctx.fillText(label, x, y + 1); ctx.textAlign = 'left';
  });
}

/* ---------- Arcade (Boso) ---------- */

export function paintArcade(ctx, w, h, t, s) {
  ctx.fillStyle = '#080614'; ctx.fillRect(0, 0, w, h);
  if (s.image && s.image.complete && s.image.naturalWidth) {
    const ir = s.image.naturalWidth / s.image.naturalHeight, cr = w / h;
    let dw = w, dh = h, dx = 0, dy = 0;
    if (ir > cr) { dh = h; dw = h * ir; dx = (w - dw) / 2; } else { dw = w; dh = w / ir; dy = (h - dh) / 2; }
    ctx.drawImage(s.image, dx, dy, dw, dh);
  } else {
    ctx.fillStyle = '#1a1040'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = NEON.mint; ctx.font = `700 90px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BOSO', w / 2, h / 2 - 20);
  }
  const shade = ctx.createLinearGradient(0, h * .6, 0, h); shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.65)');
  ctx.fillStyle = shade; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(0,0,0,.26)'; for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, h * .85); vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(1, 'rgba(0,0,0,.55)');
  ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
  if (Math.floor(t * 1.6) % 2 === 0) { ctx.fillStyle = '#ffe66d'; ctx.font = `700 34px ${MONO}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('INSERT COIN', w / 2, h - 36); }
}

/* ---------- Window: rainy night skyline ---------- */

export function paintWindow(ctx, w, h, t, s) {
  if (!s.rng) {
    s.rng = mulberry32(11);
    s.buildings = []; let x = -10;
    while (x < w) { const bw = 38 + s.rng() * 70, bh = 120 + s.rng() * 260; s.buildings.push({ x, bw, bh, far: s.rng() > .55, lit: Array.from({ length: 40 }, () => s.rng() > .55) }); x += bw - 6; }
    s.drops = Array.from({ length: 130 }, () => ({ x: s.rng() * w, y: s.rng() * h, v: 520 + s.rng() * 360, l: 14 + s.rng() * 26 }));
    s.beads = Array.from({ length: 22 }, () => ({ x: s.rng() * w, y: s.rng() * h, r: 3 + s.rng() * 4, v: 6 + s.rng() * 14 }));
    s.last = t;
  }
  const dt = Math.min(.2, t - s.last); s.last = t;
  const sky = ctx.createLinearGradient(0, 0, 0, h); sky.addColorStop(0, '#0b1030'); sky.addColorStop(.6, '#2a1650'); sky.addColorStop(1, '#6a2a6e');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  const moon = ctx.createRadialGradient(w * .74, h * .2, 0, w * .74, h * .2, 70); moon.addColorStop(0, 'rgba(255,240,230,.5)'); moon.addColorStop(1, 'rgba(255,240,230,0)');
  ctx.fillStyle = moon; ctx.fillRect(0, 0, w, h);
  for (const b of s.buildings) {
    const top = h - b.bh * (b.far ? .8 : 1) - (b.far ? 40 : 0);
    ctx.fillStyle = b.far ? '#1b1740' : '#0f0d26'; ctx.fillRect(b.x, top, b.bw, h - top);
    let k = 0;
    for (let y = top + 14; y < h - 10; y += 22) for (let x = b.x + 8; x < b.x + b.bw - 10; x += 16, k++) {
      if (!b.lit[k % 40]) continue;
      const flick = Math.sin(t * .6 + k + b.x) > .96;
      ctx.fillStyle = flick ? '#fff7c2' : (k % 5 === 0 ? '#ff9ad0' : k % 3 === 0 ? '#8fe6ff' : '#ffd88a'); ctx.globalAlpha = b.far ? .55 : .9; ctx.fillRect(x, y, 7, 11); ctx.globalAlpha = 1;
    }
  }
  const road = ctx.createLinearGradient(0, h - 60, 0, h); road.addColorStop(0, 'rgba(255,80,160,0)'); road.addColorStop(1, 'rgba(255,80,160,.35)');
  ctx.fillStyle = road; ctx.fillRect(0, h - 60, w, 60);
  ctx.strokeStyle = 'rgba(190,215,255,.55)'; ctx.lineWidth = 1.6; ctx.beginPath();
  for (const d of s.drops) { d.y += d.v * dt; d.x -= d.v * dt * .18; if (d.y > h + 20) { d.y = -20; d.x = s.rng() * (w + 120); } ctx.moveTo(d.x, d.y); ctx.lineTo(d.x + d.l * .18, d.y - d.l); }
  ctx.stroke();
  for (const b of s.beads) {
    b.y += b.v * dt; if (b.y > h + 10) { b.y = -10; b.x = s.rng() * w; }
    ctx.fillStyle = 'rgba(210,230,255,.32)'; ctx.beginPath(); ctx.ellipse(b.x, b.y, b.r * .7, b.r * 1.4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect(b.x - 1, b.y - b.r * .8, 1.6, 1.6);
  }
}

/* ---------- Plaques, signs and boards (static) ---------- */

const MS_SQUARES = ['#f25022', '#7fba00', '#00a4ef', '#ffb900'];
export function paintMsSquares(ctx, x, y, size, gap = 3) {
  MS_SQUARES.forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(x + (i % 2) * (size + gap), y + Math.floor(i / 2) * (size + gap), size, size); });
}

export const CERTS = [
  { code: 'AZ-900', title: 'Azure Fundamentals', level: 'FUNDAMENTALS', color: NEON.cyan },
  { code: 'MS-900', title: 'Microsoft 365 Fundamentals', level: 'FUNDAMENTALS', color: NEON.amber },
  { code: 'MD-102', title: 'Endpoint Administrator', level: 'ASSOCIATE', color: NEON.mint },
  { code: 'SC-300', title: 'Identity & Access Administrator', level: 'ASSOCIATE', color: NEON.violet },
];

export function certPlaque(cert, width = 512, height = 640) {
  const canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, width, height); g.addColorStop(0, '#12122a'); g.addColorStop(1, '#0a0a18');
  ctx.fillStyle = g; roundRect(ctx, 0, 0, width, height, 34); ctx.fill();
  ctx.save(); roundRect(ctx, 0, 0, width, height, 34); ctx.clip();
  const sheen = ctx.createLinearGradient(0, 0, width * .8, height * .5); sheen.addColorStop(0, 'rgba(255,255,255,.07)'); sheen.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = sheen; ctx.fillRect(0, 0, width, height); ctx.restore();
  ctx.strokeStyle = rgba(cert.color, .9); ctx.lineWidth = 8; ctx.shadowColor = cert.color; ctx.shadowBlur = 26; roundRect(ctx, 14, 14, width - 28, height - 28, 26); ctx.stroke(); ctx.shadowBlur = 0;
  paintMsSquares(ctx, width / 2 - 21, 52, 18, 3);
  ctx.fillStyle = '#a9b1d9'; ctx.font = `600 22px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if ('letterSpacing' in ctx) ctx.letterSpacing = '5px';
  ctx.fillText('MICROSOFT CERTIFIED', width / 2, 128);
  if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  paintNeon(ctx, cert.code, width / 2, 270, { size: 128, color: cert.color, tube: 5, weight: 700 });
  ctx.fillStyle = '#eef0ff'; ctx.font = `600 32px ${SANS}`;
  const words = cert.title.split(' '); const lines = []; let line = '';
  for (const word of words) { const test = line ? `${line} ${word}` : word; if (ctx.measureText(test).width > width - 90 && line) { lines.push(line); line = word; } else line = test; }
  lines.push(line);
  lines.forEach((l, i) => ctx.fillText(l, width / 2, 392 + i * 40 - (lines.length - 1) * 12));
  ctx.fillStyle = rgba(cert.color, .18); roundRect(ctx, width / 2 - 120, 478, 240, 46, 23); ctx.fill();
  ctx.fillStyle = cert.color; ctx.font = `700 21px ${BODY}`; if ('letterSpacing' in ctx) ctx.letterSpacing = '3px'; ctx.fillText(cert.level, width / 2, 502); if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  ctx.fillStyle = NEON.mint; ctx.font = `700 24px ${SANS}`; ctx.fillText('✓  EARNED', width / 2, 566);
  return canvas;
}

export function nameSign() {
  return neonCanvas(1024, 256, ctx => {
    paintNeon(ctx, 'OWEN KIM', 512, 98, { size: 168, color: NEON.pink, tube: 7, spacing: 10, weight: 700 });
    paintNeon(ctx, 'SYSTEMS · ENDPOINTS · MICROSOFT 365', 512, 214, { size: 40, color: NEON.cyan, tube: 3, outline: false, weight: 600, spacing: 6 });
  });
}

export function openSign() {
  return neonCanvas(512, 192, ctx => {
    const frame = [[26, 26], [486, 26], [486, 166], [26, 166]];
    paintTubeLine(ctx, frame, NEON.blue, 5, true);
    paintNeon(ctx, 'OPEN', 256, 98, { size: 112, color: NEON.pink, tube: 6, spacing: 10, weight: 700 });
  });
}

export function marqueeSign(text = 'BOSO') {
  return neonCanvas(512, 160, ctx => paintNeon(ctx, text, 256, 82, { size: 118, color: NEON.mint, tube: 6, spacing: 12, weight: 700, font: MONO }));
}

export function certHeaderSign() {
  return neonCanvas(1024, 180, ctx => {
    paintMsSquares(ctx, 250, 62, 22, 4);
    paintNeon(ctx, 'CERTIFIED', 600, 92, { size: 96, color: NEON.cyan, tube: 5, spacing: 12, weight: 700 });
  });
}

export function arrowPlate(label, color, dir = 1, width = 640, height = 160) {
  return neonCanvas(width, height, ctx => {
    const x0 = dir > 0 ? 24 : 96, x1 = dir > 0 ? width - 96 : width - 24, tip = dir > 0 ? width - 20 : 20;
    paintTubeLine(ctx, [[x0, 24], [x1, 24], [tip, height / 2], [x1, height - 24], [x0, height - 24]], color, 4, true);
    paintNeon(ctx, label, (x0 + x1) / 2, height / 2 + 4, { size: 66, color, tube: 3, outline: false, weight: 700, spacing: 5 });
  });
}

export function msBoardCanvas(logos) {
  const width = 1024, height = 640, canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, width, height); g.addColorStop(0, '#12132b'); g.addColorStop(1, '#0b0b1a');
  ctx.fillStyle = g; roundRect(ctx, 0, 0, width, height, 38); ctx.fill();
  ctx.strokeStyle = rgba(NEON.blue, .9); ctx.lineWidth = 8; ctx.shadowColor = NEON.blue; ctx.shadowBlur = 24; roundRect(ctx, 14, 14, width - 28, height - 28, 30); ctx.stroke(); ctx.shadowBlur = 0;
  paintNeon(ctx, 'MICROSOFT STACK', width / 2, 84, { size: 68, color: NEON.blue, tube: 4, outline: false, weight: 700, spacing: 8 });
  const cells = [['windows', 0], ['azure', 1], ['teams', 2], ['onedrive', 3], ['powerbi', 4], ['icon', 5]];
  cells.forEach(([key, i]) => {
    const col = i % 3, row = Math.floor(i / 3), cx = 176 + col * 336, cy = 218 + row * 166;
    ctx.fillStyle = 'rgba(255,255,255,.07)'; roundRect(ctx, cx - 140, cy - 64, 280, 128, 22); ctx.fill();
    const img = logos?.[key];
    if (img && img.complete && img.naturalWidth) {
      const maxW = 216, maxH = 84, r = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight);
      ctx.drawImage(img, cx - img.naturalWidth * r / 2, cy - img.naturalHeight * r / 2, img.naturalWidth * r, img.naturalHeight * r);
    }
  });
  ctx.fillStyle = '#c6cdf0'; ctx.font = `600 28px ${BODY}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('Intune · Entra ID · Exchange · SharePoint', width / 2, 556);
  return canvas;
}

export function benchLabel(text, color) {
  return neonCanvas(512, 96, ctx => paintNeon(ctx, text, 256, 50, { size: 52, color, tube: 3, outline: false, weight: 700, spacing: 6 }));
}

export function tinyLabel(text, color = NEON.cyan, width = 512) {
  return neonCanvas(width, 80, ctx => paintNeon(ctx, text, width / 2, 42, { size: 42, color, tube: 2.4, outline: false, weight: 600, spacing: 5, font: MONO }));
}

// Rock / paper / scissors as small neon cards for the play bench.
export function rpsCard(kind, color) {
  const width = 256, height = 320, canvas = makeCanvas(width, height), ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, width, height); g.addColorStop(0, '#15122e'); g.addColorStop(1, '#0a0a18');
  ctx.fillStyle = g; roundRect(ctx, 0, 0, width, height, 26); ctx.fill();
  ctx.strokeStyle = rgba(color, .85); ctx.lineWidth = 6; ctx.shadowColor = color; ctx.shadowBlur = 18; roundRect(ctx, 10, 10, width - 20, height - 20, 20); ctx.stroke(); ctx.shadowBlur = 0;
  const circle = (cx, cy, r) => Array.from({ length: 28 }, (_, i) => [cx + Math.cos(i / 28 * Math.PI * 2) * r, cy + Math.sin(i / 28 * Math.PI * 2) * r]);
  if (kind === 'rock') {
    paintTubeLine(ctx, [[72, 196], [60, 146], [92, 104], [142, 92], [192, 118], [204, 172], [170, 208], [112, 212]], color, 5, true);
    paintTubeLine(ctx, [[92, 104], [118, 150], [142, 92]], color, 3); paintTubeLine(ctx, [[118, 150], [112, 212]], color, 3); paintTubeLine(ctx, [[118, 150], [192, 118]], color, 3);
  } else if (kind === 'paper') {
    paintTubeLine(ctx, [[72, 80], [150, 80], [188, 118], [188, 226], [72, 226]], color, 5, true);
    paintTubeLine(ctx, [[150, 80], [150, 118], [188, 118]], color, 3);
    [[96, 156, 92], [96, 178, 92], [96, 200, 60]].forEach(([x, y, w]) => paintTubeLine(ctx, [[x, y], [x + w, y]], color, 3));
  } else {
    paintTubeLine(ctx, [[84, 72], [172, 190]], color, 5); paintTubeLine(ctx, [[172, 72], [84, 190]], color, 5);
    paintTubeLine(ctx, circle(76, 218, 22), color, 4, true); paintTubeLine(ctx, circle(180, 218, 22), color, 4, true);
  }
  paintNeon(ctx, kind.toUpperCase(), width / 2, 276, { size: 30, color, tube: 2, outline: false, weight: 700, spacing: 4 });
  return canvas;
}

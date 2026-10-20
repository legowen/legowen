// Shared cat behaviour for the 3D room and the page-edge cats.
// No DOM and no Three.js in here, so it can be tested in plain Node.
// Sprite sheets are 4×4 grids of 96px poses. Every pose faces right.

export const SHEET = { cell: 96, columns: 4, rows: 4 };

// Pose numbers match the sheets: 0 sit, 1 blink, 2-5 run, 6 reach, 7 pounce,
// 8 crouch, 9-11 swat, 12-13 stretch (back view), 14 sleep, 15 greet.
export const ANIM = {
  idle:    { frames: [0, 0, 1, 0],       fps: 1.3 },
  walk:    { frames: [2, 3, 4, 5],       fps: 6.5 },
  run:     { frames: [4, 5, 2, 3],       fps: 11 },
  stalk:   { frames: [8],                fps: 1 },
  pounce:  { frames: [7],                fps: 1 },
  play:    { frames: [9, 10, 11, 10, 9], fps: 5.5 },
  groom:   { frames: [6, 0, 6, 1],       fps: 2.6 },
  stretch: { frames: [12, 13, 12, 13],   fps: 2.4 },
  sleep:   { frames: [14],               fps: 1 },
  greet:   { frames: [15, 1, 15],        fps: 2.2 },
  takeoff: { frames: [6],                fps: 1 },
  air:     { frames: [4],                fps: 1 },
  land:    { frames: [7],                fps: 1 },
};

export function frameAt(name, t) {
  const anim = ANIM[name] || ANIM.idle;
  const n = Math.floor(Math.max(0, t) * anim.fps);
  return anim.frames[n % anim.frames.length];
}
export const frameCell = frame => ({ col: frame % SHEET.columns, row: Math.floor(frame / SHEET.columns) });

export function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pickWeighted(rng, entries) {
  let total = 0;
  for (const [, weight] of entries) total += Math.max(0, weight);
  if (total <= 0) return entries[0][0];
  let r = rng() * total;
  for (const [value, weight] of entries) {
    r -= Math.max(0, weight);
    if (r <= 0) return value;
  }
  return entries[entries.length - 1][0];
}

/* ---------- Floor grid and A* ---------- */

function hitsObstacle(o, x, z, margin) {
  if (o.r !== undefined) return Math.hypot(x - o.x, z - o.z) <= o.r + margin;
  return Math.abs(x - o.x) <= o.w / 2 + margin && Math.abs(z - o.z) <= o.d / 2 + margin;
}

export function createGrid({ minX, maxX, minZ, maxZ, cell = .2, obstacles = [], margin = .2 }) {
  const cols = Math.ceil((maxX - minX) / cell), rows = Math.ceil((maxZ - minZ) / cell);
  const grid = { minX, minZ, maxX: minX + cols * cell, maxZ: minZ + rows * cell, cell, cols, rows, blocked: new Uint8Array(cols * rows) };
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const x = minX + (i + .5) * cell, z = minZ + (j + .5) * cell;
    if (obstacles.some(o => hitsObstacle(o, x, z, margin))) grid.blocked[j * cols + i] = 1;
  }
  return grid;
}

export function cellIndex(grid, x, z) {
  const i = Math.floor((x - grid.minX) / grid.cell), j = Math.floor((z - grid.minZ) / grid.cell);
  return i < 0 || j < 0 || i >= grid.cols || j >= grid.rows ? -1 : j * grid.cols + i;
}
export function isFree(grid, x, z) {
  const k = cellIndex(grid, x, z);
  return k >= 0 && !grid.blocked[k];
}

export function nearestFree(grid, p, maxRing = 14) {
  if (isFree(grid, p.x, p.z)) return { x: p.x, z: p.z };
  const i0 = Math.floor((p.x - grid.minX) / grid.cell), j0 = Math.floor((p.z - grid.minZ) / grid.cell);
  let best = null, bestD = Infinity, found = -1;
  for (let r = 1; r <= maxRing; r++) {
    if (found >= 0 && r > found + 1) break;
    for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
      if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
      const i = i0 + di, j = j0 + dj;
      if (i < 0 || j < 0 || i >= grid.cols || j >= grid.rows || grid.blocked[j * grid.cols + i]) continue;
      const cx = grid.minX + (i + .5) * grid.cell, cz = grid.minZ + (j + .5) * grid.cell;
      const d = (cx - p.x) ** 2 + (cz - p.z) ** 2;
      if (d < bestD) { bestD = d; best = { x: cx, z: cz }; found = r; }
    }
  }
  return best;
}

export function lineFree(grid, a, b) {
  const d = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(d / (grid.cell * .5)));
  for (let k = 1; k < n; k++) {
    const t = k / n;
    if (!isFree(grid, a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t)) return false;
  }
  return true;
}

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(priority, value) {
    const items = this.items; items.push([priority, value]);
    let i = items.length - 1;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (items[parent][0] <= items[i][0]) break;
      [items[parent], items[i]] = [items[i], items[parent]]; i = parent;
    }
  }
  pop() {
    const items = this.items, top = items[0], last = items.pop();
    if (items.length) {
      items[0] = last;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1, r = l + 1; let m = i;
        if (l < items.length && items[l][0] < items[m][0]) m = l;
        if (r < items.length && items[r][0] < items[m][0]) m = r;
        if (m === i) break;
        [items[m], items[i]] = [items[i], items[m]]; i = m;
      }
    }
    return top[1];
  }
}

const NEIGHBOURS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];

// Returns [{x,z}, …] starting at `from` and ending at the nearest free point to `to`, or null.
export function findPath(grid, from, to) {
  const s = nearestFree(grid, from), t = nearestFree(grid, to);
  if (!s || !t) return null;
  const { cols, rows, blocked } = grid;
  const si = cellIndex(grid, s.x, s.z), ti = cellIndex(grid, t.x, t.z);
  const g = new Float32Array(cols * rows).fill(Infinity), came = new Int32Array(cols * rows).fill(-1), closed = new Uint8Array(cols * rows);
  const heap = new MinHeap();
  const tx = ti % cols, tz = (ti / cols) | 0;
  const h = k => { const dx = Math.abs((k % cols) - tx), dz = Math.abs(((k / cols) | 0) - tz); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
  g[si] = 0; heap.push(h(si), si);
  while (heap.size) {
    const k = heap.pop();
    if (closed[k]) continue;
    closed[k] = 1;
    if (k === ti) break;
    const ci = k % cols, cj = (k / cols) | 0;
    for (const [di, dj, cost] of NEIGHBOURS) {
      const ni = ci + di, nj = cj + dj;
      if (ni < 0 || nj < 0 || ni >= cols || nj >= rows) continue;
      const nk = nj * cols + ni;
      if (blocked[nk] || closed[nk]) continue;
      if (di && dj && (blocked[cj * cols + ni] || blocked[nj * cols + ci])) continue; // no corner cutting
      const ng = g[k] + cost;
      if (ng < g[nk]) { g[nk] = ng; came[nk] = k; heap.push(ng + h(nk), nk); }
    }
  }
  if (came[ti] < 0 && si !== ti) return null;
  const cells = [];
  for (let k = ti; k >= 0; k = came[k]) { cells.push({ x: grid.minX + ((k % cols) + .5) * grid.cell, z: grid.minZ + (((k / cols) | 0) + .5) * grid.cell }); if (k === si) break; }
  cells.reverse();
  // Straighten the route on the exact start and goal (not the cell centres), so the first and
  // last stretch are checked against the furniture too.
  const start = { x: from.x, z: from.z };
  const goal = isFree(grid, to.x, to.z) ? { x: to.x, z: to.z } : cells[cells.length - 1];
  const pts = [start, ...cells.slice(0, -1), goal];
  if (pts.length === 2 && Math.hypot(goal.x - start.x, goal.z - start.z) < .03) return [start];
  const out = [start]; let anchor = 0;
  for (let k = 2; k < pts.length; k++) {
    if (!lineFree(grid, pts[anchor], pts[k])) { out.push(pts[k - 1]); anchor = k - 1; }
  }
  out.push(pts[pts.length - 1]);
  return out;
}

/* ---------- Actors ---------- */

const WALK = .55, RUN = 1.9;

export function createActor({ id, x, z, seed = 1, dir = { x: 1, z: 0 } }) {
  return {
    id, x, y: 0, z, dx: dir.x, dz: dir.z, rng: mulberry32(seed),
    mode: 'rest', anim: 'idle', t: 0, left: 1.2,
    plan: [], path: [], run: false, jump: null, perch: null,
    energy: .7, sleepy: .1, travelT: 0, intent: 'start',
  };
}

export function faceTo(a, x, z) {
  const dx = x - a.x, dz = z - a.z, d = Math.hypot(dx, dz);
  if (d > 1e-4) { a.dx = dx / d; a.dz = dz / d; }
}

function setRest(a, anim, dur) { a.mode = 'rest'; a.anim = anim; a.left = dur; a.t = 0; a.path = []; a.jump = null; }

export function updateActor(a, dt, world) {
  a.t += dt;
  if (a.anim === 'sleep' && a.mode === 'rest') {
    a.sleepy = Math.max(0, a.sleepy - dt * .09);
    a.energy = Math.min(1, a.energy + dt * .04);
  } else { a.sleepy = Math.min(1, a.sleepy + dt * .011); a.energy = Math.min(1, a.energy + dt * .006); }
  if (a.mode === 'rest') { a.left -= dt; if (a.left <= 0) advance(a, world); }
  else if (a.mode === 'travel') travel(a, dt, world);
  else if (a.mode === 'jump') hop(a, dt, world);
}

function advance(a, world) {
  if (a.anim === 'sleep' && !a.plan.length) { setRest(a, 'stretch', 1.9 + a.rng() * .8); return; }
  while (a.plan.length) { if (begin(a, a.plan.shift(), world)) return; }
  decide(a, world);
}

function begin(a, step, world) {
  if (step.t === 'go') {
    const path = findPath(world.grid, a, step);
    if (!path || path.length < 2) return false;
    a.path = path.slice(1); a.mode = 'travel'; a.run = !!step.run; a.anim = a.run ? 'run' : 'walk'; a.t = 0; a.travelT = 0; a.guard = 0;
    return true;
  }
  if (step.t === 'jump') {
    const dist = Math.hypot(step.x - a.x, step.z - a.z), rise = (step.y || 0) - a.y;
    a.jump = { fx: a.x, fy: a.y, fz: a.z, tx: step.x, ty: step.y || 0, tz: step.z, t: 0, dur: .36 + .26 * Math.min(1.4, dist + Math.abs(rise)), h: .2 + Math.max(0, rise) * .3, perch: step.perch ?? null };
    faceTo(a, step.x, step.z);
    a.mode = 'jump'; a.anim = 'takeoff'; a.t = 0; a.guard = 0;
    return true;
  }
  if (step.t === 'do') {
    setRest(a, step.anim, step.dur); a.guard = 0;
    if (step.face) faceTo(a, step.face.x, step.face.z);
    return true;
  }
  return false;
}

function travel(a, dt, world) {
  a.travelT += dt;
  const target = a.path[0];
  if (!target || a.travelT > 40) { setRest(a, 'idle', .6); a.plan = []; return; }
  const dx = target.x - a.x, dz = target.z - a.z, dist = Math.hypot(dx, dz), step = (a.run ? RUN : WALK) * dt;
  if (dist <= step) {
    a.x = target.x; a.z = target.z; a.path.shift();
    if (!a.path.length) { a.mode = 'rest'; a.left = 0; advance(a, world); }
    return;
  }
  a.dx = dx / dist; a.dz = dz / dist;
  let nx = a.x + a.dx * step, nz = a.z + a.dz * step;
  for (const o of world.actors) { // soft separation so cats do not stack
    if (o === a || o.perch !== a.perch) continue;
    const ox = nx - o.x, oz = nz - o.z, d = Math.hypot(ox, oz);
    if (d < .45 && d > 1e-3) { const px = nx + ox / d * (.45 - d) * 1.5 * dt, pz = nz + oz / d * (.45 - d) * 1.5 * dt; if (isFree(world.grid, px, pz)) { nx = px; nz = pz; } }
  }
  a.x = nx; a.z = nz;
}

function hop(a, dt, world) {
  const j = a.jump; j.t += dt;
  const u = Math.min(1, j.t / j.dur);
  a.x = j.fx + (j.tx - j.fx) * u; a.z = j.fz + (j.tz - j.fz) * u;
  a.y = j.fy + (j.ty - j.fy) * u + Math.sin(Math.PI * u) * j.h;
  a.anim = u < .22 ? 'takeoff' : u < .78 ? 'air' : 'land';
  if (u < 1) return;
  a.x = j.tx; a.y = j.ty; a.z = j.tz; a.perch = j.perch; a.jump = null;
  if (a.plan.length) { a.mode = 'rest'; a.left = 0; advance(a, world); }
  else setRest(a, 'idle', .5 + a.rng() * .9);
}

/* ---------- Choosing what to do ---------- */

const REST_WEIGHTS = (a, extra = []) => [['idle', 3], ['groom', 2.2], ['stretch', 1.1], ['play', .5], ['sleep', .3 + a.sleepy * 5], ...extra];
const REST_LENGTH = { idle: [1.6, 4], groom: [2.8, 4.6], stretch: [2, 3], play: [2.5, 4], sleep: [7, 13], greet: [2, 2.4] };
const lengthOf = (a, anim) => { const [lo, hi] = REST_LENGTH[anim] || [2, 3]; return lo + a.rng() * (hi - lo); };

export const chainOf = (world, id) => { const out = []; for (let p = world.perches[id]; p; p = p.parent ? world.perches[p.parent] : null) out.unshift(p.id); return out; };
const floorPoint = p => p.approach;

// Steps that take a cat standing on perch `from` (or the floor, when null) onto perch `to` (or the floor).
export function planBetween(world, from, to) {
  const down = from ? chainOf(world, from) : [], up = to ? chainOf(world, to) : [];
  let k = 0;
  while (k < down.length && k < up.length && down[k] === up[k]) k++;
  const steps = [];
  for (let i = down.length - 1; i >= k; i--) {
    const p = world.perches[down[i]];
    if (p.parent) { const q = world.perches[p.parent]; steps.push({ t: 'jump', x: q.x, y: q.y, z: q.z, perch: q.id }); }
    else steps.push({ t: 'jump', x: floorPoint(p).x, y: 0, z: floorPoint(p).z, perch: null });
  }
  if (up.length > k) {
    if (k === 0) { const root = world.perches[up[0]]; steps.push({ t: 'go', x: floorPoint(root).x, z: floorPoint(root).z }); }
    for (let i = k; i < up.length; i++) { const p = world.perches[up[i]]; steps.push({ t: 'jump', x: p.x, y: p.y, z: p.z, perch: p.id }); }
  }
  return steps;
}

function occupied(world, a, x, z, radius = .8) {
  return world.actors.some(o => o !== a && Math.hypot(o.x - x, o.z - z) < radius && Math.abs(o.y - 0) < 1e-3);
}

function poiPlan(a, poi) {
  const anim = pickWeighted(a.rng, (poi.acts || [['idle', 1]]).map(([n, w]) => [n, n === 'sleep' ? w * (.3 + a.sleepy * 3) : w]));
  return [{ t: 'go', x: poi.x, z: poi.z }, { t: 'do', anim, dur: lengthOf(a, anim) * (poi.long && anim === 'sleep' ? 1.2 : 1), face: poi.face }];
}

function randomFree(world, a, minDist, maxDist) {
  for (let n = 0; n < 24; n++) {
    const ang = a.rng() * Math.PI * 2, d = minDist + a.rng() * (maxDist - minDist);
    const x = a.x + Math.cos(ang) * d, z = a.z + Math.sin(ang) * d;
    if (isFree(world.grid, x, z) && !occupied(world, a, x, z, .6)) return { x, z };
  }
  return null;
}

function decide(a, world) {
  if ((a.guard = (a.guard || 0) + 1) > 6) { a.guard = 0; a.plan = []; setRest(a, 'idle', 1); return; }
  const rng = a.rng, others = world.actors.filter(o => o !== a);
  if (a.perch) return decideOnPerch(a, world);
  const pois = world.pois.filter(p => !occupied(world, a, p.x, p.z, .75));
  const beds = pois.filter(p => (p.acts || []).some(([n]) => n === 'sleep'));
  const sleepyOther = others.find(o => o.mode === 'rest' && o.anim === 'sleep');
  const buddy = others.find(o => o.mode === 'rest' && o.anim !== 'sleep' && !o.perch && !o.plan.length);
  const choice = pickWeighted(rng, [
    ['rest', 1.7], ['roam', 3.2], ['hunt', a.energy > .45 ? 1 : .2], ['visit', buddy ? 1.1 : sleepyOther ? .35 : 0],
    ['perch', world.perchIds.length ? 1.2 : 0], ['zoom', a.energy > .7 ? 1.1 : .12], ['nap', beds.length ? .5 + a.sleepy * 6 : 0],
  ]);
  a.intent = choice;
  if (choice === 'roam' && pois.length) {
    const poi = pickWeighted(rng, pois.map(p => [p, p.weight ?? 1]));
    a.plan = poiPlan(a, poi);
  } else if (choice === 'nap' && beds.length) {
    const poi = pickWeighted(rng, beds.map(p => [p, p.weight ?? 1]));
    a.plan = [{ t: 'go', x: poi.x, z: poi.z }, { t: 'do', anim: 'sleep', dur: lengthOf(a, 'sleep'), face: poi.face }];
  } else if (choice === 'hunt') {
    const spot = randomFree(world, a, 1.1, 2.2);
    if (spot) a.plan = [{ t: 'do', anim: 'stalk', dur: .9, face: spot }, { t: 'go', x: spot.x, z: spot.z, run: true }, { t: 'do', anim: 'pounce', dur: .5 }, { t: 'do', anim: 'groom', dur: 2.2 }];
  } else if (choice === 'zoom') {
    const one = randomFree(world, a, 2, 4), two = randomFree(world, a, 2, 4);
    a.plan = [one && { t: 'go', x: one.x, z: one.z, run: true }, two && { t: 'go', x: two.x, z: two.z, run: true }, { t: 'do', anim: 'idle', dur: 1.4 }].filter(Boolean);
    a.energy = Math.max(0, a.energy - .45);
  } else if (choice === 'visit' && (buddy || sleepyOther)) {
    const other = buddy || sleepyOther, side = a.x < other.x ? -1 : 1;
    const near = nearestFree(world.grid, { x: other.x + side * .62, z: other.z + .05 }) || { x: other.x, z: other.z };
    if (buddy) {
      a.plan = [{ t: 'go', x: near.x, z: near.z }, { t: 'do', anim: 'play', dur: 3.4, face: other }];
      other.plan = [];
      setRest(other, 'play', 3.4 + Math.hypot(near.x - a.x, near.z - a.z) / WALK); faceTo(other, a.x, a.z);
    } else a.plan = [{ t: 'go', x: near.x, z: near.z }, { t: 'do', anim: 'greet', dur: 2.2, face: other }, { t: 'do', anim: 'idle', dur: 1.5 }];
  } else if (choice === 'perch' && world.perchIds.length) {
    const id = pickWeighted(rng, world.perchIds.map(i => [i, world.perches[i].weight ?? 1]));
    if (!world.actors.some(o => o !== a && o.perch === id)) a.plan = planBetween(world, null, id);
  }
  if (!a.plan.length) { const anim = pickWeighted(rng, REST_WEIGHTS(a)); setRest(a, anim, lengthOf(a, anim)); a.guard = 0; return; }
  advance(a, world);
}

function decideOnPerch(a, world) {
  const rng = a.rng, p = world.perches[a.perch];
  const kids = world.perchIds.filter(i => world.perches[i].parent === p.id && !world.actors.some(o => o !== a && o.perch === i));
  const choice = pickWeighted(rng, [['stay', 3 + a.sleepy * 2], ['up', kids.length ? 1.1 : 0], ['down', 1.4]]);
  if (choice === 'up') { a.plan = planBetween(world, p.id, pickWeighted(rng, kids.map(i => [i, 1]))); advance(a, world); return; }
  if (choice === 'down') { a.plan = planBetween(world, p.id, null).concat([{ t: 'do', anim: 'groom', dur: 2.4 }]); advance(a, world); return; }
  const anim = pickWeighted(rng, (p.acts || [['idle', 1]]).map(([n, w]) => [n, n === 'sleep' ? w * (.3 + a.sleepy * 3) : w]));
  setRest(a, anim, lengthOf(a, anim) * (anim === 'sleep' ? .9 : 1)); a.guard = 0;
  if (p.face) faceTo(a, p.face.x, p.face.z);
}

/* ---------- Outside commands ---------- */

// A tap or click on the floor. Returns the cat that answered, or null.
export function callCats(world, x, z) {
  const order = [...world.actors].sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z));
  for (const a of order) {
    if (a.mode === 'jump') continue;
    if (a.mode === 'rest' && a.anim === 'sleep' && Math.hypot(a.x - x, a.z - z) > 1.6) continue;
    const spot = nearestFree(world.grid, { x, z });
    if (!spot) return null;
    const far = Math.hypot(spot.x - a.x, spot.z - a.z) > 1.6;
    a.plan = [];
    if (a.perch) a.plan.push(...planBetween(world, a.perch, null));
    a.plan.push({ t: 'go', x: spot.x, z: spot.z, run: far }, { t: 'do', anim: 'greet', dur: 2.3 });
    a.intent = 'called'; setRest(a, a.anim === 'sleep' ? 'stretch' : 'idle', .01);
    return a;
  }
  return null;
}

export function petCat(a) {
  if (a.mode === 'jump') return false;
  a.plan = []; a.intent = 'petted'; setRest(a, 'greet', 2.3);
  return true;
}

export const describe = a => `${a.id}:${a.mode}/${a.anim}@${a.x.toFixed(2)},${a.y.toFixed(2)},${a.z.toFixed(2)}${a.perch ? ' on ' + a.perch : ''}`;

export function createWorld({ bounds, obstacles, pois = [], perches = [], cell = .2, margin = .2 }) {
  const grid = createGrid({ ...bounds, obstacles, cell, margin });
  const map = Object.fromEntries(perches.map(p => [p.id, p]));
  return { grid, pois, perches: map, perchIds: perches.map(p => p.id), actors: [] };
}

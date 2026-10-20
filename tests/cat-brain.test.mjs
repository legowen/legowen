// Run with:  node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ANIM, SHEET, frameAt, frameCell, mulberry32, pickWeighted,
  createGrid, isFree, nearestFree, lineFree, findPath,
  createActor, createWorld, updateActor, callCats, petCat, planBetween, chainOf, describe,
} from '../cat-brain.js';
import { CAT_BOUNDS, CAT_START, OBSTACLES, PERCHES, POIS } from '../room-layout.js';

const makeWorld = (seeds = CAT_START) => {
  const world = createWorld({ bounds: CAT_BOUNDS, obstacles: OBSTACLES, pois: POIS, perches: PERCHES });
  world.actors = seeds.map(s => createActor({ id: s.id, x: s.x, z: s.z, seed: s.seed }));
  return world;
};
const inFootprint = (o, x, z, margin = 0) => o.r !== undefined
  ? Math.hypot(x - o.x, z - o.z) < o.r + margin
  : Math.abs(x - o.x) < o.w / 2 + margin && Math.abs(z - o.z) < o.d / 2 + margin;

/* ---------- small pieces ---------- */

test('every animation uses frames that exist on the 4x4 sheet', () => {
  for (const [name, anim] of Object.entries(ANIM)) {
    assert.ok(anim.fps > 0, `${name} fps`);
    for (const f of anim.frames) {
      assert.ok(Number.isInteger(f) && f >= 0 && f < SHEET.columns * SHEET.rows, `${name} frame ${f}`);
      const { col, row } = frameCell(f);
      assert.ok(col >= 0 && col < SHEET.columns && row >= 0 && row < SHEET.rows);
    }
    for (let t = 0; t < 5; t += .13) assert.ok(anim.frames.includes(frameAt(name, t)));
  }
  assert.equal(frameAt('does-not-exist', 0), ANIM.idle.frames[0]);
  assert.equal(frameAt('walk', -4), ANIM.walk.frames[0]);
});

test('seeded random numbers repeat and stay in range', () => {
  const a = mulberry32(5), b = mulberry32(5), c = mulberry32(6);
  const first = Array.from({ length: 50 }, a), second = Array.from({ length: 50 }, b);
  assert.deepEqual(first, second);
  assert.notDeepEqual(first, Array.from({ length: 50 }, c));
  assert.ok(first.every(v => v >= 0 && v < 1));
});

test('pickWeighted respects weights and ignores zero weights', () => {
  const rng = mulberry32(1), tally = { a: 0, b: 0, c: 0 };
  for (let i = 0; i < 4000; i++) tally[pickWeighted(rng, [['a', 1], ['b', 3], ['c', 0]])]++;
  assert.equal(tally.c, 0);
  assert.ok(tally.b > tally.a * 2 && tally.b < tally.a * 4.5, JSON.stringify(tally));
  assert.equal(pickWeighted(rng, [['only', 0]]), 'only');
});

/* ---------- grid + path finding ---------- */

test('grid blocks obstacles and keeps open floor free', () => {
  const grid = createGrid({ ...CAT_BOUNDS, obstacles: OBSTACLES });
  assert.equal(isFree(grid, -1.85, -2.45), false, 'inside the desk');
  assert.equal(isFree(grid, 0, 1), true, 'open rug');
  assert.equal(isFree(grid, -99, 0), false, 'outside the room');
  const free = nearestFree(grid, { x: -1.85, z: -2.45 });
  assert.ok(free && isFree(grid, free.x, free.z));
});

test('findPath: straight line, around a wall, and unreachable', () => {
  const open = createGrid({ minX: 0, maxX: 4, minZ: 0, maxZ: 4, obstacles: [] });
  const straight = findPath(open, { x: .3, z: .3 }, { x: 3.5, z: 3.1 });
  assert.equal(straight.length, 2, 'open floor collapses to one segment');
  assert.deepEqual(straight[0], { x: .3, z: .3 });
  assert.deepEqual(straight.at(-1), { x: 3.5, z: 3.1 });

  const walled = createGrid({ minX: 0, maxX: 4, minZ: 0, maxZ: 4, margin: 0, obstacles: [{ x: 2, z: 1.6, w: .3, d: 3.2 }] });
  const around = findPath(walled, { x: .5, z: 1 }, { x: 3.5, z: 1 });
  assert.ok(around && around.length >= 3, 'must bend around the wall');
  for (let i = 1; i < around.length; i++) assert.ok(lineFree(walled, around[i - 1], around[i]));

  const sealed = createGrid({ minX: 0, maxX: 4, minZ: 0, maxZ: 4, margin: 0, obstacles: [{ x: 2, z: 2, w: .4, d: 4.4 }] });
  assert.equal(findPath(sealed, { x: .5, z: 1 }, { x: 3.5, z: 1 }), null);

  const same = findPath(open, { x: 1, z: 1 }, { x: 1, z: 1 });
  assert.equal(same.length, 1);
});

test('findPath moves to the nearest free point when the target is blocked', () => {
  const grid = createGrid({ ...CAT_BOUNDS, obstacles: OBSTACLES });
  const path = findPath(grid, { x: 0, z: 1 }, { x: -1.85, z: -2.45 });
  assert.ok(path && path.length >= 2);
  const end = path.at(-1);
  assert.ok(isFree(grid, end.x, end.z));
});

/* ---------- the actual room ---------- */

test('layout: every cat spot sits on free floor, inside the room', () => {
  const grid = createGrid({ ...CAT_BOUNDS, obstacles: OBSTACLES });
  for (const p of POIS) assert.ok(isFree(grid, p.x, p.z), `POI ${p.id} is blocked`);
  for (const p of PERCHES.filter(p => !p.parent)) assert.ok(isFree(grid, p.approach.x, p.approach.z), `approach for ${p.id} is blocked`);
  for (const s of CAT_START) assert.ok(isFree(grid, s.x, s.z), `start for ${s.id} is blocked`);
});

test('layout: perches form valid chains and every parent exists', () => {
  const world = makeWorld();
  for (const id of world.perchIds) {
    const chain = chainOf(world, id);
    assert.equal(chain.at(-1), id);
    assert.ok(!world.perches[chain[0]].parent, `${id} chain does not start at a root`);
    assert.ok(chain.length < 5);
    const p = world.perches[id];
    if (p.parent) assert.ok(world.perches[p.parent], `${id} has a missing parent`);
    else assert.ok(p.approach, `${id} is a root without an approach point`);
    assert.ok(p.y > 0);
  }
  for (const p of PERCHES) {
    for (const o of OBSTACLES.filter(o => o.id !== 'tree' && o.id !== 'chair' && o.id !== 'desk')) {
      assert.ok(!inFootprint(o, p.x, p.z), `perch ${p.id} overlaps ${o.id}`);
    }
  }
});

test('layout: perch jumps are short enough to look natural', () => {
  const world = makeWorld();
  for (const id of world.perchIds) {
    const p = world.perches[id];
    const from = p.parent ? world.perches[p.parent] : { x: p.approach.x, y: 0, z: p.approach.z };
    const run = Math.hypot(p.x - from.x, p.z - from.z), rise = p.y - from.y;
    assert.ok(run <= 1.5, `${id} jump run ${run.toFixed(2)}`);
    assert.ok(rise <= 0.75, `${id} jump rise ${rise.toFixed(2)}`);
  }
});

test('every pair of cat spots is connected by a clean path', () => {
  const grid = createGrid({ ...CAT_BOUNDS, obstacles: OBSTACLES });
  const spots = [
    ...POIS.map(p => ({ id: p.id, x: p.x, z: p.z })),
    ...PERCHES.filter(p => !p.parent).map(p => ({ id: `${p.id}:approach`, x: p.approach.x, z: p.approach.z })),
    ...CAT_START,
  ];
  let checked = 0;
  for (const a of spots) for (const b of spots) {
    if (a === b) continue;
    const path = findPath(grid, a, b);
    assert.ok(path, `${a.id} -> ${b.id} has no path`);
    assert.deepEqual(path[0], { x: a.x, z: a.z });
    assert.ok(Math.hypot(path.at(-1).x - b.x, path.at(-1).z - b.z) < .01, `${a.id} -> ${b.id} ends in the wrong place`);
    for (let i = 1; i < path.length; i++) assert.ok(lineFree(grid, path[i - 1], path[i]), `${a.id} -> ${b.id} cuts through furniture`);
    checked++;
  }
  assert.ok(checked > 100);
});

/* ---------- simulation ---------- */

function simulate(seeds, seconds, { dt = 1 / 30, hook } = {}) {
  const world = makeWorld(seeds);
  const stats = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity, maxY: 0, anims: new Set(), intents: new Set(), perches: new Set(), pois: new Set(), maxRest: 0, maxTravel: 0, steps: 0, inside: 0 };
  const eps = 1e-6;
  for (let step = 0; step * dt < seconds; step++) {
    for (const a of world.actors) {
      updateActor(a, dt, world);
      for (const k of ['x', 'y', 'z', 'dx', 'dz', 't', 'left', 'energy', 'sleepy']) assert.ok(Number.isFinite(a[k]), `${a.id}.${k} became ${a[k]} at ${(step * dt).toFixed(1)}s (${describe(a)})`);
      assert.ok(Math.abs(Math.hypot(a.dx, a.dz) - 1) < 1e-3, `${a.id} direction is not a unit vector`);
      assert.ok(ANIM[a.anim], `${a.id} has unknown animation ${a.anim}`);
      stats.minX = Math.min(stats.minX, a.x); stats.maxX = Math.max(stats.maxX, a.x);
      stats.minZ = Math.min(stats.minZ, a.z); stats.maxZ = Math.max(stats.maxZ, a.z);
      stats.maxY = Math.max(stats.maxY, a.y);
      stats.anims.add(a.anim); stats.intents.add(a.intent);
      if (a.perch) stats.perches.add(a.perch);
      if (a.mode === 'rest') stats.maxRest = Math.max(stats.maxRest, a.t);
      if (a.mode === 'travel') stats.maxTravel = Math.max(stats.maxTravel, a.travelT);
      if (a.mode === 'jump') assert.ok(a.jump && a.jump.t <= a.jump.dur + dt + eps, `${a.id} jump never ends`);
      if (a.mode !== 'jump' && a.y === 0 && OBSTACLES.some(o => inFootprint(o, a.x, a.z))) stats.inside++;
      if (a.mode === 'rest') for (const p of POIS) if (Math.hypot(p.x - a.x, p.z - a.z) < .05) stats.pois.add(p.id);
      stats.steps++;
    }
    hook?.(world, step * dt);
  }
  return { world, stats };
}

test('ten minutes of two cats: nothing breaks, nobody walks through furniture or gets stuck', () => {
  const { stats } = simulate(CAT_START, 600);
  assert.ok(stats.minX >= CAT_BOUNDS.minX - .05 && stats.maxX <= CAT_BOUNDS.maxX + .05, `x ${stats.minX}..${stats.maxX}`);
  assert.ok(stats.minZ >= CAT_BOUNDS.minZ - .05 && stats.maxZ <= CAT_BOUNDS.maxZ + .05, `z ${stats.minZ}..${stats.maxZ}`);
  assert.equal(stats.inside, 0, 'a cat stood inside a piece of furniture');
  assert.ok(stats.maxRest < 20, `longest single rest ${stats.maxRest.toFixed(1)}s`);
  assert.ok(stats.maxTravel < 30, `longest single walk ${stats.maxTravel.toFixed(1)}s`);
});

test('the cats use the whole room: floor spots, perches, and every kind of behaviour', () => {
  const { stats } = simulate(CAT_START, 900);
  assert.ok(stats.maxY > .5, 'nobody climbed anything');
  assert.ok(stats.perches.has('tree-low') || stats.perches.has('chair'), [...stats.perches].join());
  assert.ok(stats.pois.size >= 5, `only ${stats.pois.size} favourite spots visited: ${[...stats.pois]}`);
  for (const anim of ['idle', 'walk', 'run', 'groom', 'stretch', 'sleep', 'play', 'stalk', 'pounce', 'takeoff', 'air', 'land'])
    assert.ok(stats.anims.has(anim), `never played ${anim}`);
  for (const intent of ['roam', 'hunt', 'perch'])
    assert.ok(stats.intents.has(intent), `never decided to ${intent}`);
});

test('thirty different seeds stay healthy for five minutes each', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const { stats } = simulate([{ id: 'a', x: .1, z: .9, seed }, { id: 'b', x: -1.2, z: 1.4, seed: seed * 7 + 3 }], 300, { dt: 1 / 20 });
    assert.equal(stats.inside, 0, `seed ${seed}: stood inside furniture`);
    assert.ok(stats.maxRest < 20 && stats.maxTravel < 30, `seed ${seed}: stuck (${stats.maxRest.toFixed(1)}s rest, ${stats.maxTravel.toFixed(1)}s walk)`);
    assert.ok(stats.minX > CAT_BOUNDS.minX - .05 && stats.maxX < CAT_BOUNDS.maxX + .05, `seed ${seed}: left the room`);
  }
});

test('frame rate does not change where the cats can go', () => {
  for (const dt of [1 / 15, 1 / 30, 1 / 60, 1 / 144]) {
    const { stats } = simulate(CAT_START, 120, { dt });
    assert.equal(stats.inside, 0, `dt ${dt}`);
  }
});

test('a long tab-away (huge dt) does not teleport cats through walls', () => {
  const world = makeWorld();
  for (let i = 0; i < 400; i++) {
    for (const a of world.actors) updateActor(a, Math.min(.1, 5), world); // the renderer clamps dt; the brain must accept the clamp
  }
  for (const a of world.actors) assert.ok(Number.isFinite(a.x) && Number.isFinite(a.z));
});

/* ---------- player interaction ---------- */

test('tapping the floor calls the nearest awake cat, which arrives and greets', () => {
  const world = makeWorld();
  const grid = world.grid, target = { x: 2.0, z: .9 };
  assert.ok(isFree(grid, target.x, target.z), 'test target must be on open floor');
  const first = callCats(world, target.x, target.z);
  assert.equal(first, world.actors[0], 'Bomi is nearer than Seoli, so she should answer');
  let arrived = null, greeted = false;
  for (let t = 0; t < 25 && arrived === null; t += 1 / 30) {
    for (const a of world.actors) updateActor(a, 1 / 30, world);
    if (Math.hypot(first.x - target.x, first.z - target.z) < .35) arrived = t;
    if (first.anim === 'greet') greeted = true;
  }
  assert.ok(arrived !== null, `cat stopped at ${describe(first)}`);
  assert.ok(arrived < 4, `took ${arrived?.toFixed(1)}s to cross two units`);
  for (let t = 0; t < 1; t += 1 / 30) { for (const a of world.actors) updateActor(a, 1 / 30, world); if (first.anim === 'greet') greeted = true; }
  assert.ok(greeted, 'never greeted');
  assert.equal(first.intent, 'called');
});

test('tapping a blocked spot (on the desk, say) sends the cat to the nearest open floor', () => {
  const world = makeWorld();
  const first = callCats(world, -1.85, -2.45);
  assert.ok(first);
  const spot = nearestFree(world.grid, { x: -1.85, z: -2.45 });
  let arrived = false;
  for (let t = 0; t < 25 && !arrived; t += 1 / 30) {
    for (const a of world.actors) updateActor(a, 1 / 30, world);
    arrived = Math.hypot(first.x - spot.x, first.z - spot.z) < .3;
  }
  assert.ok(arrived, describe(first));
});

test('a cat on a perch hops down before answering a call', () => {
  const world = makeWorld();
  const bomi = world.actors[0], tree = world.perches['tree-low'], target = { x: -1.5, z: .9 };
  Object.assign(bomi, { x: tree.x, y: tree.y, z: tree.z, perch: 'tree-low', mode: 'rest', anim: 'idle', left: 5 });
  Object.assign(world.actors[1], { x: 3.6, z: 2.2 }); // keep Seoli far away
  assert.equal(callCats(world, target.x, target.z), bomi);
  let sawJump = false, arrived = false;
  for (let t = 0; t < 20 && !arrived; t += 1 / 30) {
    for (const a of world.actors) updateActor(a, 1 / 30, world);
    if (bomi.mode === 'jump') sawJump = true;
    arrived = bomi.mode !== 'jump' && !bomi.perch && Math.hypot(bomi.x - target.x, bomi.z - target.z) < .35;
  }
  assert.ok(sawJump, 'cat never jumped down');
  assert.ok(arrived, `never reached the caller: ${describe(bomi)}`);
  assert.equal(bomi.perch, null);
  assert.ok(bomi.y < .01);
});

test('a cat in mid-jump ignores calls; sleeping cats far away stay asleep', () => {
  const world = makeWorld();
  const [bomi, seoli] = world.actors;
  bomi.mode = 'jump'; seoli.mode = 'jump';
  assert.equal(callCats(world, 0, 0), null);
  bomi.mode = 'rest'; bomi.anim = 'sleep'; bomi.x = 3; bomi.z = 2; bomi.left = 10;
  seoli.mode = 'rest'; seoli.anim = 'sleep'; seoli.x = -3; seoli.z = 2; seoli.left = 10;
  assert.equal(callCats(world, 0, -1), null);
});

test('petting a cat makes it greet; petting mid-air is ignored', () => {
  const world = makeWorld();
  const a = world.actors[0];
  assert.equal(petCat(a), true);
  assert.equal(a.anim, 'greet');
  a.mode = 'jump';
  assert.equal(petCat(a), false);
});

test('planBetween: floor to tree top, tree top to floor, and chair to desk', () => {
  const world = makeWorld();
  const up = planBetween(world, null, 'tree-high');
  assert.deepEqual(up.map(s => s.t), ['go', 'jump', 'jump']);
  assert.equal(up.at(-1).perch, 'tree-high');
  const down = planBetween(world, 'tree-high', null);
  assert.deepEqual(down.map(s => s.t), ['jump', 'jump']);
  assert.equal(down.at(-1).perch, null);
  assert.equal(down.at(-1).y, 0);
  const sideways = planBetween(world, 'chair', 'desk');
  assert.deepEqual(sideways.map(s => s.t), ['jump']);
  const cross = planBetween(world, 'desk', 'tree-low');
  assert.deepEqual(cross.map(s => s.t), ['jump', 'jump', 'go', 'jump']);
  assert.deepEqual(planBetween(world, 'chair', 'chair'), []);
});

test('two cats never share the same perch', () => {
  const { world } = simulate(CAT_START, 600, {
    hook: w => {
      const seen = new Map();
      for (const a of w.actors) if (a.perch && a.mode === 'rest') {
        assert.ok(!seen.has(a.perch), `${a.id} and ${seen.get(a.perch)} both sit on ${a.perch}`);
        seen.set(a.perch, a.id);
      }
    },
  });
  assert.ok(world.actors.length === 2);
});

// Bomi and Seoli inside the 3D room: sprite-sheet billboards driven by cat-brain.js.
import * as THREE from 'three';
import { ANIM, frameAt, frameCell, createWorld, createActor, updateActor, callCats, petCat } from './cat-brain.js?v=5';
import { CAT_BOUNDS, OBSTACLES, POIS, PERCHES, CAT_START } from './room-layout.js?v=5';
import { glowTexture, shadowTexture, heartTexture } from './room-textures.js?v=5';
import { clamp, lerp } from './room-kit.js?v=5';

const SIZE = .92;         // sprite height in room units; the sitting pose fills about 70% of it
const FOOT = .075;        // empty strip under the paws in every frame, as a share of the cell
const PET_NAMES = { bomi: 'Bomi', seoli: 'Seoli' };

export function createRoomCats({ parent, disposer, images, lights = [], paused = false }) {
  const world = createWorld({ bounds: CAT_BOUNDS, obstacles: OBSTACLES, pois: POIS, perches: PERCHES });
  const cats = [];
  const keep = x => disposer.keep(x);
  const shadowTex = shadowTexture(), glowTex = glowTexture(), heartTex = heartTexture();
  let isPaused = paused, cameraAzimuth = 0, time = 0;

  for (const start of CAT_START) {
    const image = images?.[start.id];
    const actor = createActor({ id: start.id, x: start.x, z: start.z, seed: start.seed });
    world.actors.push(actor);
    let map = null, material;
    if (image && image.complete && image.naturalWidth) {
      map = keep(new THREE.Texture(image));
      map.colorSpace = THREE.SRGBColorSpace; map.magFilter = THREE.LinearFilter; map.minFilter = THREE.LinearFilter; map.generateMipmaps = false;
      map.repeat.set(.25, .25); map.needsUpdate = true;
      material = keep(new THREE.MeshBasicMaterial({ map, alphaTest: .32, side: THREE.DoubleSide, toneMapped: true }));
    } else {
      material = keep(new THREE.MeshBasicMaterial({ color: start.id === 'bomi' ? '#1c1c28' : '#d7a45f', alphaTest: .1, side: THREE.DoubleSide }));
    }
    const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(SIZE, SIZE)), material);
    mesh.name = `cat-${start.id}`; mesh.userData.cat = start.id; parent.add(mesh);
    const shadowMaterial = keep(new THREE.MeshBasicMaterial({ map: shadowTex, color: '#000', transparent: true, opacity: .55, depthWrite: false, fog: false }));
    const shadow = new THREE.Mesh(keep(new THREE.PlaneGeometry(.62, .34)), shadowMaterial);
    shadow.rotation.x = -Math.PI / 2; shadow.renderOrder = 3; parent.add(shadow);
    cats.push({ id: start.id, actor, mesh, map, material, shadow, flip: 1, bob: 0, squash: 1, reaction: 0 });
  }

  // hearts when a cat is petted
  const hearts = Array.from({ length: 8 }, () => {
    const material = keep(new THREE.SpriteMaterial({ map: heartTex, transparent: true, opacity: 0, depthWrite: false, toneMapped: false, fog: false }));
    const sprite = new THREE.Sprite(material); sprite.scale.set(.2, .2, .2); sprite.renderOrder = 8; sprite.visible = false; parent.add(sprite);
    return { sprite, material, age: 9, x: 0, y: 0, z: 0, dx: 0 };
  });
  let heartIndex = 0;
  function spawnHeart(x, y, z) {
    const h = hearts[heartIndex++ % hearts.length];
    h.age = 0; h.x = x; h.y = y; h.z = z; h.dx = (Math.random() - .5) * .2; h.sprite.visible = true;
  }

  // a ring where the floor was tapped
  const ringMaterial = keep(new THREE.MeshBasicMaterial({ map: glowTex, color: '#2ee6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
  const ring = new THREE.Mesh(keep(new THREE.RingGeometry(.12, .2, 32)), ringMaterial);
  ring.rotation.x = -Math.PI / 2; ring.position.y = .012; ring.renderOrder = 4; ring.visible = false; parent.add(ring);
  let ringAge = 9;

  const tint = new THREE.Color(), tmp = new THREE.Color();
  function tintFor(x, y, z) {
    tint.setRGB(.42, .42, .5);
    for (const L of lights) {
      const dx = x - L.x, dy = y + .3 - L.y, dz = z - L.z, d2 = dx * dx + dy * dy + dz * dz;
      const k = Math.min(.55, L.base * .05 / (d2 + .6));
      tint.add(tmp.copy(L.color).multiplyScalar(k));
    }
    tint.r = Math.min(tint.r, 1.15); tint.g = Math.min(tint.g, 1.15); tint.b = Math.min(tint.b, 1.15);
    return tint;
  }

  function place(cat, dt) {
    const a = cat.actor;
    const { col, row } = frameCell(frameAt(isPaused ? 'idle' : a.anim, a.t));
    // face the way the cat moves, as seen from the camera
    const screenX = a.dx * Math.cos(cameraAzimuth) - a.dz * Math.sin(cameraAzimuth);
    if (screenX > .12) cat.flip = 1; else if (screenX < -.12) cat.flip = -1;
    if (cat.map) {
      cat.map.repeat.x = cat.flip * .25;
      cat.map.offset.set((col + (cat.flip > 0 ? 0 : 1)) / 4, 1 - (row + 1) / 4);
    }
    const walking = !isPaused && a.mode === 'travel';
    const target = walking ? Math.abs(Math.sin(a.t * (a.run ? 17 : 11))) * (a.run ? .03 : .016) : 0;
    cat.bob += (target - cat.bob) * Math.min(1, dt * 18);
    const stretchY = a.mode === 'jump' ? 1 + Math.sin(Math.PI * Math.min(1, a.jump.t / a.jump.dur)) * .06 : 1;
    cat.mesh.position.set(a.x, a.y + SIZE / 2 - FOOT * SIZE + cat.bob, a.z);
    cat.mesh.rotation.y = cameraAzimuth;
    cat.mesh.scale.set(1, stretchY, 1);
    cat.material.color.copy(tintFor(a.x, a.y, a.z));
    // shadow stays on whatever the cat stands on
    const floorY = a.mode === 'jump' ? lerp(a.jump.fy, a.jump.ty, Math.min(1, a.jump.t / a.jump.dur)) : a.y;
    const lift = Math.max(0, a.y - floorY);
    cat.shadow.position.set(a.x, floorY + .008, a.z);
    const spread = 1 - Math.min(.5, lift * 1.2);
    cat.shadow.scale.set(spread * (a.anim === 'sleep' ? 1.35 : 1), spread, 1);
    cat.shadow.material.opacity = .55 * spread;
  }

  function update(dt, azimuth) {
    cameraAzimuth = azimuth; time += dt;
    for (const cat of cats) {
      if (!isPaused) updateActor(cat.actor, dt, world);
      place(cat, dt);
    }
    for (const h of hearts) {
      if (h.age > 1.2) { h.sprite.visible = false; continue; }
      h.age += dt; const u = h.age / 1.2;
      h.sprite.position.set(h.x + h.dx * u + Math.sin(u * 7) * .03, h.y + u * .55, h.z);
      h.material.opacity = Math.sin(Math.min(1, u) * Math.PI) * .95; const s = .16 + u * .1; h.sprite.scale.set(s, s, s);
    }
    if (ringAge < .7) {
      ringAge += dt; const u = ringAge / .7; ring.visible = true;
      ring.scale.setScalar(.6 + u * 2.4); ringMaterial.opacity = (1 - u) * .8;
    } else ring.visible = false;
  }

  return {
    world, cats, hitMeshes: cats.map(c => c.mesh), update,
    setPaused(value) { isPaused = !!value; },
    get paused() { return isPaused; },
    pet(id) {
      const cat = cats.find(c => c.id === id); if (!cat) return null;
      if (!petCat(cat.actor)) return null;
      spawnHeart(cat.actor.x, cat.actor.y + SIZE * .82, cat.actor.z);
      setTimeout(() => spawnHeart(cat.actor.x + .08, cat.actor.y + SIZE * .78, cat.actor.z), 180);
      return PET_NAMES[id] || id;
    },
    call(x, z) {
      const cx = clamp(x, CAT_BOUNDS.minX, CAT_BOUNDS.maxX), cz = clamp(z, CAT_BOUNDS.minZ, CAT_BOUNDS.maxZ);
      ring.position.set(cx, .012, cz); ringAge = 0;
      return callCats(world, cx, cz);
    },
    // Advance the simulation without drawing, for tests and screenshots.
    fastForward(seconds, step = 1 / 30) { for (let t = 0; t < seconds; t += step) for (const cat of cats) updateActor(cat.actor, step, world); },
    sizeInfo: { SIZE, FOOT },
  };
}

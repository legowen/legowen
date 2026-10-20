// Owen's night-shift room. A neon-lit, reflective little office rendered with Three.js.
// mountRoom(container, options) → controller. Everything is procedural except the cat sheets,
// the Boso screenshot and the logo SVGs.
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { buildRoom } from './room-props.js?v=7';
import { createRoomCats } from './room-cats.js?v=5';
import { backdropTexture } from './room-textures.js?v=5';
import { Disposer, clamp } from './room-kit.js?v=5';
import { ROOM } from './room-layout.js?v=5';

const TIERS = {
  high: { name: 'high', dpr: 1.75, maxPixels: 3.4e6, reflection: true, reflectionScale: .5, bloom: true, bloomStrength: .8, samples: 4, lights: 5, dust: 90 },
  medium: { name: 'medium', dpr: 1.4, maxPixels: 2.2e6, reflection: false, reflectionScale: .35, bloom: true, bloomStrength: .7, samples: 2, lights: 4, dust: 40 },
  low: { name: 'low', dpr: 1, maxPixels: 1.2e6, reflection: false, reflectionScale: .3, bloom: false, bloomStrength: 0, samples: 0, lights: 4, dust: 0, fpsCap: 30 },
};
const ORDER = ['high', 'medium', 'low'];

const BASE = { azimuth: .34, elevation: .5, fov: 30 };
const LOOK_AT = new THREE.Vector3(.2, 1.15, -.1);
const MAX_YAW = .34, MAX_PITCH = .15;

function pickTier(options) {
  const forced = options.quality || new URLSearchParams(location.search).get('q');
  if (TIERS[forced]) return forced;
  const small = matchMedia('(max-width: 700px)').matches, coarse = matchMedia('(pointer: coarse)').matches;
  const cores = navigator.hardwareConcurrency || 4, memory = navigator.deviceMemory || 4, weak = cores <= 4 || memory <= 3;
  if (small) return weak ? 'low' : 'medium';
  if (coarse) return 'medium';
  return weak ? 'medium' : 'high';
}

function loadImage(url, timeout = 0) {
  return new Promise(resolve => {
    const image = new Image(); let done = false;
    const finish = () => { if (done) return; done = true; resolve(image.complete && image.naturalWidth ? image : null); };
    image.decoding = 'async'; image.onload = finish; image.onerror = finish;
    image.src = url;
    if (timeout) setTimeout(finish, timeout);
  });
}
const here = path => new URL(path, import.meta.url).href;

export async function mountRoom(container, options = {}) {
  const { onNavigate, onReady, onError, onHover, signal } = options;
  if (signal?.aborted) throw new DOMException('Room loading cancelled', 'AbortError');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let tier = TIERS[pickTier(options)];
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'default' });
    if (!renderer.getContext()) throw new Error('WebGL is not available.');
  } catch (error) { onError?.(error); throw error; }

  const disposer = new Disposer();
  const canvas = renderer.domElement;
  canvas.className = 'room3d-canvas';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', 'Interactive 3D night-shift office. Move the mouse or drag to look around. The same destinations are available as links on this page.');
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block', touchAction: 'pan-y', outline: 'none' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x07070f, 1);
  container.appendChild(canvas);

  const scene = new THREE.Scene();
  scene.background = disposer.keep(backdropTexture());
  scene.fog = new THREE.FogExp2(0x090816, .011);
  const camera = new THREE.PerspectiveCamera(BASE.fov, 1, .1, 90);
  const root = new THREE.Group(); scene.add(root);

  /* ---------- assets ---------- */
  const [bomi, seoli, boso] = await Promise.all([
    loadImage(here('./assets/bomi.png'), 12000), loadImage(here('./assets/seoli.png'), 12000), loadImage(here('./assets/projects/boso.png'), 12000),
  ]);
  if (signal?.aborted) { renderer.dispose(); canvas.remove(); throw new DOMException('Room loading cancelled', 'AbortError'); }
  const assets = { boso, logos: null };

  /* ---------- state ---------- */
  let disposed = false, active = true, raf = 0, lastTime = 0, time = 0, dirty = true, lastRender = 0;
  let catsMoving = options.catsMoving !== false && !reducedMotion.matches;
  const size = { w: 0, h: 0, pr: 1 };
  const view = { dragYaw: 0, dragPitch: 0, hoverYaw: 0, hoverPitch: 0, yaw: 0, pitch: 0 };
  const noHover = matchMedia('(hover: none)').matches;
  const fitState = { distance: 24, mobile: false };
  let composer = null, bloomPass = null, room = null, cats = null;

  const qualityFor = () => ({ ...tier, reflectionSize: [Math.max(64, Math.round(size.w * size.pr * tier.reflectionScale)), Math.max(64, Math.round(size.h * size.pr * tier.reflectionScale))] });

  /* ---------- camera ---------- */
  const tmpPoint = new THREE.Vector3();
  function placeCamera(distance, yaw, pitch, panX = 0) {
    const az = BASE.azimuth + yaw, el = BASE.elevation + pitch;
    const tx = LOOK_AT.x + panX;
    camera.position.set(tx + Math.sin(az) * Math.cos(el) * distance, LOOK_AT.y + Math.sin(el) * distance, LOOK_AT.z + Math.cos(az) * Math.cos(el) * distance);
    camera.lookAt(tx, LOOK_AT.y, LOOK_AT.z);
    camera.updateMatrixWorld(true);
    return az;
  }
  const boxPoints = (x0, x1, y0, y1, z0, z1) => { const out = []; for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) out.push(new THREE.Vector3(x, y, z)); return out; };
  function measure(points, distance) {
    placeCamera(distance, 0, 0, 0);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of points) { tmpPoint.copy(p).project(camera); minX = Math.min(minX, tmpPoint.x); maxX = Math.max(maxX, tmpPoint.x); minY = Math.min(minY, tmpPoint.y); maxY = Math.max(maxY, tmpPoint.y); }
    return { minX, maxX, minY, maxY };
  }
  function fitCamera() {
    const { w, h } = size; if (!w || !h) return;
    camera.clearViewOffset(); camera.aspect = w / h; camera.fov = BASE.fov; camera.updateProjectionMatrix();
    const mobile = w < 700;
    fitState.mobile = mobile;
    const points = mobile
      ? boxPoints(-3.85, 3.9, -.25, 3.55, ROOM.minZ, 2.5)
      : boxPoints(ROOM.minX - .1, ROOM.maxX + .1, -.4, ROOM.wallHeight, ROOM.minZ, ROOM.maxZ + .05);
    // wide: the left third of the canvas is kept free for the hero text; narrower screens stack text above the scene
    const wide = w >= 1100, mid = w >= 700 && w < 1100;
    const rect = wide ? { x0: -1 + 2 * .295, x1: .985, y0: -.86, y1: .82 } : mid ? { x0: -.97, x1: .97, y0: -.82, y1: .86 } : { x0: -.99, x1: .99, y0: -.86, y1: .9 };
    let lo = 3, hi = 90;
    for (let i = 0; i < 24; i++) {
      const m = (lo + hi) / 2, box = measure(points, m);
      if (box.maxX - box.minX <= rect.x1 - rect.x0 && box.maxY - box.minY <= rect.y1 - rect.y0) hi = m; else lo = m;
    }
    fitState.distance = hi;
    const box = measure(points, hi);
    const dx = (rect.x0 + rect.x1) / 2 - (box.minX + box.maxX) / 2, dy = (rect.y0 + rect.y1) / 2 - (box.minY + box.maxY) / 2;
    camera.setViewOffset(w, h, -dx * w / 2, dy * h / 2, w, h);
  }
  let azimuth = BASE.azimuth;
  function updateCamera() {
    const panX = fitState.mobile ? view.yaw * 5.5 : 0;
    azimuth = placeCamera(fitState.distance, fitState.mobile ? view.yaw * .25 : view.yaw, view.pitch, panX);
  }

  /* ---------- build the room ---------- */
  const probe = qualityFor();
  // First sizing pass so reflection targets have a sensible size.
  size.w = Math.max(1, container.clientWidth); size.h = Math.max(1, container.clientHeight);
  size.pr = Math.min(devicePixelRatio || 1, tier.dpr, Math.sqrt(tier.maxPixels / (size.w * size.h)));
  try {
    room = buildRoom({ root, disposer, quality: qualityFor(), assets, anisotropy: Math.min(8, renderer.capabilities.getMaxAnisotropy()) });
    cats = createRoomCats({ parent: root, disposer, images: { bomi, seoli }, lights: room.lights, paused: !catsMoving });
  } catch (error) { disposer.dispose(); renderer.dispose(); canvas.remove(); onError?.(error); throw error; }
  void probe;

  /* ---------- pins and tooltip ---------- */
  const pinLayer = document.createElement('div'); pinLayer.className = 'room-pins';
  const tip = document.createElement('div'); tip.className = 'room-tip'; tip.hidden = true; tip.setAttribute('aria-hidden', 'true');
  tip.innerHTML = '<strong></strong><span></span>';
  container.append(pinLayer, tip);
  const pins = [];
  for (const hotspot of room.hotspots) {
    if (!hotspot.pin) continue;
    const button = document.createElement('button'); button.type = 'button'; button.className = 'room-pin';
    button.setAttribute('aria-label', `${hotspot.label}: ${hotspot.hint}`);
    button.innerHTML = `<i aria-hidden="true"></i><span>${hotspot.label}</span>`;
    button.addEventListener('click', () => onNavigate?.(hotspot.route));
    button.addEventListener('pointerenter', () => { hotspot.target = 1; dirty = true; });
    button.addEventListener('pointerleave', () => { hotspot.target = 0; dirty = true; });
    button.addEventListener('focus', () => { hotspot.target = 1; dirty = true; });
    button.addEventListener('blur', () => { hotspot.target = 0; dirty = true; });
    pinLayer.append(button);
    pins.push({ hotspot, button, point: new THREE.Vector3(...hotspot.pinAt) });
  }
  const pinVec = new THREE.Vector3();
  function updatePins() {
    for (const pin of pins) {
      pinVec.copy(pin.point).project(camera);
      const visible = pinVec.z < 1 && Math.abs(pinVec.x) < 1.02 && Math.abs(pinVec.y) < 1.02;
      pin.button.style.visibility = visible ? 'visible' : 'hidden';
      if (!visible) continue;
      pin.button.style.transform = `translate(${(pinVec.x * .5 + .5) * size.w}px, ${(-pinVec.y * .5 + .5) * size.h}px)`;
      // labels open toward the middle so they never run off the edge
      const side = pinVec.x > .35 ? 'left' : 'right';
      if (pin.side !== side) { pin.side = side; pin.button.dataset.side = side; }
    }
  }

  /* ---------- post-processing and quality ---------- */
  function buildComposer() {
    disposeComposer();
    if (!tier.bloom) return;
    const target = new THREE.WebGLRenderTarget(Math.round(size.w * size.pr), Math.round(size.h * size.pr), { type: THREE.HalfFloatType, samples: tier.samples });
    composer = new EffectComposer(renderer, target);
    composer.setPixelRatio(size.pr); composer.setSize(size.w, size.h);
    composer.addPass(new RenderPass(scene, camera));
    bloomPass = new UnrealBloomPass(new THREE.Vector2(size.w, size.h), tier.bloomStrength, .55, .78);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
  }
  function disposeComposer() {
    if (composer) { composer.renderTarget1?.dispose(); composer.renderTarget2?.dispose(); composer.passes.forEach(p => p.dispose?.()); }
    composer = null; bloomPass = null;
  }
  function applySize() {
    size.pr = Math.min(devicePixelRatio || 1, tier.dpr, Math.sqrt(tier.maxPixels / Math.max(1, size.w * size.h)));
    renderer.setPixelRatio(size.pr); renderer.setSize(size.w, size.h, false);
    if (composer) { composer.setPixelRatio(size.pr); composer.setSize(size.w, size.h); }
    if (room?.reflector) { const [rw, rh] = qualityFor().reflectionSize; room.reflector.getRenderTarget().setSize(rw, rh); }
  }
  function setTier(name, reason) {
    if (!TIERS[name] || tier.name === name) return;
    tier = TIERS[name];
    room.setReflection(tier.reflection && !!room.reflector);
    buildComposer(); applySize(); fitCamera(); updateCamera(); dirty = true;
    container.dataset.quality = tier.name;
    if (reason) console.info(`[room] quality → ${tier.name} (${reason})`);
  }
  container.dataset.quality = tier.name;

  /* ---------- sizing ---------- */
  function resize() {
    if (disposed) return;
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    if (w === size.w && h === size.h && renderer.getPixelRatio() === size.pr) return;
    size.w = w; size.h = h; applySize(); fitCamera(); updateCamera(); dirty = true; scheduleFrame();
  }
  const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(container);
  size.w = 0; size.h = 0; resize(); buildComposer(); applySize();

  /* ---------- pointer ---------- */
  const raycaster = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const floorPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), floorPoint = new THREE.Vector3();
  let drag = null, hovered = null, hoverCat = null, pointerInside = false;
  const pointerPos = { x: 0, y: 0 };
  function aim(event) {
    const box = canvas.getBoundingClientRect();
    ndc.set(((event.clientX - box.left) / box.width) * 2 - 1, -((event.clientY - box.top) / box.height) * 2 + 1);
    pointerPos.x = event.clientX - box.left; pointerPos.y = event.clientY - box.top;
    raycaster.setFromCamera(ndc, camera);
  }
  function pick() {
    const proxies = raycaster.intersectObjects(room.proxyGroup.children, false);
    const catHits = raycaster.intersectObjects(cats.hitMeshes, false).filter(hit => hit.object.visible);
    const proxy = proxies[0], catHit = catHits[0];
    if (catHit && (!proxy || catHit.distance < proxy.distance)) return { type: 'cat', id: catHit.object.userData.cat };
    if (proxy) return { type: 'hotspot', hotspot: proxy.object.userData.hotspot };
    if (raycaster.ray.intersectPlane(floorPlane, floorPoint) && floorPoint.x > ROOM.minX && floorPoint.x < ROOM.maxX && floorPoint.z > ROOM.minZ && floorPoint.z < ROOM.maxZ) return { type: 'floor', x: floorPoint.x, z: floorPoint.z };
    return { type: 'none' };
  }
  function setHover(hit) {
    const next = hit?.type === 'hotspot' ? hit.hotspot : null;
    if (next !== hovered) {
      if (hovered) hovered.target = 0;
      hovered = next; if (hovered) hovered.target = 1;
      dirty = true; onHover?.(hovered);
    }
    hoverCat = hit?.type === 'cat' ? hit.id : null;
    if (hovered) {
      tip.hidden = false; tip.children[0].textContent = hovered.label; tip.children[1].textContent = hovered.hint;
      const x = clamp(pointerPos.x + 16, 8, size.w - tip.offsetWidth - 8), y = clamp(pointerPos.y + 18, 8, size.h - tip.offsetHeight - 8);
      tip.style.transform = `translate(${x}px, ${y}px)`;
    } else tip.hidden = true;
    canvas.style.cursor = drag?.moved ? 'grabbing' : hovered || hoverCat ? 'pointer' : 'default';
  }
  function pointerDown(event) {
    if (event.button !== 0 || disposed) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw: view.dragYaw, pitch: view.dragPitch, moved: false, touch: event.pointerType !== 'mouse' };
    try { canvas.setPointerCapture(event.pointerId); } catch { /* capture is a nicety */ }
  }
  function pointerMove(event) {
    aim(event);
    if (drag && event.pointerId === drag.id) {
      const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) < 6) return;
      if (drag.touch && !drag.moved && Math.abs(dy) > Math.abs(dx) * 1.2) { drag = null; return; }
      drag.moved = true; tip.hidden = true;
      view.dragYaw = clamp(drag.yaw - dx * .0035, -MAX_YAW, MAX_YAW);
      // Touch drags that start sideways may also tilt the view, like a mouse drag. A swipe that starts
      // up or down is left to the browser (touch-action: pan-y), so the page still scrolls.
      view.dragPitch = clamp(drag.pitch + dy * (drag.touch ? .0024 : .0016), -MAX_PITCH, MAX_PITCH);
      canvas.style.cursor = 'grabbing'; dirty = true; scheduleFrame(); return;
    }
    if (event.pointerType === 'mouse') {
      pointerInside = true;
      const nx = clamp(ndc.x, -1, 1), ny = clamp(ndc.y, -1, 1);
      view.hoverYaw = nx * .06; view.hoverPitch = -ny * .025;
      setHover(pick()); dirty = true; scheduleFrame();
    }
  }
  function pointerUp(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const moved = drag.moved; drag = null;
    try { canvas.releasePointerCapture(event.pointerId); } catch { /* already released */ }
    if (moved) { canvas.style.cursor = 'default'; return; }
    aim(event);
    const hit = pick();
    if (hit.type === 'hotspot') onNavigate?.(hit.hotspot.route);
    else if (hit.type === 'cat') { const name = cats.pet(hit.id); if (name) options.onPet?.(name); }
    else if (hit.type === 'floor') cats.call(hit.x, hit.z);
    dirty = true; scheduleFrame();
  }
  function pointerLeave() { pointerInside = false; view.hoverYaw = 0; view.hoverPitch = 0; setHover(null); dirty = true; scheduleFrame(); }
  function pointerCancel() { drag = null; canvas.style.cursor = 'default'; }
  function keyDown(event) {
    const step = .06;
    if (event.key === 'ArrowLeft') view.dragYaw = clamp(view.dragYaw - step, -MAX_YAW, MAX_YAW);
    else if (event.key === 'ArrowRight') view.dragYaw = clamp(view.dragYaw + step, -MAX_YAW, MAX_YAW);
    else if (event.key === 'Home' || event.key === 'Escape') { view.dragYaw = 0; view.dragPitch = 0; }
    else return;
    event.preventDefault(); dirty = true; scheduleFrame();
  }
  function contextLost(event) { event.preventDefault(); pauseLoop(); onError?.(new Error('The 3D graphics context was interrupted.')); }
  function contextRestored() { dirty = true; scheduleFrame(); }
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('pointerleave', pointerLeave);
  canvas.addEventListener('webglcontextlost', contextLost);
  canvas.addEventListener('webglcontextrestored', contextRestored);
  canvas.tabIndex = 0; canvas.addEventListener('keydown', keyDown);

  /* ---------- loop ---------- */
  const governor = { frames: 0, total: 0, warm: 0, drops: 0 };
  function governorTick(dt) {
    governor.warm += dt; if (governor.warm < 2.5) return;
    governor.frames++; governor.total += dt;
    if (governor.frames >= 90) {
      const average = governor.total / governor.frames;
      governor.frames = 0; governor.total = 0;
      if (average > .036 && !options.noGovernor) {
        const next = ORDER[ORDER.indexOf(tier.name) + 1];
        if (next) { governor.warm = 0; setTier(next, `${(average * 1000).toFixed(0)} ms per frame`); }
      }
    }
  }
  function renderOnce() {
    if (composer) composer.render(); else renderer.render(scene, camera);
  }
  function frame(now) {
    raf = 0;
    if (disposed || !active || document.hidden) return;
    const animating = !reducedMotion.matches;
    if (tier.fpsCap && now - lastRender < 1000 / tier.fpsCap - 2 && !dirty) { scheduleFrame(); return; }
    lastRender = now;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, .05) : 0; lastTime = now;
    if (animating || dirty) {
      time += animating ? dt : 0;
      // ease the camera toward its target offsets
      const ease = 1 - Math.pow(.0015, dt);
      // Phones and tablets have no hover, so the view sways gently by itself instead.
      if (noHover && animating && !drag) { view.hoverYaw = Math.sin(time * .23) * .05; view.hoverPitch = Math.sin(time * .17 + 1) * .03; }
      const ty = clamp(view.dragYaw + (reducedMotion.matches ? 0 : view.hoverYaw), -MAX_YAW - .06, MAX_YAW + .06), tp = clamp(view.dragPitch + (reducedMotion.matches ? 0 : view.hoverPitch), -MAX_PITCH - .03, MAX_PITCH + .03);
      view.yaw += (ty - view.yaw) * ease; view.pitch += (tp - view.pitch) * ease;
      updateCamera();
      cats.update(animating ? dt : 0, azimuth);
      for (const fn of room.updaters) fn(time, dt);
      room.hoverUpdater(dt);
      room.updateScreens(time);
      updatePins();
      renderOnce();
      governorTick(dt);
      dirty = Math.abs(ty - view.yaw) > .0004 || Math.abs(tp - view.pitch) > .0004 || room.hotspots.some(h => Math.abs(h.target - h.hover) > .01);
    }
    if (animating || dirty) scheduleFrame();
  }
  function scheduleFrame() { if (!raf && !disposed && active && !document.hidden) raf = requestAnimationFrame(frame); }
  function pauseLoop() { if (raf) cancelAnimationFrame(raf); raf = 0; lastTime = 0; }
  function visibilityChange() { if (document.hidden) pauseLoop(); else { lastTime = 0; scheduleFrame(); } }
  function motionChange() {
    const reduced = reducedMotion.matches;
    cats.setPaused(reduced || !catsMoving); if (reduced) { view.hoverYaw = 0; view.hoverPitch = 0; }
    lastTime = 0; dirty = true; scheduleFrame();
  }
  document.addEventListener('visibilitychange', visibilityChange);
  reducedMotion.addEventListener('change', motionChange);

  /* ---------- logos load after the first frame ---------- */
  Promise.all(['windows', 'azure', 'teams', 'onedrive', 'powerbi', 'icon'].map(async key => {
    const file = { windows: 'microsoft-windows-icon', azure: 'microsoft-azure', teams: 'microsoft-teams', onedrive: 'microsoft-onedrive', powerbi: 'microsoft-power-bi', icon: 'microsoft-icon' }[key];
    return [key, await loadImage(here(`./assets/logos/${file}.svg`))];
  })).then(entries => { if (disposed) return; assets.logos = Object.fromEntries(entries); room.refreshLogos(assets); dirty = true; scheduleFrame(); });

  function dispose() {
    if (disposed) return;
    disposed = true; pauseLoop(); resizeObserver.disconnect();
    document.removeEventListener('visibilitychange', visibilityChange);
    reducedMotion.removeEventListener('change', motionChange);
    for (const [type, fn] of [['pointerdown', pointerDown], ['pointermove', pointerMove], ['pointerup', pointerUp], ['pointercancel', pointerCancel], ['pointerleave', pointerLeave], ['webglcontextlost', contextLost], ['webglcontextrestored', contextRestored], ['keydown', keyDown]]) canvas.removeEventListener(type, fn);
    signal?.removeEventListener('abort', dispose);
    disposeComposer(); disposer.dispose(); renderer.dispose(); renderer.forceContextLoss?.();
    pinLayer.remove(); tip.remove(); canvas.remove();
  }
  signal?.addEventListener('abort', dispose, { once: true });

  // first frame, then start the loop
  updateCamera(); cats.update(0, azimuth); room.updateScreens(0, true); updatePins(); renderOnce();
  scheduleFrame();
  onReady?.();

  return {
    dispose,
    setCatsMoving(value) { catsMoving = !!value; cats.setPaused(!catsMoving || reducedMotion.matches); lastTime = 0; dirty = true; scheduleFrame(); },
    setActive(value) { active = !!value; if (active) { lastTime = 0; scheduleFrame(); } else pauseLoop(); },
    resetView() { view.dragYaw = 0; view.dragPitch = 0; dirty = true; scheduleFrame(); },
    get quality() { return tier.name; },
    setQuality(name) { setTier(name, 'manual'); },
    debug: {
      THREE, scene, camera, renderer, room, cats, view, assets,
      render() { updateCamera(); cats.update(0, azimuth); updatePins(); renderOnce(); },
      step(seconds) { cats.fastForward(seconds); for (let t = 0; t < seconds; t += 1 / 10) { time += 1 / 10; for (const fn of room.updaters) fn(time, 1 / 10); room.updateScreens(time); } cats.update(0, azimuth); dirty = true; scheduleFrame(); },
      setView(yaw, pitch) { view.dragYaw = yaw; view.dragPitch = pitch; view.yaw = yaw; view.pitch = pitch; dirty = true; scheduleFrame(); },
      setTier: name => setTier(name, 'debug'),
      get time() { return time; },
    },
  };
}

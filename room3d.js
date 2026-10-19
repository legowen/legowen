import * as THREE from './vendor/three.module.js';

// A small, entirely procedural workspace. No model service or external runtime.
export async function mountRoom(container, options = {}) {
  const { onNavigate, onReady, onError, signal } = options;
  if (signal?.aborted) throw new DOMException('Room loading cancelled', 'AbortError');

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    onError?.(error);
    throw error;
  }

  const mobile = window.matchMedia('(max-width: 700px)').matches;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const resources = new Set();
  const keep = resource => (resources.add(resource), resource);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-4, 4, 3.5, -3.5, .1, 60);
  const target = new THREE.Vector3(0, 1.4, 0);
  let disposed = false, active = true, frame = 0, lastTime = 0;
  let catsMoving = options.catsMoving !== false;
  let yaw = .69, pitch = .58;
  const canvas = renderer.domElement;
  canvas.className = 'room3d-canvas';
  canvas.setAttribute('aria-label', 'Interactive 3D workspace. Drag to look around. Use the links below to explore.');
  canvas.setAttribute('role', 'img');
  Object.assign(canvas.style, { width: '100%', height: '100%', display: 'block', touchAction: 'pan-y', cursor: 'grab' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.5));
  renderer.setClearColor(0x12151c, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.3;
  renderer.shadowMap.enabled = !mobile;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  container.appendChild(canvas);

  const palette = {
    wall: 0x676881, edge: 0x444759, wood: 0xb99979, dark: 0x242a38,
    mint: 0xb4dca8, lilac: 0xb6a4df, cream: 0xe8d9b9, metal: 0x596070,
  };
  const mat = (color, extra = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: .8, ...extra }));
  const materials = Object.fromEntries(Object.entries(palette).map(([key, color]) => [key, mat(color)]));
  const glow = (color, intensity = .5) => mat(color, { emissive: color, emissiveIntensity: intensity });
  const mintGlow = glow(0xa6efc8, .65), lilacGlow = glow(0xc6a9ff, .6);
  const darkGlass = mat(0x171f31, { roughness: .25, metalness: .15 });
  const boxGeometry = keep(new THREE.BoxGeometry(1, 1, 1));
  const room = new THREE.Group();
  scene.add(room);

  function mesh(geometry, material, x, y, z, parent = room) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function box(x, y, z, width, height, depth, material, parent = room) {
    const object = mesh(boxGeometry, material, x, y, z, parent);
    object.scale.set(width, height, depth);
    return object;
  }
  function cylinder(x, y, z, top, bottom, height, material, sides = 10, parent = room) {
    return mesh(keep(new THREE.CylinderGeometry(top, bottom, height, sides)), material, x, y, z, parent);
  }
  function sphere(x, y, z, radius, material, parent = room) {
    return mesh(keep(new THREE.IcosahedronGeometry(radius, 0)), material, x, y, z, parent);
  }
  function lineBetween(a, b, radius, material, parent = room) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const object = cylinder(0, 0, 0, radius, radius, start.distanceTo(end), material, 6, parent);
    object.position.copy(start.clone().add(end).multiplyScalar(.5));
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    return object;
  }
  function canvasMaterial(width, height, paint) {
    const surface = document.createElement('canvas');
    surface.width = width;
    surface.height = height;
    paint(surface.getContext('2d'), width, height);
    const texture = keep(new THREE.CanvasTexture(surface));
    texture.colorSpace = THREE.SRGBColorSpace;
    return keep(new THREE.MeshBasicMaterial({ map: texture }));
  }
  function plane(x, y, z, width, height, material, parent = room) {
    return mesh(keep(new THREE.PlaneGeometry(width, height)), material, x, y, z, parent);
  }

  // Open-front diorama, with a slim walnut plinth and individual floor boards.
  box(0, -.17, 0, 6.5, .3, 5.3, materials.edge);
  box(0, -.035, 0, 6.4, .08, 5.2, materials.wood);
  const floorMat = [mat(0xb59b80), mat(0xc2a58a), mat(0xbca088)];
  for (let i = 0; i < 13; i++) box(-3.03 + i * .505, .012, 0, .493, .025, 5.14, floorMat[i % 3]);
  box(0, 1.53, -2.6, 6.5, 3.05, .13, materials.wall);
  const leftWallMaterial = mat(0x85829a);
  box(-3.2, 1.53, 0, .13, 3.05, 5.3, leftWallMaterial);
  box(0, .12, -2.49, 6.3, .22, .08, materials.edge);
  box(-3.09, .12, 0, .08, .22, 5.15, materials.edge);
  box(0, 3.07, -2.6, 6.53, .08, .16, materials.edge);
  box(-3.2, 3.07, 0, .16, .08, 5.3, materials.edge);

  // A window on the left wall: dusky sky, distant city, and a thin warm frame.
  const windowArt = canvasMaterial(256, 384, (ctx, w, h) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#26294d'); gradient.addColorStop(1, '#bd8d9f');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#ffe7bd'; ctx.beginPath(); ctx.arc(174, 80, 24, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e2d3ed';
    for (const [x, y] of [[32, 36], [80, 94], [139, 24], [218, 139], [51, 154], [229, 42]]) ctx.fillRect(x, y, 2, 2);
    const buildings = [[0, 237, 35], [39, 270, 32], [75, 210, 40], [119, 250, 34], [158, 278, 42], [205, 225, 51]];
    buildings.forEach(([x, y, bw], i) => {
      ctx.fillStyle = i % 2 ? '#383650' : '#474059'; ctx.fillRect(x, y, bw, h - y);
      ctx.fillStyle = '#d9bc9b';
      for (let yy = y + 14; yy < h; yy += 23) for (let xx = x + 7; xx < x + bw - 4; xx += 14) {
        if ((xx + yy) % 3 !== 0) ctx.fillRect(xx, yy, 4, 8);
      }
    });
  });
  const windowGroup = new THREE.Group(); windowGroup.position.set(-3.11, 1.96, .65); windowGroup.rotation.y = Math.PI / 2; room.add(windowGroup);
  box(0, 0, -.015, 1.54, 1.7, .08, materials.cream, windowGroup);
  plane(0, 0, .035, 1.37, 1.53, windowArt, windowGroup);
  box(0, 0, .07, .045, 1.56, .07, materials.cream, windowGroup);
  box(0, -.15, .07, 1.4, .045, .07, materials.cream, windowGroup);
  box(0, -.89, .1, 1.75, .11, .32, materials.wood, windowGroup);

  // Desk, dual monitors, keyboard and a quiet little coffee break.
  box(-.36, 1.12, -1.67, 3.25, .14, 1.22, materials.wood);
  for (const x of [-1.77, 1.04]) for (const z of [-2.13, -1.18]) box(x, .55, z, .09, 1.08, .09, materials.dark);
  box(-1.42, .76, -1.64, .57, .64, .93, materials.cream);
  for (const y of [.61, .84]) {
    box(-1.42, y, -1.165, .51, .205, .025, materials.wood);
    box(-1.42, y, -1.145, .14, .025, .025, materials.dark);
  }
  const monitorScreen = canvasMaterial(640, 360, (ctx, w, h) => {
    ctx.fillStyle = '#182630'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#29433f'; ctx.fillRect(0, 0, 132, h);
    ctx.fillStyle = '#c8edbc'; ctx.font = 'bold 28px sans-serif'; ctx.fillText('OK.', 28, 53);
    ctx.font = '16px sans-serif'; ctx.fillStyle = '#9eadae';
    ['Overview', 'Devices', 'Identity', 'Services'].forEach((text, i) => ctx.fillText(text, 18, 112 + i * 39));
    ctx.fillStyle = '#edf1df'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('A better workday.', 160, 58);
    ctx.fillStyle = '#9babb0'; ctx.font = '15px sans-serif'; ctx.fillText('A little care. A lot of uptime.', 162, 87);
    ['ENDPOINTS', 'IDENTITY', 'WORKPLACE'].forEach((text, i) => {
      ctx.fillStyle = '#283c44'; ctx.fillRect(160 + i * 151, 117, 136, 100);
      ctx.fillStyle = i === 1 ? '#b9a9e8' : '#b8ddb1'; ctx.font = 'bold 27px sans-serif'; ctx.fillText(['READY', 'SECURE', 'SYNCED'][i], 171 + i * 151, 158);
      ctx.font = '11px sans-serif'; ctx.fillText(text, 171 + i * 151, 187);
    });
    ctx.strokeStyle = '#aed3a7'; ctx.lineWidth = 3; ctx.beginPath();
    [268, 274, 259, 266, 246, 250, 232, 241, 226, 232].forEach((y, i) => i ? ctx.lineTo(166 + i * 48, y) : ctx.moveTo(166, y)); ctx.stroke();
    ctx.fillStyle = '#adc1c1'; ctx.font = '12px sans-serif'; ctx.fillText('SYSTEMS · PEOPLE · POSSIBILITY', 162, 324);
  });
  const secondScreen = canvasMaterial(256, 384, (ctx, w, h) => {
    ctx.fillStyle = '#302a47'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d4c4ef'; ctx.font = 'bold 23px sans-serif'; ctx.fillText('The playground.', 16, 42);
    ['BOSO', 'MYEONGCAT', 'LOTTOMAX', 'WEATHER'].forEach((title, i) => {
      ctx.fillStyle = ['#526b65', '#69547b', '#635a3a', '#405e74'][i]; ctx.fillRect(17, 70 + i * 73, 222, 59);
      ctx.fillStyle = '#f3eadc'; ctx.font = 'bold 16px sans-serif'; ctx.fillText(title, 31, 105 + i * 73);
    });
  });
  function monitor(x, y, width, height, art) {
    const group = new THREE.Group(); group.userData.navigate = 'projects'; room.add(group);
    box(x, y, -1.97, width + .09, height + .09, .11, materials.dark, group);
    const screen = plane(x, y, -1.906, width, height, art, group); screen.castShadow = false;
    box(x, 1.3, -1.98, .065, .3, .065, materials.metal, group);
    box(x, 1.211, -1.93, .46, .035, .28, materials.dark, group);
  }
  monitor(-.72, 1.76, 1.36, .765, monitorScreen);
  monitor(.56, 1.79, .57, .855, secondScreen);
  box(-.5, 1.214, -1.36, .92, .035, .31, materials.dark);
  for (let row = 0; row < 3; row++) for (let key = 0; key < 11; key++) box(-.9 + key * .078, 1.237, -1.45 + row * .084, .06, .012, .055, row === 0 ? materials.lilac : materials.cream);
  box(.39, 1.213, -1.35, .31, .018, .34, materials.edge);
  const mouse = sphere(.39, 1.26, -1.34, .075, materials.cream); mouse.scale.set(.7, .45, 1.2);
  cylinder(.94, 1.31, -1.52, .09, .075, .21, materials.lilac, 12);
  cylinder(.94, 1.42, -1.52, .078, .078, .008, mat(0x533e34), 12);
  const mugHandle = mesh(keep(new THREE.TorusGeometry(.061, .015, 6, 12)), materials.lilac, 1.041, 1.32, -1.52); mugHandle.rotation.y = Math.PI / 2;

  // Upholstered swivel chair; distinct silhouette without a heavy model asset.
  const chair = new THREE.Group(); chair.position.set(-.45, 0, -.34); chair.rotation.y = -.16; room.add(chair);
  cylinder(0, .23, 0, .045, .045, .4, materials.dark, 8, chair);
  for (let i = 0; i < 5; i++) {
    const angle = i * Math.PI * 2 / 5;
    lineBetween([0, .1, 0], [Math.sin(angle) * .37, .07, Math.cos(angle) * .37], .027, materials.dark, chair);
    sphere(Math.sin(angle) * .37, .055, Math.cos(angle) * .37, .055, materials.dark, chair);
  }
  box(0, .53, 0, .69, .15, .64, materials.mint, chair);
  box(0, .97, .25, .67, .77, .16, materials.mint, chair);
  box(0, 1.29, .25, .48, .13, .19, materials.mint, chair);
  for (const side of [-1, 1]) {
    box(side * .38, .7, 0, .035, .34, .035, materials.dark, chair);
    box(side * .38, .85, -.035, .105, .055, .39, materials.dark, chair);
  }

  // Rack hardware provides the systems hotspot, with modest status lighting.
  const rack = new THREE.Group(); rack.userData.navigate = 'work'; rack.position.set(2.33, 0, -1.92); room.add(rack);
  box(0, .94, 0, .88, 1.86, .91, materials.dark, rack);
  box(0, .94, .465, .75, 1.66, .035, darkGlass, rack);
  for (let i = 0; i < 6; i++) {
    const y = .28 + i * .245;
    box(0, y, .495, .67, .18, .05, materials.metal, rack);
    for (let slot = 0; slot < 5; slot++) box(-.23 + slot * .077, y, .525, .035, .095, .01, materials.dark, rack);
    for (let led = 0; led < 2; led++) box(.22 + led * .054, y, .53, .025, .027, .01, i % 2 ? mintGlow : lilacGlow, rack);
  }
  box(0, 1.91, 0, .72, .06, .73, materials.edge, rack);

  // Floating shelves, books, a simple framed work-history print, and a neon line.
  box(-1.48, 2.5, -2.32, 2.15, .09, .48, materials.wood);
  for (let i = 0; i < 6; i++) {
    const book = box(-2.28 + i * .13, 2.72 + (i % 2) * .025, -2.34, .105, .36 + (i % 2) * .05, .25, [materials.lilac, materials.mint, materials.cream][i % 3]);
    if (i === 5) book.rotation.z = -.16;
  }
  const tinyBox = box(-1.02, 2.67, -2.31, .28, .25, .28, materials.mint); tinyBox.rotation.y = .3;
  box(-1.02, 2.67, -2.155, .09, .04, .012, materials.dark);
  const careerArt = canvasMaterial(256, 320, (ctx, w, h) => {
    ctx.fillStyle = '#ded6c5'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a3d49'; ctx.font = 'bold 26px sans-serif'; ctx.fillText('STAY', 29, 50); ctx.fillText('CURIOUS.', 29, 81);
    ctx.strokeStyle = '#7b698f'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(58, 123); ctx.lineTo(58, 267); ctx.stroke();
    ['EXPLORE', 'CONNECT', 'GROW'].forEach((text, i) => {
      ctx.fillStyle = '#677f69'; ctx.beginPath(); ctx.arc(58, 139 + i * 57, 9, 0, Math.PI * 2); ctx.fill();
      ctx.font = 'bold 15px sans-serif'; ctx.fillText(text, 82, 145 + i * 57);
    });
  });
  const frameGroup = new THREE.Group(); frameGroup.userData.navigate = 'experience'; room.add(frameGroup);
  box(1.28, 2.25, -2.49, .82, 1.06, .08, materials.wood, frameGroup);
  plane(1.28, 2.25, -2.442, .71, .94, careerArt, frameGroup);
  const sign = canvasMaterial(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#414459'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d0edbe'; ctx.font = 'bold 51px sans-serif'; ctx.fillText('OWEN’S SPACE', 20, 83);
  });
  plane(-.38, 2.77, -2.514, 1.43, .36, sign);
  box(-.38, 2.5, -2.505, 1.2, .018, .018, mintGlow);

  function plant(x, y, z, scale = 1) {
    const group = new THREE.Group(); group.position.set(x, y, z); group.scale.setScalar(scale); room.add(group);
    cylinder(0, .19, 0, .22, .16, .37, materials.cream, 9, group);
    cylinder(0, .38, 0, .19, .19, .025, mat(0x4a3f3c), 9, group);
    const leafMaterial = mat(0x698d70);
    for (let i = 0; i < 7; i++) {
      const angle = i * 2.4, height = .67 + (i % 3) * .12;
      const x = Math.sin(angle) * .21, z = Math.cos(angle) * .21;
      lineBetween([0, .36, 0], [x, height, z], .012, leafMaterial, group);
      const leaf = sphere(x, height, z, .17, i % 2 ? leafMaterial : materials.mint, group);
      leaf.scale.set(.5, 1.6, .77); leaf.rotation.z = -x * 2; leaf.rotation.x = z * 2;
    }
  }
  plant(-2.65, .04, -1.88, 1.28);
  plant(-.48, 2.55, -2.3, .43);
  plant(2.33, 1.95, -1.95, .6);
  plant(-3.01, 1.12, 1.12, .44);

  // A soft woven rug and a cat-sized corner give the room a lived-in scale.
  const rug = box(.55, .035, 1.08, 3.72, .025, 1.6, mat(0xaaa1c4));
  for (let i = 0; i < 14; i++) box(-1.2 + i * .27, .051, 1.08, .014, .002, 1.51, mat(0xb8b0ce));
  for (const z of [.33, 1.83]) box(.55, .052, z, 3.59, .002, .025, materials.cream);
  cylinder(-2.3, .14, 1.9, .47, .42, .24, materials.lilac, 12);
  cylinder(-2.3, .264, 1.9, .37, .37, .015, mat(0xd7cce6), 12);
  cylinder(2.68, .08, 1.87, .15, .18, .1, materials.mint, 12);
  cylinder(2.68, .134, 1.87, .11, .11, .01, mat(0x617da2), 12);

  scene.add(new THREE.HemisphereLight(0xdce8ff, 0x715d72, 2.1));
  const key = new THREE.DirectionalLight(0xffe6c5, 3.1);
  key.position.set(3.5, 7, 5); key.castShadow = !mobile;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -5, right: 5, top: 5, bottom: -5, near: .5, far: 20 });
  key.shadow.normalBias = .035; key.shadow.bias = -.0003; scene.add(key);
  const fill = new THREE.DirectionalLight(0xa9baff, 1.4); fill.position.set(-4, 4, -2); scene.add(fill);
  const deskGlow = new THREE.PointLight(0xadf2d4, 1.1, 3.3, 2); deskGlow.position.set(-.6, 1.8, -1.1); scene.add(deskGlow);

  const cats = [];
  const catPaths = [
    [[-1.6, .65], [.6, .76], [2.24, 1.03], [1.4, 1.64], [-1.42, 1.64]],
    [[1.4, 1.75], [-.35, 1.34], [-1.83, 1.12], [-.6, .49], [1.95, .5]],
  ];

  function createCat(texture, index) {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.repeat.set(.25, .25);
    const material = keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, alphaTest: .08, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    const cat = plane(0, .36, 0, .68, .68, material);
    cat.castShadow = false; cat.receiveShadow = false; cat.renderOrder = 1;
    const shadowMaterial = keep(new THREE.MeshBasicMaterial({ color: 0x292332, transparent: true, opacity: .18, depthWrite: false }));
    const shadow = mesh(keep(new THREE.CircleGeometry(.2, 16)), shadowMaterial, 0, .063, 0);
    shadow.rotation.x = -Math.PI / 2; shadow.scale.y = .6; shadow.castShadow = false;
    const path = catPaths[index];
    const state = { mesh: cat, shadow, texture, path, waypoint: 1, pause: index ? 1.7 : 0, elapsed: 0, speed: index ? .31 : .27, direction: 1, moving: false };
    cat.position.set(path[0][0], .38, path[0][1]);
    cats.push(state);
    updateCat(state, 0, false);
  }

  function updateCat(cat, delta, animate) {
    cat.elapsed += delta;
    cat.moving = false;
    if (animate) {
      cat.pause = Math.max(0, cat.pause - delta);
      if (!cat.pause) {
        const [x, z] = cat.path[cat.waypoint];
        const dx = x - cat.mesh.position.x, dz = z - cat.mesh.position.z;
        const distance = Math.hypot(dx, dz), step = cat.speed * delta;
        if (distance < Math.max(step, .018)) {
          cat.waypoint = (cat.waypoint + 1) % cat.path.length;
          cat.pause = 1.6 + cat.waypoint * .35;
        } else {
          cat.mesh.position.x += dx / distance * step;
          cat.mesh.position.z += dz / distance * step;
          cat.direction = dx * Math.cos(yaw) - dz * Math.sin(yaw) < 0 ? -1 : 1;
          cat.moving = true;
        }
      }
    }
    const spriteFrame = cat.moving ? [2, 3, 4, 5][Math.floor(cat.elapsed * 7) % 4] : 0;
    const col = spriteFrame % 4, row = Math.floor(spriteFrame / 4);
    cat.texture.repeat.x = cat.direction > 0 ? .25 : -.25;
    cat.texture.offset.set((col + (cat.direction > 0 ? 0 : 1)) / 4, 1 - (row + 1) / 4);
    cat.mesh.rotation.y = yaw;
    cat.mesh.position.y = .38 + (cat.moving ? Math.abs(Math.sin(cat.elapsed * 14)) * .012 : 0);
    cat.shadow.position.set(cat.mesh.position.x, .064, cat.mesh.position.z);
  }

  function updateCamera() {
    camera.position.set(Math.sin(yaw) * Math.cos(pitch) * 12, Math.sin(pitch) * 12 + target.y, Math.cos(yaw) * Math.cos(pitch) * 12);
    camera.lookAt(target);
    cats.forEach(cat => { cat.mesh.rotation.y = yaw; });
  }
  function requestRender() {
    if (!disposed && active && !document.hidden && !frame) frame = requestAnimationFrame(render);
  }
  function render(time) {
    frame = 0;
    if (disposed || !active || document.hidden) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .05) : 0;
    lastTime = time;
    const animate = catsMoving && !motionPreference.matches;
    cats.forEach(cat => updateCat(cat, delta, animate));
    renderer.render(scene, camera);
    if (animate && cats.length) requestRender();
  }
  function resize() {
    if (disposed) return;
    const width = Math.max(container.clientWidth, 1), height = Math.max(container.clientHeight, 1);
    const aspect = width / height, halfHeight = Math.max(3.8, 4.35 / aspect);
    Object.assign(camera, { left: -halfHeight * aspect, right: halfHeight * aspect, top: halfHeight, bottom: -halfHeight });
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    requestRender();
  }
  function pauseRender() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function visibilityChange() { if (document.hidden) pauseRender(); else requestRender(); }
  function motionChange() { lastTime = 0; requestRender(); }

  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  let drag = null;
  function routeAt(event) {
    const bounds = canvas.getBoundingClientRect();
    pointer.set(((event.clientX - bounds.left) / bounds.width) * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(room, true);
    for (const hit of hits) {
      let object = hit.object;
      if (object.material?.transparent && object.material?.opacity < .3) continue;
      while (object && object !== room) {
        if (object.userData.navigate) return object.userData.navigate;
        object = object.parent;
      }
      return null;
    }
    return null;
  }
  function pointerDown(event) {
    if (event.button !== 0 || disposed) return;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, yaw, pitch, moved: false, touch: event.pointerType === 'touch' };
    canvas.setPointerCapture(event.pointerId);
  }
  function pointerMove(event) {
    if (!drag || event.pointerId !== drag.id) {
      if (event.pointerType !== 'touch') canvas.style.cursor = routeAt(event) ? 'pointer' : 'grab';
      return;
    }
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 6) return;
    drag.moved = true;
    yaw = THREE.MathUtils.clamp(drag.yaw - dx * .004, .26, 1.13);
    if (!drag.touch) pitch = THREE.MathUtils.clamp(drag.pitch + dy * .003, .42, .83);
    canvas.style.cursor = 'grabbing';
    updateCamera(); requestRender();
  }
  function pointerUp(event) {
    if (!drag || event.pointerId !== drag.id) return;
    const wasDragged = drag.moved; drag = null;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    canvas.style.cursor = 'grab';
    if (!wasDragged) { const route = routeAt(event); if (route) onNavigate?.(route); }
  }
  function pointerCancel() { drag = null; canvas.style.cursor = 'grab'; }
  function contextLost(event) { event.preventDefault(); pauseRender(); onError?.(new Error('The 3D graphics context was interrupted.')); }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  document.addEventListener('visibilitychange', visibilityChange);
  motionPreference.addEventListener('change', motionChange);
  canvas.addEventListener('pointerdown', pointerDown);
  canvas.addEventListener('pointermove', pointerMove);
  canvas.addEventListener('pointerup', pointerUp);
  canvas.addEventListener('pointercancel', pointerCancel);
  canvas.addEventListener('lostpointercapture', pointerCancel);
  canvas.addEventListener('webglcontextlost', contextLost);

  function dispose() {
    if (disposed) return;
    disposed = true; pauseRender(); observer.disconnect();
    document.removeEventListener('visibilitychange', visibilityChange);
    motionPreference.removeEventListener('change', motionChange);
    canvas.removeEventListener('pointerdown', pointerDown);
    canvas.removeEventListener('pointermove', pointerMove);
    canvas.removeEventListener('pointerup', pointerUp);
    canvas.removeEventListener('pointercancel', pointerCancel);
    canvas.removeEventListener('lostpointercapture', pointerCancel);
    canvas.removeEventListener('webglcontextlost', contextLost);
    signal?.removeEventListener('abort', dispose);
    resources.forEach(resource => resource.dispose());
    key.shadow.map?.dispose();
    renderer.dispose(); canvas.remove();
  }
  signal?.addEventListener('abort', dispose, { once: true });

  try {
    updateCamera(); resize();
    const loader = new THREE.TextureLoader();
    const textures = await Promise.allSettled(['bomi', 'seoli'].map(name => loader.loadAsync(new URL(`./assets/${name}.png`, import.meta.url).href)));
    textures.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (disposed) result.value.dispose();
        else createCat(keep(result.value), index);
      }
    });
    // Original maps baked in Blender; geometry and lighting stay lightweight Three.js.
    await Promise.all([
      ['wood', [materials.wood, ...floorMat], [1, 1], .012],
      ['plaster', [materials.wall, leftWallMaterial], [3, 2], .018],
      ['woven', [rug.material], [1.5, 1], .025],
    ].map(async ([name, targets, repeat, bumpScale]) => {
      const maps = await Promise.allSettled(['color', 'roughness'].map(kind => loader.loadAsync(new URL(`./assets/materials/${name}-${kind}.png`, import.meta.url).href)));
      maps.forEach((result, index) => {
        if (result.status !== 'fulfilled') return; // Plain materials remain a valid fallback.
        const texture = result.value;
        if (disposed) { texture.dispose(); return; }
        keep(texture);
        texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(...repeat);
        texture.anisotropy = Math.min(mobile ? 2 : 4, renderer.capabilities.getMaxAnisotropy());
        if (index === 0) texture.colorSpace = THREE.SRGBColorSpace;
        targets.forEach(material => {
          if (index === 0) material.map = texture;
          else { material.roughnessMap = texture; material.bumpMap = texture; material.bumpScale = bumpScale; }
          material.needsUpdate = true;
        });
      });
    }));
    if (disposed) throw new DOMException('Room loading cancelled', 'AbortError');
    renderer.render(scene, camera);
    requestRender(); onReady?.();
  } catch (error) {
    dispose();
    if (error.name !== 'AbortError') onError?.(error);
    throw error;
  }

  return {
    dispose,
    setCatsMoving(value) { catsMoving = !!value; lastTime = 0; requestRender(); },
    setActive(value) { active = !!value; if (active) requestRender(); else pauseRender(); },
    resetView() { yaw = .69; pitch = .58; updateCamera(); requestRender(); },
  };
}


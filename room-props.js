// The neon night-shift room: walls, floor, furniture, signs, screens and lights.
// Coordinates: x runs right, y up, z toward the camera. See room-layout.js for the floor plan.
import * as THREE from 'three';
import { Reflector } from 'three/addons/objects/Reflector.js';
import { Batcher, makeHalo, makeDecal } from './room-kit.js?v=5';
import {
  NEON, toTexture, brickCanvases, floorCanvas, rugCanvas, bedCanvas, glowTexture, shadowTexture, makeCanvas, neonCanvas, paintNeon, roundRect, rgba, mix,
} from './room-textures.js?v=5';
import {
  createScreen, paintEndpoint, paintTerminal, paintLaptop, paintNetwork, paintArcade, paintWindow,
  certPlaque, CERTS, webCard, nameSign, openSign, marqueeSign, certHeaderSign, arrowPlate, msBoardCanvas, benchLabel, tinyLabel,
} from './room-screens.js?v=6';
import { mulberry32 } from './cat-brain.js?v=5';
import { ROOM } from './room-layout.js?v=6';

const HOT = {
  monitors: { route: 'experience', label: 'Experience', hint: 'Career timeline' },
  rack: { route: 'sysadmin', label: 'Systems & endpoints', hint: 'Network, servers, identity' },
  microsoft: { route: 'microsoft', label: 'Microsoft 365 & certifications', hint: 'AZ-900 · MS-900 · MD-102 · SC-300' },
  arcade: { route: 'project:boso', label: 'Boso', hint: 'Play a boss battle' },
  window: { route: 'project:weather', label: 'Hope no Rain', hint: 'Weather dashboard' },
  kettlebell: { route: 'project:ptwithkitty', label: 'PT w Kitty', hint: 'Training app with a cat room' },
  lotto: { route: 'project:lotto', label: 'LottoMax', hint: 'Bomi picks the numbers' },
  web: { route: 'project:renu', label: 'Renu Bio Health', hint: 'Company site and online store' },
  soccer: { route: 'project:soccer', label: 'Soccerbee zone model', hint: 'Sports data project' },
  baseball: { route: 'project:baseball', label: 'MLB 9 Innings model', hint: 'Pitch and timing data' },
  tennis: { route: 'about', label: 'Tennis', hint: 'Soccer, baseball and tennis off the clock' },
  photo: { route: 'about', label: 'Curious by nature', hint: 'About Owen, Bomi and Seoli' },
  resume: { route: 'experience', label: 'Experience', hint: 'Career timeline' },
  sign: { route: 'about', label: 'About Owen', hint: 'Curious by nature' },
  'post-systems': { route: 'sysadmin', label: 'Systems', hint: 'Capabilities and field notes' },
  'post-microsoft': { route: 'microsoft', label: 'Microsoft', hint: 'Stack and certifications' },
  'post-projects': { route: 'projects', label: 'Projects', hint: 'Apps, data models and sites' },
  'post-experience': { route: 'experience', label: 'Experience', hint: 'Career timeline' },
  'post-contact': { route: 'contact', label: 'Contact', hint: 'Say hello' },
};

export function buildRoom({ root, disposer, quality, assets = {}, anisotropy = 4 }) {
  const b = new Batcher(disposer);
  const hotspots = [], updaters = [], lights = [], screens = [];
  const proxyGroup = new THREE.Group(); proxyGroup.name = 'hotspot-proxies'; root.add(proxyGroup);
  const keep = x => disposer.keep(x);
  const rng = mulberry32(42);

  /* ---------- materials ---------- */
  const std = (color, o = {}) => keep(new THREE.MeshStandardMaterial({ color, roughness: .7, metalness: .05, ...o }));
  const glowMat = (color, k = 2.2) => keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k), toneMapped: false, fog: false }));
  const M = {
    black: std('#0c0c14', { roughness: .55, metalness: .25 }), dark: std('#171827', { roughness: .6, metalness: .3 }),
    metal: std('#2e3345', { roughness: .45, metalness: .7 }), steel: std('#555c76', { roughness: .38, metalness: .85 }),
    white: std('#d5d9ee', { roughness: .45 }), wood: std('#5a3d2e', { roughness: .62 }), woodLight: std('#8b6548', { roughness: .65 }),
    arcade: std('#2b1457', { roughness: .5, metalness: .2 }), slab: std('#101019', { roughness: .5, metalness: .5 }),
    carpetA: std('#4b3d86', { roughness: 1 }), carpetB: std('#a93a7d', { roughness: 1 }), sisal: std('#b79a6b', { roughness: 1 }),
    leaf: std('#1f8a5c', { roughness: .8 }), leafLight: std('#3dc084', { roughness: .8 }), pot: std('#e1d9f2', { roughness: .6 }),
    orange: std('#ff7a3d', { roughness: .45, metalness: .3 }), yellow: std('#ffd23f', { roughness: .5 }), rubber: std('#16161d', { roughness: .9 }),
    paper: std('#eceaf6', { roughness: .9 }), chairSeat: std('#14141e', { roughness: .8 }),
    glass: keep(new THREE.MeshStandardMaterial({ color: '#9fc4ff', roughness: .05, metalness: 0, transparent: true, opacity: .2, depthWrite: false })),
  };
  const G = Object.fromEntries(Object.entries(NEON).map(([k, v]) => [k, glowMat(v)]));
  const ledMats = {};
  for (const [name, color] of [['green', '#4dff9a'], ['amber', '#ffb347'], ['blue', '#4f8bff'], ['pink', '#ff3d9a']]) {
    ledMats[name] = [0, 1, 2].map(() => keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(2.4), toneMapped: false, fog: false })));
  }
  const ledColors = { green: new THREE.Color('#4dff9a'), amber: new THREE.Color('#ffb347'), blue: new THREE.Color('#4f8bff'), pink: new THREE.Color('#ff3d9a') };

  /* ---------- helpers ---------- */
  const screenMaterial = (texture, k = 1.25) => keep(new THREE.MeshBasicMaterial({ map: texture, color: new THREE.Color(k, k, k), toneMapped: false, fog: false }));
  const neonMaterial = (texture, k = 1.7) => keep(new THREE.MeshBasicMaterial({ map: texture, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false, color: new THREE.Color(k, k, k) }));
  function planeMesh(material, w, h, x, y, z, ry = 0, order = 0) {
    const mesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), material);
    mesh.position.set(x, y, z); mesh.rotation.y = ry; mesh.renderOrder = order; root.add(mesh); return mesh;
  }
  const neonPlane = (canvas, w, h, x, y, z, ry = 0, k = 1.7) => {
    const texture = keep(toTexture(canvas, { anisotropy })); const material = neonMaterial(texture, k);
    const mesh = planeMesh(material, w, h, x, y, z, ry, 3); mesh.userData.material = material; return mesh;
  };
  const addLight = (color, intensity, distance, x, y, z, opts = {}) => {
    const light = new THREE.PointLight(color, intensity, distance, 2); light.position.set(x, y, z); root.add(light);
    lights.push({ light, color: new THREE.Color(color), base: intensity, x, y, z, ...opts }); return light;
  };
  const halo = (color, size, opacity, x, y, z) => { const sprite = makeHalo(disposer, color, size, opacity); sprite.position.set(x, y, z); root.add(sprite); return sprite; };
  const poolDecal = (color, x, z, w, d, opacity = .4, y = .006) => { const m = makeDecal(disposer, glowTexture(), { color, w, d, opacity, additive: true, y, order: 2 }); m.position.x = x; m.position.z = z; root.add(m); return m; };
  const shadowDecal = (x, z, w, d, opacity = .6) => { const m = makeDecal(disposer, shadowTexture(), { color: '#000000', w, d, opacity, y: .005, order: 2 }); m.position.x = x; m.position.z = z; root.add(m); return m; };

  function hotspot(id, [x, y, z], [w, h, d], haloDef, { pin = false, pinAt, ry = 0 } = {}) {
    const info = HOT[id];
    const proxy = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ visible: false }));
    disposer.keep(proxy.geometry); disposer.keep(proxy.material);
    proxy.position.set(x, y, z); proxy.rotation.y = ry; proxy.visible = false; proxyGroup.add(proxy);
    let sprite = null;
    if (haloDef) { sprite = halo(haloDef.color, haloDef.size, 0, haloDef.x ?? x, haloDef.y ?? y, haloDef.z ?? z + d / 2 + .1); sprite.userData.baseOpacity = haloDef.opacity ?? .65; sprite.userData.hover = 0; }
    const record = { id, ...info, proxy, halo: sprite, pin, pinAt: pinAt || [x, y + h / 2, z + d / 2], hover: 0, target: 0 };
    proxy.userData.hotspot = record; hotspots.push(record); return record;
  }

  /* ---------- shell: floor, walls, trim ---------- */
  const { minX, maxX, minZ, maxZ, wallHeight: H } = ROOM;
  const W = maxX - minX, D = maxZ - minZ, cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;

  const bricks = brickCanvases({ size: 512, columns: 6, rows: 16 });
  const brickTex = (repX, repY) => { const t = keep(toTexture(bricks.color, { wrap: true, repeat: [repX, repY], anisotropy })); return t; };
  const bumpTex = (repX, repY) => { const t = keep(toTexture(bricks.height, { wrap: true, repeat: [repX, repY], srgb: false, anisotropy })); return t; };
  const brickMat = (repX, repY) => std('#ffffff', { map: brickTex(repX, repY), bumpMap: bumpTex(repX, repY), bumpScale: 1.4, roughness: .82, metalness: .0 });

  const wallBack = new THREE.Mesh(keep(new THREE.BoxGeometry(W + .24, H, .24)), [M.black, M.black, M.black, M.black, brickMat((W + .24) / 1.8, H / 1.8), M.black]);
  wallBack.position.set(cx - .12, H / 2, minZ - .12); root.add(wallBack);
  const wallLeft = new THREE.Mesh(keep(new THREE.BoxGeometry(.24, H, D + .24)), [brickMat((D + .24) / 1.8, H / 1.8), M.black, M.black, M.black, M.black, M.black]);
  wallLeft.position.set(minX - .12, H / 2, cz - .12); root.add(wallLeft);

  // floor slab with a lit lip along the open edges
  b.rbox(M.slab, cx, -.2, cz, W + .1, .4, D + .1, .03);
  const lipCyan = glowMat('#2ee6ff', 1.25), lipPink = glowMat('#ff3d9a', 1.25);
  b.box(lipCyan, cx, -.025, maxZ + .045, W + .08, .03, .012);
  b.box(lipPink, maxX + .045, -.025, cz, .012, .03, D + .08);

  // baseboards, crowns and LED strips that outline the room
  b.rbox(M.black, cx, .1, minZ + .035, W, .2, .07, .01);
  b.rbox(M.black, minX + .035, .1, cz, .07, .2, D, .01);
  b.box(G.cyan, cx, .215, minZ + .02, W, .016, .014);
  b.box(G.cyan, minX + .02, .215, cz, .014, .016, D);
  b.rbox(M.black, cx, H - .07, minZ + .045, W, .14, .09, .015);
  b.rbox(M.black, minX + .045, H - .07, cz, .09, .14, D, .015);
  b.box(G.violet, cx, H - .17, minZ + .04, W, .018, .014);
  b.box(G.violet, minX + .04, H - .17, cz, .014, .018, D);
  b.box(G.pink, minX + .03, H / 2, minZ + .03, .03, H - .3, .03);

  // reflective floor: mirror below, textured and lit overlay on top
  const floorTex = keep(toTexture(floorCanvas({ size: 1024, tiles: 4 }), { wrap: true, repeat: [W / 4.4, D / 4.4], anisotropy }));
  const floorMat = keep(new THREE.MeshStandardMaterial({ map: floorTex, color: '#ffffff', roughness: .42, metalness: .1, transparent: true, opacity: .84 }));
  const floorOverlay = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), floorMat);
  floorOverlay.rotation.x = -Math.PI / 2; floorOverlay.position.set(cx, .003, cz); floorOverlay.renderOrder = 1; root.add(floorOverlay);
  const floorBase = new THREE.Mesh(keep(new THREE.PlaneGeometry(W, D)), M.slab);
  floorBase.rotation.x = -Math.PI / 2; floorBase.position.set(cx, .001, cz); floorBase.visible = true; root.add(floorBase);

  let reflector = null;
  const REFLECTOR_SHADER = {
    name: 'WetFloor',
    uniforms: { color: { value: null }, tDiffuse: { value: null }, textureMatrix: { value: null }, uStrength: { value: 1 } },
    vertexShader: /* glsl */`
      uniform mat4 textureMatrix; varying vec4 vUv; varying vec3 vWorld;
      void main() { vUv = textureMatrix * vec4(position, 1.0); vWorld = (modelMatrix * vec4(position, 1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
    fragmentShader: /* glsl */`
      uniform vec3 color; uniform sampler2D tDiffuse; uniform float uStrength; varying vec4 vUv; varying vec3 vWorld;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
      void main() {
        vec4 uv = vUv; float w = uv.w;
        // polished concrete: a very gentle, low-frequency ripple instead of swirling "marble"
        vec2 wob = vec2(noise(vWorld.xz * 1.7), noise(vWorld.xz * 1.7 + 17.3)) - 0.5;
        uv.xy += wob * 0.006 * w;
        vec3 sum = texture2DProj(tDiffuse, uv).rgb * 0.28;
        const float R = 0.012;
        sum += texture2DProj(tDiffuse, uv + vec4( R, 0.0, 0.0, 0.0) * w).rgb * 0.12;
        sum += texture2DProj(tDiffuse, uv + vec4(-R, 0.0, 0.0, 0.0) * w).rgb * 0.12;
        sum += texture2DProj(tDiffuse, uv + vec4(0.0,  R, 0.0, 0.0) * w).rgb * 0.12;
        sum += texture2DProj(tDiffuse, uv + vec4(0.0, -R, 0.0, 0.0) * w).rgb * 0.12;
        sum += texture2DProj(tDiffuse, uv + vec4( R,  R, 0.0, 0.0) * w * 1.6).rgb * 0.06;
        sum += texture2DProj(tDiffuse, uv + vec4(-R,  R, 0.0, 0.0) * w * 1.6).rgb * 0.06;
        sum += texture2DProj(tDiffuse, uv + vec4( R, -R, 0.0, 0.0) * w * 1.6).rgb * 0.06;
        sum += texture2DProj(tDiffuse, uv + vec4(-R, -R, 0.0, 0.0) * w * 1.6).rgb * 0.06;
        vec3 viewDir = normalize(cameraPosition - vWorld);
        float fres = pow(1.0 - clamp(viewDir.y, 0.0, 1.0), 2.2);
        gl_FragColor = vec4(sum * color * uStrength * mix(0.55, 1.0, fres), 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  };
  if (quality.reflection) {
    reflector = new Reflector(keep(new THREE.PlaneGeometry(W, D)), { color: 0xffffff, textureWidth: quality.reflectionSize[0], textureHeight: quality.reflectionSize[1], clipBias: .003, multisample: 0, shader: REFLECTOR_SHADER });
    reflector.rotation.x = -Math.PI / 2; reflector.position.set(cx, .002, cz); root.add(reflector);
    reflector.material.uniforms.uStrength.value = 1.15;
    disposer.keep({ dispose: () => reflector.dispose() });
    floorBase.visible = false;
  } else floorMat.opacity = .97;

  /* ---------- lighting ---------- */
  root.add(new THREE.HemisphereLight(0x3a4a86, 0x14091f, .85));
  root.add(Object.assign(new THREE.AmbientLight(0x2a2f5a, .55)));
  const moon = new THREE.DirectionalLight(0x6f8cff, .45); moon.position.set(-5, 6, 4); root.add(moon);
  const signLight = addLight('#ff3d9a', 26, 10, -1.85, 2.7, -2.2, { flicker: .06 });
  const rackLight = addLight('#2ee6ff', 20, 8, 3.2, 2.2, -1.6);
  const deskLamp = addLight('#ffb066', 3.2, 3.2, -3.1, 1.6, -2.3);
  const windowLight = addLight('#5b7cff', 14, 7, -3.4, 2.2, -1.1);
  if (quality.lights >= 5) addLight('#9d6bff', 6, 4.5, .9, 1.7, -1.7);

  /* ---------- the desk ---------- */
  b.rbox(M.wood, -1.85, 1.06, -2.45, 3.3, .08, 1.0, .02);
  b.rbox(M.metal, -1.85, .985, -2.45, 3.2, .06, .9, .01);
  for (const x of [-3.42, -.28]) for (const z of [-2.88, -2.02]) b.box(M.metal, x, .5, z, .07, 1, .07);
  b.box(M.dark, -1.85, .6, -2.9, 3.2, .78, .03);
  b.box(G.cyan, -1.85, .955, -1.955, 3.24, .014, .014);
  b.rbox(M.black, -3.02, .36, -2.5, .28, .7, .56, .02);
  b.box(G.pink, -2.875, .36, -2.4, .008, .6, .02); b.box(G.cyan, -2.875, .36, -2.32, .008, .6, .02);
  shadowDecal(-1.85, -2.1, 3.6, 1.5, .55); poolDecal('#2ee6ff', -1.85, -1.75, 3.2, 1.2, .28);

  // monitors
  function monitor(x, y, z, w, h, texture, ry) {
    const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; root.add(g);
    const frame = new THREE.Mesh(keep(new THREE.BoxGeometry(w + .07, h + .07, .045)), M.black); g.add(frame);
    const screen = new THREE.Mesh(keep(new THREE.PlaneGeometry(w, h)), screenMaterial(texture)); screen.position.z = .026; g.add(screen);
    const neck = new THREE.Mesh(keep(new THREE.BoxGeometry(.06, y - h / 2 - 1.1, .035)), M.metal); neck.position.set(0, -(h / 2) - (y - h / 2 - 1.1) / 2, -.03); g.add(neck);
    const base = new THREE.Mesh(keep(new THREE.BoxGeometry(.46, .018, .26)), M.metal); base.position.set(0, 1.109 - y, .02); g.add(base);
    return g;
  }
  const endpointScreen = createScreen(1280, 720, paintEndpoint, { fps: 4, anisotropy }); screens.push(endpointScreen);
  const terminalScreen = createScreen(1024, 576, paintTerminal, { fps: 6, anisotropy }); screens.push(terminalScreen);
  monitor(-2.52, 1.79, -2.8, 1.5, .84, endpointScreen.texture, .1);
  monitor(-1.1, 1.72, -2.8, 1.15, .65, terminalScreen.texture, .22);
  hotspot('monitors', [-1.85, 1.75, -2.75], [2.9, 1.0, .5], { color: NEON.cyan, size: 3.6, opacity: .4, y: 1.7, z: -2.4 }, { pin: true, pinAt: [-1.85, 2.45, -2.7] });

  // laptop (Jamf-style screen), keyboard, mouse, mug, duck
  const laptopScreen = createScreen(512, 320, paintLaptop, { fps: 2, anisotropy }); screens.push(laptopScreen);
  const laptop = new THREE.Group(); laptop.position.set(-3.08, 1.1, -2.2); laptop.rotation.y = .55; root.add(laptop);
  const lbase = new THREE.Mesh(keep(new THREE.BoxGeometry(.42, .02, .29)), M.steel); lbase.position.y = .01; laptop.add(lbase);
  const lid = new THREE.Group(); lid.position.set(0, .02, -.14); lid.rotation.x = -.22; laptop.add(lid);
  const lidBody = new THREE.Mesh(keep(new THREE.BoxGeometry(.42, .28, .012)), M.steel); lidBody.position.y = .14; lid.add(lidBody);
  const lidScreen = new THREE.Mesh(keep(new THREE.PlaneGeometry(.39, .244)), screenMaterial(laptopScreen.texture, 1.15)); lidScreen.position.set(0, .14, .008); lid.add(lidScreen);

  const keysCanvas = makeCanvas(512, 160), kctx = keysCanvas.getContext('2d');
  kctx.fillStyle = '#0b0b14'; kctx.fillRect(0, 0, 512, 160);
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) { const hue = (c * 24 + r * 18) % 360; kctx.fillStyle = `hsl(${hue} 90% 62%)`; roundRect(kctx, 12 + c * 33, 12 + r * 28, 28, 23, 5); kctx.fill(); }
  const keysTex = keep(toTexture(keysCanvas, { anisotropy }));
  const keysMesh = new THREE.Mesh(keep(new THREE.PlaneGeometry(.78, .24)), keep(new THREE.MeshBasicMaterial({ map: keysTex, color: new THREE.Color(1.25, 1.25, 1.25), toneMapped: false })));
  keysMesh.rotation.x = -Math.PI / 2; keysMesh.position.set(-1.15, 1.1335, -2.17); root.add(keysMesh);
  b.rbox(M.black, -1.15, 1.118, -2.17, .82, .026, .28, .01);
  b.rbox(M.black, -.9, 1.106, -2.2, 1.5, .008, .55, .004);
  b.box(G.pink, -.15, 1.108, -2.2, .01, .006, .55);
  b.rbox(M.dark, -.58, 1.125, -2.2, .075, .03, .12, .015);
  b.cyl(M.white, -1.78, 1.15, -2.32, .05, .045, .1, 14); b.torus(M.white, -1.725, 1.15, -2.32, .03, .009, { y: Math.PI / 2 }, Math.PI * 1.9);
  b.sphere(M.yellow, -1.55, 1.145, -2.62, .05, 1, .85, 1.1); b.sphere(M.yellow, -1.55, 1.205, -2.595, .033); b.box(M.orange, -1.55, 1.2, -2.563, .028, .012, .02);
  // lamp
  b.cyl(M.dark, -3.35, 1.115, -2.75, .08, .09, .03, 18); b.rod(M.steel, [-3.35, 1.13, -2.75], [-3.22, 1.5, -2.7], .012); b.rod(M.steel, [-3.22, 1.5, -2.7], [-3.05, 1.52, -2.55], .012);
  b.cyl(M.dark, -3.03, 1.5, -2.54, .09, .04, .09, 18, { x: .5 }); b.sphere(glowMat('#ffb066', 3), -3.0, 1.46, -2.5, .035);
  const lampHalo = halo('#ffb066', 1.2, .5, -3.0, 1.46, -2.48);

  // clipboard résumé
  const clip = new THREE.Group(); clip.position.set(-.72, 1.112, -2.52); clip.rotation.y = .35; root.add(clip);
  const clipBoard = new THREE.Mesh(keep(new THREE.BoxGeometry(.2, .012, .28)), M.dark); clip.add(clipBoard);
  const clipPaper = new THREE.Mesh(keep(new THREE.BoxGeometry(.17, .004, .24)), M.paper); clipPaper.position.y = .009; clip.add(clipPaper);
  const clipCanvas = makeCanvas(128, 176), cc = clipCanvas.getContext('2d'); cc.fillStyle = '#eceaf6'; cc.fillRect(0, 0, 128, 176);
  cc.fillStyle = '#23244a'; cc.font = '700 15px sans-serif'; cc.fillText('OWEN KIM', 12, 24); cc.fillStyle = '#8d93b8'; for (let i = 0; i < 12; i++) cc.fillRect(12, 40 + i * 11, i % 4 === 3 ? 60 : 100, 4);
  const clipTex = keep(toTexture(clipCanvas, { anisotropy })); const clipFace = new THREE.Mesh(keep(new THREE.PlaneGeometry(.17, .234)), keep(new THREE.MeshBasicMaterial({ map: clipTex, color: new THREE.Color(.9, .9, .95) })));
  clipFace.rotation.x = -Math.PI / 2; clipFace.position.y = .0125; clip.add(clipFace);
  // the clipboard still opens Experience, but the monitors carry the Experience pin so the desk has one dot per section
  hotspot('resume', [-.72, 1.17, -2.52], [.3, .12, .36], { color: NEON.white, size: .9, opacity: .5, y: 1.35, z: -2.4 });

  // Framed family portrait; contain the square illustration so all four faces remain visible.
  {
    const photoCanvas = makeCanvas(512, 384), pc = photoCanvas.getContext('2d');
    const photo = assets.deskPhoto;
    if (photo) {
      pc.fillStyle = '#fff8e9'; pc.fillRect(0, 0, 512, 384);
      const k = Math.min(512 / photo.naturalWidth, 384 / photo.naturalHeight), w = photo.naturalWidth * k, h = photo.naturalHeight * k;
      pc.drawImage(photo, (512 - w) / 2, (384 - h) / 2, w, h);
    } else {
      pc.fillStyle = '#1b1530'; pc.fillRect(0, 0, 512, 384); paintNeon(pc, '♥', 256, 170, { size: 120, color: NEON.pink, tube: 3 });
    }
    const frame = new THREE.Group(); frame.position.set(-.34, 1.106, -2.68); frame.rotation.y = .42; frame.scale.setScalar(1.3); root.add(frame);
    const tilt = new THREE.Group(); tilt.rotation.x = -.16; frame.add(tilt);
    const back = new THREE.Mesh(keep(new THREE.BoxGeometry(.38, .3, .024)), M.black); back.position.y = .155; tilt.add(back);
    const face = new THREE.Mesh(keep(new THREE.PlaneGeometry(.33, .248)), keep(new THREE.MeshBasicMaterial({ map: keep(toTexture(photoCanvas, { anisotropy })), color: new THREE.Color(.92, .92, .92), toneMapped: false })));
    face.position.set(0, .155, .0125); tilt.add(face);
    const trim = glowMat('#ff6fae', 1.3);
    for (const [w, h, x, y] of [[.38, .008, 0, .007], [.38, .008, 0, .303], [.008, .3, -.186, .155], [.008, .3, .186, .155]]) {
      const bar = new THREE.Mesh(keep(new THREE.BoxGeometry(w, h, .006)), trim); bar.position.set(x, y, .014); tilt.add(bar);
    }
    const leg = new THREE.Mesh(keep(new THREE.BoxGeometry(.03, .22, .012)), M.dark); leg.position.set(0, .1, -.07); leg.rotation.x = .45; frame.add(leg);
    halo('#ff6fae', .8, .22, -.34, 1.3, -2.58);
    hotspot('photo', [-.34, 1.3, -2.66], [.52, .42, .22], null, { ry: .42, pin: true, pinAt: [-.34, 1.62, -2.66] });
  }

  /* ---------- the chair ---------- */
  {
    const x = -1.0, z = -1.47;
    b.cyl(M.metal, x, .33, z, .035, .035, .42, 10);
    for (let i = 0; i < 5; i++) {
      const a = i * Math.PI * 2 / 5 + .3, ex = x + Math.sin(a) * .34, ez = z + Math.cos(a) * .34;
      b.rod(M.metal, [x, .12, z], [ex, .08, ez], .022); b.sphere(M.rubber, ex, .05, ez, .045);
    }
    b.rbox(M.chairSeat, x, .56, z, .64, .1, .62, .04);
    b.rbox(M.chairSeat, x, 1.06, z + .33, .6, .86, .1, .05, { x: -.12 });
    b.rbox(M.chairSeat, x, 1.62, z + .37, .34, .22, .08, .04, { x: -.12 });
    b.box(G.pink, x - .27, 1.06, z + .285, .018, .78, .012, { x: -.12 }); b.box(G.pink, x + .27, 1.06, z + .285, .018, .78, .012, { x: -.12 });
    for (const s of [-1, 1]) { b.box(M.metal, x + s * .36, .72, z + .05, .035, .3, .035); b.rbox(M.black, x + s * .36, .88, z, .08, .035, .34, .015); }
    shadowDecal(x, z + .05, 1.2, 1.1, .5);
  }

  /* ---------- the rack ---------- */
  {
    const x = 3.7, z = -2.35, zf = z + .47;
    b.rbox(M.black, x, .06, z, 1.0, .12, .95, .02);
    for (const sx of [-.47, .47]) for (const sz of [-.43, .43]) b.box(M.metal, x + sx, 1.06, z + sz, .05, 1.88, .05);
    b.box(M.dark, x - .485, 1.06, z, .02, 1.84, .86); b.box(M.dark, x + .485, 1.06, z, .02, 1.84, .86); b.box(M.dark, x, 1.06, z - .44, .94, 1.84, .02);
    b.rbox(M.black, x, 2.0, z, 1.0, .06, .95, .02);
    b.rbox(M.dark, x, .3, z + .02, .86, .28, .8, .02); b.box(G.green ?? G.mint, x + .26, .3, zf - .08, .12, .035, .01);
    const unitW = .84;
    const led = (kind, px, py, i) => b.box(ledMats[kind][i % 3], px, py, zf + .005, .018, .018, .01);
    const slot = i => .5 + i * .215;
    // 0 patch panel, 1 switch, 2 patch panel, 3 firewall, 4 NAS, 5 server, 6 server
    for (let k = 0; k < 7; k++) {
      const y = slot(k);
      b.rbox(k === 1 ? M.white : M.dark, x, y, z + .035, unitW, .185, .84, .012);
      b.box(M.black, x - unitW / 2 + .02, y, zf - .005, .025, .185, .008); b.box(M.black, x + unitW / 2 - .02, y, zf - .005, .025, .185, .008);
      if (k === 0 || k === 2) { for (let p = 0; p < 24; p++) b.box(M.black, x - .37 + p * .031, y + (p % 2 ? -.03 : .03), zf - .002, .022, .03, .012); }
      if (k === 1) { for (let p = 0; p < 16; p++) { b.box(M.black, x - .34 + p * .034, y - .02, zf - .002, .024, .034, .012); led(p % 5 === 0 ? 'amber' : 'green', x - .34 + p * .034, y + .04, p); } b.box(G.cyan, x + .33, y + .02, zf - .002, .04, .04, .008); }
      if (k === 3) { b.box(M.orange, x - .39, y, zf - .002, .012, .17, .01); for (let p = 0; p < 8; p++) { b.box(M.black, x - .22 + p * .04, y - .02, zf - .002, .026, .034, .012); led(p % 3 ? 'green' : 'amber', x - .22 + p * .04, y + .04, p + 1); } }
      if (k === 4) { for (let p = 0; p < 4; p++) { b.rbox(M.black, x - .27 + p * .17, y, zf - .002, .15, .15, .012, .01); led('blue', x - .27 + p * .17, y - .055, p); } }
      if (k === 5 || k === 6) { for (let p = 0; p < 14; p++) b.box(M.black, x - .3 + p * .022, y, zf - .003, .006, .12, .008); b.box(M.black, x + .3, y, zf - .002, .1, .12, .01); led(k === 5 ? 'green' : 'amber', x + .36, y + .06, k); led('green', x + .33, y + .06, k + 1); }
    }
    // patch cables
    const cables = [['#ff3d9a', 0, 1, -.3], ['#2ee6ff', 0, 1, -.1], ['#ffb347', 2, 1, .12], ['#7dffb2', 2, 1, .3], ['#a678ff', 0, 1, .22]];
    for (const [color, from, to, dx] of cables) {
      const m = keep(new THREE.MeshStandardMaterial({ color, roughness: .5, emissive: color, emissiveIntensity: .25 }));
      b.tube(m, [[x + dx, slot(from) - .03, zf], [x + dx - .06, slot(from) - .07, zf + .09], [x + dx - .04, (slot(from) + slot(to)) / 2, zf + .13], [x + dx + .02, slot(to) + .03, zf + .02]], .012, 24);
    }
    const labelTex = keep(toTexture(tinyLabel('RACK-01 · ONLINE', NEON.cyan, 512), { anisotropy }));
    const label = planeMesh(neonMaterial(labelTex, 1.6), .62, .1, x, 1.94, zf + .02, 0, 3);
    shadowDecal(x, z + .05, 1.7, 1.5, .6); poolDecal('#2ee6ff', x - .2, z + 1.1, 2.4, 1.6, .3);
    hotspot('rack', [x, 1.0, z + .1], [1.0, 2.0, .9], { color: NEON.cyan, size: 3.2, opacity: .45, y: 1.1, z: zf + .2 }, { pin: true, pinAt: [x, 2.1, zf] });
  }

  // wall display above the rack
  const networkScreen = createScreen(1280, 720, paintNetwork, { fps: 3, anisotropy }); screens.push(networkScreen);
  {
    const x = 3.64, y = 2.72, z = -3.06;
    b.rbox(M.black, x, y, z, 1.52, .9, .05, .02);
    planeMesh(screenMaterial(networkScreen.texture, 1.2), 1.46, .821, x, y, z + .027, 0, 0);
    poolDecal('#2ee6ff', 3.4, -2.2, 2.4, 2.0, .16);
    halo('#2ee6ff', 2.6, .26, x, y, z + .2);
  }

  /* ---------- the arcade cabinet (Boso) ---------- */
  const arcadeScreen = createScreen(512, 448, paintArcade, { fps: 4, state: { image: assets.boso }, anisotropy }); screens.push(arcadeScreen);
  {
    const x = .875, z = -2.5;
    b.rbox(M.arcade, x, .5, z, .85, 1.0, .75, .03);
    b.rbox(M.arcade, x, 1.5, z - .12, .85, 1.1, .5, .03);
    b.rbox(M.black, x, 1.02, z + .22, .85, .08, .42, .02, { x: .18 });
    b.cyl(M.dark, x - .15, 1.1, z + .22, .018, .018, .14, 10, { x: .18 }); b.sphere(glowMat('#ff4d5e', 1.4), x - .15, 1.18, z + .205, .04);
    [['#ff4d5e', .02], ['#ffb347', .12], ['#2ee6ff', .22], ['#7dffb2', .32]].forEach(([c, dx], i) => b.cyl(glowMat(c, 1.3), x + .05 + dx - .1 + (i % 2) * .02, 1.075 + (i % 2) * .012, z + .2 + (i % 2) * .05, .03, .03, .02, 14, { x: .18 }));
    b.rbox(M.black, x, 1.5, z + .1, .74, .62, .06, .02, { x: -.12 });
    planeMesh(screenMaterial(arcadeScreen.texture, 1.2), .66, .54, x, 1.51, z + .136, 0, 0).rotation.x = -.12;
    b.rbox(M.black, x, 2.02, z + .02, .85, .2, .3, .02);
    b.box(G.pink, x - .43, 1.0, z + .38, .016, 1.0, .016); b.box(G.cyan, x + .43, 1.0, z + .38, .016, 1.0, .016);
    b.box(G.pink, x - .43, 1.75, z + .12, .016, .5, .016); b.box(G.cyan, x + .43, 1.75, z + .12, .016, .5, .016);
    b.box(G.amber, x - .1, .62, z + .382, .09, .02, .006); b.box(G.amber, x + .1, .62, z + .382, .09, .02, .006);
    neonPlane(marqueeSign('BOSO'), .7, .2, x, 2.02, z + .175, 0, 1.6);
    shadowDecal(x, z + .1, 1.3, 1.1, .6); poolDecal('#9d6bff', x, z + .9, 1.9, 1.5, .28);
    halo('#9d6bff', 1.8, .3, x, 1.55, z + .35);
    hotspot('arcade', [x, 1.05, z + .02], [.9, 2.1, .8], { color: NEON.violet, size: 2.4, opacity: .5, y: 1.55, z: z + .5 }, { pin: true, pinAt: [x, 2.3, z + .3] });
  }

  /* ---------- back wall signs ---------- */
  {
    b.rbox(M.black, -1.85, 3.02, -3.07, 3.55, .95, .04, .03);
    const sign = neonPlane(nameSign(), 3.3, .825, -1.85, 3.02, -3.04, 0, 1.75);
    sign.userData.flicker = { base: 1.75, amount: .05, speed: 9 };
    updaters.push((t) => { const f = sign.userData.flicker; const n = Math.sin(t * f.speed) * Math.sin(t * 2.3 + 1.7); sign.material.color.setScalar(f.base + (n > .93 ? -.9 : 0) + n * f.amount); });
    halo('#ff3d9a', 5.0, .32, -1.85, 3.02, -2.95);
    poolDecal('#ff3d9a', -1.85, -1.0, 4.4, 2.8, .12);
    hotspot('sign', [-1.85, 3.02, -3.0], [3.6, 1.0, .2], { color: NEON.pink, size: 5.4, opacity: .5, z: -2.9 });

    b.rbox(M.black, .875, 2.72, -3.07, 1.02, .42, .04, .025);
    const open = neonPlane(openSign(), .95, .356, .875, 2.72, -3.04, 0, 1.7);
    updaters.push((t) => { const n = Math.sin(t * 1.3 + 2) + Math.sin(t * 11) * .25; open.material.color.setScalar(n > 1.05 ? .35 : 1.7); });
    halo('#4f8bff', 1.9, .22, .875, 2.72, -2.95);
  }

  /* ---------- certification wall ---------- */
  {
    const cxw = 2.08;
    b.rbox(M.black, cxw, 2.92, -3.07, 1.5, .34, .04, .02);
    neonPlane(certHeaderSign(), 1.44, .253, cxw, 2.92, -3.04, 0, 1.55);
    CERTS.forEach((cert, i) => {
      const col = i % 2, row = Math.floor(i / 2), px = cxw - .36 + col * .72, py = 2.28 - row * .9;
      b.rbox(M.black, px, py, -3.07, .68, .85, .05, .02);
      const mat = screenMaterial(keep(toTexture(certPlaque(cert), { anisotropy })), 1.12);
      planeMesh(mat, .62, .775, px, py, -3.04, 0, 0);
    });
    halo('#2ee6ff', 3.2, .18, cxw, 2.0, -2.95);
    poolDecal('#2ee6ff', cxw, -2.2, 1.9, 1.5, .12);
    hotspot('microsoft', [cxw, 2.0, -3.0], [1.62, 1.95, .2], { color: NEON.cyan, size: 3.0, opacity: .5, z: -2.9 }, { pin: true, pinAt: [cxw, 3.2, -3.0] });
  }

  /* ---------- left wall: window and Microsoft board ---------- */
  const windowScreen = createScreen(512, 640, paintWindow, { fps: 6, anisotropy }); screens.push(windowScreen);
  {
    const wz = -1.15, wy = 2.18, ww = 1.7, wh = 2.1, fx = minX + .05;
    planeMesh(screenMaterial(windowScreen.texture, 1.1), ww - .1, wh - .1, minX + .012, wy, wz, Math.PI / 2, 0);
    b.rbox(M.black, fx, wy + wh / 2, wz, .1, .1, ww + .1, .01); b.rbox(M.black, fx, wy - wh / 2, wz, .1, .1, ww + .1, .01);
    for (const s of [-1, 1]) b.rbox(M.black, fx, wy, wz + s * ww / 2, .1, wh, .1, .01);
    b.box(M.black, minX + .04, wy, wz, .03, wh - .1, .035); b.box(M.black, minX + .04, wy + .1, wz, .03, .035, ww - .1);
    b.rbox(M.woodLight, minX + .14, wy - wh / 2 - .06, wz, .28, .06, ww + .3, .02);
    halo('#5b7cff', 3.4, .2, minX + .5, wy, wz);
    poolDecal('#5b7cff', minX + 1.7, wz, 2.4, 1.7, .28);
    hotspot('window', [minX + .1, wy, wz], [.3, wh + .1, ww + .1], { color: NEON.blue, size: 3.0, opacity: .55, x: minX + .4 }, { pin: true, pinAt: [minX + .1, wy + 1.2, wz] });
  }
  const msBoard = { mesh: null, canvas: null, texture: null };
  {
    const bz = .98, by = 2.62, bw = 1.5, bh = .94;
    b.rbox(M.black, minX + .045, by, bz, .04, bh + .1, bw + .1, .02);
    const canvas = msBoardCanvas(assets.logos);
    const texture = keep(toTexture(canvas, { anisotropy }));
    msBoard.mesh = planeMesh(screenMaterial(texture, 1.1), bw, bh, minX + .068, by, bz, Math.PI / 2, 0);
    msBoard.canvas = canvas; msBoard.texture = texture;
    halo('#4f8bff', 2.8, .2, minX + .3, by, bz);
    hotspot('microsoft', [minX + .1, by, bz], [.2, bh + .1, bw + .1], { color: NEON.blue, size: 2.6, opacity: .55, x: minX + .35 }, { pin: false });
  }

  /* ---------- cat tree ---------- */
  {
    b.rbox(M.carpetA, -3.3, .05, .6, 1.3, .1, 1.0, .03);
    b.cyl(M.sisal, -3.0, .34, .6, .075, .075, .5, 12); b.rbox(M.carpetB, -3.0, .58, .6, .62, .07, .62, .03);
    b.cyl(M.sisal, -3.6, .68, .45, .075, .075, 1.2, 12); b.rbox(M.carpetB, -3.6, 1.26, .45, .6, .07, .6, .03);
    b.rbox(M.carpetA, -3.58, .3, .88, .5, .42, .46, .04); b.sphere(M.black, -3.58, .26, 1.115, .12, 1, 1, .1);
    b.rod(M.white, [-3.25, 1.26, .45], [-3.25, .95, .45], .004); b.sphere(glowMat('#ff3d9a', 1.4), -3.25, .93, .45, .045);
    shadowDecal(-3.3, .65, 1.9, 1.5, .55);
  }

  /* ---------- signpost ---------- */
  {
    const px = -3.6, pz = 2.4;
    b.rbox(M.black, px, .03, pz, .36, .06, .36, .02); b.cyl(M.metal, px, 1.1, pz, .04, .04, 2.1, 12); b.sphere(glowMat('#ffb347', 2), px, 2.18, pz, .06);
    const plates = [['SYSTEMS', NEON.cyan, 1, 'post-systems'], ['MICROSOFT', NEON.blue, -1, 'post-microsoft'], ['PROJECTS', NEON.violet, 1, 'post-projects'], ['EXPERIENCE', NEON.pink, -1, 'post-experience'], ['CONTACT', NEON.mint, 1, 'post-contact']];
    plates.forEach(([label, color, dir, id], i) => {
      const y = .95 + i * .27, ox = dir * .39;
      b.rbox(M.black, px + ox, y, pz + .03, .74, .22, .03, .01);
      neonPlane(arrowPlate(label, color, dir), .72, .18, px + ox, y, pz + .05, 0, 1.5);
      hotspot(id, [px + ox, y, pz + .05], [.78, .25, .12], { color, size: 1.2, opacity: .55, z: pz + .2 });
    });
    halo('#ffb347', .8, .5, px, 2.18, pz); shadowDecal(px, pz, .7, .7, .5);
  }

  /* ---------- floor life: rug, beds, bowls, workout, play bench ---------- */
  {
    const rugTex = keep(toTexture(rugCanvas({ width: 1024, height: 640 }), { anisotropy }));
    const rug = new THREE.Mesh(keep(new THREE.PlaneGeometry(3.5, 2.2)), keep(new THREE.MeshStandardMaterial({ map: rugTex, roughness: 1, metalness: 0 })));
    rug.rotation.x = -Math.PI / 2; rug.position.set(.1, .012, .5); rug.renderOrder = 1; root.add(rug);

    const bed = (x, z, mat, tint) => {
      b.cyl(mat, x, .06, z, .47, .5, .12, 24); b.torus(mat, x, .13, z, .43, .075, { x: Math.PI / 2 }, Math.PI * 2, 24);
      const cushion = new THREE.Mesh(keep(new THREE.CircleGeometry(.38, 28)), keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(bedCanvas(tint), { anisotropy })), roughness: 1 })));
      cushion.rotation.x = -Math.PI / 2; cushion.position.set(x, .122, z); root.add(cushion);
      shadowDecal(x, z, 1.2, 1.1, .5);
    };
    bed(2.7, .6, M.carpetA, '#6a4bb5'); bed(.5, 2.05, M.carpetB, '#c24390');

    b.rbox(M.black, 3.5, .006, -.45, .8, .012, .5, .02);
    b.cyl(M.white, 3.35, .045, -.45, .1, .07, .09, 18); b.cyl(glowMat('#7dffb2', .9), 3.35, .086, -.45, .085, .085, .004, 18);
    b.cyl(M.white, 3.62, .045, -.45, .1, .07, .09, 18); b.cyl(glowMat('#4f8bff', .9), 3.62, .086, -.45, .085, .085, .004, 18);

    // kettlebell + dumbbells (PT w Kitty)
    b.rbox(M.carpetB, 1.45, .012, 1.75, .55, .024, 1.3, .01);
    b.sphere(M.orange, 2.0, .2, 1.7, .18, 1, .95, 1); b.torus(M.orange, 2.0, .39, 1.7, .1, .027, { z: 0 }, Math.PI * 2, 16);
    b.cyl(M.white, 1.2, .14, 1.45, .045, .045, .26, 12); b.cyl(glowMat('#2ee6ff', 1.2), 1.2, .285, 1.45, .03, .03, .03, 12);
    shadowDecal(2.0, 1.7, .7, .7, .55);
    hotspot('kettlebell', [2.0, .26, 1.7], [.55, .6, .55], { color: NEON.pink, size: 1.2, opacity: .55, y: .45, z: 1.95 }, { pin: true, pinAt: [2.0, .75, 1.7] });

    // sports corner: soccer ball, baseball and a tennis racket (Owen's hobbies; the balls open the sports projects)
    {
      const sx = -2.05, sz = 2.3;
      // soccer ball: black pentagons where an icosahedron's 12 corners land on the sphere
      const ballCanvas = makeCanvas(512, 256), bc = ballCanvas.getContext('2d');
      bc.fillStyle = '#f2f2f6'; bc.fillRect(0, 0, 512, 256); bc.fillStyle = '#15151c';
      const phi = (1 + Math.sqrt(5)) / 2, corners = [];
      for (const [a, b] of [[1, phi], [-1, phi], [1, -phi], [-1, -phi]]) corners.push([0, a, b], [a, b, 0], [b, 0, a]);
      for (const [x, y, z] of corners) {
        const len = Math.hypot(x, y, z), lat = Math.asin(y / len), lon = Math.atan2(z, x);
        const u = (lon / (Math.PI * 2) + .5) * 512, v = (.5 - lat / Math.PI) * 256, rx = 26 / Math.max(.25, Math.cos(lat)), ry = 26;
        for (const du of [-512, 0, 512]) { bc.beginPath(); for (let i = 0; i < 5; i++) { const t = i / 5 * Math.PI * 2 - Math.PI / 2; bc.lineTo(u + du + Math.cos(t) * rx, v + Math.sin(t) * ry); } bc.closePath(); bc.fill(); }
      }
      const soccer = new THREE.Mesh(keep(new THREE.SphereGeometry(.18, 28, 20)), keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(ballCanvas, { anisotropy })), roughness: .55 })));
      soccer.position.set(sx, .18, sz); soccer.rotation.set(.4, .8, .2); root.add(soccer);
      shadowDecal(sx, sz, .55, .55, .55);
      // baseball: white with a red seam that winds twice around
      const bbCanvas = makeCanvas(512, 256), bb = bbCanvas.getContext('2d');
      bb.fillStyle = '#f4f1ea'; bb.fillRect(0, 0, 512, 256); bb.strokeStyle = '#d8312f'; bb.lineWidth = 5;
      for (const side of [0, 1]) { bb.beginPath(); for (let i = 0; i <= 64; i++) { const u = i / 64 * 512, v = 128 + Math.sin(i / 64 * Math.PI * 4 + side * Math.PI) * 52; i ? bb.lineTo(u, v) : bb.moveTo(u, v); } bb.stroke(); }
      const baseball = new THREE.Mesh(keep(new THREE.SphereGeometry(.075, 20, 14)), keep(new THREE.MeshStandardMaterial({ map: keep(toTexture(bbCanvas, { anisotropy })), roughness: .7 })));
      baseball.position.set(sx + .46, .075, sz + .26); baseball.rotation.set(.3, -.6, .5); root.add(baseball);
      shadowDecal(sx + .46, sz + .26, .26, .26, .5);
      // tennis racket lying on the floor, with a ball
      const racket = new THREE.Group(); racket.position.set(sx + .55, .018, sz - .28); racket.rotation.y = -.55; racket.scale.setScalar(1.35); root.add(racket);
      const head = new THREE.Mesh(keep(new THREE.TorusGeometry(.13, .012, 8, 36)), keep(new THREE.MeshStandardMaterial({ color: '#2ee6ff', emissive: '#0b6f80', emissiveIntensity: .6, roughness: .4, metalness: .3 })));
      head.rotation.x = -Math.PI / 2; head.scale.set(1, 1.28, 1); head.position.set(0, 0, -.2); racket.add(head);
      const stringsCanvas = makeCanvas(128, 160), st = stringsCanvas.getContext('2d'); st.strokeStyle = '#e9edf7'; st.lineWidth = 2;
      for (let x = 10; x < 128; x += 13) { st.beginPath(); st.moveTo(x, 0); st.lineTo(x, 160); st.stroke(); } for (let y = 10; y < 160; y += 13) { st.beginPath(); st.moveTo(0, y); st.lineTo(128, y); st.stroke(); }
      const strings = new THREE.Mesh(keep(new THREE.CircleGeometry(.125, 32)), keep(new THREE.MeshBasicMaterial({ map: keep(toTexture(stringsCanvas, { anisotropy })), transparent: true, opacity: .75, depthWrite: false })));
      strings.rotation.x = -Math.PI / 2; strings.scale.set(1, 1.28, 1); strings.position.set(0, .002, -.2); racket.add(strings);
      const handle = new THREE.Mesh(keep(new THREE.CylinderGeometry(.016, .018, .26, 10)), M.black); handle.rotation.x = Math.PI / 2; handle.position.set(0, .002, .1); racket.add(handle);
      const throat = new THREE.Mesh(keep(new THREE.CylinderGeometry(.01, .01, .1, 8)), M.steel); throat.rotation.x = Math.PI / 2; throat.position.set(0, 0, -.02); racket.add(throat);
      b.sphere(keep(new THREE.MeshStandardMaterial({ color: '#d7f04a', roughness: .8 })), sx + 1.05, .045, sz - .02, .045);
      shadowDecal(sx + .55, sz - .38, .4, .6, .35);
      hotspot('soccer', [sx, .18, sz], [.42, .38, .42], { color: NEON.mint, size: 1, opacity: .35, y: .2, z: sz + .24 });
      hotspot('baseball', [sx + .46, .08, sz + .26], [.24, .2, .24], { color: NEON.pink, size: .6, opacity: .35, y: .09, z: sz + .4 });
      hotspot('tennis', [sx + .55, .04, sz - .3], [.34, .1, .55], null, { ry: -.55 });
    }

    // play bench: LottoMax machine and the Renu web cards (site, shop, cart)
    b.rbox(M.wood, 3.2, .38, 2.0, 1.5, .06, .42, .02); for (const sx of [-.66, .66]) b.box(M.dark, 3.2 + sx, .19, 2.0, .06, .38, .36);
    b.box(G.violet, 3.2, .345, 2.215, 1.46, .012, .012);
    shadowDecal(3.2, 2.05, 1.9, .9, .45);
    const lx = 2.72, ly = .41, lz = 2.0;
    b.cyl(M.dark, lx, ly + .06, lz, .17, .2, .12, 18); b.cyl(M.metal, lx, ly + .14, lz, .1, .17, .06, 18);
    const globe = new THREE.Mesh(keep(new THREE.SphereGeometry(.24, 24, 18)), M.glass); globe.position.set(lx, ly + .42, lz); globe.renderOrder = 5; root.add(globe);
    const ballColors = ['#ff3d9a', '#2ee6ff', '#ffb347', '#7dffb2', '#a678ff', '#ff4d5e', '#ffe66d'];
    const balls = [];
    for (let i = 0; i < 14; i++) {
      const mesh = new THREE.Mesh(keep(new THREE.SphereGeometry(.045, 10, 8)), keep(new THREE.MeshStandardMaterial({ color: ballColors[i % 7], roughness: .35, emissive: ballColors[i % 7], emissiveIntensity: .25 })));
      const a = rng() * Math.PI * 2, r = rng() * .15, h = (rng() - .5) * .28;
      mesh.position.set(lx + Math.cos(a) * r, ly + .36 + h, lz + Math.sin(a) * r); mesh.userData = { a, r, h, s: .5 + rng() * .9 }; root.add(mesh); balls.push(mesh);
    }
    updaters.push((t) => balls.forEach(m => { const u = m.userData; const a = u.a + t * u.s * .8; m.position.set(lx + Math.cos(a) * u.r, ly + .36 + u.h + Math.sin(t * u.s * 2 + u.a) * .04, lz + Math.sin(a) * u.r); }));
    b.sphere(M.metal, lx + .22, ly + .2, lz + .08, .035); b.rod(M.metal, [lx + .2, ly + .2, lz + .06], [lx + .26, ly + .13, lz + .14], .012);
    halo('#ff3d9a', 1.0, .3, lx, ly + .42, lz + .1);
    neonPlane(benchLabel('LOTTOMAX', NEON.amber), .5, .094, lx, ly + .03, lz + .22, 0, 1.4);
    hotspot('lotto', [lx, ly + .3, lz], [.55, .75, .5], { color: NEON.amber, size: 1.4, opacity: .55, z: lz + .3 }, { pin: true, pinAt: [lx, ly + .78, lz] });

    ['web', 'shop', 'cart'].forEach((kind, i) => {
      const x = 3.4 + i * .27, ry = -.12 + i * .12;
      b.rbox(M.black, x, ly + .17, 2.0, .23, .3, .03, .015, { y: ry });
      const card = planeMesh(screenMaterial(keep(toTexture(webCard(kind, [NEON.violet, NEON.cyan, NEON.pink][i]), { anisotropy })), 1.15), .2, .26, x + Math.sin(ry) * .019, ly + .17, 2.019, ry, 0);
      void card;
    });
    halo('#a678ff', 1.2, .22, 3.65, ly + .2, 2.2);
    hotspot('web', [3.67, ly + .2, 2.0], [.85, .4, .2], { color: NEON.violet, size: 1.3, opacity: .5, z: 2.3 }, { pin: true, pinAt: [3.67, ly + .52, 2.0] });
  }

  /* ---------- plants ---------- */
  {
    const plant = (x, z, s = 1) => {
      b.cyl(M.pot, x, .26 * s, z, .24 * s, .17 * s, .52 * s, 14);
      for (let i = 0; i < 11; i++) {
        const a = i * 2.4, tilt = .45 + (i % 4) * .13, hgt = (.62 + (i % 3) * .24) * s;
        const px = x + Math.sin(a) * .1 * s, pz = z + Math.cos(a) * .1 * s;
        b.sphere(i % 3 ? M.leaf : M.leafLight, px + Math.sin(a) * .22 * s, .52 * s + hgt * .72, pz + Math.cos(a) * .22 * s, .11 * s, .55, 2.0 + (i % 3) * .3, 1, { z: Math.sin(a) * tilt, x: Math.cos(a) * tilt });
      }
    };
    plant(-4.0, -2.55, 1.45); plant(1.9, -2.6, .55);
  }

  /* ---------- finish batching and glows for small items ---------- */
  b.flush(root);

  /* ---------- floating dust ---------- */
  let dust = null;
  if (quality.dust) {
    const n = quality.dust, positions = new Float32Array(n * 3), seeds = new Float32Array(n);
    for (let i = 0; i < n; i++) { positions[i * 3] = minX + rng() * W; positions[i * 3 + 1] = .2 + rng() * (H - .4); positions[i * 3 + 2] = minZ + rng() * D; seeds[i] = rng() * 6.28; }
    const geometry = keep(new THREE.BufferGeometry()); geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = keep(new THREE.PointsMaterial({ map: glowTexture(), size: .09, transparent: true, opacity: .55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#c9b7ff', sizeAttenuation: true, fog: false }));
    dust = new THREE.Points(geometry, material); dust.renderOrder = 7; dust.frustumCulled = false; root.add(dust);
    updaters.push((t, dt) => { const arr = geometry.attributes.position.array; for (let i = 0; i < n; i++) { arr[i * 3] += Math.sin(t * .3 + seeds[i]) * dt * .02; arr[i * 3 + 1] += (.015 + Math.sin(seeds[i] * 3) * .008) * dt; if (arr[i * 3 + 1] > H - .2) arr[i * 3 + 1] = .2; } geometry.attributes.position.needsUpdate = true; });
  }

  /* ---------- LED blinking and hover glow ---------- */
  updaters.push((t) => {
    for (const [name, mats] of Object.entries(ledMats)) mats.forEach((m, i) => { const v = Math.sin(t * (3 + i * 1.7 + (name === 'amber' ? 2 : 0)) + i * 2) > (name === 'green' ? -.7 : .1) ? 2.4 : .25; m.color.copy(ledColors[name]).multiplyScalar(v); });
    lights[0].light.intensity = lights[0].base * (1 + Math.sin(t * 7) * .015);
  });
  const hoverUpdater = (dt) => {
    for (const h of hotspots) {
      h.hover += (h.target - h.hover) * Math.min(1, dt * 10);
      if (h.halo) { h.halo.material.opacity = h.hover * (h.halo.userData.baseOpacity || .6); const s = 1 + h.hover * .12; h.halo.scale.setScalar((h.halo.userData.size ||= h.halo.scale.x) * s); }
    }
  };

  // At most one screen repaints per frame, taking turns, so uploads never pile up in a single frame.
  let screenTurn = 0;
  function updateScreens(t, force = false) {
    if (force) { for (const s of screens) s.update(t, true); return; }
    for (let i = 0; i < screens.length; i++) { const k = (screenTurn + i) % screens.length; if (screens[k].update(t)) { screenTurn = k + 1; return; } }
  }
  function refreshLogos(newAssets) {
    if (newAssets?.logos) { const ctx = msBoard.canvas.getContext('2d'); const fresh = msBoardCanvas(newAssets.logos); ctx.clearRect(0, 0, fresh.width, fresh.height); ctx.drawImage(fresh, 0, 0); msBoard.texture.needsUpdate = true; }
  }

  return {
    hotspots, lights, reflector, floorMaterial: floorMat, floorOverlay, updaters, hoverUpdater, updateScreens, refreshLogos, proxyGroup, dust, screens,
    setReflection(on) { if (reflector) { reflector.visible = on; floorBase.visible = !on; floorMat.opacity = on ? .84 : .97; } },
    bounds: { minX, maxX, minZ, maxZ, height: H },
  };
}

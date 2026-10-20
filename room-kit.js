// Small building kit for the room: merge many boxes into few draw calls, and track
// everything that has to be disposed when the room is closed.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { glowTexture } from './room-textures.js?v=5';

const _matrix = new THREE.Matrix4(), _quat = new THREE.Quaternion(), _euler = new THREE.Euler(), _pos = new THREE.Vector3(), _scale = new THREE.Vector3();
const _normalMatrix = new THREE.Matrix3(), _v = new THREE.Vector3();

export class Disposer {
  constructor() { this.items = new Set(); }
  keep(item) { this.items.add(item); return item; }
  dispose() { for (const item of this.items) item.dispose?.(); this.items.clear(); }
}

// Collects transformed geometry per material and turns each group into a single mesh.
export class Batcher {
  constructor(disposer) {
    this.disposer = disposer;
    this.groups = new Map();
    this.shared = new Map();
    this.unitBox = new THREE.BoxGeometry(1, 1, 1);
    this.unitSphere = new THREE.SphereGeometry(1, 16, 12);
    this.unitPlane = new THREE.PlaneGeometry(1, 1);
  }

  cached(key, make) {
    let geometry = this.shared.get(key);
    if (!geometry) this.shared.set(key, geometry = make());
    return geometry;
  }

  matrix(x, y, z, rot, sx = 1, sy = 1, sz = 1) {
    _euler.set(rot?.x || 0, rot?.y || 0, rot?.z || 0, 'YXZ');
    _quat.setFromEuler(_euler);
    return _matrix.compose(_pos.set(x, y, z), _quat, _scale.set(sx, sy, sz));
  }

  add(geometry, material, matrix) {
    let g = this.groups.get(material);
    if (!g) this.groups.set(material, g = { pos: [], nor: [], uv: [], idx: [], count: 0 });
    const pos = geometry.attributes.position, nor = geometry.attributes.normal, uv = geometry.attributes.uv;
    _normalMatrix.getNormalMatrix(matrix);
    for (let i = 0; i < pos.count; i++) {
      _v.fromBufferAttribute(pos, i).applyMatrix4(matrix); g.pos.push(_v.x, _v.y, _v.z);
      _v.fromBufferAttribute(nor, i).applyMatrix3(_normalMatrix).normalize(); g.nor.push(_v.x, _v.y, _v.z);
      g.uv.push(uv ? uv.getX(i) : 0, uv ? uv.getY(i) : 0);
    }
    const index = geometry.index;
    if (index) for (let i = 0; i < index.count; i++) g.idx.push(index.getX(i) + g.count);
    else for (let i = 0; i < pos.count; i++) g.idx.push(i + g.count);
    g.count += pos.count;
  }

  box(material, x, y, z, w, h, d, rot) { this.add(this.unitBox, material, this.matrix(x, y, z, rot, w, h, d)); }
  rbox(material, x, y, z, w, h, d, radius = .03, rot) {
    const r = Math.min(radius, w / 2.01, h / 2.01, d / 2.01);
    const key = `rb${w.toFixed(3)}|${h.toFixed(3)}|${d.toFixed(3)}|${r.toFixed(3)}`;
    this.add(this.cached(key, () => new RoundedBoxGeometry(w, h, d, 2, r)), material, this.matrix(x, y, z, rot));
  }
  cyl(material, x, y, z, rTop, rBottom, height, segments = 14, rot) {
    const key = `cy${rTop.toFixed(3)}|${rBottom.toFixed(3)}|${height.toFixed(3)}|${segments}`;
    this.add(this.cached(key, () => new THREE.CylinderGeometry(rTop, rBottom, height, segments)), material, this.matrix(x, y, z, rot));
  }
  sphere(material, x, y, z, r, sx = 1, sy = 1, sz = 1, rot) { this.add(this.unitSphere, material, this.matrix(x, y, z, rot, r * sx, r * sy, r * sz)); }
  torus(material, x, y, z, radius, tube, rot, arc = Math.PI * 2, segments = 24) {
    const key = `to${radius.toFixed(3)}|${tube.toFixed(3)}|${arc.toFixed(3)}|${segments}`;
    this.add(this.cached(key, () => new THREE.TorusGeometry(radius, tube, 8, segments, arc)), material, this.matrix(x, y, z, rot));
  }
  plane(material, x, y, z, w, h, rot) { this.add(this.unitPlane, material, this.matrix(x, y, z, rot, w, h, 1)); }
  // A cable following a smooth curve through `points`.
  tube(material, points, radius = .012, segments = 40) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'catmullrom', .35);
    const geometry = new THREE.TubeGeometry(curve, segments, radius, 6, false);
    this.add(geometry, material, _matrix.identity());
    geometry.dispose();
  }
  // Line segment between two points as a thin cylinder.
  rod(material, a, b, radius = .02, segments = 8) {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), length = start.distanceTo(end);
    const mid = start.clone().add(end).multiplyScalar(.5);
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
    const m = new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1));
    this.add(this.cached(`rd${radius.toFixed(3)}|${length.toFixed(3)}|${segments}`, () => new THREE.CylinderGeometry(radius, radius, length, segments)), material, m);
  }

  flush(parent) {
    const meshes = [];
    for (const [material, g] of this.groups) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(g.nor, 3));
      geometry.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geometry.setIndex(g.count > 65535 ? new THREE.Uint32BufferAttribute(g.idx, 1) : new THREE.Uint16BufferAttribute(g.idx, 1));
      geometry.computeBoundingSphere();
      const mesh = new THREE.Mesh(geometry, material);
      mesh.matrixAutoUpdate = false;
      parent.add(mesh); meshes.push(mesh);
      this.disposer.keep(geometry);
    }
    for (const geometry of this.shared.values()) this.disposer.keep(geometry);
    this.disposer.keep(this.unitBox); this.disposer.keep(this.unitSphere); this.disposer.keep(this.unitPlane);
    this.groups.clear();
    return meshes;
  }
}

/* ---------- Glow helpers ---------- */

export function makeHalo(disposer, color, size, opacity = .5) {
  const material = disposer.keep(new THREE.SpriteMaterial({ map: glowTexture(), color: new THREE.Color(color), transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(size, size, 1);
  sprite.renderOrder = 6;
  sprite.userData.baseOpacity = opacity;
  return sprite;
}

// A flat additive light pool or soft dark contact shadow lying on the floor.
export function makeDecal(disposer, texture, { color = '#ffffff', w = 1, d = 1, opacity = 1, additive = false, y = .004, order = 2 } = {}) {
  const material = disposer.keep(new THREE.MeshBasicMaterial({
    map: texture, color: new THREE.Color(color), transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, fog: false,
  }));
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
  disposer.keep(mesh.geometry);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.renderOrder = order;
  return mesh;
}

export function easeOutCubic(t) { return 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3); }
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
export const lerp = (a, b, t) => a + (b - a) * t;

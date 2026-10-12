import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V2 = [number, number];
export type V3 = [number, number, number];

// ---------------------------------------------------------------- caching
const cache = new Map<string, THREE.BufferGeometry>();
export function memo<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = cache.get(key) as T | undefined;
  if (!g) {
    g = make();
    cache.set(key, g);
  }
  return g;
}

// ---------------------------------------------------------------- builder
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();

/** collects transformed geometry parts and merges them into ONE draw call */
export class Builder {
  private list: THREE.BufferGeometry[] = [];

  add(g: THREE.BufferGeometry, p: V3 = [0, 0, 0], r: V3 = [0, 0, 0], s: V3 | number = 1) {
    const c = g.clone();
    if (typeof s === 'number') _s.set(s, s, s);
    else _s.set(s[0], s[1], s[2]);
    _e.set(r[0], r[1], r[2], 'YXZ');
    _q.setFromEuler(_e);
    _p.set(p[0], p[1], p[2]);
    _m.compose(_p, _q, _s);
    c.applyMatrix4(_m);
    this.list.push(c);
    return this;
  }

  get empty() {
    return this.list.length === 0;
  }

  build(): THREE.BufferGeometry {
    const out = mergeGeometries(this.list, false);
    this.list.forEach((g) => g.dispose());
    this.list = [];
    if (!out) throw new Error('furniture: mergeGeometries failed');
    return out;
  }
}

// ---------------------------------------------------------------- primitives
/**
 * cushion-soft box (cached).
 * RoundedBoxGeometry ships non-indexed; we re-index it so it merges with the
 * (indexed) lathe / cylinder / shape parts, and cap corner subdivision so a
 * whole sofa stays a few thousand triangles for mobile.
 */
export function rbox(w: number, h: number, d: number, r: number, seg = 3) {
  const s = Math.max(1, Math.min(seg, 3));
  const rr = Math.max(0.002, Math.min(r, w / 2 - 1e-3, h / 2 - 1e-3, d / 2 - 1e-3));
  return memo(`rb|${w}|${h}|${d}|${rr}|${s}`, () => {
    const raw = new RoundedBoxGeometry(w, h, d, s, rr);
    const indexed = mergeVertices(raw);
    raw.dispose();
    return indexed;
  });
}

export function cyl(rt: number, rb: number, h: number, seg = 16) {
  return memo(`cy|${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg));
}

// ---------------------------------------------------------------- lathe profiles
/**
 * Rounded rectangle cross-section, counter-clockwise (x = radius, y = height).
 * Swept around Y it becomes a ring with softly radiused edges.
 */
export function rrProfile(x0: number, y0: number, x1: number, y1: number, r: number, n = 5): V2[] {
  const rr = Math.min(r, (x1 - x0) / 2 - 1e-4, (y1 - y0) / 2 - 1e-4);
  const pts: V2[] = [];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  arc(x1 - rr, y0 + rr, -Math.PI / 2);
  arc(x1 - rr, y1 - rr, 0);
  arc(x0 + rr, y1 - rr, Math.PI / 2);
  arc(x0 + rr, y0 + rr, Math.PI);
  return pts;
}

/** solid disc with rounded rim and an optional pillowy crown on top */
export function discProfile(R: number, h: number, r: number, crown = 0, n = 5): V2[] {
  const rr = Math.min(r, R - 1e-3, h / 2);
  const pts: V2[] = [[0, 0]];
  const arc = (cx: number, cy: number, a0: number) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + (i / n) * (Math.PI / 2);
      pts.push([cx + rr * Math.cos(a), cy + rr * Math.sin(a)]);
    }
  };
  arc(R - rr, rr, -Math.PI / 2);
  arc(R - rr, h - rr, 0);
  const top = R - rr;
  const m = crown > 0 ? 8 : 1;
  for (let k = 1; k <= m; k++) {
    const x = top * (1 - k / m);
    const t = top > 0 ? x / top : 0;
    pts.push([x, h + crown * (1 - t * t)]);
  }
  return pts;
}

export function circleProfile(R: number, y: number, t: number, n = 8): V2[] {
  const pts: V2[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    pts.push([R + t * Math.cos(a), y + t * Math.sin(a)]);
  }
  return pts;
}

/**
 * Revolve a closed profile. For partial sweeps the open ends are capped so the
 * shape stays solid (φ = 0 is +Z, increasing toward +X).
 */
export function lathe(profile: V2[], segs = 40, phiStart = 0, phiLen = Math.PI * 2): THREE.BufferGeometry {
  let pts = profile.map(([x, y]) => new THREE.Vector2(Math.max(x, 1e-4), y));
  if (THREE.ShapeUtils.isClockWise(pts)) pts = pts.reverse();
  const g = new THREE.LatheGeometry(pts, Math.max(2, Math.round(segs)), phiStart, phiLen);
  if (phiLen >= Math.PI * 2 - 1e-3) return g;
  const sg = new THREE.ShapeGeometry(new THREE.Shape(pts.map((p) => p.clone())));
  const c1 = sg.clone().rotateY(phiStart - Math.PI / 2);
  const c2 = sg.clone().rotateY(phiStart + phiLen - Math.PI / 2);
  const out = mergeGeometries([g, c1, c2], false);
  g.dispose(); sg.dispose(); c1.dispose(); c2.dispose();
  return out ?? g;
}

/** how many lathe segments a given sweep deserves */
export const segsFor = (phiLen: number, perRad = 9) => Math.max(2, Math.ceil(phiLen * perRad));

// ---------------------------------------------------------------- soft goods
/** scatter pillow: thin pinched seams, plump middle, pulled-in corners */
export function pillowGeo(w: number, h: number, t: number) {
  return memo(`pillow|${w}|${h}|${t}`, () => {
    let g: THREE.BufferGeometry = new THREE.BoxGeometry(w, h, t, 18, 18, 6);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      const nx = x / (w / 2);
      const ny = y / (h / 2);
      const edge =
        (1 - Math.pow(Math.abs(nx), 3.6) * 0.9) * (1 - Math.pow(Math.abs(ny), 3.6) * 0.9);
      const zz = z * (0.2 + 0.8 * Math.max(0, edge));
      const k = 1 - 0.08 * nx * nx * ny * ny; // corner pinch
      pos.setXYZ(i, x * k, y * k, zz);
    }
    g.deleteAttribute('normal');
    g.deleteAttribute('uv');
    g = mergeVertices(g, 1e-4);
    g.computeVertexNormals();
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    return g;
  });
}

/** channel-tufted upholstery panel (plane facing +Z with rounded vertical ribs) */
export function ribbedPanel(w: number, h: number, ribs: number, depth: number) {
  return memo(`rib|${w}|${h}|${ribs}|${depth}`, () => {
    const g = new THREE.PlaneGeometry(w, h, ribs * 8, 18);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) / w + 0.5;
      const v = pos.getY(i) / h + 0.5;
      const f = Math.sin(Math.PI * ((u * ribs) % 1));
      const rib = Math.pow(Math.max(f, 0), 0.6);
      const top = 1 - 0.8 * THREE.MathUtils.smoothstep(v, 0.8, 1);
      const bot = 1 - 0.8 * (1 - THREE.MathUtils.smoothstep(v, 0, 0.12));
      pos.setZ(i, depth * rib * top * bot);
    }
    g.computeVertexNormals();
    return g;
  });
}

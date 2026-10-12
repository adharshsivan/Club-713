import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  Builder, memo, rbox, cyl, lathe, rrProfile, discProfile, circleProfile,
  pillowGeo, ribbedPanel, segsFor, type V2,
} from './geo';

const PI = Math.PI;
const jit = (k: number) => Math.sin(k * 12.9898 + 4.1) * 0.5; // deterministic -0.5..0.5

const store = new Map<string, unknown>();
function cached<T>(key: string, make: () => T): T {
  if (!store.has(key)) store.set(key, make());
  return store.get(key) as T;
}

export interface Parts {
  fabric: THREE.BufferGeometry;
  accent: THREE.BufferGeometry | null;
  metal: THREE.BufferGeometry;
}

// =====================================================================
//  SOFA — plinth, split seat cushions, channel-tufted back, bolster arms,
//  scatter pillows, brass kick-plate and tapered brass feet.
//  Local space: front faces +Z, back at -Z, length along X.
// =====================================================================
export type Arms = 'none' | 'both' | 'left' | 'right';
export interface SofaOpts { L: number; D: number; arms: Arms; back: boolean; pillows: number }

export function sofaGeos(o: SofaOpts): Parts {
  return cached(`sofa|${o.L}|${o.D}|${o.arms}|${o.back}|${o.pillows}`, () => {
    const { L, D, back, pillows } = o;
    const fab = new Builder();
    const acc = new Builder();
    const met = new Builder();
    const aw = 0.2;
    const hasL = o.arms === 'both' || o.arms === 'left';
    const hasR = o.arms === 'both' || o.arms === 'right';
    const x0 = -L / 2 + (hasL ? aw : 0);
    const x1 = L / 2 - (hasR ? aw : 0);
    const W = x1 - x0;
    const cx = (x0 + x1) / 2;
    const bt = back ? 0.24 : 0;

    // plinth + brass kick-plate + feet
    fab.add(rbox(L, 0.2, D, 0.06, 5), [0, 0.18, 0]);
    met.add(rbox(L - 0.08, 0.026, D - 0.08, 0.01, 3), [0, 0.092, 0]);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        met.add(cyl(0.03, 0.016, 0.1, 12), [sx * (L / 2 - 0.13), 0.045, sz * (D / 2 - 0.13)]);
      }
    }

    // split seat cushions
    const n = Math.max(1, Math.round(W / 1.2));
    const cw = W / n;
    const cd = D - bt;
    for (let i = 0; i < n; i++) {
      fab.add(rbox(cw - 0.012, 0.2, cd - 0.01, 0.078, 5), [x0 + (i + 0.5) * cw, 0.38, D / 2 - cd / 2]);
    }

    // bolster arms
    if (hasL) fab.add(rbox(aw, 0.37, D, 0.085, 5), [-L / 2 + aw / 2, 0.455, 0]);
    if (hasR) fab.add(rbox(aw, 0.37, D, 0.085, 5), [L / 2 - aw / 2, 0.455, 0]);

    // channel-tufted back
    if (back) {
      fab.add(rbox(L, 0.66, bt, 0.105, 5), [0, 0.6, -D / 2 + bt / 2]);
      const ribs = Math.max(3, Math.round(W / 0.15));
      fab.add(ribbedPanel(W - 0.03, 0.42, ribs, 0.045), [cx, 0.7, -D / 2 + bt - 0.005]);
    }

    // scatter pillows
    for (let k = 0; k < pillows; k++) {
      const t = (k + 0.5) / pillows;
      const big = k % 2 === 0;
      acc.add(
        pillowGeo(big ? 0.48 : 0.4, big ? 0.42 : 0.3, 0.17),
        [x0 + W * t + jit(k) * 0.12, 0.48 + (big ? 0.2 : 0.15), -D / 2 + bt + 0.11],
        [-0.24, jit(k + 3) * 0.5, jit(k + 7) * 0.3],
      );
    }

    return { fabric: fab.build(), accent: pillows ? acc.build() : null, metal: met.build() };
  });
}

// =====================================================================
//  ARC BANQUETTE — a continuous curved sofa swept around Y.
//  Local space: back at -Z (φ = π), opening toward +Z, centred on origin.
// =====================================================================
export interface ArcOpts { ri: number; ro: number; span: number; pillows: number }

export function arcGeos(o: ArcOpts): Parts {
  return cached(`arc|${o.ri}|${o.ro}|${o.span}|${o.pillows}`, () => {
    const { ri, ro, span, pillows } = o;
    const fab = new Builder();
    const acc = new Builder();
    const met = new Builder();
    const a0 = PI - span / 2;
    const bt = 0.25;

    // brass kick + fabric frame
    met.add(lathe(rrProfile(ri + 0.05, 0, ro - 0.05, 0.09, 0.02, 3), segsFor(span, 10), a0, span));
    fab.add(lathe(rrProfile(ri + 0.02, 0.085, ro - 0.02, 0.28, 0.05, 4), segsFor(span, 10), a0, span));

    // seat cushions
    const n = Math.max(3, Math.round(span / 0.46));
    const len = span / n;
    const gap = 0.022;
    for (let i = 0; i < n; i++) {
      fab.add(lathe(rrProfile(ri, 0.28, ro - bt, 0.49, 0.08, 4), segsFor(len, 12), a0 + i * len + gap / 2, len - gap));
    }

    // channel-tufted back (each rib is its own softly-radiused wedge)
    const nb = n * 2;
    const lb = span / nb;
    for (let i = 0; i < nb; i++) {
      fab.add(lathe(rrProfile(ro - bt - 0.01, 0.27, ro, 0.95, 0.1, 5), segsFor(lb, 14), a0 + i * lb + 0.006, lb - 0.012));
    }

    // pillows leaning on the back, facing the centre
    for (let k = 0; k < pillows; k++) {
      const a = a0 + span * ((k + 0.5) / pillows);
      const r = ro - bt - 0.1;
      const big = k % 2 === 0;
      acc.add(
        pillowGeo(big ? 0.46 : 0.38, big ? 0.4 : 0.3, 0.16),
        [r * Math.sin(a), 0.48 + (big ? 0.19 : 0.15), r * Math.cos(a)],
        [-0.24, a + PI + jit(k) * 0.3, 0],
      );
    }

    return { fabric: fab.build(), accent: pillows ? acc.build() : null, metal: met.build() };
  });
}

// =====================================================================
//  STOOL — leather seat with a barrel back, brass pedestal + foot ring
// =====================================================================
export function stoolGeos(h: number, back: boolean) {
  return cached(`stool|${h}|${back}`, () => {
    const up = new Builder();
    const met = new Builder();
    up.add(lathe(discProfile(0.205, 0.1, 0.042, 0.02, 5), 40), [0, h - 0.12, 0]);
    if (back) {
      up.add(lathe(rrProfile(0.17, 0, 0.228, 0.3, 0.026, 4), 20, PI - 1.0, 2.0), [0, h - 0.05, 0]);
    }
    met.add(lathe(discProfile(0.21, 0.032, 0.013, 0.012, 3), 40));
    met.add(cyl(0.022, 0.028, h - 0.18, 14), [0, 0.03 + (h - 0.18) / 2, 0]);
    met.add(lathe(discProfile(0.13, 0.026, 0.01, 0, 3), 28), [0, h - 0.148, 0]);
    met.add(lathe(circleProfile(0.19, 0, 0.012, 8), 40), [0, 0.26, 0]);
    for (let k = 0; k < 3; k++) {
      const a = (k * PI * 2) / 3 + 0.5;
      met.add(cyl(0.008, 0.008, 0.18, 6), [0.1 * Math.cos(a), 0.26, -0.1 * Math.sin(a)], [0, a, PI / 2]);
    }
    return { up: up.build(), metal: met.build() };
  });
}

// =====================================================================
//  TABLES
// =====================================================================
export interface TableParts { top: THREE.BufferGeometry; metal: THREE.BufferGeometry }

/** slender brass pedestal with a stone/wood top and a bevelled brass rim */
export function pedestalTableGeos(R: number, h: number, baseR = 0.27): TableParts {
  return cached(`ped|${R}|${h}|${baseR}`, () => {
    const top = new Builder();
    const met = new Builder();
    top.add(lathe(discProfile(R - 0.014, 0.034, 0.01, 0, 3), 56), [0, h - 0.034, 0]);
    met.add(lathe(rrProfile(R - 0.02, h - 0.042, R, h + 0.002, 0.008, 3), 56));
    const s = h - 0.14;
    met.add(
      lathe(
        [
          [0, 0.05], [0.055, 0.05], [0.03, 0.05 + s * 0.3], [0.024, 0.05 + s * 0.6],
          [0.032, h - 0.09], [0.075, h - 0.045], [0, h - 0.03],
        ],
        28,
      ),
    );
    met.add(lathe(discProfile(baseR, 0.05, 0.022, 0.018), 44));
    return { top: top.build(), metal: met.build() };
  });
}

/** low drum coffee table: stone top on a brass drum */
export function coffeeTableGeos(R: number, h: number): TableParts {
  return cached(`cof|${R}|${h}`, () => {
    const top = new Builder();
    const met = new Builder();
    top.add(lathe(discProfile(R, 0.05, 0.016, 0, 3), 56), [0, h - 0.05, 0]);
    met.add(lathe(rrProfile(R - 0.01, h - 0.054, R + 0.005, h - 0.012, 0.004, 3), 56));
    met.add(lathe(discProfile(R * 0.56, h - 0.07, 0.025, 0, 4), 40), [0, 0.02, 0]);
    met.add(lathe(discProfile(R * 0.7, 0.022, 0.008, 0, 3), 44));
    return { top: top.build(), metal: met.build() };
  });
}

/** soft round pouf on a brass ring foot */
export function poufGeos(R: number, h: number) {
  return cached(`pouf|${R}|${h}`, () => {
    const up = new Builder();
    const met = new Builder();
    up.add(lathe(discProfile(R, h, R * 0.5, 0.025, 6), 36), [0, 0.04, 0]);
    met.add(lathe(rrProfile(R * 0.55, 0, R * 0.84, 0.05, 0.014, 3), 36));
    // seam piping
    met.add(lathe(circleProfile(R * 0.97, 0, 0.007, 6), 36), [0, 0.04 + h * 0.32, 0]);
    return { up: up.build(), metal: met.build() };
  });
}

// =====================================================================
//  BARREL ARMCHAIR
// =====================================================================
export function armchairGeos(): Parts {
  return cached('armchair', () => {
    const fab = new Builder();
    const met = new Builder();
    met.add(lathe(discProfile(0.27, 0.03, 0.012, 0.01, 3), 40));
    met.add(cyl(0.04, 0.05, 0.14, 14), [0, 0.1, 0]);
    met.add(lathe(discProfile(0.25, 0.026, 0.01, 0, 3), 40), [0, 0.165, 0]);
    fab.add(lathe(discProfile(0.34, 0.15, 0.06, 0, 5), 40), [0, 0.19, 0]);
    fab.add(lathe(discProfile(0.31, 0.12, 0.05, 0.028, 5), 40), [0, 0.34, 0]);
    const span = 2.9;
    const a0 = PI - span / 2;
    const nb = 11;
    const lb = span / nb;
    for (let i = 0; i < nb; i++) {
      fab.add(lathe(rrProfile(0.3, 0.3, 0.47, 0.84, 0.1, 5), segsFor(lb, 14), a0 + i * lb + 0.008, lb - 0.016));
    }
    return { fabric: fab.build(), accent: null, metal: met.build() };
  });
}

// =====================================================================
//  TABLEWARE — table lamp, tumblers, decanter in a brass ice bucket
// =====================================================================
export function tablewareGeos() {
  return cached('tableware', () => {
    const metal = new Builder();
    const glass = new Builder();
    const liquid = new Builder();
    const glow = new Builder();

    metal.add(lathe(discProfile(0.042, 0.07, 0.014, 0, 3), 20), [0.02, 0, -0.04]);
    glow.add(cyl(0.032, 0.036, 0.11, 20), [0.02, 0.125, -0.04]);
    metal.add(lathe(discProfile(0.034, 0.012, 0.004, 0, 2), 20), [0.02, 0.18, -0.04]);

    for (const [x, z] of [[0.17, 0.11], [0.24, -0.01]]) {
      glass.add(cyl(0.036, 0.03, 0.09, 18), [x, 0.045, z]);
      liquid.add(cyl(0.031, 0.027, 0.04, 16), [x, 0.024, z]);
    }

    metal.add(
      lathe([[0, 0], [0.07, 0], [0.09, 0.19], [0.094, 0.205], [0.08, 0.205], [0, 0.185]], 28),
      [-0.2, 0, 0.06],
    );
    liquid.add(
      lathe(
        [[0, 0], [0.052, 0], [0.054, 0.1], [0.03, 0.18], [0.02, 0.22], [0.02, 0.26], [0.026, 0.27], [0, 0.27]],
        22,
      ),
      [-0.2, 0.12, 0.06],
    );
    return {
      metal: metal.build(), glass: glass.build(), liquid: liquid.build(), glow: glow.build(),
    };
  });
}

// =====================================================================
//  BOTTLES — three turned silhouettes for the back bar
// =====================================================================
const BOTTLE_PROFILES: V2[][] = [
  // tall slim
  [[0, 0], [0.036, 0], [0.038, 0.02], [0.038, 0.19], [0.03, 0.215], [0.014, 0.25], [0.013, 0.31], [0.016, 0.32], [0.016, 0.335], [0, 0.335]],
  // square-shouldered
  [[0, 0], [0.05, 0], [0.052, 0.015], [0.052, 0.16], [0.04, 0.2], [0.02, 0.215], [0.019, 0.27], [0.022, 0.275], [0.022, 0.29], [0, 0.29]],
  // flask / decanter
  [[0, 0], [0.06, 0], [0.062, 0.02], [0.058, 0.12], [0.03, 0.2], [0.02, 0.24], [0.02, 0.27], [0.034, 0.285], [0.034, 0.3], [0, 0.3]],
];
export function bottleGeo(kind: number) {
  return memo(`bottle|${kind}`, () => lathe(BOTTLE_PROFILES[kind % 3], 12));
}

// =====================================================================
//  COUNTER DETAILS
// =====================================================================
/** vertical fluted panel: a row of half-buried reeded cylinders */
export function flutesGeo(L: number, h: number, y: number, r = 0.034, step = 0.095) {
  return memo(`flute|${L}|${h}|${y}|${r}|${step}`, () => {
    const b = new Builder();
    const n = Math.floor(L / step);
    const s = L / n;
    const c = cyl(r, r, h, 10);
    for (let i = 0; i < n; i++) b.add(c, [-L / 2 + (i + 0.5) * s, y, 0]);
    return b.build();
  });
}

/** stone slab + brass edging (centred on origin, top surface at y) */
export function counterTopGeos(L: number, depth: number, y: number) {
  return cached(`ctop|${L}|${depth}|${y}`, () => {
    const slab = new Builder();
    const brass = new Builder();
    slab.add(rbox(L + 0.2, 0.05, depth, 0.018, 3), [0, y - 0.025, 0]);
    for (const sz of [-1, 1]) {
      brass.add(rbox(L + 0.24, 0.058, 0.032, 0.012, 3), [0, y - 0.027, sz * (depth / 2 + 0.002)]);
    }
    for (const sx of [-1, 1]) {
      brass.add(rbox(0.032, 0.058, depth + 0.036, 0.012, 3), [sx * (L / 2 + 0.102), y - 0.027, 0]);
    }
    return { slab: slab.build(), brass: brass.build() };
  });
}

/** floor-standing drink ledge that wraps a column */
export function ledgeGeos() {
  return cached('ledge', () => {
    const top = new Builder();
    const brass = new Builder();
    const glow = new Builder();
    top.add(lathe(rrProfile(0.34, 1.03, 0.68, 1.078, 0.018, 4), 56));
    brass.add(lathe(rrProfile(0.664, 0.98, 0.692, 1.088, 0.011, 3), 56));
    brass.add(lathe(rrProfile(0.31, 0.93, 0.46, 1.03, 0.012, 3), 40));
    brass.add(lathe(rrProfile(0.32, 0.02, 0.46, 0.2, 0.012, 3), 40));
    glow.add(lathe(circleProfile(0.58, 1.018, 0.008, 6), 56));
    return { top: top.build(), brass: brass.build(), glow: glow.build() };
  });
}

// =====================================================================
//  DECOR — potted plant, wall sconce, floor lamp, backlit art panel
// =====================================================================

/** ceramic cylinder pot with a flared lip */
export function potGeos(R: number, h: number) {
  return cached(`pot|${R}|${h}`, () => {
    const pot = new Builder();
    pot.add(lathe([
      [0, 0], [R * 0.86, 0], [R * 0.78, h * 0.08], [R * 0.7, h * 0.55],
      [R * 0.82, h * 0.92], [R, h], [R * 0.9, h], [R * 0.68, h * 0.9], [0, h * 0.9],
    ], 28));
    return pot.build();
  });
}

/** a handful of merged, noise-displaced icosphere blobs — a cheap indoor shrub */
export function foliageGeos(seed: number, scale = 1) {
  return cached(`foliage|${seed}|${scale}`, () => {
    const blobs: [number, number, number, number][] = [
      [0, 0.72, 0, 0.42], [0.26, 0.58, 0.12, 0.3], [-0.22, 0.62, -0.16, 0.28],
      [0.08, 0.95, -0.1, 0.26], [-0.14, 0.4, 0.22, 0.24],
    ];
    const parts = blobs.map(([x, y, z, r], k) => {
      let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r * scale, 1);
      g.deleteAttribute('normal');
      g.deleteAttribute('uv');
      g = mergeVerticesLocal(g);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
        const n = Math.sin(vx * 9 + seed + k) * Math.sin(vy * 7 + vz * 5) * 0.14 * r * scale;
        const s = 1 + n / (r * scale);
        p.setXYZ(i, vx * s + x * scale, vy * s + y * scale, vz * s + z * scale);
      }
      return g;
    });
    const out = mergeGeometries(parts, false)!;
    parts.forEach((g) => g.dispose());
    out.computeVertexNormals();
    const pos = out.attributes.position;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const h = THREE.MathUtils.clamp(pos.getY(i) / (0.95 * scale), 0, 1);
      const lit = 0.3 + 0.5 * h;
      col[i * 3] = 0.07 * lit * 2;
      col[i * 3 + 1] = 0.22 + 0.2 * lit;
      col[i * 3 + 2] = 0.09 * lit * 1.4;
    }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  });
}

function mergeVerticesLocal(g: THREE.BufferGeometry) {
  // local alias kept here so pieces.ts doesn't need a second import line at the top
  return mergeVertices(g);
}

/** half-cylinder wall sconce: brass backplate + frosted glass shade */
export function sconceGeos() {
  return cached('sconce', () => {
    const brass = new Builder();
    const glass = new Builder();
    brass.add(rbox(0.16, 0.22, 0.03, 0.02, 2), [0, 0, -0.015]);
    brass.add(lathe(rrProfile(0, 0, 0.09, 0.16, 0.015, 3), 20, -Math.PI / 2, Math.PI), [0, 0, 0], [0, Math.PI / 2, 0]);
    glass.add(lathe(rrProfile(0, 0, 0.082, 0.148, 0.012, 3), 20, -Math.PI / 2, Math.PI), [0, 0, 0.01], [0, Math.PI / 2, 0]);
    return { brass: brass.build(), glass: glass.build() };
  });
}

/** slender torchiere floor lamp with a fabric drum shade */
export function floorLampGeos(h: number) {
  return cached(`lamp|${h}`, () => {
    const metal = new Builder();
    const shade = new Builder();
    const glow = new Builder();
    metal.add(lathe(discProfile(0.16, 0.03, 0.012, 0, 3), 32));
    metal.add(cyl(0.018, 0.022, h - 0.42, 14), [0, (h - 0.42) / 2 + 0.03, 0]);
    metal.add(lathe(discProfile(0.07, 0.02, 0.008, 0, 2), 24), [0, h - 0.4, 0]);
    shade.add(lathe(rrProfile(0.1, 0, 0.17, 0.36, 0.02, 3), 32), [0, h - 0.38, 0]);
    glow.add(cyl(0.09, 0.14, 0.3, 24), [0, h - 0.2, 0]);
    metal.add(lathe(circleProfile(0.17, 0, 0.01, 10), 32), [0, h - 0.02, 0]);
    return { metal: metal.build(), shade: shade.build(), glow: glow.build() };
  });
}

// =====================================================================
//  PA SPEAKER CABINET — recessed driver(s), rubber surround, dust cap,
//  corner caps, rear handles. 'sub' = single 15" woofer, 'top' = horn + mid.
// =====================================================================
export interface SpeakerParts {
  body: THREE.BufferGeometry;
  rubber: THREE.BufferGeometry;
  driver: THREE.BufferGeometry;
  led: THREE.BufferGeometry;
}

export function speakerGeos(kind: 'sub' | 'top'): SpeakerParts {
  return cached(`speaker|${kind}`, () => {
    const body = new Builder();
    const rubber = new Builder();
    const driver = new Builder();
    const led = new Builder();

    const W = 1.18;
    const H = 1.18;
    const D = 1.5;
    const fz = D / 2; // front face

    // cabinet shell + recessed baffle + steel corner caps + rear handles
    body.add(rbox(W, H, D, 0.05));
    body.add(rbox(W - 0.16, H - 0.16, 0.06, 0.02), [0, 0, fz - 0.015]);
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        body.add(rbox(0.16, 0.16, 0.12, 0.035), [sx * (W / 2 - 0.05), sy * (H / 2 - 0.05), fz - 0.02]);
      }
      body.add(rbox(0.06, 0.3, 0.06, 0.02), [0, sx * 0.3, -fz + 0.01]);
    }

    // a woofer: surround ring, receding cone, domed dust cap, thin LED halo
    const woofer = (x: number, y: number, r: number) => {
      rubber.add(new THREE.TorusGeometry(r + 0.05, 0.05, 10, 36), [x, y, fz + 0.005]);
      driver.add(new THREE.ConeGeometry(r, r * 0.62, 32, 1, true), [x, y, fz - r * 0.29], [-Math.PI / 2, 0, 0]);
      driver.add(new THREE.SphereGeometry(r * 0.28, 18, 12), [x, y, fz - r * 0.58], [0, 0, 0], [1, 1, 0.7]);
      led.add(new THREE.TorusGeometry(r + 0.12, 0.011, 6, 44), [x, y, fz + 0.03]);
    };

    if (kind === 'sub') {
      woofer(0, 0, 0.4);
    } else {
      // horn-loaded top: flared mouth + mid driver beneath
      body.add(rbox(0.88, 0.38, 0.12, 0.03), [0, 0.32, fz + 0.01]);
      driver.add(new THREE.ConeGeometry(0.12, 0.26, 24, 1, true), [0, 0.32, fz - 0.1], [-Math.PI / 2, 0, 0], [2.5, 1, 1]);
      driver.add(new THREE.SphereGeometry(0.05, 12, 8), [0, 0.32, fz - 0.21]);
      woofer(0, -0.26, 0.26);
    }

    return {
      body: body.build(),
      rubber: rubber.build(),
      driver: driver.build(),
      led: led.build(),
    };
  });
}

/** backlit feature panel: brass frame around a glowing recessed field */
export function artPanelGeos(w: number, h: number) {
  return cached(`art|${w}|${h}`, () => {
    const frame = new Builder();
    frame.add(rbox(w, h, 0.05, 0.015, 2));
    const inset = new Builder().add(rbox(w - 0.14, h - 0.14, 0.02, 0.01, 2), [0, 0, 0.02]).build();
    return { frame: frame.build(), inset };
  });
}

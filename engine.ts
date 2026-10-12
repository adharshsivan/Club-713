// Procedural pixel-art renderer for the stage LED walls (no image assets).

export const hash = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeIn = (t: number) => clamp01(t) ** 2;
export const easeOut = (t: number) => 1 - (1 - clamp01(t)) ** 2;
export const smooth = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

const rgbCache = new Map<string, [number, number, number]>();
function rgb(hex: string) {
  let v = rgbCache.get(hex);
  if (!v) {
    const n = parseInt(hex.slice(1), 16);
    v = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    rgbCache.set(hex, v);
  }
  return v;
}

/** Blend two #rrggbb colours (returns a CSS colour for drawing only). */
export function mix(a: string, b: string, t: number) {
  const A = rgb(a);
  const B = rgb(b);
  const k = clamp01(t);
  return `rgb(${Math.round(lerp(A[0], B[0], k))},${Math.round(lerp(A[1], B[1], k))},${Math.round(lerp(A[2], B[2], k))})`;
}

// 3x5 pixel font
const FONT: Record<string, string> = {
  '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111',
  '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001010010010',
  '8': '111101111101111', '9': '111101111001111',
  A: '010101111101101', C: '111100100100111', D: '110101101101110', E: '111100110100111',
  G: '111100101101111', I: '111010010010111', M: '101111111101101', N: '110101101101101',
  O: '111101101101111', R: '110101110101101', S: '111100111001111', T: '111010010010010',
  W: '101101111111101', '!': '010010010000010', '?': '111001010000010', ' ': '000000000000000',
};

export class Px {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;
  }

  alpha(a: number) {
    this.ctx.globalAlpha = clamp01(a);
  }

  clear(c: string) {
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  rect(x: number, y: number, w: number, h: number, c: string) {
    const W = Math.round(w);
    const H = Math.round(h);
    if (W <= 0 || H <= 0) return;
    this.ctx.fillStyle = c;
    this.ctx.fillRect(Math.round(x), Math.round(y), W, H);
  }

  dot(x: number, y: number, c: string) {
    this.rect(x, y, 1, 1, c);
  }

  line(x1: number, y1: number, x2: number, y2: number, c: string, t = 1) {
    const steps = Math.max(
      Math.abs(Math.round(x2) - Math.round(x1)),
      Math.abs(Math.round(y2) - Math.round(y1)),
      1,
    );
    const o = Math.floor(t / 2);
    this.ctx.fillStyle = c;
    for (let k = 0; k <= steps; k++) {
      this.ctx.fillRect(
        Math.round(x1 + ((x2 - x1) * k) / steps) - o,
        Math.round(y1 + ((y2 - y1) * k) / steps) - o,
        t,
        t,
      );
    }
  }

  disc(cx: number, cy: number, r: number, c: string) {
    if (r < 1) {
      this.dot(cx, cy, c);
      return;
    }
    const R = Math.round(r);
    const X = Math.round(cx);
    const Y = Math.round(cy);
    this.ctx.fillStyle = c;
    for (let y = -R; y <= R; y++) {
      const half = Math.round(Math.sqrt(Math.max(0, r * r - y * y)));
      this.ctx.fillRect(X - half, Y + y, half * 2 + 1, 1);
    }
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, c: string) {
    const RY = Math.max(0, Math.round(ry));
    for (let y = -RY; y <= RY; y++) {
      const k = RY === 0 ? 0 : y / (ry + 0.5);
      const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - k * k)));
      this.rect(Math.round(cx) - half, cy + y, half * 2 + 1, 1, c);
    }
  }

  ring(cx: number, cy: number, r: number, c: string) {
    const n = Math.max(8, Math.ceil(r * 7));
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      this.dot(cx + Math.cos(a) * r, cy + Math.sin(a) * r, c);
    }
  }

  vgrad(y0: number, y1: number, a: string, b: string) {
    const span = Math.max(1, y1 - y0 - 1);
    for (let y = y0; y < y1; y++) this.rect(0, y, this.w, 1, mix(a, b, (y - y0) / span));
  }

  textWidth(str: string, s = 1) {
    return (str.length * 4 - 1) * s;
  }

  text(str: string, x: number, y: number, c: string, s = 1) {
    for (let i = 0; i < str.length; i++) {
      const g = FONT[str[i]];
      if (!g) continue;
      for (let row = 0; row < 5; row++) {
        for (let col = 0; col < 3; col++) {
          if (g[row * 3 + col] === '1') this.rect(x + (i * 4 + col) * s, y + row * s, s, s, c);
        }
      }
    }
  }

  /** pixel-dissolve transition: blacks out a hashed fraction of pixels */
  dissolve(amount: number, seed: number) {
    if (amount <= 0) return;
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = '#000000';
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (hash(x * 12.9898 + y * 78.233 + seed * 3.7) < amount) this.ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

// ------------------------------------------------------------------ characters
export interface Palette {
  cloth: string; shade: string; trim: string; glow: string; skin: string; hair: string;
}

export const PALETTES: Palette[] = [
  { cloth: '#14f0cc', shade: '#087e9b', trim: '#d9ff48', glow: '#fd50b5', skin: '#ffd09d', hair: '#292147' },
  { cloth: '#ff55b7', shade: '#922cbe', trim: '#ffe453', glow: '#45fff0', skin: '#c98a5e', hair: '#171a3c' },
  { cloth: '#9eff39', shade: '#277c62', trim: '#42edff', glow: '#ff7949', skin: '#ffe0ad', hair: '#d6431f' },
  { cloth: '#ff982e', shade: '#963b82', trim: '#f13aff', glow: '#59f5d1', skin: '#8d5a3b', hair: '#24203f' },
  { cloth: '#5a7dff', shade: '#2b2f9e', trim: '#ff5ad1', glow: '#fff35a', skin: '#ffc9a0', hair: '#f5e6c8' },
];

export const ASTRO: Palette = {
  cloth: '#eef2fb', shade: '#9aa6bd', trim: '#ff8a3d', glow: '#57e6ff', skin: '#ffd09d', hair: '#eef2fb',
};

type V2 = [number, number];
export interface Pose { l: V2; r: V2; lf: V2; rf: V2; bob?: number }

/** hand + foot positions on a 12x16 character grid (shoulders at y7, feet at y15) */
export const POSES: Record<string, Pose> = {
  idle: { l: [3, 11], r: [8, 11], lf: [4, 15], rf: [7, 15] },
  wave: { l: [3, 11], r: [10, 3], lf: [4, 15], rf: [7, 15] },
  look: { l: [3, 11], r: [9, 1], lf: [4, 15], rf: [7, 15] },
  up: { l: [2, 1], r: [9, 1], lf: [4, 15], rf: [7, 15] },
  d1: { l: [1, 9], r: [10, 3], lf: [3, 15], rf: [8, 14] },
  d2: { l: [2, 2], r: [10, 10], lf: [4, 14], rf: [9, 15] },
  d3: { l: [0, 6], r: [11, 6], lf: [2, 15], rf: [9, 15] },
  d4: { l: [3, 4], r: [8, 4], lf: [4, 15], rf: [7, 15], bob: 1 },
  d5: { l: [1, 3], r: [8, 10], lf: [2, 14], rf: [8, 15] },
  d6: { l: [3, 10], r: [11, 2], lf: [3, 15], rf: [10, 14] },
  run1: { l: [2, 9], r: [9, 8], lf: [2, 14], rf: [8, 15] },
  run2: { l: [3, 8], r: [8, 9], lf: [5, 15], rf: [6, 14] },
  jump: { l: [1, 3], r: [10, 3], lf: [4, 13], rf: [7, 13] },
  skate: { l: [0, 8], r: [11, 7], lf: [3, 15], rf: [8, 15], bob: 1 },
  skate2: { l: [1, 7], r: [11, 9], lf: [3, 15], rf: [8, 15], bob: 1 },
  scratch: { l: [2, 10], r: [9, 10], lf: [4, 15], rf: [7, 15] },
  scratch2: { l: [1, 10], r: [10, 9], lf: [4, 15], rf: [7, 15] },
  pump: { l: [2, 10], r: [9, 1], lf: [4, 15], rf: [7, 15] },
  float: { l: [0, 5], r: [11, 5], lf: [3, 14], rf: [8, 14] },
  point: { l: [3, 11], r: [11, 6], lf: [4, 15], rf: [7, 15] },
};

export function kid(
  p: Px, x0: number, y0: number, s: number, pose: Pose, pal: Palette,
  opts: { flip?: boolean; helmet?: boolean } = {},
) {
  const flip = !!opts.flip;
  const u = pose.bob ?? 0;
  const R = (gx: number, gy: number, gw: number, gh: number, c: string) => {
    const fx = flip ? 12 - gx - gw : gx;
    p.rect(x0 + fx * s, y0 + gy * s, gw * s, gh * s, c);
  };
  const L = (ax: number, ay: number, bx: number, by: number, c: string) => {
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay), 1);
    for (let k = 0; k <= n; k++) {
      R(Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n), 1, 1, c);
    }
  };

  // legs + two-tone trainers
  L(5, 11 + u, pose.lf[0], pose.lf[1] - 1, pal.shade);
  L(6, 11 + u, pose.rf[0], pose.rf[1] - 1, pal.cloth);
  R(pose.lf[0] - 1, pose.lf[1], 2, 1, '#f2f5ff');
  R(pose.rf[0], pose.rf[1], 2, 1, '#f2f5ff');
  R(pose.lf[0] - 1, pose.lf[1], 1, 1, pal.glow);
  R(pose.rf[0] + 1, pose.rf[1], 1, 1, pal.trim);

  // jacket with side panels, zip and belt
  R(4, 6 + u, 4, 5, pal.cloth);
  R(4, 8 + u, 1, 3, pal.shade);
  R(7, 8 + u, 1, 3, pal.shade);
  R(6, 7 + u, 1, 2, pal.trim);
  R(4, 10 + u, 4, 1, pal.shade);

  // two-tone arms with glowing hands
  const arm = (sx: number, hand: V2, sleeve: string) => {
    const hx = hand[0];
    const hy = hand[1] + u;
    const mx = Math.round((sx + hx) / 2);
    const my = Math.round((7 + u + hy) / 2);
    L(sx, 7 + u, mx, my, sleeve);
    L(mx, my, hx, hy, pal.trim);
    R(hx, hy, 1, 1, pal.skin);
  };
  arm(4, pose.l, pal.cloth);
  arm(7, pose.r, pal.shade);

  // head: hair, visor, smile, headphones
  R(4, 1 + u, 4, 4, pal.skin);
  R(4, 0 + u, 4, 2, pal.hair);
  R(4, 2 + u, 4, 1, pal.glow);
  R(5, 2 + u, 1, 1, '#ffffff');
  R(5, 4 + u, 2, 1, '#c2416b');
  R(3, 1 + u, 1, 3, pal.trim);
  R(8, 1 + u, 1, 3, pal.trim);

  if (opts.helmet) {
    const cx = x0 + 6 * s;
    const cy = y0 + (2.5 + u) * s;
    p.ring(cx, cy, 3.6 * s, '#e9f1ff');
    p.dot(cx - 2 * s, cy - 2 * s, '#ffffff');
  }
}

// ------------------------------------------------------------------ props
/** 7-wide, 15-tall rocket; flame drawn below the nozzle */
export function rocket(p: Px, cx: number, top: number, flame: number, time: number, pilot?: Palette) {
  const X = Math.round(cx);
  const T = Math.round(top);
  const red = '#ff3d6e';
  const redD = '#b81f55';

  if (flame > 0) {
    const fl = flame + Math.round((hash(Math.floor(time * 20)) - 0.5) * 3);
    for (let k = 0; k < fl; k++) {
      const f = k / Math.max(1, fl);
      const half = f < 0.7 ? 1 : 0;
      const col = f < 0.2 ? '#ffffff' : f < 0.45 ? '#fff27a' : f < 0.75 ? '#ff9a2e' : '#ff3d3d';
      p.rect(X - half, T + 15 + k, half * 2 + 1, 1, col);
    }
    for (let i = 0; i < 3; i++) {
      if (hash(i + Math.floor(time * 24)) > 0.4) {
        p.dot(X - 2 + Math.floor(hash(i * 7 + Math.floor(time * 24)) * 5), T + 15 + fl + i, '#ffb45a');
      }
    }
  }

  p.dot(X, T, red);
  p.rect(X - 1, T + 1, 3, 1, red);
  p.rect(X - 2, T + 2, 5, 1, red);
  p.dot(X - 1, T + 1, '#ff9ab8');

  p.rect(X - 3, T + 3, 7, 10, '#eef2ff');
  p.rect(X + 2, T + 3, 1, 10, '#b5bfd4');
  p.rect(X + 3, T + 3, 1, 10, '#8590ab');
  p.rect(X - 3, T + 3, 1, 10, '#ffffff');

  p.disc(X, T + 6, 1.6, '#5a6a85');
  p.disc(X, T + 6, 1, '#57e6ff');
  if (pilot) p.dot(X, T + 6, pilot.skin);

  p.rect(X - 3, T + 9, 7, 1, '#b6ff2e');

  p.rect(X - 4, T + 9, 1, 4, red);
  p.rect(X - 5, T + 11, 1, 3, red);
  p.rect(X + 4, T + 9, 1, 4, redD);
  p.rect(X + 5, T + 11, 1, 3, redD);

  p.rect(X - 3, T + 13, 7, 1, '#9aa4ba');
  p.rect(X - 1, T + 14, 3, 1, '#5a6170');
}

export function moon(p: Px, cx: number, cy: number, r: number) {
  p.disc(cx, cy, r, '#cdd1dc');
  const craters: [number, number, number][] = [
    [-0.35, -0.25, 0.22], [0.32, 0.18, 0.27], [-0.1, 0.48, 0.15], [0.42, -0.42, 0.12], [-0.55, 0.2, 0.1],
  ];
  for (const [dx, dy, s] of craters) p.disc(cx + dx * r, cy + dy * r, Math.max(0.5, s * r), '#a2a7b6');
  if (r > 5) p.disc(cx - r * 0.42, cy - r * 0.45, r * 0.12, '#eef0f5');
}

export function earth(p: Px, cx: number, cy: number, r: number) {
  p.ring(cx, cy, r + 1, '#3d8bff');
  p.disc(cx, cy, r, '#2363d8');
  const land: [number, number, number][] = [
    [-0.35, -0.2, 0.38], [0.35, 0.3, 0.3], [0.15, -0.55, 0.22], [-0.2, 0.5, 0.2],
  ];
  for (const [dx, dy, s] of land) p.disc(cx + dx * r, cy + dy * r, Math.max(0.6, s * r), '#3fcf74');
  if (r > 3) {
    for (let i = 0; i < 4; i++) {
      p.rect(cx - r * 0.6 + i * r * 0.35, cy - r * 0.1 + (i % 2) * r * 0.4, Math.max(1, r * 0.3), 1, '#e8f3ff');
    }
  }
}

/** the acid-house smiley */
export function smiley(p: Px, cx: number, cy: number, r: number) {
  p.disc(cx, cy, r, '#ffe12e');
  p.dot(cx - r * 0.4, cy - r * 0.3, '#1a1206');
  p.dot(cx + r * 0.4, cy - r * 0.3, '#1a1206');
  for (let i = 0; i <= 4; i++) {
    const a = Math.PI * (0.2 + (0.6 * i) / 4);
    p.dot(cx + Math.cos(a) * r * 0.55, cy + Math.sin(a) * r * 0.55, '#1a1206');
  }
}

import * as THREE from 'three';

export interface TextTexOpts {
  text: string;
  sub?: string;
  color?: string;
  subColor?: string;
  font?: string;
  tracking?: number; // extra px between glyphs
  width?: number;
  height?: number;
}

const cache = new Map<string, { tex: THREE.CanvasTexture; aspect: number }>();

/** Crisp glowing signage rendered to a canvas — zero network dependencies. */
export function textTexture(opts: TextTexOpts) {
  const key = JSON.stringify(opts);
  const hit = cache.get(key);
  if (hit) return hit;

  const W = opts.width ?? 1024;
  const H = opts.height ?? 256;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, W, H);

  const color = opts.color ?? '#ffd9a0';
  const font = opts.font ?? `700 ${Math.floor(H * (opts.sub ? 0.46 : 0.58))}px "Arial Black", Arial, sans-serif`;
  g.font = font;
  g.textBaseline = 'middle';

  const tracking = opts.tracking ?? Math.floor(H * 0.22);
  // measure with tracking
  const chars = opts.text.split('');
  let total = 0;
  const widths = chars.map((ch) => {
    const w = g.measureText(ch).width;
    total += w + tracking;
    return w;
  });
  total -= tracking;

  let x = (W - total) / 2;
  const y = opts.sub ? H * 0.40 : H * 0.52;
  g.shadowColor = color;
  g.shadowBlur = H * 0.12;
  g.fillStyle = color;
  chars.forEach((ch, i) => {
    g.fillText(ch, x, y);
    x += widths[i] + tracking;
  });

  if (opts.sub) {
    g.font = `500 ${Math.floor(H * 0.14)}px Arial, sans-serif`;
    g.shadowBlur = H * 0.06;
    g.fillStyle = opts.subColor ?? 'rgba(255,255,255,0.85)';
    const sw = g.measureText(opts.sub).width;
    g.fillText(opts.sub, (W - sw) / 2, H * 0.78);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  const out = { tex, aspect: W / H };
  cache.set(key, out);
  return out;
}

/** stacked letters for vertical blade signage */
export function verticalTextTexture(text: string, color: string) {
  const key = `v|${text}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const cell = 256;
  const W = 256;
  const H = cell * text.length + 64;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.font = '900 188px "Arial Black", Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = color;
  g.shadowBlur = 26;
  g.fillStyle = color;
  text.split('').forEach((ch, i) => g.fillText(ch, W / 2, 32 + cell * i + cell / 2));
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const out = { tex, aspect: W / H };
  cache.set(key, out);
  return out;
}

function prng(seed: number) {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

let paving: THREE.CanvasTexture | null = null;
/** large-format honed stone slabs (1.2 × 0.6 m), stagger-laid. One tile = 4.8 m. */
export function pavingTexture() {
  if (paving) return paving;
  const S = 1024, rows = 8, sw = 256, sh = 128;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = prng(17);
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * (sw / 2);
    for (let k = -1; k < 5; k++) {
      const l = 46 + r() * 16;
      g.fillStyle = `rgb(${l},${l},${l + 6})`;
      g.fillRect(k * sw + off, row * sh, sw, sh);
    }
  }
  for (let i = 0; i < 16000; i++) {
    const a = r() * 0.12;
    g.fillStyle = r() < 0.5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a * 1.4})`;
    g.fillRect(r() * S, r() * S, 1.6, 1.6);
  }
  g.fillStyle = 'rgba(6,6,9,0.92)';
  for (let row = 0; row <= rows; row++) g.fillRect(0, row * sh - 1.5, S, 3);
  for (let row = 0; row < rows; row++) {
    const off = (row % 2) * (sw / 2);
    for (let k = 0; k <= 4; k++) g.fillRect(k * sw + off - 1.5, row * sh, 3, sh);
  }
  paving = new THREE.CanvasTexture(c);
  paving.wrapS = paving.wrapT = THREE.RepeatWrapping;
  paving.colorSpace = THREE.SRGBColorSpace;
  paving.anisotropy = 8;
  return paving;
}

let asphalt: THREE.CanvasTexture | null = null;
export function asphaltTexture() {
  if (asphalt) return asphalt;
  const S = 512;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const g = c.getContext('2d')!;
  const r = prng(41);
  g.fillStyle = '#1b1b20';
  g.fillRect(0, 0, S, S);
  for (let i = 0; i < 22000; i++) {
    const l = 10 + r() * 50;
    g.fillStyle = `rgba(${l},${l},${l + 4},${0.25 + r() * 0.4})`;
    g.fillRect(r() * S, r() * S, 1 + r() * 1.4, 1 + r() * 1.4);
  }
  for (let i = 0; i < 9; i++) {
    const x = r() * S, y = r() * S, rad = 30 + r() * 80;
    const gr = g.createRadialGradient(x, y, 0, x, y, rad);
    gr.addColorStop(0, 'rgba(0,0,0,0.25)');
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr;
    g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
  }
  asphalt = new THREE.CanvasTexture(c);
  asphalt.wrapS = asphalt.wrapT = THREE.RepeatWrapping;
  asphalt.colorSpace = THREE.SRGBColorSpace;
  asphalt.anisotropy = 8;
  return asphalt;
}

let radial: THREE.CanvasTexture | null = null;

/** soft radial falloff — used for lens flares, floor light pools, haze motes */
export function radialTexture() {
  if (radial) return radial;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.18, 'rgba(255,255,255,0.6)');
  grad.addColorStop(0.45, 'rgba(255,255,255,0.16)');
  grad.addColorStop(0.75, 'rgba(255,255,255,0.04)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  radial = new THREE.CanvasTexture(c);
  radial.colorSpace = THREE.SRGBColorSpace;
  return radial;
}

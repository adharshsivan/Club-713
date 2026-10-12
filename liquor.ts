import * as THREE from 'three';
import { lathe, type V2 } from './geo';

/**
 * Back-bar spirit bottles. Eight fictional brands (no real trademarks), each
 * with its own bottle shape, glass tint, liquid, closure and a printed paper
 * label wrapped around the front of the body. Labels face +Z (toward guests).
 */

export type Shape = 'tall' | 'slim' | 'flat' | 'round' | 'cognac';
type LabelStyle = 'classic' | 'modern' | 'noir' | 'scotch' | 'rum' | 'botanic' | 'cognac' | 'aperitivo';

export interface BrandSpec {
  id: string;
  name: string;
  sub: string;
  detail: string;
  shape: Shape;
  glass: string;
  glassOpacity: number;
  liquid: string;
  liquidGlow: number;
  cap: string;
  stopper: boolean;
  label: { bg: string; fg: string; accent: string; style: LabelStyle };
}

interface Dims { baseR: number; R: number; body: number; shoulder: number; Rn: number; neck: number; labelH: number }

const DIMS: Record<Shape, Dims> = {
  tall:   { baseR: 0.043, R: 0.043, body: 0.20, shoulder: 0.050, Rn: 0.016, neck: 0.090, labelH: 0.105 },
  slim:   { baseR: 0.036, R: 0.036, body: 0.22, shoulder: 0.050, Rn: 0.014, neck: 0.095, labelH: 0.110 },
  flat:   { baseR: 0.048, R: 0.050, body: 0.16, shoulder: 0.040, Rn: 0.020, neck: 0.065, labelH: 0.095 },
  round:  { baseR: 0.050, R: 0.053, body: 0.15, shoulder: 0.065, Rn: 0.020, neck: 0.055, labelH: 0.090 },
  cognac: { baseR: 0.044, R: 0.058, body: 0.14, shoulder: 0.060, Rn: 0.019, neck: 0.060, labelH: 0.085 },
};

export const BRANDS: BrandSpec[] = [
  {
    id: 'harrow', name: 'OLD HARROW', sub: 'KENTUCKY STRAIGHT BOURBON', detail: '45% ALC/VOL  ·  700 ML',
    shape: 'flat', glass: '#dfe7ea', glassOpacity: 0.28, liquid: '#b4601a', liquidGlow: 0.35,
    cap: '#1b1410', stopper: false,
    label: { bg: '#eadcb8', fg: '#6b1712', accent: '#b8862b', style: 'classic' },
  },
  {
    id: 'krona', name: 'KRONA', sub: 'PREMIUM VODKA', detail: 'TRIPLE DISTILLED  ·  40% ALC/VOL',
    shape: 'tall', glass: '#e4eef2', glassOpacity: 0.22, liquid: '#dfe8ec', liquidGlow: 0.18,
    cap: '#c9ced4', stopper: false,
    label: { bg: '#f3f5f7', fg: '#14284a', accent: '#c1272d', style: 'modern' },
  },
  {
    id: 'sanmiro', name: 'SAN MIRO', sub: 'TEQUILA REPOSADO', detail: '100% BLUE AGAVE  ·  38% ALC/VOL',
    shape: 'tall', glass: '#e2ebee', glassOpacity: 0.22, liquid: '#e4c97a', liquidGlow: 0.3,
    cap: '#2a1a10', stopper: true,
    label: { bg: '#121212', fg: '#e8b84a', accent: '#d9602c', style: 'noir' },
  },
  {
    id: 'dunmore', name: 'DUNMORE', sub: 'SINGLE MALT SCOTCH WHISKY', detail: 'AGED 12 YEARS  ·  43% ALC/VOL',
    shape: 'round', glass: '#cfdcd2', glassOpacity: 0.3, liquid: '#a24f16', liquidGlow: 0.33,
    cap: '#0f0f10', stopper: true,
    label: { bg: '#123a2c', fg: '#e3c06a', accent: '#e3c06a', style: 'scotch' },
  },
  {
    id: 'blacktide', name: 'BLACK TIDE', sub: 'SPICED RUM', detail: 'CARIBBEAN BLEND  ·  35% ALC/VOL',
    shape: 'round', glass: '#0b0b0c', glassOpacity: 0.94, liquid: '#1a0f0a', liquidGlow: 0.0,
    cap: '#8a1721', stopper: false,
    label: { bg: '#0d0d10', fg: '#f2efe6', accent: '#c8202f', style: 'rum' },
  },
  {
    id: 'juniper', name: 'JUNIPER & CO.', sub: 'LONDON DRY GIN', detail: 'SMALL BATCH  ·  41% ALC/VOL',
    shape: 'slim', glass: '#2f7d5a', glassOpacity: 0.62, liquid: '#cfe4d8', liquidGlow: 0.15,
    cap: '#b99a4a', stopper: false,
    label: { bg: '#dcebd8', fg: '#173f2c', accent: '#2f7d5a', style: 'botanic' },
  },
  {
    id: 'aurel', name: 'AUREL', sub: 'V.S.O.P. COGNAC', detail: 'FINE CHAMPAGNE  ·  40% ALC/VOL',
    shape: 'cognac', glass: '#e4e6e0', glassOpacity: 0.26, liquid: '#8a3a12', liquidGlow: 0.32,
    cap: '#bf9b3d', stopper: true,
    label: { bg: '#4a111c', fg: '#e8c872', accent: '#e8c872', style: 'cognac' },
  },
  {
    id: 'rosso', name: 'ROSSO', sub: 'BITTER APERITIVO', detail: 'MILANO  ·  25% ALC/VOL',
    shape: 'tall', glass: '#f0f2f2', glassOpacity: 0.2, liquid: '#a8101c', liquidGlow: 0.4,
    cap: '#161616', stopper: false,
    label: { bg: '#e9e6dc', fg: '#9c1220', accent: '#9c1220', style: 'aperitivo' },
  },
];

export const brandRadius = (b: BrandSpec) => DIMS[b.shape].R;

// ------------------------------------------------------------------ geometry
const radiusAt = (d: Dims, y: number) => {
  if (y <= 0) return d.baseR;
  if (y <= d.body) return d.baseR + (d.R - d.baseR) * Math.sin((y / d.body) * Math.PI * 0.5);
  const t = Math.min(1, (y - d.body) / d.shoulder);
  return d.Rn + (d.R - d.Rn) * Math.cos(t * Math.PI * 0.5);
};

/** closed lathe profile for glass (inset 0, full height) or the liquid inside (inset, fill) */
function bottleProfile(d: Dims, inset: number, fillTo: number | null): V2[] {
  const top = d.body + d.shoulder + d.neck;
  const y0 = inset > 0 ? 0.007 : 0;
  const yEnd = fillTo ?? top;
  const pts: V2[] = [[0, y0]];
  pts.push([Math.max(0.002, (d.baseR - inset) * 0.86), y0]);
  const steps = 14;
  for (let i = 0; i <= steps; i++) {
    const y = y0 + 0.004 + ((d.body + d.shoulder - y0 - 0.004) * i) / steps;
    if (y > yEnd) break;
    pts.push([Math.max(0.002, radiusAt(d, y) - inset), y]);
  }
  if (yEnd > d.body + d.shoulder) {
    pts.push([Math.max(0.002, d.Rn - inset), d.body + d.shoulder]);
    pts.push([Math.max(0.002, d.Rn - inset), yEnd]);
  }
  if (inset === 0) pts.push([d.Rn + 0.003, yEnd], [d.Rn + 0.003, yEnd + 0.007]);
  pts.push([0, inset === 0 ? yEnd + 0.007 : yEnd]);
  return pts;
}

// ------------------------------------------------------------------ labels
function fitText(g: CanvasRenderingContext2D, text: string, font: (s: number) => string, maxW: number, size: number) {
  let s = size;
  g.font = font(s);
  while (g.measureText(text).width > maxW && s > 8) {
    s -= 2;
    g.font = font(s);
  }
  return s;
}

function labelTexture(b: BrandSpec, aspect: number) {
  const W = 512;
  const H = Math.max(120, Math.round(W / aspect));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  const { bg, fg, accent, style } = b.label;
  const cx = W / 2;
  g.textAlign = 'center';
  g.textBaseline = 'middle';

  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // paper grain
  for (let i = 0; i < 700; i++) {
    g.fillStyle = Math.sin(i * 12.9898) > 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
    g.fillRect((Math.sin(i * 7.31) * 0.5 + 0.5) * W, (Math.sin(i * 3.77 + 2) * 0.5 + 0.5) * H, 2, 1);
  }

  const border = (inset: number, col: string, lw = 3) => {
    g.strokeStyle = col;
    g.lineWidth = lw;
    g.strokeRect(inset, inset, W - inset * 2, H - inset * 2);
  };
  const serif = (s: number) => `bold ${s}px Georgia, 'Times New Roman', serif`;
  const sans = (s: number) => `bold ${s}px 'Arial Black', Arial, sans-serif`;
  const light = (s: number) => `${s}px Arial, sans-serif`;
  const maxW = W * 0.64; // the middle of the wrap is what you actually see

  const text = (t: string, y: number, font: (s: number) => string, size: number, col: string, spacing = 0) => {
    const ctx = g as CanvasRenderingContext2D & { letterSpacing?: string };
    ctx.letterSpacing = `${spacing}px`;
    const s = fitText(g, t, font, maxW, size);
    g.fillStyle = col;
    g.font = font(s);
    g.fillText(t, cx, y);
    ctx.letterSpacing = '0px';
  };
  const rule = (y: number, col: string, w = 0.5) => {
    g.fillStyle = col;
    g.fillRect(cx - (W * w) / 2, y, W * w, 2);
  };
  const star = (x: number, y: number, r: number, col: string) => {
    g.fillStyle = col;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.fill();
  };

  switch (style) {
    case 'classic': {
      border(10, accent, 4);
      border(20, fg, 1.5);
      text('EST. 1894', H * 0.2, light, 22, fg, 4);
      text(b.name, H * 0.43, serif, 78, fg, 2);
      rule(H * 0.57, accent, 0.45);
      text(b.sub, H * 0.69, serif, 22, fg, 2);
      text(b.detail, H * 0.85, light, 17, fg, 1);
      star(cx - W * 0.27, H * 0.43, 12, accent);
      star(cx + W * 0.27, H * 0.43, 12, accent);
      break;
    }
    case 'modern': {
      g.fillStyle = fg;
      g.fillRect(0, 0, W, H * 0.34);
      text(b.name, H * 0.17, sans, 64, '#ffffff', 12);
      // little crown
      g.fillStyle = accent;
      g.beginPath();
      g.moveTo(cx - 24, H * 0.62);
      g.lineTo(cx - 24, H * 0.46);
      g.lineTo(cx - 12, H * 0.54);
      g.lineTo(cx, H * 0.43);
      g.lineTo(cx + 12, H * 0.54);
      g.lineTo(cx + 24, H * 0.46);
      g.lineTo(cx + 24, H * 0.62);
      g.fill();
      text(b.sub, H * 0.76, sans, 28, fg, 5);
      text(b.detail, H * 0.9, light, 16, fg, 1);
      break;
    }
    case 'noir': {
      border(12, accent, 2);
      g.strokeStyle = accent;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, H * 0.27, 28, 0, Math.PI * 2);
      g.stroke();
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.beginPath();
        g.moveTo(cx + Math.cos(a) * 34, H * 0.27 + Math.sin(a) * 34);
        g.lineTo(cx + Math.cos(a) * 46, H * 0.27 + Math.sin(a) * 46);
        g.stroke();
      }
      g.fillStyle = b.label.accent;
      g.beginPath();
      g.arc(cx, H * 0.27, 14, 0, Math.PI * 2);
      g.fill();
      text(b.name, H * 0.58, sans, 58, fg, 8);
      text(b.sub, H * 0.76, light, 24, accent, 5);
      text(b.detail, H * 0.9, light, 16, fg, 1);
      break;
    }
    case 'scotch': {
      border(10, accent, 3);
      text(b.name, H * 0.22, serif, 66, fg, 6);
      rule(H * 0.35, accent, 0.5);
      text(b.sub, H * 0.45, serif, 20, fg, 2);
      g.strokeStyle = accent;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, H * 0.7, 36, 0, Math.PI * 2);
      g.stroke();
      text('12', H * 0.7, serif, 44, fg);
      text('YEARS', H * 0.7 + 36 + 14, light, 14, fg, 4);
      text(b.detail, H * 0.94, light, 14, fg, 1);
      break;
    }
    case 'rum': {
      g.strokeStyle = accent;
      g.lineWidth = 3;
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        for (let x = 0; x <= W; x += 8) {
          const y = H * (0.12 + k * 0.05) + Math.sin(x * 0.045 + k) * 5;
          if (x === 0) g.moveTo(x, y);
          else g.lineTo(x, y);
        }
        g.stroke();
      }
      text(b.name, H * 0.48, sans, 66, fg, 6);
      text(b.sub, H * 0.69, sans, 28, accent, 8);
      text(b.detail, H * 0.88, light, 16, fg, 1);
      break;
    }
    case 'botanic': {
      border(14, accent, 3);
      g.strokeStyle = fg;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(cx, H * 0.26, 24, 0, Math.PI * 2);
      g.stroke();
      g.fillStyle = accent;
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.beginPath();
        g.ellipse(cx + Math.cos(a) * 12, H * 0.26 + Math.sin(a) * 12, 7, 3.5, a, 0, Math.PI * 2);
        g.fill();
      }
      text(b.name, H * 0.55, serif, 50, fg, 2);
      text(b.sub, H * 0.74, serif, 24, fg, 3);
      text(b.detail, H * 0.9, light, 15, fg, 1);
      break;
    }
    case 'cognac': {
      border(10, accent, 3);
      border(20, accent, 1);
      star(cx, H * 0.2, 14, accent);
      text(b.name, H * 0.45, serif, 76, fg, 10);
      rule(H * 0.6, accent, 0.4);
      text(b.sub, H * 0.73, serif, 24, fg, 3);
      text(b.detail, H * 0.88, light, 15, fg, 1);
      break;
    }
    case 'aperitivo': {
      g.fillStyle = fg;
      g.fillRect(0, H * 0.4, W, H * 0.2);
      text(b.name, H * 0.5, sans, 62, '#f4efe4', 14);
      text('MILANO', H * 0.2, serif, 26, fg, 8);
      text(b.sub, H * 0.76, sans, 24, fg, 4);
      text(b.detail, H * 0.9, light, 16, fg, 1);
      break;
    }
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// ------------------------------------------------------------------ assembled parts
export interface LiquorParts {
  glass: THREE.BufferGeometry;
  liquid: THREE.BufferGeometry;
  cap: THREE.BufferGeometry;
  label: THREE.BufferGeometry;
  glassMat: THREE.MeshPhysicalMaterial;
  liquidMat: THREE.MeshStandardMaterial;
  capMat: THREE.MeshStandardMaterial;
  labelMat: THREE.MeshStandardMaterial;
}

const cache = new Map<string, LiquorParts>();

export function liquorParts(b: BrandSpec): LiquorParts {
  const hit = cache.get(b.id);
  if (hit) return hit;

  const d = DIMS[b.shape];
  const top = d.body + d.shoulder + d.neck;
  const fill = d.body + d.shoulder + d.neck * 0.22;

  const glass = lathe(bottleProfile(d, 0, null), 28);
  const liquid = lathe(bottleProfile(d, 0.0045, fill), 24);

  // closure: screw cap or cork stopper with a wider head
  const capH = b.stopper ? 0.04 : 0.03;
  const capProfile: V2[] = b.stopper
    ? [[0, 0], [d.Rn + 0.003, 0], [d.Rn + 0.003, capH * 0.45], [d.Rn + 0.011, capH * 0.5], [d.Rn + 0.011, capH], [0, capH]]
    : [[0, 0], [d.Rn + 0.004, 0], [d.Rn + 0.004, capH], [0, capH]];
  const cap = lathe(capProfile, 20).translate(0, top - 0.012, 0);

  // label: partial cylinder wrapped over the front of the body
  const labelY = d.body * 0.52;
  const rl = radiusAt(d, labelY) + 0.0014;
  const arc = 3.4;
  const aspect = (rl * arc) / d.labelH;
  const label = new THREE.CylinderGeometry(rl, rl, d.labelH, 36, 1, true, -arc / 2, arc).translate(0, labelY, 0);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: b.glass, transparent: true, opacity: b.glassOpacity, roughness: 0.05, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.5, depthWrite: false,
  });
  const liquidMat = new THREE.MeshStandardMaterial({
    color: b.liquid, roughness: 0.18, metalness: 0,
    emissive: new THREE.Color(b.liquid), emissiveIntensity: b.liquidGlow,
  });
  const capMat = new THREE.MeshStandardMaterial({ color: b.cap, roughness: 0.4, metalness: b.stopper ? 0.1 : 0.7 });
  const map = labelTexture(b, aspect);
  const labelMat = new THREE.MeshStandardMaterial({
    map, roughness: 0.75, metalness: 0,
    emissive: new THREE.Color('#ffffff'), emissiveMap: map, emissiveIntensity: 0.16,
  });

  const out: LiquorParts = { glass, liquid, cap, label, glassMat, liquidMat, capMat, labelMat };
  cache.set(b.id, out);
  return out;
}

import { useMemo } from 'react';
import * as THREE from 'three';
import { useLightTheme } from './lightTheme';
import { matBlack, matBrass } from './materials';
import { ROOM } from './collision';

// Banners hang from brass rails on cords from the ceiling, flush to the long
// east and west walls. They sit well above head height, so they never block movement.

const CEILING_Y = ROOM.h;      // cords run up to the ceiling
const RAIL_Y = 8.3;            // rail height
const WIDTH = 1.2;
const HEIGHT = 3.5;
const WALL_GAP = 0.62;         // distance from the wall face into the room
const WALL_X = ROOM.x - WALL_GAP;
const SLOTS = [-9, -4.5, 0];   // z positions along each wall (clear of the stairs and entry)

type Palette = [panel: string, accent: string];

/** scale a #rrggbb colour toward black */
function shade(hex: string, k: number) {
  return `#${new THREE.Color(hex).multiplyScalar(k).getHexString()}`;
}

const textureCache = new Map<string, THREE.CanvasTexture>();

/** woven-satin panel with a halo emblem, equaliser bars, chevrons and a hem band */
function bannerTexture(panel: string, accent: string) {
  const key = `${panel}|${accent}`;
  const hit = textureCache.get(key);
  if (hit) return hit;

  const W = 256;
  const H = 768;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;

  const grad = g.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, panel);
  grad.addColorStop(1, shade(panel, 0.5));
  g.fillStyle = grad;
  g.fillRect(0, 0, W, H);

  // fine vertical pinstripes, like woven satin
  g.fillStyle = 'rgba(255,255,255,0.035)';
  for (let x = 0; x < W; x += 8) g.fillRect(x, 0, 2, H);

  // emblem: halo rings over an equaliser
  const cx = W / 2;
  const cy = 250;
  g.strokeStyle = accent;
  g.fillStyle = accent;
  g.lineWidth = 10;
  g.beginPath();
  g.arc(cx, cy, 80, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = 4;
  g.beginPath();
  g.arc(cx, cy, 58, 0, Math.PI * 2);
  g.stroke();
  g.beginPath();
  g.arc(cx, cy, 9, 0, Math.PI * 2);
  g.fill();

  const bars = [0.45, 0.8, 0.6, 1, 0.7, 0.5];
  const bw = 14;
  const gap = 8;
  const base = cy + 200;
  bars.forEach((h, i) => {
    const x = cx - (bars.length * (bw + gap) - gap) / 2 + i * (bw + gap);
    const bh = h * 90;
    g.fillRect(x, base - bh, bw, bh);
  });

  // chevrons near the foot
  g.lineWidth = 8;
  g.lineCap = 'round';
  g.lineJoin = 'round';
  for (let k = 0; k < 2; k++) {
    const y = 540 + k * 46;
    g.beginPath();
    g.moveTo(56, y);
    g.lineTo(cx, y + 40);
    g.lineTo(W - 56, y);
    g.stroke();
  }

  // hem band with an accent seam
  g.fillStyle = shade(panel, 0.3);
  g.fillRect(0, H - 34, W, 34);
  g.fillStyle = accent;
  g.fillRect(0, H - 40, W, 6);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

/** flat cloth with soft vertical pleats, deepest toward the rail and flat at the edges */
function clothGeometry() {
  const g = new THREE.PlaneGeometry(WIDTH, HEIGHT, 36, 64);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const u = x / WIDTH + 0.5;   // 0 → 1 across the width
    const t = y / HEIGHT + 0.5;  // 0 at the hem → 1 at the rail
    const amp = 0.022 + 0.01 * t;
    p.setZ(i, Math.sin(u * Math.PI * 2 * 5) * amp * (0.6 + 0.4 * t));
  }
  g.computeVertexNormals();
  return g;
}

function Banner({
  x, z, rotationY, panel, accent,
}: { x: number; z: number; rotationY: number; panel: string; accent: string }) {
  const geo = useMemo(clothGeometry, []);
  const map = useMemo(() => bannerTexture(panel, accent), [panel, accent]);
  const mat = useMemo(
    () => new THREE.MeshPhysicalMaterial({
      map,
      emissiveMap: map,
      emissive: new THREE.Color('#ffffff'),
      emissiveIntensity: 0.22,
      roughness: 0.78,
      metalness: 0,
      sheen: 0.7,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color(accent),
      side: THREE.DoubleSide,
    }),
    [map, accent],
  );

  const clothCenterY = RAIL_Y - 0.06 - HEIGHT / 2;
  const hemY = RAIL_Y - 0.06 - HEIGHT;

  return (
    <group position={[x, 0, z]} rotation={[0, rotationY, 0]}>
      <mesh geometry={geo} material={mat} position={[0, clothCenterY, 0]} />

      {/* dark sleeve wrapping the top of the cloth around the rail */}
      <mesh position={[0, RAIL_Y, 0]} material={matBlack}>
        <boxGeometry args={[WIDTH, 0.16, 0.05]} />
      </mesh>

      {/* brass rail with finials at each end */}
      <mesh position={[0, RAIL_Y, 0]} rotation={[0, 0, Math.PI / 2]} material={matBrass}>
        <cylinderGeometry args={[0.022, 0.022, WIDTH + 0.6, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * (WIDTH / 2 + 0.3), RAIL_Y, 0]} material={matBrass}>
          <sphereGeometry args={[0.045, 14, 10]} />
        </mesh>
      ))}

      {/* two cords running up to the ceiling */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.42, (RAIL_Y + CEILING_Y) / 2, 0]} material={matBlack}>
          <cylinderGeometry args={[0.008, 0.008, CEILING_Y - RAIL_Y, 6]} />
        </mesh>
      ))}

      {/* weighted brass hem bar keeps the banner hanging straight */}
      <mesh position={[0, hemY - 0.02, 0]} rotation={[0, 0, Math.PI / 2]} material={matBrass}>
        <cylinderGeometry args={[0.018, 0.018, WIDTH - 0.02, 10]} />
      </mesh>
    </group>
  );
}

export function Banners() {
  const theme = useLightTheme();
  const palettes: Palette[] = [
    [shade(theme.pulseA, 0.32), theme.haloA],
    [shade(theme.cool, 0.32), theme.floorA],
    [shade(theme.pulseB, 0.32), theme.warm],
  ];

  return (
    <group>
      {SLOTS.map((z, i) => {
        const east = palettes[i % palettes.length];
        const west = palettes[(i + 1) % palettes.length];
        return (
          <group key={z}>
            <Banner x={WALL_X} z={z} rotationY={-Math.PI / 2} panel={east[0]} accent={east[1]} />
            <Banner x={-WALL_X} z={z} rotationY={Math.PI / 2} panel={west[0]} accent={west[1]} />
          </group>
        );
      })}
    </group>
  );
}

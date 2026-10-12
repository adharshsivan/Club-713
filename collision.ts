// 713 traversal system: platforms (walkable heights) + colliders (blockers)
import {
  FX, DOOR, VEST, CANOPY, PARK, PARK_CARS, CAR_L, CAR_W, TREES, BENCHES,
  LAMP_Z, LAMP_X, LAMP_X_FAR, BOLLARDS,
  POSTS_A, POSTS_B, PODIUM, WORLD,
} from './exterior/layout';
import { MEZZANINE_LAYOUT as M, stairHeightAt } from './mezzanineLayout';
import { STAGE } from './stageLayout';

export const ROOM = { x: 17.5, z: 12.75, h: 9 };
export const PLAYER_R = 0.35;
export const STEP_UP = 0.55;

interface Platform {
  x1: number; x2: number; z1: number; z2: number;
  h: (x: number, z: number) => number;
  solidBelow: boolean; // true = solid mass (can't walk underneath/into it)
}

export const MEZZ_Y = M.elevation;
export const STAGE_Y = 0.9;

const stepRamp = (z: number) => STAGE_Y * ((-6.2 - z) / 1.4);

const platforms: Platform[] = [
  // performance stage
  { x1: -STAGE.halfWidth, x2: STAGE.halfWidth, z1: STAGE.rearZ, z2: STAGE.frontZ, h: () => STAGE_Y, solidBelow: true },
  // stage front steps (center)
  { x1: -2.2, x2: 2.2, z1: -7.6, z2: -6.2, h: (_x, z) => stepRamp(z), solidBelow: true },
  // mezzanine deck (walk under it freely)
  { x1: -ROOM.x, x2: ROOM.x, z1: M.frontZ, z2: ROOM.z, h: () => MEZZ_Y, solidBelow: false },
  // grand stairs east / west
  { x1: M.stairInnerX, x2: ROOM.x, z1: M.stairStartZ, z2: M.frontZ, h: (_x, z) => stairHeightAt(z), solidBelow: true },
  { x1: -ROOM.x, x2: -M.stairInnerX, z1: M.stairStartZ, z2: M.frontZ, h: (_x, z) => stairHeightAt(z), solidBelow: true },
];

interface Collider {
  x1: number; x2: number; z1: number; z2: number;
  y1?: number; y2?: number; // active only while player's feet are inside this range
}

export const colliders: Collider[] = [
  // ---- narrow DJ console, with clear access behind, on both sides, and in front
  {
    x1: -STAGE.podiumHalfWidth, x2: STAGE.podiumHalfWidth,
    z1: STAGE.podiumZ - STAGE.podiumHalfDepth,
    z2: STAGE.podiumZ + STAGE.podiumHalfDepth,
    y1: STAGE_Y - STEP_UP,
  },
  // ---- sub stacks flanking stage
  { x1: 8.7, x2: 11.3, z1: -11.6, z2: -8.7 },
  { x1: -11.3, x2: -8.7, z1: -11.6, z2: -8.7 },
  // ---- east wall booths (3), pulled clear of the stair approach
  { x1: 15.05, x2: ROOM.x, z1: -10.0, z2: -7.0, y2: 2.5 },
  { x1: 15.05, x2: ROOM.x, z1: -6.5, z2: -3.5, y2: 2.5 },
  { x1: 15.05, x2: ROOM.x, z1: -3.0, z2: 0.0, y2: 2.5 },
  // ---- booth-corner planter (south of the booths, clear of the stage footprint)
  { x1: 16.3, x2: 17.5, z1: -9.4, z2: -8.6, y2: 1.8 },
  // ---- halo columns
  { x1: 9.1, x2: 9.9, z1: 2.1, z2: 2.9 }, { x1: -9.9, x2: -9.1, z1: 2.1, z2: 2.9 },
  { x1: 9.1, x2: 9.9, z1: -4.9, z2: -4.1 }, { x1: -9.9, x2: -9.1, z1: -4.9, z2: -4.1 },
  // ---- west wall planters
  { x1: -17.5, x2: -16.3, z1: -12.5, z2: -11.5, y2: 1.8 },
  { x1: -17.5, x2: -16.3, z1: -0.1, z2: 0.9, y2: 1.8 },
  // ---- curved sofa islands flanking the dance floor (clear of the stair runs)
  { x1: 7.25, x2: 10.3, z1: -2.65, z2: 1.05, y2: 2.5 },
  { x1: -10.3, x2: -7.25, z1: -2.65, z2: 1.05, y2: 2.5 },
  // ---- partition closing the east under-stair pocket (washroom + under-stair doors)
  { x1: M.stairInnerX - 0.02, x2: ROOM.x, z1: M.frontZ, z2: ROOM.z, y2: MEZZ_Y - 0.4 },
  // ---- east under-mezz lounge pod (the entrance-side pod is removed)
  { x1: 9.95, x2: 13.1, z1: 9.3, z2: 12.4, y2: 2.6 },
  // ---- under-balcony bar: counter + back bar, its stool row, then end-cap lamps + planters
  { x1: -5.7, x2: 5.7, z1: 10.2, z2: ROOM.z, y2: 2.6 },
  { x1: -5.5, x2: 5.5, z1: 9.55, z2: 10.2, y2: 2.0 },
  { x1: -7.5, x2: -7.1, z1: 12.1, z2: 12.5, y2: 1.8 },
  { x1: 7.1, x2: 7.5, z1: 12.1, z2: 12.5, y2: 1.8 },
  { x1: -8.72, x2: -7.88, z1: 11.88, z2: 12.72, y2: 1.8 },
  { x1: 7.88, x2: 8.72, z1: 11.88, z2: 12.72, y2: 1.8 },
  // ---- mezzanine glass balustrade (gaps where the stairs land)
  {
    x1: -M.railX, x2: M.railX,
    z1: M.frontZ - M.guardHalfWidth, z2: M.frontZ + M.guardHalfWidth,
    y1: MEZZ_Y - STEP_UP, y2: MEZZ_Y + M.railHeight,
  },
  // ---- mezz VIP sofas + armchairs along the back wall (upstairs)
  { x1: 2.5, x2: 13.9, z1: 11.7, z2: ROOM.z, y1: 2.5 },
  { x1: -13.9, x2: -2.5, z1: 11.7, z2: ROOM.z, y1: 2.5 },
  { x1: -2.0, x2: 2.0, z1: 11.45, z2: ROOM.z, y1: 2.5 },
  // ---- mezz poseur tables + their stools
  { x1: -7.0, x2: -5.0, z1: 9.4, z2: 11.1, y1: 2.5 },
  { x1: -1.0, x2: 1.0, z1: 9.4, z2: 11.1, y1: 2.5 },
  { x1: 5.0, x2: 7.0, z1: 9.4, z2: 11.1, y1: 2.5 },
  // ---- slim stair guards; both landings remain open beyond the balcony corners
  ...[-1, 1].map((side) => ({
    x1: side * M.railX - M.guardHalfWidth,
    x2: side * M.railX + M.guardHalfWidth,
    z1: M.stairStartZ, z2: M.frontZ,
    y2: MEZZ_Y + M.railHeight,
  })),
];

function inBox(x: number, z: number, b: { x1: number; x2: number; z1: number; z2: number }, r = 0) {
  return x > b.x1 - r && x < b.x2 + r && z > b.z1 - r && z < b.z2 + r;
}

/** best walkable height at (x,z) for a player whose feet are at footY */
export function groundHeight(x: number, z: number, footY: number) {
  let g = 0;
  for (const p of platforms) {
    if (!inBox(x, z, p)) continue;
    const h = p.h(x, z);
    if (footY >= h - STEP_UP && h > g) g = h;
  }
  return g;
}

// ---------------------------------------------------------------- building envelope + exterior
const exteriorColliders: Collider[] = [
  // interior wall + exterior shell; the west wall has the entry gap
  { x1: FX, x2: -17.5, z1: -13.5, z2: DOOR.z1 },
  { x1: FX, x2: -17.5, z1: DOOR.z2, z2: 13.5 },
  { x1: FX - 0.01, x2: -17.5, z1: DOOR.z1, z2: DOOR.z2, y1: 2.0 }, // no walking out of the mezzanine
  { x1: 17.5, x2: 18.3, z1: -13.5, z2: 13.5 },
  { x1: FX, x2: 18.3, z1: 12.75, z2: 13.5 },
  { x1: FX, x2: 18.3, z1: -13.5, z2: -12.75 },
  // threshold tunnel walls
  { x1: VEST.x1, x2: FX, z1: VEST.z1, z2: DOOR.z1 },
  { x1: VEST.x1, x2: FX, z1: DOOR.z2, z2: VEST.z2 },
  // canopy support columns (clear of the door run)
  ...[CANOPY.z1 + 1.05, CANOPY.z2 - 1.05].map((z) => ({
    x1: CANOPY.x1 + 0.19, x2: CANOPY.x1 + 0.91, z1: z - 0.36, z2: z + 0.36,
  })),
  // car park: the pad is walkable; only the parked cars and the west kerb block
  ...PARK_CARS.map((c) => ({
    x1: c.x - CAR_L / 2, x2: c.x + CAR_L / 2,
    z1: c.z - CAR_W / 2, z2: c.z + CAR_W / 2,
  })),
  { x1: PARK.x1 - 0.18, x2: PARK.x1 + 0.18, z1: PARK.z1, z2: PARK.z2, y2: 1.2 },
  // planters, benches, lamps, bollards
  ...TREES.map(([x, z]) => ({ x1: x - 1.12, x2: x + 1.12, z1: z - 1.12, z2: z + 1.12 })),
  ...BENCHES.map(([x, z]) => ({ x1: x - 0.32, x2: x + 0.32, z1: z - 1.32, z2: z + 1.32 })),
  ...LAMP_Z.flatMap((z) => [LAMP_X, LAMP_X_FAR].map((x) => ({ x1: x - 0.18, x2: x + 0.18, z1: z - 0.18, z2: z + 0.18 }))),
  ...BOLLARDS.map(([x, z]) => ({ x1: x - 0.1, x2: x + 0.1, z1: z - 0.1, z2: z + 0.1 })),
  // velvet-rope queue lines + host podium
  { x1: Math.min(...POSTS_A.xs) - 0.1, x2: Math.max(...POSTS_A.xs) + 0.1, z1: POSTS_A.z - 0.08, z2: POSTS_A.z + 0.08 },
  { x1: Math.min(...POSTS_B.xs) - 0.1, x2: Math.max(...POSTS_B.xs) + 0.1, z1: POSTS_B.z - 0.08, z2: POSTS_B.z + 0.08 },
  { x1: PODIUM.x - 0.38, x2: PODIUM.x + 0.38, z1: PODIUM.z - 0.32, z2: PODIUM.z + 0.32 },
];
colliders.push(...exteriorColliders);

function blockedAt(x: number, z: number, footY: number) {
  // world bounds (plaza garden walls / far kerb)
  if (x < WORLD.x1 + PLAYER_R || x > WORLD.x2 - PLAYER_R || z < WORLD.z1 + PLAYER_R || z > WORLD.z2 - PLAYER_R) return true;
  // solid platform masses (stage body, stair mass) when player is below them
  for (const p of platforms) {
    if (!p.solidBelow) continue;
    if (!inBox(x, z, p, PLAYER_R * 0.6)) continue;
    const h = p.h(Math.min(Math.max(x, p.x1), p.x2), Math.min(Math.max(z, p.z1), p.z2));
    if (footY < h - STEP_UP) return true;
  }
  // furniture / rails
  for (const c of colliders) {
    const y1 = c.y1 ?? -1e9, y2 = c.y2 ?? 1e9;
    if (footY + 0.1 < y1 || footY + 0.1 > y2) continue;
    if (inBox(x, z, c, PLAYER_R)) return true;
  }
  return false;
}

/** axis-separated movement resolution; returns the new (x, z) */
export function resolveMove(x: number, z: number, dx: number, dz: number, footY: number): [number, number] {
  let nx = x, nz = z;
  if (!blockedAt(x + dx, z, footY)) nx = x + dx;
  if (!blockedAt(nx, z + dz, footY)) nz = z + dz;
  return [nx, nz];
}

/** arrive on the plaza, facing the glowing entrance */
export const SPAWN = { x: -40, z: DOOR.zc, yaw: -Math.PI / 2 };

export interface Location { id: string; label: string; x: number; z: number; y: number; yaw: number }
export const LOCATIONS: Location[] = [
  { id: 'plaza', label: 'PLAZA', x: -40, z: DOOR.zc, y: 0, yaw: -Math.PI / 2 },
  { id: 'floor', label: 'DANCE FLOOR', x: 0, z: 5.6, y: 0, yaw: 0 },
  { id: 'stage', label: 'DJ STAGE', x: 0, z: -8.55, y: STAGE_Y, yaw: Math.PI },
  { id: 'bar', label: 'BAR', x: 0, z: 8.3, y: 0, yaw: Math.PI },
  { id: 'vip', label: 'VIP', x: 0, z: 9.0, y: MEZZ_Y, yaw: 0 },
];

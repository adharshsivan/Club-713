// 713 exterior: single source of truth for visuals AND collision.
// The hero façade faces west (-X). The interior entry sits under the mezzanine.

export const FX = -18.3;          // outer face of the west façade
export const SHELL_TOP = 11;      // parapet height
export const DOOR = { z1: 9.3, z2: 11.5, h: 2.5, zc: 10.4, x: -18.05 };
export const VEST = { x1: -21.8, z1: 8.9, z2: 11.9, h: 2.9 };   // illuminated threshold tunnel
export const CANOPY = { x1: -25.6, z1: 5.5, z2: 14.5, y: 3.8 };

// guest car park: bays along the west edge, drive aisle on the club side
export const PARK = {
  x1: -28.6, x2: -20.4, z1: -8.6, z2: 3.4,
  bayDepth: 4.9,  // bays run from x1 eastward; the remainder is the aisle
  bays: 4,
  kerbH: 0.14,
};

export const CAR_L = 4.3;   // body length (nose-to-tail, along x)
export const CAR_W = 1.85;  // body width (along z)

/** parked cars: nosed in toward the west kerb, tails facing the aisle */
export const PARK_CARS: { x: number; z: number; kind: number; color: string }[] = (() => {
  const span = (PARK.z2 - PARK.z1) / PARK.bays;
  const colors = ['#7d1f2a', '#1d3566', '#24262b', '#9ea3a8'];
  // one bay deliberately left empty so the park doesn't read as a solid wall of cars
  return [0, 1, 3].map((i, k) => ({
    x: PARK.x1 + 0.55 + CAR_L / 2,
    z: PARK.z1 + (i + 0.5) * span,
    kind: k % 3,
    color: colors[i % colors.length],
  }));
})();

export const PLAZA = { x1: -44, x2: 24, z1: -32, z2: 32 };
export const STREET = { x1: -56, x2: -44 };
export const WORLD = { x1: -59.4, x2: 23.5, z1: -31.5, z2: 31.5 };

export const TREES: [number, number][] = [
  [-38.5, -24], [-38.5, -12.5], [-38.5, -1], [-38.5, 21.5], [-38.5, 29],
  [-24, -19], [-24, 19], [-6, -19], [8, -19], [-6, 19], [8, 19],
];
export const BENCHES: [number, number][] = [[-38.5, -18.2], [-38.5, -6.8], [-38.5, 25.25]];

export const LAMP_Z = [-28, -16, -3, 21, 30];
export const LAMP_X = -43.4;
export const LAMP_X_FAR = -56.6;

export const BOLLARDS: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let i = 0; i < 29; i++) {
    const z = -30.8 + i * 2.2;
    if (Math.abs(z - DOOR.zc) < 2.8) continue;
    if (LAMP_Z.some((l) => Math.abs(l - z) < 0.9)) continue;
    out.push([-43.7, z]);
  }
  return out;
})();

export const POSTS_A = { z: 8.2, xs: [-22.6, -24.1, -25.6, -27.1, -28.6, -30.1, -31.6] };
export const POSTS_B = { z: 12.6, xs: [-22.6, -24.1, -25.6, -27.1] };
export const PODIUM = { x: -23.2, z: 13.6 };

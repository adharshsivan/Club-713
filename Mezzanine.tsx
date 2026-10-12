import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ROOM, MEZZ_Y } from './collision';
import { MEZZANINE_LAYOUT as M } from './mezzanineLayout';
import { MezzanineRailing } from './MezzanineRailing';
import {
  matFloorDark, matBronze, matWalnut, em, PAL,
} from './materials';
import { Pendant } from './Pendant';
import {
  Sofa, Armchair, PedestalTable, TableTop, Stools, Planter, WallSconce,
  type StoolItem,
} from './furn/Furniture';
import { FAB, LEATHER } from './furn/fabrics';
import type { Arms } from './furn/pieces';
import { useLightTheme } from './lightTheme';

const tmp = new THREE.Object3D();
const STEPS = M.stairSteps;
const RISE = MEZZ_Y / STEPS;
const RUN = (M.frontZ - M.stairStartZ) / STEPS;
const STAIR_WIDTH = ROOM.x - M.stairInnerX;

function Stairs({ side }: { side: 1 | -1 }) {
  const stepsRef = useRef<THREE.InstancedMesh>(null!);
  const noseRef = useRef<THREE.InstancedMesh>(null!);
  const cx = side * (M.stairInnerX + ROOM.x) / 2;
  useLayoutEffect(() => {
    for (let i = 0; i < STEPS; i++) {
      const top = (i + 1) * RISE;
      const z = M.stairStartZ + (i + 0.5) * RUN;
      tmp.position.set(cx, top / 2, z);
      tmp.scale.set(STAIR_WIDTH, top, RUN);
      tmp.updateMatrix();
      stepsRef.current.setMatrixAt(i, tmp.matrix);
      tmp.position.set(cx, top + 0.008, M.stairStartZ + i * RUN + 0.03);
      tmp.scale.set(STAIR_WIDTH, 0.016, 0.035);
      tmp.updateMatrix();
      noseRef.current.setMatrixAt(i, tmp.matrix);
    }
    stepsRef.current.instanceMatrix.needsUpdate = true;
    noseRef.current.instanceMatrix.needsUpdate = true;
  }, [cx]);
  return (
    <group>
      <instancedMesh ref={stepsRef} args={[undefined, undefined, STEPS]} material={matFloorDark}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={noseRef} args={[undefined, undefined, STEPS]} material={em(PAL.warmWhite, 1.3)}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}

// ------------------------------------------------------------------ VIP lounge
const TABLE_Z = 10.5;
const POSEUR_H = 1.06;

/** [local x of module, arm placement] — sofas face -Z so local X is mirrored in world */
const EAST: { x: number; arms: Arms; pillows: number }[] = [
  { x: 4.5, arms: 'right', pillows: 3 },
  { x: 8.2, arms: 'none', pillows: 2 },
  { x: 11.9, arms: 'left', pillows: 3 },
];
const WEST: { x: number; arms: Arms; pillows: number }[] = [
  { x: -4.5, arms: 'left', pillows: 3 },
  { x: -8.2, arms: 'none', pillows: 2 },
  { x: -11.9, arms: 'right', pillows: 3 },
];

function VIPLounge() {
  const theme = useLightTheme();
  // three stools per poseur table, backs turned away from the table
  const stools = useMemo<StoolItem[]>(() => {
    const out: StoolItem[] = [];
    for (const tx of [-6, 0, 6]) {
      for (const a of [-1.1, 0, 1.1]) {
        out.push({ x: tx + 0.74 * Math.sin(a), z: TABLE_Z - 0.74 * Math.cos(a), rot: -a });
      }
    }
    return out;
  }, []);

  return (
    <group position={[0, MEZZ_Y, 0]}>
      {/* modular channel-tufted sofas along the back wall */}
      {EAST.map((m) => (
        <Sofa
          key={m.x} L={3.6} D={0.95} arms={m.arms} pillows={m.pillows}
          fabric={FAB.plum} accent={m.pillows === 2 ? FAB.rust : FAB.champagne}
          position={[m.x, 0, 12.25]} rotationY={Math.PI} lift={0.034}
        />
      ))}
      {WEST.map((m) => (
        <Sofa
          key={m.x} L={3.6} D={0.95} arms={m.arms} pillows={m.pillows}
          fabric={FAB.ink} accent={m.pillows === 2 ? FAB.rust : FAB.champagne}
          position={[m.x, 0, 12.25]} rotationY={Math.PI} lift={0.034}
        />
      ))}

      {/* barrel armchairs flanking the centre aisle, angled toward it */}
      <Armchair fabric={FAB.emerald} position={[-1.4, 0, 12.0]} rotationY={Math.PI - 0.38} />
      <Armchair fabric={FAB.emerald} position={[1.4, 0, 12.0]} rotationY={Math.PI + 0.38} />
      <PedestalTable R={0.3} h={0.52} top="marble" position={[0, 0, 12.15]} />
      <TableTop position={[0, 0.52, 12.15]} scale={0.6} />

      {/* poseur tables with leather stools */}
      {[-6, 0, 6].map((x, i) => (
        <group key={x}>
          <PedestalTable R={0.46} h={POSEUR_H} top="wood" position={[x, 0, TABLE_Z]} />
          <TableTop position={[x, POSEUR_H, TABLE_Z]} scale={0.95} rotationY={i * 1.3} />
          {/* hand-blown globe cluster hung from the real ceiling (y = 9 world) */}
          <Pendant
            variant="cluster" color={theme.haloA}
            position={[x, 9 - MEZZ_Y - 0.02, TABLE_Z]} bottom={2.25} scale={1.05}
          />
        </group>
      ))}
      <Stools items={stools} h={0.76} fabric={LEATHER.ink} />

      {/* small planters anchoring the ends of the back-wall sofa run */}
      <Planter position={[-13.3, 0, 12.3]} seed={31} scale={0.95} />
      <Planter position={[13.3, 0, 12.3]} seed={58} scale={0.95} />

      {/* wall sconces along the back wall, between the sofa modules */}
      {[-9.1, -3.0, 3.0, 9.1].map((x) => (
        <WallSconce key={x} position={[x, 2.3, 12.72]} rotationY={Math.PI} color={theme.haloA} />
      ))}

      {/* wall blades rising between the sofa modules */}
      {[-10.05, -6.35, 6.35, 10.05].map((x) => (
        <mesh key={x} position={[x, 1.95, 12.7]} material={em(theme.pulseA, 1.7)}>
          <boxGeometry args={[0.05, 1.5, 0.04]} />
        </mesh>
      ))}
    </group>
  );
}

export function Mezzanine() {
  const theme = useLightTheme();
  return (
    <group>
      {/* deck */}
      <mesh position={[0, MEZZ_Y - 0.125, (M.frontZ + ROOM.z) / 2]} material={matFloorDark}>
        <boxGeometry args={[ROOM.x * 2, 0.25, ROOM.z - M.frontZ]} />
      </mesh>
      <mesh position={[0, MEZZ_Y + 0.012, (M.frontZ + ROOM.z) / 2]} material={matWalnut}>
        <boxGeometry args={[ROOM.x * 2, 0.024, ROOM.z - M.frontZ]} />
      </mesh>
      {/* fascia + identity light line */}
      <mesh position={[0, MEZZ_Y - 0.28, 7.96]} material={matBronze}>
        <boxGeometry args={[ROOM.x * 2, 0.56, 0.14]} />
      </mesh>
      <mesh position={[0, MEZZ_Y - 0.54, 7.95]} material={em(theme.haloA, 2)}>
        <boxGeometry args={[ROOM.x * 2, 0.035, 0.04]} />
      </mesh>
      {/* under-mezz warm soffit lines */}
      {[9.2, 10.6, 12.0].map((z) => (
        <mesh key={z} position={[0, MEZZ_Y - 0.27, z]} material={em(PAL.warmWhite, 0.85)}>
          <boxGeometry args={[30, 0.03, 0.05]} />
        </mesh>
      ))}

      <Stairs side={1} />
      <Stairs side={-1} />
      <MezzanineRailing />
      <VIPLounge />
    </group>
  );
}

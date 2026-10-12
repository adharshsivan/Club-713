import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { ROOM } from './collision';
import {
  matFloor, matPanel, matBronze, matBrass, matGunmetal,
  matWalnutDark, em, PAL,
} from './materials';
import { useLightTheme } from './lightTheme';
import { WallSconce, Planter } from './furn/Furniture';

const tmp = new THREE.Object3D();

/** vertical walnut fin rhythm on the east & west walls */
function WallFins() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const count = 2 * 22;
  useLayoutEffect(() => {
    let i = 0;
    for (const side of [1, -1]) {
      for (let k = 0; k < 22; k++) {
        const z = -12 + k * 0.92;
        const h = 7.6 + Math.sin(k * 0.7) * 0.9;
        tmp.position.set(side * (ROOM.x - 0.14), h / 2, z);
        tmp.scale.set(0.22, h, 0.34);
        tmp.rotation.set(0, 0, 0);
        tmp.updateMatrix();
        ref.current.setMatrixAt(i++, tmp.matrix);
      }
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={matWalnutDark}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

/** warm -> cool gradient LED blades between fins (identity gradient, re-skins with the lighting theme) */
function GradientBlades() {
  const theme = useLightTheme();
  const blades = useMemo(() => {
    const list: { z: number; color: string }[] = [];
    const a = new THREE.Color(theme.warm);
    const b = new THREE.Color(theme.cool);
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const c = a.clone().lerp(b, t);
      list.push({ z: -11.4 + k * 3.1, color: `#${c.getHexString()}` });
    }
    return list;
  }, [theme]);
  return (
    <group>
      {blades.map((bl, i) => (
        <group key={i}>
          <mesh position={[ROOM.x - 0.1, 3.9, bl.z]} material={em(bl.color, 2.2)}>
            <boxGeometry args={[0.06, 7.2, 0.1]} />
          </mesh>
          <mesh position={[-(ROOM.x - 0.1), 3.9, bl.z]} material={em(bl.color, 2.2)}>
            <boxGeometry args={[0.06, 7.2, 0.1]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/** acoustic baffle field floating over the stage end of the room */
function Baffles() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const count = 16;
  useLayoutEffect(() => {
    for (let i = 0; i < count; i++) {
      const x = -13.5 + i * 1.8;
      tmp.position.set(x, 8.15 + Math.sin(i * 1.3) * 0.25, -9.8);
      tmp.scale.set(0.12, 1.5, 5.4);
      tmp.rotation.set(0, 0, 0);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]} material={matPanel}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

function Column({ x, z, color }: { x: number; z: number; color: string }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, 4.5, 0]} material={matGunmetal}>
        <cylinderGeometry args={[0.32, 0.38, 9, 14]} />
      </mesh>
      <mesh position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]} material={em(color, 1.8)}>
        <torusGeometry args={[0.37, 0.025, 8, 24]} />
      </mesh>
      <mesh position={[0, 0.25, 0]} material={matBrass}>
        <cylinderGeometry args={[0.45, 0.5, 0.5, 14]} />
      </mesh>
    </group>
  );
}

/** glowing entry portal tucked under the mezzanine (west wall) */
function EntryPortal({ color }: { color: string }) {
  // open doorway to the plaza: glowing frame + brass threshold (local x runs along world z)
  const frame = em(color, 2.4);
  return (
    <group position={[-ROOM.x + 0.03, 0, 10.4]} rotation={[0, Math.PI / 2, 0]}>
      <mesh position={[-1.13, 1.28, 0]} material={frame}>
        <boxGeometry args={[0.06, 2.56, 0.06]} />
      </mesh>
      <mesh position={[1.13, 1.28, 0]} material={frame}>
        <boxGeometry args={[0.06, 2.56, 0.06]} />
      </mesh>
      <mesh position={[0, 2.53, 0]} material={frame}>
        <boxGeometry args={[2.32, 0.06, 0.06]} />
      </mesh>
      <mesh position={[0, 0.006, 0.25]} material={matBrass}>
        <boxGeometry args={[2.2, 0.012, 0.6]} />
      </mesh>
    </group>
  );
}

/**
 * Wall sconces + potted plants lining the bare run of the west wall —
 * kept clear of the grand stair mass (which starts at z = 2.8) and the
 * entry threshold (z 9.3–11.5).
 */
function WestWallDecor({ color }: { color: string }) {
  const sconceZ = [-11, -8, -5, -2, 1];
  return (
    <group>
      {sconceZ.map((z) => (
        <WallSconce key={z} position={[-ROOM.x + 0.16, 2.1, z]} rotationY={Math.PI / 2} color={color} />
      ))}
      <Planter position={[-ROOM.x + 0.9, 0, -12.0]} seed={5} scale={0.95} />
      <Planter position={[-ROOM.x + 0.9, 0, 0.4]} seed={13} scale={0.95} />
    </group>
  );
}

export function Architecture() {
  const theme = useLightTheme();
  return (
    <group>
      {/* floor slab */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} material={matFloor}>
        <planeGeometry args={[ROOM.x * 2, ROOM.z * 2]} />
      </mesh>
      {/* bronze inlay rings around the dance floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -1]} material={matBrass}>
        <ringGeometry args={[6.25, 6.45, 64]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -1]} material={em(theme.haloA, 0.9)}>
        <ringGeometry args={[7.3, 7.38, 64]} />
      </mesh>

      {/* walls */}
      <mesh position={[0, 4.5, -ROOM.z - 0.15]} material={matPanel}>
        <boxGeometry args={[ROOM.x * 2 + 1, 9, 0.3]} />
      </mesh>
      <mesh position={[0, 4.5, ROOM.z + 0.15]} material={matPanel}>
        <boxGeometry args={[ROOM.x * 2 + 1, 9, 0.3]} />
      </mesh>
      <mesh position={[ROOM.x + 0.15, 4.5, 0]} material={matPanel}>
        <boxGeometry args={[0.3, 9, ROOM.z * 2 + 1]} />
      </mesh>
      {/* west wall, split around the doorway to the plaza (z 9.3 → 11.5, h 2.5) */}
      <mesh position={[-ROOM.x - 0.15, 4.5, (-ROOM.z - 0.5 + 9.3) / 2]} material={matPanel}>
        <boxGeometry args={[0.3, 9, 9.3 + ROOM.z + 0.5]} />
      </mesh>
      <mesh position={[-ROOM.x - 0.15, 4.5, (11.5 + ROOM.z + 0.5) / 2]} material={matPanel}>
        <boxGeometry args={[0.3, 9, ROOM.z + 0.5 - 11.5]} />
      </mesh>
      <mesh position={[-ROOM.x - 0.15, (2.5 + 9) / 2, 10.4]} material={matPanel}>
        <boxGeometry args={[0.3, 9 - 2.5, 2.2]} />
      </mesh>

      {/* ceiling slab */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM.h, 0]} material={matPanel}>
        <planeGeometry args={[ROOM.x * 2, ROOM.z * 2]} />
      </mesh>
      {/* concentric ceiling light coves above the dance floor */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8.75, -1]} material={em(theme.haloA, 1.6)}>
        <ringGeometry args={[6.6, 6.78, 64]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8.75, -1]} material={em(theme.pulseA, 1.2)}>
        <ringGeometry args={[8.2, 8.33, 64]} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 8.75, -1]} material={em(PAL.warmWhite, 0.8)}>
        <ringGeometry args={[9.7, 9.78, 64]} />
      </mesh>
      {/* linear circulation strips */}
      {[12.6, -12.6].map((x) => (
        <mesh key={x} position={[x, 8.85, -1]} material={em(PAL.warmWhite, 1.1)}>
          <boxGeometry args={[0.08, 0.06, 20]} />
        </mesh>
      ))}

      <WallFins />
      <GradientBlades />
      <Baffles />

      <Column x={9.5} z={2.5} color={theme.haloA} />
      <Column x={-9.5} z={2.5} color={theme.haloA} />
      <Column x={9.5} z={-4.5} color={theme.haloA} />
      <Column x={-9.5} z={-4.5} color={theme.haloA} />

      <WestWallDecor color={theme.haloA} />

      {/* bronze skirting */}
      <mesh position={[0, 0.08, -ROOM.z + 0.05]} material={matBronze}>
        <boxGeometry args={[ROOM.x * 2, 0.16, 0.1]} />
      </mesh>

      <EntryPortal color={theme.haloA} />
    </group>
  );
}

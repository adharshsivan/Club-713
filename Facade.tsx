import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { matBronze, matBrass, matOnyx, matWalnutDark, em, PAL } from '../materials';
import { rbox } from '../furn/geo';
import { GLASS } from '../furn/fabrics';
import { FX, SHELL_TOP, DOOR, VEST, CANOPY } from './layout';
import { useExteriorMode } from './mode';

type B6 = [number, number, number, number, number, number]; // x1 x2 y1 y2 z1 z2

const concrete = new THREE.MeshStandardMaterial({ color: '#1d1d23', roughness: 0.78, metalness: 0.15 });
const roofMat = new THREE.MeshStandardMaterial({ color: '#0f0f13', roughness: 0.95, metalness: 0.05 });
const mirrorBronze = new THREE.MeshStandardMaterial({ color: '#6f533d', roughness: 0.14, metalness: 1 });

const N_SIDE = 13.5;

function Slab({ b, mat }: { b: B6; mat: THREE.Material }) {
  const [x1, x2, y1, y2, z1, z2] = b;
  return (
    <mesh position={[(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2]} material={mat}>
      <boxGeometry args={[x2 - x1, y2 - y1, z2 - z1]} />
    </mesh>
  );
}

// ================================================================== shell
function Shell() {
  const day = useExteriorMode() === 'day';
  const amber = em(PAL.amber, 2.2);
  return (
    <group>
      {/* west façade (door cut-out) */}
      <Slab b={[FX, -17.8, 0, SHELL_TOP, -N_SIDE, DOOR.z1]} mat={concrete} />
      <Slab b={[FX, -17.8, 0, SHELL_TOP, DOOR.z2, N_SIDE]} mat={concrete} />
      <Slab b={[FX, -17.8, DOOR.h, SHELL_TOP, DOOR.z1, DOOR.z2]} mat={concrete} />
      {/* side + rear volumes */}
      <Slab b={[FX, 18.3, 0, SHELL_TOP, 13.05, N_SIDE]} mat={concrete} />
      <Slab b={[FX, 18.3, 0, SHELL_TOP, -N_SIDE, -13.05]} mat={concrete} />
      <Slab b={[17.8, 18.3, 0, SHELL_TOP, -13.05, 13.05]} mat={concrete} />
      <Slab b={[-17.8, 17.8, 9.01, 10.6, -13.05, 13.05]} mat={roofMat} />

      {/* parapet crown line — front façade only */}
      {!day && <Slab b={[FX - 0.03, FX + 0.03, SHELL_TOP - 0.06, SHELL_TOP, -N_SIDE, N_SIDE]} mat={amber} />}

      {/* bronze mirror panels under the canopy, flanking the threshold */}
      <Slab b={[FX - 0.03, FX, 0, CANOPY.y - 0.15, CANOPY.z1 + 0.1, VEST.z1]} mat={mirrorBronze} />
      <Slab b={[FX - 0.03, FX, 0, CANOPY.y - 0.15, VEST.z2, N_SIDE - 0.05]} mat={mirrorBronze} />
    </group>
  );
}

// ================================================================== fin skin (wraps the whole box)
interface Fin {
  px: number; py: number; pz: number;   // instance centre
  sx: number; sy: number; sz: number;   // instance size
  front: boolean;                       // only front beams receive the night gradient
}

// One uniform beam rhythm wraps the whole building so it reads as a single
// monolithic box rather than stacked volumes. Beams are wide with narrow gaps
// so the pattern doesn't alias (moiré) when the camera orbits. The identity
// gradient is drawn only on outward -X faces, i.e. the front of the building.
const FIN_PITCH = 0.66;
const FIN_DEPTH = 0.4;
const FIN_WIDTH = 0.46;
const FIN_TOP = SHELL_TOP;
const REAR_X = 18.3;                // outer face of the rear wall
const FIN_CLEARANCE = 0.04;         // gap between beam back face and the wall

/** beams standing off a face whose normal is ±X (front and rear) */
function xFaceRun(fixedX: number, zFrom: number, zTo: number, y0: number, front: boolean, out: Fin[]) {
  const span = zTo - zFrom;
  const n = Math.max(2, Math.round(span / FIN_PITCH));
  const pitch = span / n;
  for (let i = 0; i < n; i++) {
    const c = zFrom + (i + 0.5) * pitch;
    const h = FIN_TOP - y0;
    out.push({ px: fixedX, py: y0 + h / 2, pz: c, sx: FIN_DEPTH, sy: h, sz: FIN_WIDTH, front });
  }
}

/** beams standing off a face whose normal is ±Z (north and south sides) */
function zFaceRun(fixedZ: number, xFrom: number, xTo: number, out: Fin[]) {
  const span = xTo - xFrom;
  const n = Math.max(2, Math.round(span / FIN_PITCH));
  const pitch = span / n;
  for (let i = 0; i < n; i++) {
    const c = xFrom + (i + 0.5) * pitch;
    out.push({ px: c, py: FIN_TOP / 2, pz: fixedZ, sx: FIN_WIDTH, sy: FIN_TOP, sz: FIN_DEPTH, front: false });
  }
}

function finSegments(): Fin[] {
  const out: Fin[] = [];
  const frontX = FX - FIN_CLEARANCE - FIN_DEPTH / 2;

  // Front: beams lift clear of the canopy so the doorway stays unobstructed.
  // The canopy overhangs the building's north edge, so clamp to the wall span.
  const canopyZ0 = Math.max(CANOPY.z1 - 0.15, -N_SIDE);
  const canopyZ1 = Math.min(CANOPY.z2 + 0.15, N_SIDE);
  xFaceRun(frontX, -N_SIDE, canopyZ0, 0, true, out);
  xFaceRun(frontX, canopyZ0, canopyZ1, CANOPY.y + 0.32, true, out);

  // rear + both sides: continuous, full height, no seams
  xFaceRun(REAR_X + FIN_CLEARANCE + FIN_DEPTH / 2, -N_SIDE, N_SIDE, 0, false, out);
  zFaceRun(N_SIDE + FIN_CLEARANCE + FIN_DEPTH / 2, FX, REAR_X, out);
  zFaceRun(-N_SIDE - FIN_CLEARANCE - FIN_DEPTH / 2, FX, REAR_X, out);

  return out;
}

/**
 * Fin material: dark bronze steel whose OUTWARD-facing faces carry the identity
 * gradient (electric green rising into ultraviolet). The glow lives on the fins
 * themselves instead of a light panel behind them, so nothing bright shows
 * through the gaps and the façade stays stable from any viewing angle.
 */
function makeFinMaterial() {
  const uDay = { value: 0 };
  const m = new THREE.MeshStandardMaterial({ color: '#39271b', roughness: 0.66, metalness: 0.04 });
  m.onBeforeCompile = (s) => {
    s.uniforms.uDay = uDay;
    s.vertexShader = s.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vWY;\nvarying float vFront;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vec4 finWP = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        vWY = finWP.y;
        vFront = step(0.5, -normalize(mat3(modelMatrix) * objectNormal).x);`,
      );
    s.fragmentShader = s.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uDay;\nvarying float vWY;\nvarying float vFront;')
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
        float gt = smoothstep(0.5, 10.5, vWY);
        vec3 gc = mix(vec3(0.60, 1.0, 0.14), vec3(0.17, 0.72, 0.55), smoothstep(0.0, 0.5, gt));
        gc = mix(gc, vec3(0.42, 0.22, 0.95), smoothstep(0.45, 1.0, gt));
        float gf = smoothstep(0.1, 1.2, vWY) * (1.0 - smoothstep(10.4, 11.0, vWY));
        totalEmissiveRadiance += gc * gf * vFront * 0.28 * (1.0 - uDay);`,
      );
  };
  m.customProgramCacheKey = () => 'facade-fin-gradient';
  return { material: m, uDay };
}

/** plain dark wood for the side and rear beam skin — no emissive component */
const sideBeamMat = new THREE.MeshStandardMaterial({
  color: '#322218', roughness: 0.72, metalness: 0.02,
});

/** uniform fin screen carrying the identity gradient on the hero façade */
export function FacadeFeature() {
  const day = useExteriorMode() === 'day';
  const fin = useMemo(makeFinMaterial, []);
  const fins = useMemo(finSegments, []);
  const frontFins = useMemo(() => fins.filter((f) => f.front), [fins]);
  const shellFins = useMemo(() => fins.filter((f) => !f.front), [fins]);
  const frontRef = useRef<THREE.InstancedMesh>(null!);
  const shellRef = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    const write = (mesh: THREE.InstancedMesh, list: Fin[]) => {
      list.forEach((f, i) => {
        o.position.set(f.px, f.py, f.pz);
        o.scale.set(f.sx, f.sy, f.sz);
        o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    };
    write(frontRef.current, frontFins);
    write(shellRef.current, shellFins);
  }, [frontFins, shellFins]);

  useFrame(() => {
    fin.uDay.value = day ? 1 : 0;
  });

  return (
    <group>
      <instancedMesh ref={frontRef} args={[undefined, undefined, frontFins.length]} material={fin.material} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
      <instancedMesh ref={shellRef} args={[undefined, undefined, shellFins.length]} material={sideBeamMat} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
      </instancedMesh>
    </group>
  );
}

// ================================================================== canopy
/**
 * Entrance canopy: a thick cantilevered bronze slab on two sculpted columns,
 * with a coffered soffit, a recessed light cove and a clean blank fascia
 * reserved for the venue sign. No tension rods.
 */
function Canopy() {
  const day = useExteriorMode() === 'day';
  const len = FX - CANOPY.x1;
  const w = CANOPY.z2 - CANOPY.z1;
  const cx = (CANOPY.x1 + FX) / 2;
  const cz = (CANOPY.z1 + CANOPY.z2) / 2;
  const front = CANOPY.x1;
  const y = CANOPY.y;

  // two columns just inside the canopy corners, carrying the slab honestly
  const colZ = [CANOPY.z1 + 1.05, CANOPY.z2 - 1.05];

  return (
    <group>
      {/* main slab + stepped shadow-gap band so it reads thick, not like card */}
      <mesh position={[cx, y + 0.1, cz]} geometry={rbox(len, 0.3, w, 0.05)} material={matBronze} />
      <mesh position={[cx + 0.06, y - 0.1, cz]} geometry={rbox(len - 0.12, 0.12, w - 0.12, 0.03)} material={matOnyx} />
      <mesh position={[cx + 0.1, y - 0.2, cz]} geometry={rbox(len - 0.2, 0.1, w - 0.2, 0.03)} material={matBronze} />

      {/* coffered soffit: brass ribs running out toward the plaza */}
      {Array.from({ length: 9 }, (_, i) => CANOPY.z1 + 0.6 + (i * (w - 1.2)) / 8).map((z) => (
        <mesh key={z} position={[cx + 0.1, y - 0.26, z]} material={matBrass}>
          <boxGeometry args={[len - 0.4, 0.035, 0.055]} />
        </mesh>
      ))}
      {/* warm light slots between the ribs */}
      {Array.from({ length: 8 }, (_, i) => CANOPY.z1 + 0.9 + (i * (w - 1.2)) / 8).map((z) => (
        <mesh key={z} position={[cx + 0.1, y - 0.252, z]} material={day ? matOnyx : em(PAL.warmWhite, 2.2)}>
          <boxGeometry args={[len - 0.55, 0.012, 0.055]} />
        </mesh>
      ))}

      {/* perimeter cove: a continuous glow tucked under the slab edge */}
      <mesh position={[front + 0.14, y - 0.07, cz]} material={day ? matOnyx : em(PAL.acid, 2.4)}>
        <boxGeometry args={[0.03, 0.035, w - 0.3]} />
      </mesh>
      {[CANOPY.z1 + 0.1, CANOPY.z2 - 0.1].map((z) => (
        <mesh key={z} position={[cx + 0.1, y - 0.07, z]} material={day ? matOnyx : em(PAL.acid, 2.4)}>
          <boxGeometry args={[len - 0.3, 0.035, 0.03]} />
        </mesh>
      ))}

      {/* blank fascia band — left clear for the venue sign */}
      <mesh position={[front - 0.03, y + 0.1, cz]} material={matOnyx}>
        <boxGeometry args={[0.05, 0.26, w - 0.1]} />
      </mesh>
      <mesh position={[front - 0.06, y + 0.26, cz]} material={matBrass}>
        <boxGeometry args={[0.04, 0.03, w - 0.06]} />
      </mesh>

      {/* support columns: tapered bronze shafts, brass collar, lit reveal, base */}
      {colZ.map((z) => (
        <group key={z} position={[front + 0.55, 0, z]}>
          <mesh position={[0, 0.06, 0]} material={matOnyx}>
            <cylinderGeometry args={[0.3, 0.36, 0.12, 6]} />
          </mesh>
          <mesh position={[0, (y - 0.26) / 2 + 0.1, 0]} material={matBronze}>
            <cylinderGeometry args={[0.15, 0.2, y - 0.26, 6]} />
          </mesh>
          <mesh position={[0, (y - 0.26) / 2 + 0.1, -0.17]} material={day ? matOnyx : em(PAL.acid, 1.5)}>
            <boxGeometry args={[0.03, y - 1.2, 0.02]} />
          </mesh>
          <mesh position={[0, y - 0.3, 0]} material={matBrass}>
            <cylinderGeometry args={[0.19, 0.19, 0.08, 6]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ================================================================== threshold tunnel
function Vestibule() {
  const day = useExteriorMode() === 'day';
  const L = FX - VEST.x1;
  const cx = (VEST.x1 + FX) / 2;
  const ribs = useMemo(() => {
    const a = new THREE.Color(PAL.acid);
    const b = new THREE.Color(PAL.ultraviolet);
    return Array.from({ length: 7 }, (_, i) => ({
      x: VEST.x1 + 0.25 + (i * (L - 0.5)) / 6,
      color: `#${a.clone().lerp(b, i / 6).getHexString()}`,
    }));
  }, [L]);
  const inner = DOOR.z2 - DOOR.z1;
  const outline = em(PAL.acid, 2.6);
  return (
    <group>
      <Slab b={[VEST.x1, FX, 0, VEST.h + 0.6, VEST.z1, DOOR.z1]} mat={matBronze} />
      <Slab b={[VEST.x1, FX, 0, VEST.h + 0.6, DOOR.z2, VEST.z2]} mat={matBronze} />
      <Slab b={[VEST.x1, FX, VEST.h, VEST.h + 0.6, DOOR.z1, DOOR.z2]} mat={matBronze} />
      <Slab b={[VEST.x1, FX, 0, 0.02, DOOR.z1, DOOR.z2]} mat={matOnyx} />
      {/* walnut lining */}
      <mesh position={[cx, VEST.h / 2, DOOR.z1 + 0.005]} material={matWalnutDark}>
        <planeGeometry args={[L, VEST.h]} />
      </mesh>
      <mesh position={[cx, VEST.h / 2, DOOR.z2 - 0.005]} rotation={[0, Math.PI, 0]} material={matWalnutDark}>
        <planeGeometry args={[L, VEST.h]} />
      </mesh>
      {/* gradient rib-rings: amber outside → ultraviolet as you step in */}
      {ribs.map((r) => {
        const m = em(r.color, 2.1);
        return (
          <group key={r.x} position={[r.x, 0, 0]}>
            <mesh position={[0, VEST.h / 2, DOOR.z1 + 0.04]} material={day ? matBrass : m}>
              <boxGeometry args={[0.06, VEST.h - 0.05, 0.06]} />
            </mesh>
            <mesh position={[0, VEST.h / 2, DOOR.z2 - 0.04]} material={day ? matBrass : m}>
              <boxGeometry args={[0.06, VEST.h - 0.05, 0.06]} />
            </mesh>
            <mesh position={[0, VEST.h - 0.04, DOOR.zc]} material={day ? matBrass : m}>
              <boxGeometry args={[0.06, 0.06, inner]} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[cx, 0.024, DOOR.zc]} material={day ? matBrass : em(PAL.amber, 1.8)}>
        <boxGeometry args={[L, 0.004, 0.04]} />
      </mesh>
      {/* portal mouth: deep brass reveal + double glow outline */}
      {[DOOR.z1 - 0.12, DOOR.z2 + 0.12].map((z) => (
        <mesh key={z} position={[VEST.x1 - 0.06, (VEST.h + 0.26) / 2, z]} material={matBrass}>
          <boxGeometry args={[0.14, VEST.h + 0.26, 0.2] } />
        </mesh>
      ))}
      <mesh position={[VEST.x1 - 0.06, VEST.h + 0.17, DOOR.zc]} material={matBrass}>
        <boxGeometry args={[0.14, 0.2, inner + 0.44]} />
      </mesh>
      <mesh position={[VEST.x1 - 0.14, VEST.h / 2, DOOR.z1 - 0.03]} material={day ? matOnyx : outline}>
        <boxGeometry args={[0.03, VEST.h, 0.04]} />
      </mesh>
      <mesh position={[VEST.x1 - 0.14, VEST.h / 2, DOOR.z2 + 0.03]} material={day ? matOnyx : outline}>
        <boxGeometry args={[0.03, VEST.h, 0.04]} />
      </mesh>
      <mesh position={[VEST.x1 - 0.14, VEST.h + 0.03, DOOR.zc]} material={day ? matOnyx : outline}>
        <boxGeometry args={[0.03, 0.04, inner + 0.1]} />
      </mesh>
      {/* soft halo washing the wall around the mouth */}
      {[DOOR.z1 - 0.24, DOOR.z2 + 0.24].map((z) => (
        <mesh key={z} position={[VEST.x1 - 0.02, VEST.h / 2, z]} material={day ? matOnyx : em(PAL.ultraviolet, 0.8)}>
          <boxGeometry args={[0.02, VEST.h + 0.1, 0.05]} />
        </mesh>
      ))}
      {/* brass thresholds */}
      {[VEST.x1 + 0.05, FX - 0.05].map((x) => (
        <mesh key={x} position={[x, 0.026, DOOR.zc]} material={matBrass}>
          <boxGeometry args={[0.1, 0.012, inner]} />
        </mesh>
      ))}
      {/* lit approach strip running out from the doorway into the plaza */}
      {!day && <mesh position={[VEST.x1 - 1.6, 0.012, DOOR.zc]} rotation={[-Math.PI / 2, 0, 0]} material={em(PAL.acid, 1.1)}>
        <planeGeometry args={[inner - 0.3, 3.2]} />
      </mesh>}
      {[DOOR.z1 + 0.1, DOOR.z2 - 0.1].map((z) => (
        <mesh key={z} position={[VEST.x1 - 1.6, 0.016, z]} material={day ? matBrass : em(PAL.acid, 2.2)}>
          <boxGeometry args={[3.2, 0.012, 0.035]} />
        </mesh>
      ))}
    </group>
  );
}

// ================================================================== automatic sliding doors
function DoorPanel({ refObj }: { refObj: React.RefObject<THREE.Group | null> }) {
  return (
    <group ref={refObj}>
      <mesh material={GLASS}>
        <boxGeometry args={[0.035, 2.42, 1.08]} />
      </mesh>
      {[-0.55, 0.55].map((z) => (
        <mesh key={z} position={[0, 0, z]} material={matBrass}>
          <boxGeometry args={[0.06, 2.46, 0.04]} />
        </mesh>
      ))}
      {[-1.22, 1.22].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={matBrass}>
          <boxGeometry args={[0.06, 0.04, 1.1]} />
        </mesh>
      ))}
    </group>
  );
}

function Doors() {
  const camera = useThree((s) => s.camera);
  const left = useRef<THREE.Group>(null);
  const right = useRef<THREE.Group>(null);
  const open = useRef(0);
  useFrame((_, dt) => {
    const near = Math.hypot(camera.position.x - DOOR.x, camera.position.z - DOOR.zc) < 4.8;
    open.current = THREE.MathUtils.damp(open.current, near ? 1 : 0, 7, dt);
    const o = open.current * 1.04;
    if (left.current) left.current.position.set(DOOR.x, 1.23, DOOR.zc - 0.55 - o);
    if (right.current) right.current.position.set(DOOR.x, 1.23, DOOR.zc + 0.55 + o);
  });
  return (
    <>
      <DoorPanel refObj={left} />
      <DoorPanel refObj={right} />
    </>
  );
}

export function Facade() {
  return (
    <group>
      <Shell />
      <FacadeFeature />
      <Canopy />
      <Vestibule />
      <Doors />
    </group>
  );
}

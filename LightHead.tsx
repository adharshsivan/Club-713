import { useMemo, useRef } from 'react';
import { createPortal, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { showState } from './show/director';
import { matBlack, matGunmetal } from './materials';
import { radialTexture } from './textures';
import { BEAM_LEN, beamGeometry, createBeamMaterial } from './beams';

const _o = new THREE.Vector3();
const _d = new THREE.Vector3();
const _down = new THREE.Vector3(0, -1, 0);

export interface LightHeadProps {
  index: number;
  palette: string[];
  position: [number, number, number];
  rotationY?: number;
  /** returns [tiltX, tiltZ] of the head for time t */
  aim: (t: number, i: number) => [number, number];
  beamRadius?: number;
  floorY?: number;
  /** overall beam brightness multiplier (1 = default) */
  strength?: number;
}

/**
 * Moving-head fixture: yoke + head + lens flare + layered volumetric beam +
 * a floor light-pool that tracks exactly where the beam lands.
 */
export function LightHead({
  index, palette, position, rotationY = 0, aim, beamRadius = 1.25, floorY = 0.04, strength = 1,
}: LightHeadProps) {
  const scene = useThree((s) => s.scene);
  const pivot = useRef<THREE.Group>(null!);
  const outer = useRef<THREE.Mesh>(null!);
  const inner = useRef<THREE.Mesh>(null!);
  const glow = useRef<THREE.Sprite>(null!);
  const pool = useRef<THREE.Mesh>(null!);

  const targets = useMemo(() => palette.map((c) => new THREE.Color(c)), [palette]);

  const gear = useMemo(() => {
    const col = targets[index % targets.length].clone();
    return {
      color: col,
      outerMat: createBeamMaterial(col, 0.5, 1.6, index * 1.7),
      innerMat: createBeamMaterial(col, 0.9, 3.8, index * 1.7 + 2.3),
      lens: new THREE.MeshBasicMaterial({ color: col.clone(), toneMapped: false }),
      glowMat: new THREE.SpriteMaterial({
        map: radialTexture(), color: col.clone(), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }),
      poolMat: new THREE.MeshBasicMaterial({
        map: radialTexture(), color: col.clone(), transparent: true,
        blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      }),
    };
  }, [index, targets]);

  const outerGeo = useMemo(() => beamGeometry(beamRadius), [beamRadius]);
  const innerGeo = useMemo(() => beamGeometry(beamRadius * 0.34, 0.012), [beamRadius]);

  useFrame(() => {
    const { t, pulse, bar, energy, drop } = showState();
    const dyn = 0.6 + 0.5 * energy;

    // ---- aim
    const [rx, rz] = aim(t, index);
    pivot.current.rotation.set(rx, 0, rz);
    pivot.current.updateWorldMatrix(true, false);
    const m = pivot.current.matrixWorld;
    _o.set(0, -0.42, 0).applyMatrix4(m);
    _d.copy(_down).transformDirection(m);

    // ---- beam length: stop right at the floor
    const hitsFloor = _d.y < -0.08;
    const len = hitsFloor ? THREE.MathUtils.clamp((_o.y - floorY) / -_d.y, 2, 24) : 12;
    const s = (len * 1.06) / BEAM_LEN;
    outer.current.scale.setScalar(s);
    inner.current.scale.setScalar(s);

    // ---- colour phrasing (8-beat phrases, slow luxurious crossfades)
    const target = targets[(index + Math.floor(bar / 2)) % targets.length];
    gear.color.lerp(target, 0.02);
    gear.outerMat.uniforms.uColor.value.copy(gear.color);
    gear.innerMat.uniforms.uColor.value.copy(gear.color);
    gear.outerMat.uniforms.uTime.value = t;
    gear.innerMat.uniforms.uTime.value = t;
    gear.outerMat.uniforms.uIntensity.value = ((0.3 + pulse * 0.2) * dyn + drop * 0.12) * strength;
    gear.innerMat.uniforms.uIntensity.value = ((0.55 + pulse * 0.38) * dyn + drop * 0.15) * strength;

    // ---- lens + flare (kept restrained so the LED wall stays the focal point)
    gear.lens.color.copy(gear.color).multiplyScalar(1.2 + pulse * 1.0);
    gear.glowMat.color.copy(gear.color);
    gear.glowMat.opacity = 0.4 + pulse * 0.25;
    glow.current.scale.setScalar(0.85 + pulse * 0.35);

    // ---- floor pool
    const p = pool.current;
    const hx = _o.x + _d.x * len;
    const hz = _o.z + _d.z * len;
    if (hitsFloor && hz > -7.4 && hz < 7.6 && Math.abs(hx) < 13.5) {
      const elong = 1 / Math.max(0.35, -_d.y);
      const size = 1.5 + len * 0.15;
      p.visible = true;
      p.position.set(hx, floorY + 0.012, hz);
      p.rotation.set(-Math.PI / 2, Math.atan2(-_d.x, -_d.z), 0, 'YXZ');
      p.scale.set(size, size * elong, 1);
      gear.poolMat.color.copy(gear.color).multiplyScalar((0.4 + pulse * 0.4) * strength * (0.6 + 0.4 * energy));
    } else {
      p.visible = false;
    }
  });

  return (
    <>
      <group position={position} rotation={[0, rotationY, 0]}>
        {/* truss clamp */}
        <mesh position={[0, 0.1, 0]} material={matBlack}>
          <cylinderGeometry args={[0.09, 0.12, 0.14, 12]} />
        </mesh>
        <group ref={pivot} position={[0, -0.08, 0]}>
          {/* yoke arms */}
          {[-0.18, 0.18].map((x) => (
            <mesh key={x} position={[x, -0.12, 0]} material={matGunmetal}>
              <boxGeometry args={[0.035, 0.34, 0.12]} />
            </mesh>
          ))}
          {/* head body */}
          <mesh position={[0, -0.22, 0]} material={matBlack}>
            <cylinderGeometry args={[0.15, 0.115, 0.4, 20]} />
          </mesh>
          <mesh position={[0, -0.405, 0]} material={matGunmetal}>
            <cylinderGeometry args={[0.125, 0.125, 0.03, 20]} />
          </mesh>
          {/* lens */}
          <mesh position={[0, -0.422, 0]} rotation={[Math.PI / 2, 0, 0]} material={gear.lens}>
            <circleGeometry args={[0.1, 20]} />
          </mesh>
          <sprite ref={glow} position={[0, -0.46, 0]} material={gear.glowMat} />

          {/* volumetric beam: soft outer shaft + hot inner core */}
          <mesh ref={outer} position={[0, -0.42, 0]} geometry={outerGeo} material={gear.outerMat} />
          <mesh ref={inner} position={[0, -0.42, 0]} geometry={innerGeo} material={gear.innerMat} />
        </group>
      </group>

      {/* floor light pool lives in world space */}
      {createPortal(
        <mesh ref={pool} visible={false} material={gear.poolMat}>
          <planeGeometry args={[1, 1]} />
        </mesh>,
        scene,
      )}
    </>
  );
}

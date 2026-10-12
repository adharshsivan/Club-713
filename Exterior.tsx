import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { PAL } from '../materials';
import { radialTexture } from '../textures';
import { clubTime } from '../clock';
import { SkyDome, Stars, Skyline } from './Sky';
import { Facade } from './Facade';
import { Plaza } from './Plaza';
import { CANOPY, DOOR, PLAZA, FX } from './layout';
import { useExteriorMode } from './mode';

/** drifting low-lying haze across the plaza, tinted by the club's neon */
function GroundHaze() {
  const ref = useRef<THREE.Points>(null!);
  const { geo, mat } = useMemo(() => {
    let s = 71;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const n = 70;
    const pos = new Float32Array(n * 3);
    const col = new Float32Array(n * 3);
    const acid = new THREE.Color(PAL.acid);
    const violet = new THREE.Color(PAL.ultraviolet);
    const amber = new THREE.Color(PAL.amberHot);
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = PLAZA.x1 + 4 + r() * (FX - PLAZA.x1 - 2);
      const z = -28 + r() * 56;
      pos[i * 3] = x;
      pos[i * 3 + 1] = 0.3 + r() * 1.1;
      pos[i * 3 + 2] = z;
      // closer to the façade → greener; mid plaza → amber/violet drift
      const t = THREE.MathUtils.clamp((x - PLAZA.x1) / (FX - PLAZA.x1), 0, 1);
      c.copy(violet).lerp(amber, r() * 0.5);
      c.lerp(acid, t * t * 0.8);
      c.toArray(col, i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.PointsMaterial({
      map: radialTexture(), size: 7, transparent: true, opacity: 0.12,
      vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false,
      sizeAttenuation: true, fog: false,
    });
    return { geo: g, mat: m };
  }, []);

  useFrame(() => {
    const { t, pulse } = clubTime();
    ref.current.position.x = Math.sin(t * 0.05) * 1.6;
    ref.current.position.z = Math.cos(t * 0.04) * 1.2;
    mat.opacity = 0.1 + pulse * 0.04;
  });

  return <points ref={ref} geometry={geo} material={mat} frustumCulled={false} />;
}

/**
 * 713 exterior. Daylight is represented by broad fills positioned outdoors
 * with a limited range; a global sunlight source would bleed through the
 * unshadowed shell and flatten the interior nightclub lighting.
 */
export function Exterior() {
  const mode = useExteriorMode();
  const day = mode === 'day';

  return (
    <group>
      <SkyDome />
      <group visible={!day}><Stars /></group>
      <Skyline />
      <Facade />
      <Plaza />
      <group visible={!day}><GroundHaze /></group>
      {day ? (
        <>
          {/* Non-fixture daylight fills stay outside the building's interior. */}
          <pointLight position={[-36, 21, -11]} intensity={155} distance={44} decay={1.4} color="#fff5df" />
          <pointLight position={[-36, 21, 17]} intensity={155} distance={44} decay={1.4} color="#e3efff" />
          <pointLight position={[5, 22, -30]} intensity={130} distance={30} decay={1.5} color="#fff4db" />
          <pointLight position={[5, 22, 30]} intensity={130} distance={30} decay={1.5} color="#e3efff" />
        </>
      ) : (
        <>
          {/* warm canopy wash over the entrance */}
          <pointLight position={[(CANOPY.x1 - 18.3) / 2, 3.2, DOOR.zc]} distance={10} decay={1.8} intensity={16} color={PAL.amber} />
        </>
      )}
    </group>
  );
}

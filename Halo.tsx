import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clubTime } from './clock';
import { matGunmetal, matBlack } from './materials';
import { LightHead } from './LightHead';
import { useLightTheme } from './lightTheme';

const HEADS = 8;
const RIG_R = 5.7;

/** sweep inward over the floor, crossing the centre, with a lateral swirl */
const haloAim = (t: number, i: number): [number, number] => {
  const sweep = 0.5 + 0.5 * Math.sin(t * 0.55 + i * 0.8);
  return [-(0.2 + sweep * 0.75), Math.sin(t * 0.4 + i * 1.3) * 0.45];
};

/**
 * THE HALO: 713's signature levitating double ring of light
 * above the circular dance floor, crowned by a rotating ring truss of
 * eight moving-head fixtures.
 */
export function Halo() {
  const theme = useLightTheme();
  const haloMat = useRef<THREE.MeshStandardMaterial>(null!);
  const innerMat = useRef<THREE.MeshStandardMaterial>(null!);
  const haloGroup = useRef<THREE.Group>(null!);
  const rig = useRef<THREE.Group>(null!);

  useFrame(() => {
    const { t, pulse } = clubTime();
    haloMat.current.emissiveIntensity = 1.6 + pulse * 2.2;
    innerMat.current.emissiveIntensity = 1.0 + pulse * 1.4;
    haloGroup.current.rotation.z = Math.sin(t * 0.21) * 0.07;
    haloGroup.current.rotation.x = Math.cos(t * 0.17) * 0.05;
    haloGroup.current.position.y = 6.1 + Math.sin(t * 0.5) * 0.08;
    rig.current.rotation.y = t * 0.22;
  });

  return (
    <group position={[0, 0, -1]}>
      {/* halo rings */}
      <group ref={haloGroup} position={[0, 6.1, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[5, 0.16, 16, 128]} />
          <meshStandardMaterial
            ref={haloMat}
            color="#111"
            emissive={theme.haloA}
            emissiveIntensity={2}
            roughness={0.6}
          />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, -0.45, 0]}>
          <torusGeometry args={[4.25, 0.09, 12, 112]} />
          <meshStandardMaterial
            ref={innerMat}
            color="#111"
            emissive={theme.haloB}
            emissiveIntensity={1.2}
            roughness={0.6}
          />
        </mesh>
      </group>

      {/* suspension cables */}
      {[0, 1, 2, 3].map((i) => {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        return (
          <mesh key={i} position={[Math.cos(a) * 5, 7.5, Math.sin(a) * 5]} material={matBlack}>
            <cylinderGeometry args={[0.02, 0.02, 2.9, 6]} />
          </mesh>
        );
      })}

      {/* ring truss + moving heads */}
      <group ref={rig} position={[0, 7.8, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]} material={matGunmetal}>
          <torusGeometry args={[RIG_R, 0.07, 8, 96]} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.22, 0]} material={matGunmetal}>
          <torusGeometry args={[RIG_R, 0.07, 8, 96]} />
        </mesh>
        {Array.from({ length: HEADS }, (_, i) => {
          const a = (i / HEADS) * Math.PI * 2;
          return (
            <LightHead
              key={i}
              index={i}
              palette={theme.heads1}
              position={[Math.cos(a) * RIG_R, -0.12, Math.sin(a) * RIG_R]}
              rotationY={Math.atan2(-Math.cos(a), -Math.sin(a))}
              aim={haloAim}
              strength={0.7}
            />
          );
        })}
      </group>
    </group>
  );
}

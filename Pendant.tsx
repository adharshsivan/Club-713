import { useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { clubTime } from './clock';
import { matBrass, matGunmetal, em, PAL } from './materials';
import { radialTexture } from './textures';

export type PendantVariant = 'smoked' | 'orb' | 'ring' | 'cluster' | 'blade';

interface PendantMats {
  bulb: THREE.MeshStandardMaterial;
  glow: THREE.SpriteMaterial;
  shade: THREE.MeshStandardMaterial;
  base: number; kick: number; glowBase: number; glowKick: number;
}

const cache = new Map<string, PendantMats>();

function mats(variant: PendantVariant, color: string): PendantMats {
  const key = `${variant}|${color}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const col = new THREE.Color(color);
  let bulb: THREE.MeshStandardMaterial;
  let shade: THREE.MeshStandardMaterial;
  let base = 2.6, kick = 2.0, glowBase = 0.45, glowKick = 0.35;

  switch (variant) {
    case 'smoked':
      bulb = em(color, 3.2);
      shade = new THREE.MeshStandardMaterial({
        color: '#241a12', roughness: 0.09, metalness: 0.2,
        transparent: true, opacity: 0.62, emissive: col.clone(), emissiveIntensity: 0.85,
      });
      base = 2.8; kick = 2.6; glowBase = 0.5; glowKick = 0.4;
      break;
    case 'orb':
      bulb = new THREE.MeshStandardMaterial({
        color: '#fff3e2', roughness: 0.05, metalness: 0,
        transparent: true, opacity: 0.34, emissive: col.clone(), emissiveIntensity: 1.8,
      });
      shade = bulb;
      base = 1.6; kick = 1.5; glowBase = 0.4; glowKick = 0.3;
      break;
    case 'cluster':
      bulb = new THREE.MeshStandardMaterial({
        color: '#fff3e2', roughness: 0.05, metalness: 0,
        transparent: true, opacity: 0.3, emissive: col.clone(), emissiveIntensity: 2.2,
      });
      shade = bulb;
      base = 1.9; kick = 1.7; glowBase = 0.34; glowKick = 0.28;
      break;
    case 'ring':
      bulb = em(color, 2.4);
      shade = em(color, 2.4);
      base = 2.2; kick = 2.2; glowBase = 0.42; glowKick = 0.36;
      break;
    default: // blade
      bulb = em(color, 3.4);
      shade = em(color, 3.4);
      base = 3.0; kick = 2.8; glowBase = 0.5; glowKick = 0.42;
      break;
  }

  const glow = new THREE.SpriteMaterial({
    map: radialTexture(), color: col.clone(), transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
  const out = { bulb, glow, shade, base, kick, glowBase, glowKick };
  cache.set(key, out);
  return out;
}

export interface PendantProps {
  variant?: PendantVariant;
  position?: [number, number, number];
  rotationY?: number;
  color?: string;
  scale?: number;
  /** stem length from the ceiling rose down to the top of the fixture */
  drop?: number;
  /** if set, the stem is sized so the fixture's lowest point sits at this Y (parent space) */
  bottom?: number;
  beat?: boolean;
}

/** visual height of each fixture family below the end of its stem */
const FIXTURE_H: Record<PendantVariant, number> = {
  smoked: 0.36, orb: 0.44, ring: 0.14, cluster: 0.4, blade: 0.54,
};

/**
 * Designer pendant lighting. Everything hangs from a brass ceiling rose;
 * each variant is a distinct fixture family rather than a bare light orb.
 */
export function Pendant({
  variant = 'smoked',
  position = [0, 0, 0],
  rotationY = 0,
  color = PAL.amber,
  scale = 1,
  drop = 1.0,
  bottom,
  beat = true,
}: PendantProps) {
  const m = useMemo(() => mats(variant, color), [variant, color]);
  const stemH = Math.max(
    0.08,
    bottom !== undefined ? (position[1] - bottom) / scale - 0.06 - FIXTURE_H[variant] : drop,
  );

  useFrame(() => {
    if (!beat) return;
    const { pulse } = clubTime();
    m.bulb.emissiveIntensity = m.base + pulse * m.kick;
    m.glow.opacity = m.glowBase + pulse * m.glowKick;
  });

  const rose = (
    <group>
      <mesh position={[0, -0.03, 0]} material={matBrass}>
        <cylinderGeometry args={[0.11, 0.13, 0.06, 20]} />
      </mesh>
      <mesh position={[0, -0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={matGunmetal}>
        <torusGeometry args={[0.115, 0.012, 8, 24]} />
      </mesh>
    </group>
  );

  return (
    <group position={position} rotation={[0, rotationY, 0]} scale={scale}>
      {rose}

      {variant === 'ring' ? (
        <>
          {/* three suspension wires into a floating light ring */}
          {[0, 1, 2].map((i) => {
            const a = (i / 3) * Math.PI * 2;
            const len = Math.hypot(stemH, 0.24);
            return (
              <mesh
                key={i}
                position={[Math.cos(a) * 0.08, -stemH / 2, Math.sin(a) * 0.08]}
                rotation={[Math.sin(a) * 0.2, 0, -Math.cos(a) * 0.2]}
                material={matGunmetal}
              >
                <cylinderGeometry args={[0.006, 0.006, len, 4]} />
              </mesh>
            );
          })}
          <mesh position={[0, -stemH - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={m.shade}>
            <torusGeometry args={[0.27, 0.032, 12, 64]} />
          </mesh>
          <mesh position={[0, -stemH - 0.06, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
            <torusGeometry args={[0.2, 0.008, 8, 48]} />
          </mesh>
          <sprite position={[0, -stemH - 0.06, 0]} scale={[1.05, 1.05, 1]} material={m.glow} />
        </>
      ) : (
        <>
          <mesh position={[0, -stemH / 2, 0]} material={matGunmetal}>
            <cylinderGeometry args={[0.013, 0.013, stemH, 6]} />
          </mesh>

          {variant === 'smoked' && (
            <>
              <mesh position={[0, -stemH, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
                <torusGeometry args={[0.085, 0.016, 8, 24]} />
              </mesh>
              <mesh position={[0, -stemH - 0.17, 0]} material={m.shade}>
                <coneGeometry args={[0.19, 0.34, 32, 1, true]} />
              </mesh>
              <mesh position={[0, -stemH - 0.17, 0]} material={matBrass}>
                <torusGeometry args={[0.055, 0.008, 8, 24]} />
              </mesh>
              <mesh position={[0, -stemH - 0.14, 0]} material={m.bulb}>
                <sphereGeometry args={[0.062, 14, 14]} />
              </mesh>
              <sprite position={[0, -stemH - 0.15, 0]} scale={[0.72, 0.72, 1]} material={m.glow} />
            </>
          )}

          {variant === 'orb' && (
            <>
              <mesh position={[0, -stemH - 0.16, 0]} material={m.bulb}>
                <sphereGeometry args={[0.155, 26, 20]} />
              </mesh>
              <mesh position={[0, -stemH - 0.16, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
                <torusGeometry args={[0.157, 0.012, 8, 32]} />
              </mesh>
              {/* halo ring floating beneath the globe */}
              <mesh position={[0, -stemH - 0.4, 0]} rotation={[Math.PI / 2, 0, 0]} material={em(color, 2.2)}>
                <torusGeometry args={[0.24, 0.014, 8, 48]} />
              </mesh>
              <sprite position={[0, -stemH - 0.16, 0]} scale={[0.95, 0.95, 1]} material={m.glow} />
            </>
          )}

          {variant === 'cluster' && (
            <>
              {/* horizontal arc carrying three hand-blown globes */}
              <mesh position={[0, -stemH, 0]} rotation={[0, 0, Math.PI / 2]} material={matBrass}>
                <torusGeometry args={[0.32, 0.012, 8, 40, Math.PI]} />
              </mesh>
              {[-0.32, 0, 0.32].map((x, i) => (
                <group key={x} position={[x, -stemH - 0.09, 0]}>
                  <mesh position={[0, -0.02, 0]} material={matBrass}>
                    <cylinderGeometry args={[0.012, 0.012, 0.05, 6]} />
                  </mesh>
                  <mesh position={[0, -0.1, 0]} material={m.bulb}>
                    <sphereGeometry args={[0.085, 18, 14]} />
                  </mesh>
                  <sprite position={[0, -0.1, 0]} scale={[0.5, 0.5, 1]} material={m.glow} />
                  {i === 1 && (
                    <mesh position={[0, -0.26, 0]} rotation={[Math.PI / 2, 0, 0]} material={em(color, 1.8)}>
                      <torusGeometry args={[0.16, 0.01, 8, 32]} />
                    </mesh>
                  )}
                </group>
              ))}
            </>
          )}

          {variant === 'blade' && (
            <>
              {/* slim brass cage around a vertical light blade */}
              {[0, 0.46].map((y) => (
                <mesh key={y} position={[0, -stemH - 0.03 - y, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
                  <torusGeometry args={[0.1, 0.009, 8, 28]} />
                </mesh>
              ))}
              {[0, 1, 2, 3].map((i) => {
                const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
                return (
                  <mesh key={i} position={[Math.cos(a) * 0.1, -stemH - 0.26, Math.sin(a) * 0.1]} material={matGunmetal}>
                    <cylinderGeometry args={[0.005, 0.005, 0.5, 4]} />
                  </mesh>
                );
              })}
              <mesh position={[0, -stemH - 0.26, 0]} material={m.bulb}>
                <boxGeometry args={[0.028, 0.5, 0.028]} />
              </mesh>
              <sprite position={[0, -stemH - 0.26, 0]} scale={[0.5, 0.95, 1]} material={m.glow} />
            </>
          )}
        </>
      )}
    </group>
  );
}

import { matGunmetal } from './materials';
import { LightHead } from './LightHead';
import { useLightTheme } from './lightTheme';
import { showState } from './show/director';

const COUNT = 5;
const MID = (COUNT - 1) / 2;

/**
 * Choreographed fan: slow graceful sweeps that open up with show energy,
 * plus a subtle shiver on drop hits. Aims over the dance floor, never
 * jittering — calm sections read calm, drops read wide.
 */
const stageAim = (t: number, i: number): [number, number] => {
  const { energy, drop } = showState();
  const amp = 0.55 + energy * 0.65;
  const speed = 0.32 + energy * 0.28;
  const wave = Math.sin(t * speed + i * 0.6);
  const sway = Math.sin(t * (speed * 0.7) + i * 1.1) * 0.12 * amp;
  const shiver = drop * Math.sin(t * 6 + i * 2.4) * 0.05;
  return [-(0.42 + 0.2 * wave * amp), (i - MID) * 0.14 * amp + sway + shiver];
};

/** front-of-stage truss with a raked fan of moving heads */
export function StageBeams() {
  const theme = useLightTheme();
  return (
    <group position={[0, 7.1, -8.7]}>
      {/* twin-chord truss */}
      {[0, 0.22].map((y) => (
        <mesh key={y} position={[0, y, 0]} material={matGunmetal}>
          <boxGeometry args={[12.4, 0.07, 0.07]} />
        </mesh>
      ))}
      {Array.from({ length: 13 }, (_, i) => (
        <mesh key={i} position={[-6 + i, 0.11, 0]} rotation={[0, 0, i % 2 ? 0.6 : -0.6]} material={matGunmetal}>
          <boxGeometry args={[0.04, 0.26, 0.04]} />
        </mesh>
      ))}
      {/* drop rods */}
      {[-5.8, 5.8].map((x) => (
        <mesh key={x} position={[x, 1.0, 0]} material={matGunmetal}>
          <cylinderGeometry args={[0.025, 0.025, 1.9, 6]} />
        </mesh>
      ))}
      {Array.from({ length: COUNT }, (_, i) => (
        <LightHead
          key={i}
          index={i}
          palette={theme.heads2}
          position={[(i - MID) * 2.4, -0.02, 0]}
          aim={stageAim}
          beamRadius={0.85}
          strength={0.5}
        />
      ))}
    </group>
  );
}

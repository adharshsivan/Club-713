import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { Architecture } from './Architecture';
import { DanceFloor } from './DanceFloor';
import { Halo } from './Halo';
import { StageBeams } from './StageBeams';
import { Exterior } from './exterior/Exterior';
import { Stage } from './Stage';
import { Mezzanine } from './Mezzanine';
import { Seating } from './Seating';
import { clubTime } from './clock';
import { MEZZ_Y } from './collision';
import { useLightTheme, getLightTheme } from './lightTheme';
import { UnderBalconyBar } from './UnderBalconyBar';
import { Banners } from './Banners';
import { Washroom } from './Washroom';
import { useExteriorMode } from './exterior/mode';

/** beat-reactive key light over the dance floor (gentle — the LED wall leads) */
function PulseLight() {
  const ref = useRef<THREE.PointLight>(null!);
  useFrame(() => {
    const { pulse, bar } = clubTime();
    const theme = getLightTheme();
    ref.current.intensity = 22 + pulse * 14;
    const phrase = Math.floor(bar) % 2;
    ref.current.color.lerp(new THREE.Color(phrase ? theme.pulseA : theme.pulseB), 0.025);
  });
  return <pointLight ref={ref} position={[0, 6.8, -1]} distance={17} decay={1.6} />;
}

export function ClubScene() {
  const theme = useLightTheme();
  const day = useExteriorMode() === 'day';
  return (
    <>
      <color attach="background" args={[day ? '#a5c7de' : '#050508']} />
      <fogExp2 attach="fog" args={[day ? '#bad7e6' : '#0a0a12', day ? 0.005 : 0.015]} />

      {/* efficient light set — no shadow maps, emissives do the storytelling */}
      <ambientLight intensity={0.3} color="#8f86b8" />
      <PulseLight />
      <pointLight position={[-14.5, 3.6, -2]} distance={11} decay={1.7} intensity={22} color={theme.warm} />
      <pointLight position={[0, 4.2, -9.5]} distance={13} decay={1.7} intensity={20} color={theme.white} />
      {/* under the mezzanine: one warm wash per lounge pod */}
      <pointLight position={[7.8, 2.45, 10.2]} distance={9} decay={1.8} intensity={13} color={theme.warm} />
      <pointLight position={[-7.8, 2.45, 10.2]} distance={9} decay={1.8} intensity={13} color={theme.warm} />
      {/* VIP deck: warm wash east, cool-tinged wash west */}
      <pointLight position={[8.5, MEZZ_Y + 3.1, 10.2]} distance={10.5} decay={1.8} intensity={14} color={theme.warm} />
      <pointLight position={[-8.5, MEZZ_Y + 3.1, 10.2]} distance={10.5} decay={1.8} intensity={14} color={theme.cool} />
      <pointLight position={[16, 2.8, -2.5]} distance={8} decay={1.8} intensity={9} color={theme.warm} />
      {/* bar under the mezzanine */}
      <pointLight position={[0, 2.3, 11.8]} distance={9} decay={1.8} intensity={12} color={theme.warm} />

      {/* procedural environment for metal / glass reflections (no network assets) */}
      <Environment resolution={64} frames={1}>
        <Lightformer intensity={1.4} color={theme.warm} position={[0, 4, -9]} scale={[10, 4, 1]} />
        <Lightformer intensity={0.9} color={theme.cool} position={[0, 6, 8]} rotation={[0, Math.PI, 0]} scale={[12, 3, 1]} />
        <Lightformer intensity={0.5} color="#ffffff" position={[0, 9, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[8, 8, 1]} />
        <Lightformer intensity={0.6} color={theme.pulseB} position={[-10, 3, 0]} rotation={[0, Math.PI / 2, 0]} scale={[8, 2, 1]} />
      </Environment>

      <Architecture />
      <DanceFloor />
      <Halo />
      <StageBeams />
      <Stage />
      <Mezzanine />
      <Seating />
      <UnderBalconyBar />
      <Banners />
      <Washroom />
      <Exterior />

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.6} luminanceThreshold={0.3} luminanceSmoothing={0.35} mipmapBlur />
        <Vignette offset={0.22} darkness={0.72} />
      </EffectComposer>
    </>
  );
}

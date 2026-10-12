import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { matBrass, matGunmetal } from './materials';
import { Px } from './pixel/engine';
import { showState } from './show/director';
import { drawDancerScreen, type DancerAccents } from './show/dancers';
import { useLightTheme } from './lightTheme';

const FPS = 24; // smooth enough for eased keyframe interpolation, still cheap at 40x56

const BIG_RES: [number, number] = [40, 56];

const vertex = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// LED-wall look: round diodes, faint refresh band, soft vignette. Kept subtle
// so the crisp pixel art — not the panel effect — is what you notice.
const fragment = /* glsl */ `
  varying vec2 vUv;
  uniform sampler2D uTex;
  uniform vec2 uRes;
  uniform float uTime;
  uniform float uKick;
  void main() {
    vec3 c = texture2D(uTex, vUv).rgb;
    vec2 g = fract(vUv * uRes);
    float diode = 1.0 - smoothstep(0.38, 0.5, length(g - 0.5));
    float roll = 1.0 + 0.07 * exp(-pow((fract(vUv.y - uTime * 0.12) - 0.5) * 8.0, 2.0));
    float vig = 1.0 - 0.28 * smoothstep(0.55, 1.0, length((vUv - 0.5) * vec2(1.2, 1.0) * 1.6));
    vec3 off = vec3(0.010, 0.011, 0.018);
    vec3 col = (off + c * (1.06 + uKick * 0.16)) * diode * roll * vig;
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface ScreenProps {
  position: [number, number, number];
  size: [number, number];
  res: [number, number];
  side: 'L' | 'R';
  accents: DancerAccents;
}

function PixelScreen({ position, size, res, side, accents }: ScreenProps) {
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const screen = useMemo(() => {
    const px = new Px(res[0], res[1]);
    const tex = new THREE.CanvasTexture(px.canvas);
    tex.magFilter = THREE.NearestFilter;
    tex.minFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return { px, tex, step: -1 };
  }, [res]);
  const uniforms = useMemo(() => ({
    uTex: { value: screen.tex },
    uRes: { value: new THREE.Vector2(res[0], res[1]) },
    uTime: { value: 0 },
    uKick: { value: 0 },
  }), [screen, res]);

  useEffect(() => () => screen.tex.dispose(), [screen]);

  const accRef = useRef(accents);
  accRef.current = accents;

  useFrame(() => {
    const s = showState();
    mat.current.uniforms.uTime.value = s.t;
    mat.current.uniforms.uKick.value = s.kick;
    const step = Math.floor(s.t * FPS);
    if (step === screen.step) return;
    screen.step = step;
    drawDancerScreen(screen.px, side, s, accRef.current);
    screen.tex.needsUpdate = true;
  });

  const [width, height] = size;
  return (
    <group position={position}>
      <mesh position={[0, 0, -0.035]} material={matGunmetal}>
        <boxGeometry args={[width + 0.15, height + 0.17, 0.12]} />
      </mesh>
      <mesh position={[0, 0, 0.04]}>
        <planeGeometry args={[width, height]} />
        <shaderMaterial ref={mat} vertexShader={vertex} fragmentShader={fragment} uniforms={uniforms} />
      </mesh>
      <mesh position={[0, height / 2 + 0.08, 0.02]} material={matBrass}>
        <boxGeometry args={[width + 0.17, 0.035, 0.14]} />
      </mesh>
      <mesh position={[0, -height / 2 - 0.08, 0.02]} material={matBrass}>
        <boxGeometry args={[width + 0.17, 0.035, 0.14]} />
      </mesh>
    </group>
  );
}

/** stage LED wings: Nova (left) and Volt (right) dancing in sync */
export function PixelScreens() {
  const theme = useLightTheme();
  const left: DancerAccents = { main: theme.floorA, soft: theme.cool };
  const right: DancerAccents = { main: theme.floorC, soft: theme.pulseA };
  return (
    <group>
      {/* side wings of the stage LED triptych (centre video wall lives in Stage.tsx) */}
      <PixelScreen position={[-5.15, 4.15, -12.42]} size={[2.5, 3.6]} res={BIG_RES} side="L" accents={left} />
      <PixelScreen position={[5.15, 4.15, -12.42]} size={[2.5, 3.6]} res={BIG_RES} side="R" accents={right} />
    </group>
  );
}

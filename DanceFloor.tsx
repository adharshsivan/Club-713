import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { clubTime } from './clock';
import { matBrass } from './materials';
import { getLightTheme } from './lightTheme';

const vertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy / 6.0;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const floorFragment = /* glsl */ `
  varying vec2 vP;
  uniform float uBeat;
  uniform float uTime;
  uniform vec3 uAcid;
  uniform vec3 uViolet;
  uniform vec3 uCyan;
  uniform vec3 uAmber;
  uniform vec2 uPlayer;
  uniform float uPresence;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float beatHit(float b) { return exp(-fract(b) * 6.0); }

  void main() {
    vec2 p = vP;
    float r = length(p);
    float angle = fract(atan(p.y, p.x) / 6.2831853 + 1.0);
    float ring = floor(r * 8.0);
    float sectorCount = 12.0 + ring * 8.0;
    float ringPhase = angle * sectorCount + sin(uTime * 0.23 + ring * 1.4) * 0.12;
    float sector = floor(ringPhase);
    float seed = hash(vec2(ring, sector));

    // Panel joints stay dark while the light moves inside the radial grid.
    float radialJoint = smoothstep(0.015, 0.055, fract(r * 8.0));
    float angularJoint = smoothstep(0.045, 0.14, fract(ringPhase));
    float joint = radialJoint * angularJoint;
    float halfBeat = beatHit(uBeat * 2.0) * 0.32;
    float kick = beatHit(uBeat);

    float slow = sin(angle * 6.2831853 * 3.0 - uTime * 0.75 + r * 8.0) * 0.5 + 0.5;
    float wave = exp(-pow((r - fract(uBeat * 0.19 + 0.13)), 2.0) * 155.0);
    float chaseA = exp(-pow(mod(sector - floor(uBeat * 1.3) + ring * 2.0 + sectorCount * 4.0, sectorCount) / sectorCount, 2.0) * 300.0);
    float chaseB = exp(-pow(mod(sector + floor(uBeat * 0.9) + ring * 3.0 + sectorCount * 4.0, sectorCount) / sectorCount, 2.0) * 300.0);
    float sparkle = step(0.89, hash(vec2(seed * 27.0, floor(uBeat * 2.0) + ring))) * (0.3 + halfBeat);

    vec3 base = mix(uViolet * 0.19, uAcid * 0.14, slow);
    base += uAcid * chaseA * (0.65 + kick * 0.7);
    base += uCyan * chaseB * (0.48 + halfBeat);
    base += mix(uAmber, uViolet, ring / 8.0) * wave * (0.7 + kick * 1.05);
    base += uAmber * sparkle * 0.6;
    // Nearby tiles wake up as the visitor crosses the floor.
    float nearPlayer = exp(-dot(p - uPlayer, p - uPlayer) * 130.0) * uPresence;
    base += uAcid * nearPlayer * (0.35 + kick * 0.3);

    // Centre aperture radiates outward on each downbeat.
    float centre = 1.0 - smoothstep(0.10, 0.16, r);
    float core = 1.0 - smoothstep(0.04, 0.13, r);
    vec3 centreColor = mix(uViolet * 0.2, uAcid * (0.85 + kick * 0.85), core);
    centreColor += uAmber * exp(-pow(r - fract(uBeat * 0.2) * 0.16, 2.0) * 2200.0) * kick;
    vec3 color = mix(base * joint * (0.7 + 0.3 * seed), centreColor, centre);

    color += vec3(0.009, 0.012, 0.019);
    color *= 1.0 - smoothstep(0.94, 1.0, r) * 0.8;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const rimVertex = /* glsl */ `
  varying vec2 vP;
  void main() {
    vP = position.xy;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const rimFragment = /* glsl */ `
  varying vec2 vP;
  uniform float uBeat;
  uniform vec3 uAcid;
  uniform vec3 uViolet;
  void main() {
    float angle = fract(atan(vP.y, vP.x) / 6.2831853 + 1.0);
    float n = 72.0;
    float cell = floor(angle * n);
    float gap = smoothstep(0.03, 0.12, fract(angle * n)) *
                (1.0 - smoothstep(0.87, 0.98, fract(angle * n)));
    float forward = exp(-pow(mod(cell - floor(uBeat * 3.0) + n * 8.0, n) / n, 2.0) * 230.0);
    float reverse = exp(-pow(mod(cell + floor(uBeat * 2.0) + n * 8.0, n) / n, 2.0) * 230.0);
    float kick = exp(-fract(uBeat) * 6.0);
    vec3 color = (uAcid * (0.09 + forward * 1.4) + uViolet * (0.08 + reverse * 1.1)) * gap;
    color += (uAcid + uViolet) * kick * gap * 0.14;
    gl_FragColor = vec4(color, 1.0);
  }
`;

export function DanceFloor() {
  const camera = useThree((state) => state.camera);
  const floor = useRef<THREE.ShaderMaterial>(null!);
  const rim = useRef<THREE.ShaderMaterial>(null!);
  const lastTheme = useRef<string | null>(null);
  const colors = useMemo(() => {
    const theme = getLightTheme();
    return {
      uAcid: { value: new THREE.Color(theme.floorA) },
      uViolet: { value: new THREE.Color(theme.floorB) },
      uCyan: { value: new THREE.Color(theme.floorC) },
      uAmber: { value: new THREE.Color(theme.floorD) },
    };
  }, []);
  const floorUniforms = useMemo(() => ({
    uBeat: { value: 0 }, uTime: { value: 0 },
    uPlayer: { value: new THREE.Vector2(0, 0) }, uPresence: { value: 0 },
    ...colors,
  }), [colors]);
  const rimUniforms = useMemo(() => ({
    uBeat: { value: 0 }, uAcid: colors.uAcid, uViolet: colors.uViolet,
  }), [colors]);

  useFrame(() => {
    const { beat, t } = clubTime();
    const theme = getLightTheme();
    if (lastTheme.current !== theme.id) {
      lastTheme.current = theme.id;
      colors.uAcid.value.set(theme.floorA);
      colors.uViolet.value.set(theme.floorB);
      colors.uCyan.value.set(theme.floorC);
      colors.uAmber.value.set(theme.floorD);
    }
    floor.current.uniforms.uBeat.value = beat;
    floor.current.uniforms.uTime.value = t;
    floor.current.uniforms.uPlayer.value.set(camera.position.x / 6, -(camera.position.z + 1) / 6);
    floor.current.uniforms.uPresence.value = camera.position.y < 2.5 ? 1 : 0;
    rim.current.uniforms.uBeat.value = beat;
  });

  return (
    <group position={[0, 0, -1]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
        <circleGeometry args={[6, 96]} />
        <shaderMaterial ref={floor} vertexShader={vertex} fragmentShader={floorFragment} uniforms={floorUniforms} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.035, 0]} material={matBrass}>
        <ringGeometry args={[5.99, 6.22, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.043, 0]}>
        <ringGeometry args={[6.09, 6.16, 96]} />
        <shaderMaterial ref={rim} vertexShader={rimVertex} fragmentShader={rimFragment} uniforms={rimUniforms} />
      </mesh>
    </group>
  );
}

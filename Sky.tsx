import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useExteriorMode } from './mode';

// ------------------------------------------------------------------ sky dome
const skyVert = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const skyFrag = /* glsl */ `
  varying vec3 vDir;
  uniform float uDay;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    vec3 zen = vec3(0.008, 0.009, 0.028);
    vec3 mid = vec3(0.03, 0.02, 0.06);
    vec3 hor = vec3(0.17, 0.075, 0.11);   // city glow on the horizon
    vec3 col = mix(hor, mid, smoothstep(0.0, 0.16, h));
    col = mix(col, zen, smoothstep(0.16, 0.75, h));
    col = mix(col, vec3(0.02, 0.014, 0.03), 1.0 - smoothstep(-0.25, 0.0, h));
    // moon + soft corona
    vec3 moonDir = normalize(vec3(-0.6, 0.38, 0.7));
    float md = max(dot(d, moonDir), 0.0);
    col += vec3(0.85, 0.88, 1.0) * smoothstep(0.99935, 0.9996, md) * 1.6;
    col += vec3(0.4, 0.45, 0.65) * pow(md, 220.0) * 0.35;
    col += vec3(0.2, 0.22, 0.35) * pow(md, 18.0) * 0.06;
    vec3 dayHorizon = vec3(0.75, 0.84, 0.91);
    vec3 dayMid = vec3(0.45, 0.69, 0.86);
    vec3 dayZenith = vec3(0.26, 0.53, 0.78);
    vec3 day = mix(dayHorizon, dayMid, smoothstep(0.0, 0.3, h));
    day = mix(day, dayZenith, smoothstep(0.3, 0.92, h));
    day = mix(day, vec3(0.78, 0.85, 0.89), 1.0 - smoothstep(-0.25, 0.0, h));
    vec3 sunDir = normalize(vec3(-0.55, 0.72, -0.35));
    float sun = max(dot(d, sunDir), 0.0);
    day += vec3(1.0, 0.9, 0.69) * smoothstep(0.999, 0.9996, sun) * 0.85;
    day += vec3(1.0, 0.83, 0.58) * pow(sun, 90.0) * 0.16;
    col = mix(col, day, uDay);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function SkyDome() {
  const mode = useExteriorMode();
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: skyVert, fragmentShader: skyFrag,
      uniforms: { uDay: { value: mode === 'day' ? 1 : 0 } },
      side: THREE.BackSide, depthWrite: false,
    }),
    [],
  );
  useFrame((_, delta) => {
    mat.uniforms.uDay.value = THREE.MathUtils.damp(mat.uniforms.uDay.value, mode === 'day' ? 1 : 0, 3.5, delta);
  });
  return (
    <mesh material={mat} renderOrder={-10} frustumCulled={false}>
      <sphereGeometry args={[200, 40, 20]} />
    </mesh>
  );
}

// ------------------------------------------------------------------ stars
export function Stars() {
  const geo = useMemo(() => {
    let s = 9;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const n = 1100;
    const arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const y = 0.1 + r() * 0.9;
      const a = r() * Math.PI * 2;
      const rr = Math.sqrt(1 - y * y);
      arr[i * 3] = Math.cos(a) * rr * 190;
      arr[i * 3 + 1] = y * 190;
      arr[i * 3 + 2] = Math.sin(a) * rr * 190;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    return g;
  }, []);
  const mat = useMemo(
    () => new THREE.PointsMaterial({
      color: '#d6dcff', size: 2.4, sizeAttenuation: false, transparent: true,
      opacity: 0.7, fog: false, depthWrite: false,
    }),
    [],
  );
  return <points geometry={geo} material={mat} frustumCulled={false} />;
}

// ------------------------------------------------------------------ distant skyline
const cityVert = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  varying float vSeed;
  void main() {
    vec4 w = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vSeed = float(gl_InstanceID) * 7.31;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;
const cityFrag = /* glsl */ `
  varying vec3 vW;
  varying vec3 vN;
  varying float vSeed;
  uniform float uDay;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 base = vec3(0.016, 0.016, 0.026);
    vec3 dayBase = vec3(0.23, 0.27, 0.32) * (0.85 + 0.15 * vN.x);
    if (vN.y > 0.5) { gl_FragColor = vec4(mix(base * 0.7, dayBase * 1.12, uDay), 1.0); return; }
    float u = abs(vN.x) > 0.5 ? vW.z : vW.x;
    vec2 g = vec2(u / 2.4, vW.y / 3.4);
    vec2 c = floor(g);
    vec2 f = fract(g);
    // anti-aliased window mask: edges are softened by the pixel footprint, and
    // once a window is smaller than ~a pixel it melts into its average so it
    // can no longer crawl or sparkle while the camera orbits
    vec2 fw = fwidth(g);
    float aa = max(fw.x, fw.y);
    float edge = clamp(aa, 0.001, 0.5);
    float win = smoothstep(0.2 - edge, 0.2 + edge, f.x) * (1.0 - smoothstep(0.8 - edge, 0.8 + edge, f.x))
              * smoothstep(0.3 - edge, 0.3 + edge, f.y) * (1.0 - smoothstep(0.78 - edge, 0.78 + edge, f.y));
    float lit = step(0.68, hash(c + vSeed));
    vec3 warm = vec3(1.0, 0.64, 0.32);
    vec3 cool = vec3(0.55, 0.72, 1.0);
    vec3 wc = mix(warm, cool, step(0.82, hash(c * 1.7 + vSeed + 3.1)));
    vec3 wcol = wc * (0.25 + 0.45 * hash(c + vSeed + 7.0));
    float detail = 1.0 - smoothstep(0.18, 0.55, aa);        // 1 near, 0 far
    float meanLit = 0.32 * 0.6 * 0.48;                      // avg lit fraction x window area
    vec3 col = base + mix(vec3(0.30, 0.22, 0.14) * meanLit, win * lit * wcol, detail);
    col += vec3(0.12, 0.05, 0.1) * (1.0 - smoothstep(0.0, 45.0, vW.y)) * 0.3;
    vec3 dayCol = dayBase - win * vec3(0.09, 0.065, 0.045) * detail;
    gl_FragColor = vec4(mix(col, dayCol, uDay), 1.0);
  }
`;

export function Skyline() {
  const mode = useExteriorMode();
  const ref = useRef<THREE.InstancedMesh>(null!);
  const N = 96;
  const mat = useMemo(
    () => new THREE.ShaderMaterial({
      vertexShader: cityVert, fragmentShader: cityFrag,
      uniforms: { uDay: { value: mode === 'day' ? 1 : 0 } },
    }),
    [],
  );
  useFrame((_, delta) => {
    mat.uniforms.uDay.value = THREE.MathUtils.damp(mat.uniforms.uDay.value, mode === 'day' ? 1 : 0, 3.5, delta);
  });
  useLayoutEffect(() => {
    let s = 3;
    const r = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const o = new THREE.Object3D();
    for (let i = 0; i < N; i++) {
      const a = r() * Math.PI * 2;
      const rad = 78 + r() * 85;
      const h = 14 + Math.pow(r(), 2) * 75;
      o.position.set(-20 + Math.cos(a) * rad, h / 2, Math.sin(a) * rad);
      o.rotation.set(0, Math.round(r() * 3) * (Math.PI / 2) + (r() - 0.5) * 0.3, 0);
      o.scale.set(8 + r() * 16, h, 8 + r() * 16);
      o.updateMatrix();
      ref.current.setMatrixAt(i, o.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} material={mat} frustumCulled={false}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

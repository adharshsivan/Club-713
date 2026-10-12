import * as THREE from 'three';

/**
 * Volumetric light-beam shader.
 * Geometry is an open cone that starts at the lens (origin, tiny radius) and
 * opens toward -Y. Soft edges come from a view-angle falloff, so the beam
 * reads as light scattering through haze rather than a solid mesh.
 */
export const BEAM_LEN = 10;

const vert = /* glsl */ `
  uniform float uLength;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying float vAlong;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vAlong = clamp(-position.y / uLength, 0.0, 1.0);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mv.xyz;
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mv;
  }
`;

const frag = /* glsl */ `
  uniform vec3 uColor;
  uniform float uIntensity;
  uniform float uPower;
  uniform float uTime;
  uniform float uSeed;
  varying vec3 vNormalV;
  varying vec3 vViewPos;
  varying float vAlong;
  varying vec2 vUv;

  void main() {
    vec3 V = normalize(-vViewPos);
    float ndv = abs(dot(normalize(vNormalV), V));

    // soft volumetric edge: bright through the middle, vanishing at the silhouette
    float soft = pow(ndv, uPower);

    // light scatters away with distance from the lens
    float a = 1.0 - vAlong;
    float falloff = 0.18 + 0.82 * pow(a, 1.25);
    float startFade = smoothstep(0.0, 0.03, vAlong);
    float endFade = 1.0 - smoothstep(0.78, 1.0, vAlong);

    // never let a beam become a solid slab when the camera is close / inside it
    float prox = smoothstep(0.7, 4.5, length(vViewPos));

    // drifting dust streaks inside the shaft (periodic around the cone)
    float s1 = sin(vUv.x * 6.2831853 * 7.0 + vAlong * 5.0 - uTime * 0.35 + uSeed);
    float s2 = sin(vUv.x * 6.2831853 * 3.0 - vAlong * 2.5 + uTime * 0.22 + uSeed * 1.7);
    float dust = 0.84 + 0.16 * s1 * s2;

    float alpha = soft * falloff * startFade * endFade * prox * dust * uIntensity;

    // white-hot core, coloured halo
    vec3 col = mix(uColor, vec3(1.0), pow(ndv, 9.0) * 0.5);
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createBeamMaterial(color: THREE.Color, intensity: number, power: number, seed: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: color.clone() },
      uIntensity: { value: intensity },
      uPower: { value: power },
      uTime: { value: 0 },
      uSeed: { value: seed },
      uLength: { value: BEAM_LEN },
    },
    vertexShader: vert,
    fragmentShader: frag,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
}

const geoCache = new Map<string, THREE.CylinderGeometry>();

/** open cone: narrow at origin (lens), wide at -Y. Smooth 48-sided silhouette. */
export function beamGeometry(radius: number, topRadius = 0.025) {
  const key = `${radius}|${topRadius}`;
  let g = geoCache.get(key);
  if (!g) {
    g = new THREE.CylinderGeometry(topRadius, radius, BEAM_LEN, 48, 1, true);
    g.translate(0, -BEAM_LEN / 2, 0);
    geoCache.set(key, g);
  }
  return g;
}

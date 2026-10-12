import * as THREE from 'three';

// ------------------------------------------------- ACID identity palette
export const PAL = {
  base: '#0b0b10',
  amber: '#ffb25e',
  amberHot: '#ff9e45',
  violet: '#8b5cf6',
  ultraviolet: '#6d3df0',
  magenta: '#ff3d81',
  cyan: '#38e8ff',
  warmWhite: '#ffe8cf',
  acid: '#b6ff2e',        // ACID signature neon green
  acidHot: '#d6ff5a',
  acidDeep: '#6fd400',
};

// ------------------------------------------------- shared PBR materials
export const matFloor = new THREE.MeshStandardMaterial({
  color: '#16161c', roughness: 0.28, metalness: 0.6,
});
export const matFloorDark = new THREE.MeshStandardMaterial({
  color: '#0e0e13', roughness: 0.5, metalness: 0.4,
});
export const matBronze = new THREE.MeshStandardMaterial({
  color: '#4a382c', roughness: 0.38, metalness: 0.9,
});
export const matBrass = new THREE.MeshStandardMaterial({
  color: '#9a7646', roughness: 0.22, metalness: 0.95,
});
export const matWalnut = new THREE.MeshStandardMaterial({
  color: '#4b2f1f', roughness: 0.62, metalness: 0.08,
});
export const matWalnutDark = new THREE.MeshStandardMaterial({
  color: '#352115', roughness: 0.68, metalness: 0.05,
});
export const matBlack = new THREE.MeshStandardMaterial({
  color: '#101014', roughness: 0.85, metalness: 0.2,
});
export const matPanel = new THREE.MeshStandardMaterial({
  color: '#15151c', roughness: 0.92, metalness: 0.1,
});
export const matGunmetal = new THREE.MeshStandardMaterial({
  color: '#23252c', roughness: 0.35, metalness: 0.85,
});
export const matGlass = new THREE.MeshStandardMaterial({
  color: '#6fb9d8', roughness: 0.05, metalness: 0.9,
  transparent: true, opacity: 0.22, side: THREE.DoubleSide,
});
export const matGlassDark = new THREE.MeshStandardMaterial({
  color: '#30465a', roughness: 0.08, metalness: 0.9,
  transparent: true, opacity: 0.4, side: THREE.DoubleSide,
});
export const matVelvetPlum = new THREE.MeshStandardMaterial({
  color: '#45203c', roughness: 0.95, metalness: 0,
});
export const matVelvetRust = new THREE.MeshStandardMaterial({
  color: '#7a4524', roughness: 0.95, metalness: 0,
});
export const matVelvetInk = new THREE.MeshStandardMaterial({
  color: '#1d2030', roughness: 0.95, metalness: 0,
});
export const matStone = new THREE.MeshStandardMaterial({
  color: '#1a1b22', roughness: 0.42, metalness: 0.25,
});
export const matOnyx = new THREE.MeshStandardMaterial({
  color: '#0c0c11', roughness: 0.22, metalness: 0.4,
});
export const matCabinet = new THREE.MeshStandardMaterial({
  color: '#0b0b0e', roughness: 0.62, metalness: 0.2,
});
export const matSpeakerCone = new THREE.MeshStandardMaterial({
  color: '#1d2129', roughness: 0.32, metalness: 0.7, side: THREE.DoubleSide,
});
export const matSpeakerRubber = new THREE.MeshStandardMaterial({
  color: '#070709', roughness: 0.95, metalness: 0,
});
export const matSmokedGlass = new THREE.MeshStandardMaterial({
  color: '#241a12', roughness: 0.1, metalness: 0.15,
  transparent: true, opacity: 0.6, emissive: new THREE.Color('#ffb25e'), emissiveIntensity: 0.8,
});
export const matGlassWarm = new THREE.MeshStandardMaterial({
  color: '#ffe9d2', roughness: 0.06, metalness: 0,
  transparent: true, opacity: 0.32, emissive: new THREE.Color('#ffcf9a'), emissiveIntensity: 1.5,
});

// ------------------------------------------------- emissive helpers
const emCache = new Map<string, THREE.MeshStandardMaterial>();
export function em(color: string, intensity = 2, base = '#000000') {
  const key = `${color}|${intensity}|${base}`;
  let m = emCache.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color: base, emissive: new THREE.Color(color), emissiveIntensity: intensity,
      roughness: 1, metalness: 0,
    });
    emCache.set(key, m);
  }
  return m;
}

export const matBeam = new THREE.MeshBasicMaterial({
  color: PAL.violet, transparent: true, opacity: 0.1,
  blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
});

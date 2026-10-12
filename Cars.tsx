import { useMemo } from 'react';
import * as THREE from 'three';
import { Builder, rbox, cyl } from '../furn/geo';
import { CAR_L, CAR_W } from './layout';
import { useExteriorMode } from './mode';

const PI = Math.PI;
const WHEEL_R = 0.33;

export interface CarParts {
  shell: THREE.BufferGeometry;
  glass: THREE.BufferGeometry;
  trim: THREE.BufferGeometry;
  tyre: THREE.BufferGeometry;
  rim: THREE.BufferGeometry;
  head: THREE.BufferGeometry;
  tail: THREE.BufferGeometry;
}

const cache = new Map<number, CarParts>();

/**
 * Low-poly parked car. Nose points -x (cars are nosed in toward the west kerb),
 * so the tail lights face the drive aisle. kind 0 = saloon, 1 = hatch, 2 = SUV.
 */
export function carGeos(kind: number): CarParts {
  const hit = cache.get(kind);
  if (hit) return hit;

  const L = kind === 2 ? CAR_L + 0.2 : CAR_L;
  const W = kind === 2 ? CAR_W + 0.08 : CAR_W;
  const sillY = kind === 2 ? 0.42 : 0.33;     // underside of the body
  const bodyH = kind === 2 ? 0.74 : 0.62;
  const cabH = kind === 2 ? 0.66 : 0.54;
  const cabL = kind === 1 ? 1.95 : 2.25;
  const cabX = kind === 1 ? -0.35 : -0.2;     // cabin sits slightly rearward

  const shell = new Builder();
  const glass = new Builder();
  const trim = new Builder();
  const tyre = new Builder();
  const rim = new Builder();
  const head = new Builder();
  const tail = new Builder();

  // main body + a lower bonnet/boot shelf so the silhouette isn't a single slab
  const bodyY = sillY + bodyH / 2;
  shell.add(rbox(L, bodyH, W, 0.26, 3), [0, bodyY, 0]);
  shell.add(rbox(L * 0.26, 0.16, W * 0.9, 0.1, 2), [-L * 0.33, bodyY + bodyH / 2, 0]);
  shell.add(rbox(L * 0.22, 0.14, W * 0.9, 0.1, 2), [L * 0.36, bodyY + bodyH / 2, 0]);

  // cabin: tinted glass box, body-coloured roof slab, four pillars
  const cabY = sillY + bodyH + cabH / 2 - 0.05;
  glass.add(rbox(cabL, cabH, W * 0.86, 0.2, 3), [cabX, cabY, 0]);
  shell.add(rbox(cabL * 0.9, 0.12, W * 0.82, 0.09, 2), [cabX, cabY + cabH / 2, 0]);
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      shell.add(
        rbox(0.11, cabH, 0.11, 0.04, 2),
        [cabX + sx * (cabL / 2 - 0.06), cabY, sz * (W * 0.43 - 0.05)],
      );
    }
  }

  // wheels (axis along z) + hubs
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const wx = sx * L * 0.31;
      const wz = sz * (W / 2 - 0.03);
      tyre.add(cyl(WHEEL_R, WHEEL_R, 0.22, 16), [wx, WHEEL_R, wz], [PI / 2, 0, 0]);
      rim.add(cyl(0.18, 0.18, 0.235, 12), [wx, WHEEL_R, wz], [PI / 2, 0, 0]);
      // arch trim above each wheel
      shell.add(rbox(0.82, 0.1, 0.07, 0.03, 2), [wx, sillY + 0.06, sz * (W / 2 - 0.01)]);
    }
  }

  // bumpers + side rubbing strip + mirrors
  trim.add(rbox(0.16, 0.2, W * 0.98, 0.06, 2), [-L / 2 + 0.05, sillY + 0.16, 0]);
  trim.add(rbox(0.16, 0.2, W * 0.98, 0.06, 2), [L / 2 - 0.05, sillY + 0.16, 0]);
  for (const sz of [-1, 1]) {
    trim.add(rbox(L * 0.7, 0.07, 0.05, 0.02, 2), [0, sillY + 0.2, sz * (W / 2 + 0.01)]);
    trim.add(rbox(0.16, 0.1, 0.1, 0.03, 2), [cabX + cabL / 2 + 0.06, cabY, sz * (W * 0.5)]);
  }
  // grille
  trim.add(rbox(0.05, 0.16, W * 0.5, 0.03, 2), [-L / 2 + 0.01, bodyY + 0.02, 0]);

  // lamps
  for (const sz of [-1, 1]) {
    head.add(rbox(0.07, 0.15, 0.4, 0.04, 2), [-L / 2 + 0.02, bodyY + 0.14, sz * W * 0.29]);
    tail.add(rbox(0.07, 0.13, 0.36, 0.04, 2), [L / 2 - 0.02, bodyY + 0.16, sz * W * 0.3]);
  }

  const parts: CarParts = {
    shell: shell.build(),
    glass: glass.build(),
    trim: trim.build(),
    tyre: tyre.build(),
    rim: rim.build(),
    head: head.build(),
    tail: tail.build(),
  };
  cache.set(kind, parts);
  return parts;
}

// ------------------------------------------------------------------ materials
const paintCache = new Map<string, THREE.MeshPhysicalMaterial>();
function paint(color: string) {
  let m = paintCache.get(color);
  if (!m) {
    m = new THREE.MeshPhysicalMaterial({
      color, roughness: 0.34, metalness: 0.55, clearcoat: 1, clearcoatRoughness: 0.12,
    });
    paintCache.set(color, m);
  }
  return m;
}

const glassMat = new THREE.MeshPhysicalMaterial({
  color: '#0a0f16', roughness: 0.08, metalness: 0.2,
  transparent: true, opacity: 0.78, clearcoat: 1,
});
const trimMat = new THREE.MeshStandardMaterial({ color: '#15171b', roughness: 0.65, metalness: 0.35 });
const tyreMat = new THREE.MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.95, metalness: 0 });
const rimMat = new THREE.MeshStandardMaterial({ color: '#9fa4ab', roughness: 0.3, metalness: 0.9 });
const headMat = new THREE.MeshStandardMaterial({
  color: '#1a1d22', emissive: new THREE.Color('#cfe4ff'), emissiveIntensity: 0.35, roughness: 0.25,
});
const tailMat = new THREE.MeshStandardMaterial({
  color: '#2a0a0c', emissive: new THREE.Color('#ff2a2a'), emissiveIntensity: 0.5, roughness: 0.35,
});
const headDayMat = new THREE.MeshStandardMaterial({ color: '#bfccd2', roughness: 0.24, metalness: 0.12 });
const tailDayMat = new THREE.MeshStandardMaterial({ color: '#9e2830', roughness: 0.34, metalness: 0.05 });

export function Car({
  position, rotationY = 0, kind = 0, color = '#24262b',
}: {
  position: [number, number, number];
  rotationY?: number;
  kind?: number;
  color?: string;
}) {
  const day = useExteriorMode() === 'day';
  const g = useMemo(() => carGeos(kind), [kind]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={g.shell} material={paint(color)} />
      <mesh geometry={g.glass} material={glassMat} />
      <mesh geometry={g.trim} material={trimMat} />
      <mesh geometry={g.tyre} material={tyreMat} />
      <mesh geometry={g.rim} material={rimMat} />
      <mesh geometry={g.head} material={day ? headDayMat : headMat} />
      <mesh geometry={g.tail} material={day ? tailDayMat : tailMat} />
    </group>
  );
}

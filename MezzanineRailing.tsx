import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { matBrass, matBronze, matGlass, em, PAL } from './materials';
import { MEZZANINE_LAYOUT as M } from './mezzanineLayout';

const railingGlass = matGlass.clone();
railingGlass.side = THREE.FrontSide;
railingGlass.depthWrite = false;

// Shear a closed panel instead of tilting a box, so posts and glass ends stay vertical.
function panelGeometry(
  from: THREE.Vector3,
  to: THREE.Vector3,
  bottom: number,
  height: number,
  thickness: number,
) {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const length = Math.hypot(dx, dz);
  const geometry = new THREE.BoxGeometry(length, height, thickness);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, positions.getY(i) + positions.getX(i) / length * (to.y - from.y));
  }

  geometry.rotateY(-Math.atan2(dz, dx));
  geometry.translate(
    (from.x + to.x) / 2,
    (from.y + to.y) / 2 + bottom + height / 2,
    (from.z + to.z) / 2,
  );
  geometry.computeVertexNormals();
  return geometry;
}

function handrailPath(base: THREE.Vector3[], height: number) {
  const points = base.map((p) => p.clone().add(new THREE.Vector3(0, height, 0)));
  const path = new THREE.CurvePath<THREE.Vector3>();
  let cursor = points[0];

  // Small formed elbows join each flight to the balcony without an abrupt rail break.
  for (let i = 1; i < points.length - 1; i++) {
    const corner = points[i];
    const before = corner.clone().lerp(points[i - 1], 0.07 / corner.distanceTo(points[i - 1]));
    const after = corner.clone().lerp(points[i + 1], 0.07 / corner.distanceTo(points[i + 1]));
    path.add(new THREE.LineCurve3(cursor, before));
    path.add(new THREE.QuadraticBezierCurve3(before, corner, after));
    cursor = after;
  }

  path.add(new THREE.LineCurve3(cursor, points[points.length - 1]));
  return path;
}

export function MezzanineRailing() {
  const postsRef = useRef<THREE.InstancedMesh>(null!);
  const mountsRef = useRef<THREE.InstancedMesh>(null!);
  const rail = useMemo(() => {
    const base = [
      new THREE.Vector3(-M.railX, 0, M.stairStartZ),
      new THREE.Vector3(-M.railX, M.elevation, M.frontZ),
      new THREE.Vector3(M.railX, M.elevation, M.frontZ),
      new THREE.Vector3(M.railX, 0, M.stairStartZ),
    ];
    const panes: THREE.BufferGeometry[] = [];
    const shoes: THREE.BufferGeometry[] = [];
    const posts: THREE.Vector3[] = [];
    const divisions = [M.flightPanels, M.balconyPanels, M.flightPanels];

    divisions.forEach((count, segment) => {
      const from = base[segment];
      const to = base[segment + 1];
      const seam = 0.004 / Math.hypot(to.x - from.x, to.z - from.z);

      for (let i = 0; i < count; i++) {
        const a = from.clone().lerp(to, i / count + (i === 0 ? 0 : seam));
        const b = from.clone().lerp(to, (i + 1) / count - (i === count - 1 ? 0 : seam));
        panes.push(panelGeometry(a, b, 0.06, M.railHeight - 0.11, M.glassThickness));
      }

      shoes.push(panelGeometry(from, to, -0.015, 0.095, 0.10));
      for (let i = segment === 0 ? 0 : 1; i <= count; i++) {
        posts.push(from.clone().lerp(to, i / count));
      }
    });

    return {
      panes,
      shoes,
      posts,
      cap: new THREE.TubeGeometry(handrailPath(base, M.railHeight), 768, 0.04, 12, false),
      light: new THREE.TubeGeometry(handrailPath(base, M.railHeight - 0.075), 768, 0.009, 6, false),
      ends: [base[0], base[base.length - 1]].map((p) =>
        new THREE.Vector3(p.x, p.y + M.railHeight, p.z)),
    };
  }, []);

  useLayoutEffect(() => {
    const transform = new THREE.Object3D();
    rail.posts.forEach((p, i) => {
      transform.position.set(p.x, p.y + 0.025 + (M.railHeight - 0.035) / 2, p.z);
      transform.updateMatrix();
      postsRef.current.setMatrixAt(i, transform.matrix);

      transform.position.set(p.x, p.y + 0.055, p.z);
      transform.updateMatrix();
      mountsRef.current.setMatrixAt(i, transform.matrix);
    });
    postsRef.current.instanceMatrix.needsUpdate = true;
    mountsRef.current.instanceMatrix.needsUpdate = true;
    postsRef.current.computeBoundingSphere();
    mountsRef.current.computeBoundingSphere();
  }, [rail]);

  return (
    <group name="continuous-mezzanine-glass-railing">
      {rail.panes.map((geometry, i) => (
        <mesh key={`glass-${i}`} geometry={geometry} material={railingGlass} />
      ))}
      {rail.shoes.map((geometry, i) => (
        <mesh key={`shoe-${i}`} geometry={geometry} material={matBronze} />
      ))}

      <instancedMesh ref={postsRef} args={[undefined, undefined, rail.posts.length]} material={matBrass}>
        <cylinderGeometry args={[0.025, 0.025, M.railHeight - 0.035, 12]} />
      </instancedMesh>
      <instancedMesh ref={mountsRef} args={[undefined, undefined, rail.posts.length]} material={matBrass}>
        <cylinderGeometry args={[0.065, 0.065, 0.055, 12]} />
      </instancedMesh>

      <mesh geometry={rail.cap} material={matBrass} />
      <mesh geometry={rail.light} material={em(PAL.violet, 1.6)} />
      {rail.ends.map((position, i) => (
        <mesh key={`end-${i}`} position={position} material={matBrass}>
          <sphereGeometry args={[0.04, 12, 8]} />
        </mesh>
      ))}
    </group>
  );
}
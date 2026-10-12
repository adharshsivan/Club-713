import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { matBrass, matGunmetal, em, PAL } from '../materials';
import { radialTexture } from '../textures';
import {
  FAB, LEATHER, MARBLE, WALNUT, GLASS, SPIRIT, LAMP_GLOW,
  CERAMIC, FOLIAGE, SCONCE_GLASS,
} from './fabrics';
import {
  sofaGeos, arcGeos, stoolGeos, pedestalTableGeos, coffeeTableGeos, poufGeos,
  armchairGeos, tablewareGeos, potGeos, foliageGeos,
  sconceGeos, floorLampGeos, artPanelGeos, type Arms,
} from './pieces';

type V3 = [number, number, number];
type Mat = THREE.Material;

/** warm light pool that sells "under-lit" furniture on polished floors */
const poolMat = new THREE.MeshBasicMaterial({
  map: radialTexture(), color: '#ffa650', transparent: true, opacity: 0.4,
  blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
});

function Pool({ w, d, lift }: { w: number; d: number; lift: number }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, lift, 0]} material={poolMat}>
      <planeGeometry args={[w, d]} />
    </mesh>
  );
}

// ------------------------------------------------------------------ sofa
export interface SofaProps {
  L: number;
  D?: number;
  arms?: Arms;
  back?: boolean;
  pillows?: number;
  fabric?: Mat;
  accent?: Mat;
  position?: V3;
  rotationY?: number;
  pool?: boolean;
  lift?: number;
}

export function Sofa({
  L, D = 0.95, arms = 'both', back = true, pillows = 0,
  fabric = FAB.plum, accent = FAB.champagne,
  position = [0, 0, 0], rotationY = 0, pool = true, lift = 0.006,
}: SofaProps) {
  const g = useMemo(() => sofaGeos({ L, D, arms, back, pillows }), [L, D, arms, back, pillows]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {pool && <Pool w={L + 1.0} d={D + 1.0} lift={lift} />}
      <mesh geometry={g.fabric} material={fabric} />
      {g.accent && <mesh geometry={g.accent} material={accent} />}
      <mesh geometry={g.metal} material={matBrass} />
    </group>
  );
}

// ------------------------------------------------------------------ curved banquette
export interface ArcProps {
  ri: number;
  ro: number;
  span: number;
  pillows?: number;
  fabric?: Mat;
  accent?: Mat;
  position?: V3;
  rotationY?: number;
}

export function ArcBanquette({
  ri, ro, span, pillows = 0, fabric = FAB.plum, accent = FAB.champagne,
  position = [0, 0, 0], rotationY = 0,
}: ArcProps) {
  const g = useMemo(() => arcGeos({ ri, ro, span, pillows }), [ri, ro, span, pillows]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={g.fabric} material={fabric} />
      {g.accent && <mesh geometry={g.accent} material={accent} />}
      <mesh geometry={g.metal} material={matBrass} />
    </group>
  );
}

// ------------------------------------------------------------------ stools (instanced)
export interface StoolItem { x: number; z: number; y?: number; rot?: number }

/** back of each stool points to local -Z before `rot` is applied */
export function Stools({
  items, h = 0.76, back = true, fabric = LEATHER.cognac,
}: { items: StoolItem[]; h?: number; back?: boolean; fabric?: Mat }) {
  const g = useMemo(() => stoolGeos(h, back), [h, back]);
  const up = useRef<THREE.InstancedMesh>(null!);
  const mt = useRef<THREE.InstancedMesh>(null!);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    items.forEach((it, i) => {
      o.position.set(it.x, it.y ?? 0, it.z);
      o.rotation.set(0, it.rot ?? 0, 0);
      o.updateMatrix();
      up.current.setMatrixAt(i, o.matrix);
      mt.current.setMatrixAt(i, o.matrix);
    });
    up.current.instanceMatrix.needsUpdate = true;
    mt.current.instanceMatrix.needsUpdate = true;
  }, [items]);
  return (
    <>
      <instancedMesh ref={up} args={[g.up, fabric, items.length]} frustumCulled={false} />
      <instancedMesh ref={mt} args={[g.metal, matBrass, items.length]} frustumCulled={false} />
    </>
  );
}

// ------------------------------------------------------------------ tables
export function PedestalTable({
  R, h, top = 'marble', baseR, position = [0, 0, 0],
}: { R: number; h: number; top?: 'marble' | 'wood'; baseR?: number; position?: V3 }) {
  const g = useMemo(() => pedestalTableGeos(R, h, baseR ?? Math.max(0.24, R * 0.58)), [R, h, baseR]);
  return (
    <group position={position}>
      <mesh geometry={g.top} material={top === 'marble' ? MARBLE : WALNUT} />
      <mesh geometry={g.metal} material={matBrass} />
    </group>
  );
}

export function CoffeeTable({
  R, h, top = 'marble', position = [0, 0, 0],
}: { R: number; h: number; top?: 'marble' | 'wood'; position?: V3 }) {
  const g = useMemo(() => coffeeTableGeos(R, h), [R, h]);
  return (
    <group position={position}>
      <mesh geometry={g.top} material={top === 'marble' ? MARBLE : WALNUT} />
      <mesh geometry={g.metal} material={matBrass} />
    </group>
  );
}

// ------------------------------------------------------------------ pouf / armchair
export function Pouf({
  R = 0.24, h = 0.38, fabric = FAB.champagne, position = [0, 0, 0],
}: { R?: number; h?: number; fabric?: Mat; position?: V3 }) {
  const g = useMemo(() => poufGeos(R, h), [R, h]);
  return (
    <group position={position}>
      <mesh geometry={g.up} material={fabric} />
      <mesh geometry={g.metal} material={matBrass} />
    </group>
  );
}

export function Armchair({
  fabric = FAB.plum, position = [0, 0, 0], rotationY = 0,
}: { fabric?: Mat; position?: V3; rotationY?: number }) {
  const g = useMemo(() => armchairGeos(), []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={g.fabric} material={fabric} />
      <mesh geometry={g.metal} material={matBrass} />
    </group>
  );
}

// ------------------------------------------------------------------ tabletop styling
export function TableTop({ position = [0, 0, 0], scale = 1, rotationY = 0 }: {
  position?: V3; scale?: number; rotationY?: number;
}) {
  const g = useMemo(() => tablewareGeos(), []);
  return (
    <group position={position} scale={scale} rotation={[0, rotationY, 0]}>
      <mesh geometry={g.metal} material={matBrass} />
      <mesh geometry={g.glass} material={GLASS} />
      <mesh geometry={g.liquid} material={SPIRIT} />
      <mesh geometry={g.glow} material={LAMP_GLOW} />
    </group>
  );
}

// ------------------------------------------------------------------ potted plant
export function Planter({
  R = 0.22, h = 0.46, scale = 1, seed = 0, position = [0, 0, 0],
}: { R?: number; h?: number; scale?: number; seed?: number; position?: V3 }) {
  const pot = useMemo(() => potGeos(R, h), [R, h]);
  const leaves = useMemo(() => foliageGeos(seed, scale), [seed, scale]);
  return (
    <group position={position}>
      <mesh geometry={pot} material={CERAMIC} />
      <mesh geometry={leaves} position={[0, h, 0]} material={FOLIAGE} />
    </group>
  );
}

// ------------------------------------------------------------------ wall sconce
export function WallSconce({
  position = [0, 0, 0], rotationY = 0, color = PAL.amber,
}: { position?: V3; rotationY?: number; color?: string }) {
  const g = useMemo(() => sconceGeos(), []);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={g.brass} material={matBrass} />
      <mesh geometry={g.glass} material={SCONCE_GLASS} />
      <mesh position={[0, 0, 0.02]} material={em(color, 2.4)}>
        <boxGeometry args={[0.1, 0.1, 0.02]} />
      </mesh>
      <sprite position={[0, 0, 0.05]} scale={[0.5, 0.5, 1]}>
        <spriteMaterial
          map={radialTexture()} color={color} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.6}
        />
      </sprite>
    </group>
  );
}

// ------------------------------------------------------------------ floor lamp
export function FloorLamp({
  h = 1.7, color = PAL.amber, position = [0, 0, 0],
}: { h?: number; color?: string; position?: V3 }) {
  const g = useMemo(() => floorLampGeos(h), [h]);
  return (
    <group position={position}>
      <mesh geometry={g.metal} material={matGunmetal} />
      <mesh geometry={g.shade} material={FAB.champagne} />
      <mesh geometry={g.glow} material={em(color, 1.4, '#2a1a0a')} />
      <sprite position={[0, h - 0.2, 0]} scale={[0.6, 0.6, 1]}>
        <spriteMaterial
          map={radialTexture()} color={color} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} opacity={0.5}
        />
      </sprite>
    </group>
  );
}

// ------------------------------------------------------------------ backlit art panel
export function ArtPanel({
  w = 2.0, h = 1.1, color = PAL.violet, position = [0, 0, 0], rotationY = 0,
}: { w?: number; h?: number; color?: string; position?: V3; rotationY?: number }) {
  const g = useMemo(() => artPanelGeos(w, h), [w, h]);
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh geometry={g.frame} material={matBrass} />
      <mesh geometry={g.inset} material={em(color, 1.3, '#120d1a')} />
    </group>
  );
}

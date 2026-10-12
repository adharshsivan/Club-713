import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { matStone, matOnyx, matBrass, matBlack, em, PAL } from './materials';
import { Pendant, type PendantVariant } from './Pendant';
import { Stools, TableTop, type StoolItem } from './furn/Furniture';
import { MARBLE, LEATHER } from './furn/fabrics';
import { flutesGeo, counterTopGeos } from './furn/pieces';
import { Builder, rbox, cyl } from './furn/geo';
import { BRANDS, brandRadius, liquorParts, type BrandSpec } from './furn/liquor';

const tmp = new THREE.Object3D();

const fluteMat = new THREE.MeshStandardMaterial({ color: '#2c2d38', roughness: 0.26, metalness: 0.55 });

interface Slot { x: number; y: number; rot: number }

const rnd = (n: number) => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** one brand = glass + liquid + closure + printed label, each a single instanced draw */
function BrandBottles({ brand, slots }: { brand: BrandSpec; slots: Slot[] }) {
  const parts = useMemo(() => liquorParts(brand), [brand]);
  const glass = useRef<THREE.InstancedMesh>(null!);
  const liquid = useRef<THREE.InstancedMesh>(null!);
  const cap = useRef<THREE.InstancedMesh>(null!);
  const label = useRef<THREE.InstancedMesh>(null!);

  useLayoutEffect(() => {
    slots.forEach((s, i) => {
      tmp.position.set(s.x, s.y, 0.22);
      tmp.rotation.set(0, s.rot, 0);
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      [glass, liquid, cap, label].forEach((m) => m.current.setMatrixAt(i, tmp.matrix));
    });
    [glass, liquid, cap, label].forEach((m) => { m.current.instanceMatrix.needsUpdate = true; });
  }, [slots]);

  const n = Math.max(1, slots.length);
  return (
    <>
      <instancedMesh ref={liquid} args={[parts.liquid, parts.liquidMat, n]} frustumCulled={false} />
      <instancedMesh ref={cap} args={[parts.cap, parts.capMat, n]} frustumCulled={false} />
      <instancedMesh ref={label} args={[parts.label, parts.labelMat, n]} frustumCulled={false} />
      {/* glass last: transparent, drawn over the liquid and label behind it */}
      <instancedMesh ref={glass} args={[parts.glass, parts.glassMat, n]} frustumCulled={false} renderOrder={2} />
    </>
  );
}

/**
 * Stocked like a real back bar: bottles of the same spirit sit together in
 * little runs of two to four, every label turned out to the room.
 */
function Bottles({ length, shelfYs }: { length: number; shelfYs: number[] }) {
  const lists = useMemo(() => {
    const out = new Map<string, Slot[]>(BRANDS.map((b) => [b.id, []]));
    shelfYs.forEach((y, si) => {
      const limit = length / 2 - 0.2;
      let x = -length / 2 + 0.2;
      let n = 0;
      while (x < limit) {
        const brand = BRANDS[Math.floor(rnd(si * 31 + n * 7.7) * BRANDS.length)];
        const run = 2 + Math.floor(rnd(si * 13 + n * 3.3) * 3);
        const r = brandRadius(brand);
        for (let c = 0; c < run && x + r < limit; c++) {
          out.get(brand.id)!.push({
            x: x + r,
            y: y + 0.0175,
            rot: (rnd(si * 97 + n * 11 + c) - 0.5) * 0.28,
          });
          x += r * 2 + 0.035;
        }
        x += 0.045;
        n++;
      }
    });
    return out;
  }, [length, shelfYs]);

  return (
    <>
      {BRANDS.map((b) => {
        const slots = lists.get(b.id)!;
        return slots.length ? <BrandBottles key={b.id} brand={b} slots={slots} /> : null;
      })}
    </>
  );
}

function BackFins({ length, panelH }: { length: number; panelH: number }) {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const n = Math.max(5, Math.round(length / 0.62));
  useLayoutEffect(() => {
    for (let i = 0; i < n; i++) {
      const x = -length / 2 + (i + 0.5) * (length / n);
      const h = panelH - 0.16;
      tmp.position.set(x, 0.08 + h / 2, 0.11);
      tmp.rotation.set(0, 0, 0);
      tmp.scale.set(0.05, h, 0.09);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, [length, panelH, n]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, n]} material={matBrass}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

export interface BarProps {
  length: number;
  accent?: string;
  position: [number, number, number];
  rotationY?: number;
  variant?: 'low' | 'full';
  pendant?: PendantVariant;
  pendantColor?: string;
}

/**
 * Premium parametric bar. Back bar: onyx + brass fins + warm wash + turned
 * bottles. Counter: reeded stone front, veined marble top with brass edging,
 * brass foot rail, leather stools with barrel backs, styled service stations.
 * Local space: back wall at z = 0, guests stand at +z.
 */
export function BarUnit({
  length,
  accent = PAL.amber,
  position,
  rotationY = 0,
  variant = 'low',
  pendant = 'smoked',
  pendantColor = PAL.amber,
}: BarProps) {
  const low = variant === 'low';
  const panelH = low ? 2.2 : 2.85;
  const shelfYs = useMemo(() => (low ? [0.68, 1.14, 1.6] : [0.92, 1.58, 2.24]), [low]);
  const counterZ = low ? 1.9 : 2.05;
  const ceiling = low ? 2.95 : 8.98;
  const pendantBottom = low ? 1.95 : 2.4;
  const pendantN = Math.max(3, Math.round(length / 2.15));

  const c = useMemo(() => {
    const body = new Builder().add(rbox(length, 1.0, 0.85, 0.03, 3), [0, 0.6, 0]).build();
    const plinth = new Builder().add(rbox(length - 0.2, 0.1, 0.72, 0.02, 2), [0, 0.05, 0]).build();
    const rail = new Builder();
    rail.add(cyl(0.021, 0.021, length - 0.3, 10), [0, 0.24, 0.58], [0, 0, Math.PI / 2]);
    for (const sx of [-1, 0, 1]) {
      rail.add(cyl(0.014, 0.014, 0.14, 8), [sx * (length / 2 - 0.25), 0.24, 0.52], [Math.PI / 2, 0, 0]);
    }
    return {
      body,
      plinth,
      rail: rail.build(),
      flutes: flutesGeo(length - 0.1, 0.9, 0.58, 0.034, 0.095),
      tops: counterTopGeos(length, 1.0, 1.15),
    };
  }, [length]);

  const stools = useMemo<StoolItem[]>(() => {
    const n = Math.max(4, Math.floor(length / 1.2));
    return Array.from({ length: n }, (_, i) => ({
      x: -length / 2 + (i + 0.5) * (length / n),
      z: 0.95,
      rot: Math.PI,
    }));
  }, [length]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* ---------------- back bar ---------------- */}
      <mesh position={[0, panelH / 2 + 0.1, 0.03]} material={matOnyx}>
        <boxGeometry args={[length + 0.4, panelH + 0.2, 0.14]} />
      </mesh>
      <mesh position={[0, panelH / 2 + 0.1, 0.1]} material={em(accent, 0.55, '#1a1206')}>
        <planeGeometry args={[length, panelH]} />
      </mesh>
      <BackFins length={length} panelH={panelH} />
      <mesh position={[0, panelH + 0.16, 0.16]} material={em(accent, 2.6)}>
        <boxGeometry args={[length, 0.035, 0.035]} />
      </mesh>
      <mesh position={[0, panelH + 0.16, 0.05]} material={em(accent, 0.9, '#150e05')}>
        <planeGeometry args={[length, 0.5]} />
      </mesh>

      {/* shelves + turned bottles */}
      {shelfYs.map((y) => (
        <group key={y}>
          <mesh position={[0, y, 0.2]} material={matBrass}>
            <boxGeometry args={[length, 0.035, 0.36]} />
          </mesh>
          <mesh position={[0, y - 0.015, 0.37]} material={em(accent, 1.8)}>
            <boxGeometry args={[length, 0.012, 0.012]} />
          </mesh>
        </group>
      ))}
      <Bottles length={length} shelfYs={shelfYs} />

      {/* ---------------- counter ---------------- */}
      <group position={[0, 0, counterZ]}>
        <mesh geometry={c.plinth} material={matBlack} />
        <mesh geometry={c.body} material={matStone} />
        <mesh geometry={c.flutes} position={[0, 0, 0.425]} material={fluteMat} />
        <mesh geometry={c.tops.slab} material={MARBLE} />
        <mesh geometry={c.tops.brass} material={matBrass} />
        <mesh geometry={c.rail} material={matBrass} />

        {/* shadow-gap glow + top grazing line */}
        <mesh position={[0, 0.1, 0.4]} material={em(accent, 2.4)}>
          <boxGeometry args={[length - 0.1, 0.026, 0.026]} />
        </mesh>
        <mesh position={[0, 1.153, -0.46]} material={em(accent, 1.8)}>
          <boxGeometry args={[length, 0.012, 0.012]} />
        </mesh>

        {/* brass-framed onyx inlay set into the fluting (no signage) */}
        <group position={[0, 0.62, 0.485]}>
          <mesh material={matBrass}>
            <boxGeometry args={[2.12, 0.6, 0.026]} />
          </mesh>
          <mesh position={[0, 0, 0.004]} material={matOnyx}>
            <boxGeometry args={[2.04, 0.52, 0.026]} />
          </mesh>
        </group>

        {/* styled service stations */}
        {[-length / 3, 0, length / 3].map((x, i) => (
          <TableTop key={x} position={[x, 1.15, -0.02]} rotationY={i * 1.9} />
        ))}

        <Stools items={stools} h={0.78} fabric={LEATHER.cognac} />
      </group>

      {/* ---------------- pendants ---------------- */}
      {Array.from({ length: pendantN }, (_, i) => {
        const x = -length / 2 + (i + 0.5) * (length / pendantN);
        return (
          <Pendant
            key={i}
            variant={pendant}
            color={pendantColor}
            position={[x, ceiling, counterZ + 0.05]}
            bottom={pendantBottom}
            scale={0.92}
          />
        );
      })}
    </group>
  );
}

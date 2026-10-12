import { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { matBrass, matBronze, matGunmetal, matOnyx, em, PAL } from '../materials';
import { pavingTexture, asphaltTexture, radialTexture, textTexture } from '../textures';
import { Builder, rbox, cyl, lathe, circleProfile, discProfile, memo } from '../furn/geo';
import { FAB, WALNUT } from '../furn/fabrics';
import { Car } from './Cars';
import { useExteriorMode } from './mode';
import {
  FX, DOOR, VEST, CANOPY, PARK, PARK_CARS, PLAZA, STREET, TREES, BENCHES,
  LAMP_Z, LAMP_X, LAMP_X_FAR, BOLLARDS, POSTS_A, POSTS_B, PODIUM,
} from './layout';

const PI = Math.PI;
type R4 = [number, number, number, number];

const box = (w: number, h: number, d: number) =>
  memo(`bx|${w}|${h}|${d}`, () => new THREE.BoxGeometry(w, h, d));

// ------------------------------------------------------------------ materials
const pavingMat = new THREE.MeshStandardMaterial({
  map: pavingTexture(), roughness: 0.2, metalness: 0.45, envMapIntensity: 1.2,
});
const asphaltMat = new THREE.MeshStandardMaterial({
  map: asphaltTexture(), roughness: 0.34, metalness: 0.35, envMapIntensity: 1.0,
});
const farMat = new THREE.MeshStandardMaterial({ color: '#0b0b0f', roughness: 0.95 });
const curbStone = new THREE.MeshStandardMaterial({ color: '#34343c', roughness: 0.5, metalness: 0.15 });
const planterStone = new THREE.MeshStandardMaterial({ color: '#2e2e36', roughness: 0.55, metalness: 0.12 });
const paintMat = new THREE.MeshStandardMaterial({ color: '#bdbdc3', roughness: 0.6, emissive: '#26262a' });
const paintDayMat = new THREE.MeshStandardMaterial({ color: '#bdbdc3', roughness: 0.6 });
const lampLensMat = new THREE.MeshStandardMaterial({ color: '#d0d8dd', roughness: 0.45, metalness: 0.05 });
const barkMat = new THREE.MeshStandardMaterial({ color: '#2b211a', roughness: 0.9 });
const soilMat = new THREE.MeshStandardMaterial({ color: '#0d0b09', roughness: 1 });
const hedgeMat = new THREE.MeshStandardMaterial({ color: '#13241a', roughness: 0.9 });

/** foliage lit from below: vertex colour drives both albedo and an uplight glow */
const leafDay = { value: 0 };
const leafMat = (() => {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.82, vertexColors: true });
  m.onBeforeCompile = (s) => {
    s.uniforms.uDay = leafDay;
    s.fragmentShader = s.fragmentShader.replace(
      '#include <common>',
      '#include <common>\nuniform float uDay;',
    ).replace(
      '#include <emissivemap_fragment>',
      '#include <emissivemap_fragment>\n  totalEmissiveRadiance += vColor.rgb * 0.85 * (1.0 - uDay);',
    );
  };
  m.customProgramCacheKey = () => 'acid-leaf';
  return m;
})();

function glow(color: string, opacity: number) {
  return new THREE.MeshBasicMaterial({
    map: radialTexture(), color, transparent: true, opacity,
    blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
  });
}
const lampPoolMat = glow('#ffd9a8', 0.42);
const amberPoolMat = glow('#ffa650', 0.38);
const acidPoolMat = glow('#9bff3a', 0.34);

// ------------------------------------------------------------------ ground
function rectsGeo(rects: R4[], tile: number) {
  const parts = rects.map(([x1, x2, z1, z2]) => {
    const g = new THREE.PlaneGeometry(x2 - x1, z2 - z1, 1, 1);
    g.rotateX(-PI / 2);
    g.translate((x1 + x2) / 2, 0, (z1 + z2) / 2);
    const p = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / tile, -p.getZ(i) / tile);
    return g;
  });
  const out = mergeGeometries(parts, false)!;
  parts.forEach((g) => g.dispose());
  return out;
}

function Ground() {
  const day = useExteriorMode() === 'day';
  const g = useMemo(() => {
    const plaza = rectsGeo(
      [
        [PLAZA.x1, PLAZA.x2, 13.5, PLAZA.z2],
        [PLAZA.x1, PLAZA.x2, PLAZA.z1, -13.5],
        [PLAZA.x1, PARK.x1, -13.5, 13.5],
        [PARK.x2, FX, -13.5, 13.5],
        [PARK.x1, PARK.x2, PARK.z2, 13.5],
        [PARK.x1, PARK.x2, -13.5, PARK.z1],
        [18.3, PLAZA.x2, -13.5, 13.5],
      ],
      4.8,
    );
    // asphalt pad filling the car-park footprint
    const parkPad = rectsGeo([[PARK.x1, PARK.x2, PARK.z1, PARK.z2]], 6);
    const street = rectsGeo([[STREET.x1, STREET.x2, -200, 200]], 6);
    const walk = rectsGeo([[-60, STREET.x1, -200, 200]], 4.8);
    const far = rectsGeo(
      [
        [-220, -60, -220, 220],
        [PLAZA.x2, 220, -220, 220],
        [PLAZA.x1, PLAZA.x2, PLAZA.z2, 220],
        [PLAZA.x1, PLAZA.x2, -220, PLAZA.z1],
      ],
      10,
    );

    // kerbs, garden walls, far hedge
    const stone = new Builder();
    const cap = new Builder();
    stone.add(box(0.26, 0.13, 400), [PLAZA.x1 - 0.13, 0.065, 0]);
    stone.add(box(0.26, 0.13, 400), [STREET.x1 + 0.13, 0.065, 0]);
    const wallH = 0.62;
    stone.add(rbox(PLAZA.x2 - PLAZA.x1, wallH, 0.45, 0.03), [(PLAZA.x1 + PLAZA.x2) / 2, wallH / 2, PLAZA.z2 - 0.2]);
    stone.add(rbox(PLAZA.x2 - PLAZA.x1, wallH, 0.45, 0.03), [(PLAZA.x1 + PLAZA.x2) / 2, wallH / 2, PLAZA.z1 + 0.2]);
    stone.add(rbox(0.45, wallH, PLAZA.z2 - PLAZA.z1, 0.03), [PLAZA.x2 - 0.2, wallH / 2, 0]);
    cap.add(box(PLAZA.x2 - PLAZA.x1, 0.03, 0.5), [(PLAZA.x1 + PLAZA.x2) / 2, wallH + 0.015, PLAZA.z2 - 0.2]);
    cap.add(box(PLAZA.x2 - PLAZA.x1, 0.03, 0.5), [(PLAZA.x1 + PLAZA.x2) / 2, wallH + 0.015, PLAZA.z1 + 0.2]);
    cap.add(box(0.5, 0.03, PLAZA.z2 - PLAZA.z1), [PLAZA.x2 - 0.2, wallH + 0.015, 0]);
    const hedge = new Builder().add(rbox(0.9, 1.2, 400, 0.2), [-59.95, 0.6, 0]).build();

    // road markings
    const paint = new Builder();
    for (let z = -198; z < 198; z += 6) {
      if (Math.abs(z - DOOR.zc) < 4) continue;
      paint.add(box(0.15, 0.01, 3), [-50, 0.006, z]);
    }
    paint.add(box(0.12, 0.01, 400), [-44.9, 0.006, 0]);
    paint.add(box(0.12, 0.01, 400), [-55.1, 0.006, 0]);
    for (let i = 0; i < 10; i++) paint.add(box(0.5, 0.01, 3.2), [-55 + 0.5 + i, 0.007, DOOR.zc]);

    return {
      plaza, parkPad, street, walk, far,
      stone: stone.build(), cap: cap.build(), hedge, paint: paint.build(),
    };
  }, []);

  return (
    <group>
      <mesh geometry={g.plaza} material={pavingMat} />
      <mesh geometry={g.parkPad} material={asphaltMat} />
      <mesh geometry={g.walk} material={pavingMat} />
      <mesh geometry={g.street} material={asphaltMat} />
      <mesh geometry={g.far} material={farMat} />
      <mesh geometry={g.stone} material={curbStone} />
      <mesh geometry={g.cap} material={matBronze} />
      <mesh geometry={g.hedge} material={hedgeMat} />
      <mesh geometry={g.paint} material={day ? paintDayMat : paintMat} />
    </group>
  );
}

// ------------------------------------------------------------------ guest car park
function CarPark() {
  const day = useExteriorMode() === 'day';
  const { x1, x2, z1, z2, bayDepth, bays, kerbH } = PARK;
  const span = (z2 - z1) / bays;
  const cx = (x1 + x2) / 2;
  const cz = (z1 + z2) / 2;

  const g = useMemo(() => {
    const paint = new Builder();
    const kerb = new Builder();
    const stops = new Builder();

    // bay dividers + the head-of-bay line
    for (let i = 0; i <= bays; i++) {
      paint.add(box(bayDepth, 0.012, 0.11), [x1 + bayDepth / 2, 0.008, z1 + i * span]);
    }
    paint.add(box(0.11, 0.012, z2 - z1), [x1 + bayDepth, 0.008, cz]);
    // aisle centre dashes
    for (let z = z1 + 0.6; z < z2 - 0.4; z += 1.5) {
      paint.add(box(0.09, 0.012, 0.8), [x1 + bayDepth + (x2 - x1 - bayDepth) / 2, 0.008, z]);
    }

    // kerbs: solid along the west (car stop) edge, low trims north + south
    kerb.add(rbox(0.3, kerbH + 0.18, z2 - z1 + 0.6, 0.05), [x1 - 0.15, (kerbH + 0.18) / 2, cz]);
    kerb.add(rbox(x2 - x1 + 0.6, kerbH, 0.3, 0.04), [cx, kerbH / 2, z1 - 0.15]);
    kerb.add(rbox(x2 - x1 + 0.6, kerbH, 0.3, 0.04), [cx, kerbH / 2, z2 + 0.15]);

    // concrete wheel stops, one per bay
    for (let i = 0; i < bays; i++) {
      stops.add(rbox(0.28, 0.12, 1.5, 0.05), [x1 + 0.52, 0.06, z1 + (i + 0.5) * span]);
    }

    return { paint: paint.build(), kerb: kerb.build(), stops: stops.build() };
  }, [x1, x2, z1, z2, bayDepth, bays, kerbH, cx, cz, span]);

  // two lamp masts on the aisle edge
  const lampX = x2 - 0.5;
  const lamps = [z1 + span * 0.7, z2 - span * 0.7];

  return (
    <group>
      <mesh geometry={g.kerb} material={curbStone} />
      <mesh geometry={g.paint} material={day ? paintDayMat : paintMat} />
      <mesh geometry={g.stops} material={planterStone} />

      {PARK_CARS.map((c) => (
        <Car key={`${c.x},${c.z}`} position={[c.x, 0, c.z]} rotationY={PI} kind={c.kind} color={c.color} />
      ))}

      {lamps.map((z) => (
        <group key={z} position={[lampX, 0, z]}>
          <mesh position={[0, 0.06, 0]} material={matGunmetal}>
            <cylinderGeometry args={[0.18, 0.22, 0.12, 12]} />
          </mesh>
          <mesh position={[0, 2.6, 0]} material={matGunmetal}>
            <cylinderGeometry args={[0.055, 0.075, 5.1, 12]} />
          </mesh>
          <mesh position={[0, 5.18, 0]} material={matGunmetal}>
            <boxGeometry args={[0.7, 0.1, 0.26]} />
          </mesh>
          <mesh position={[0, 5.11, 0]} material={day ? lampLensMat : em(PAL.warmWhite, 2.6)}>
            <boxGeometry args={[0.56, 0.02, 0.16]} />
          </mesh>
          <mesh visible={!day} position={[0, 0.02, 0]} rotation={[-PI / 2, 0, 0]} material={lampPoolMat}>
            <planeGeometry args={[9, 9]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// ------------------------------------------------------------------ trees in planters
function canopyGeo() {
  return memo('tree-canopy', () => {
    const spec: [number, number, number, number][] = [
      [0, 3.55, 0, 1.3], [0.85, 3.25, 0.3, 0.95], [-0.75, 3.3, -0.4, 1.0],
      [0.2, 4.2, -0.3, 0.95], [-0.35, 3.05, 0.75, 0.85], [0.5, 3.9, 0.75, 0.8],
    ];
    const blobs = spec.map(([x, y, z, r], k) => {
      let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(r, 2);
      g.deleteAttribute('normal');
      g.deleteAttribute('uv');
      g = mergeVertices(g);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const vx = p.getX(i), vy = p.getY(i), vz = p.getZ(i);
        const n = Math.sin(vx * 3.1 + vz * 2.3 + k) * Math.sin(vy * 2.7 + vx * 1.3) * 0.12 * r
          + Math.sin(vx * 7.3 + vy * 5.1 + vz * 6.7) * 0.04 * r;
        const s = 1 + n / r;
        p.setXYZ(i, vx * s + x, vy * s * 0.9 + y, vz * s + z);
      }
      return g;
    });
    const out = mergeGeometries(blobs, false)!;
    out.computeVertexNormals();
    const p = out.attributes.position;
    const col = new Float32Array(p.count * 3);
    for (let i = 0; i < p.count; i++) {
      const h = THREE.MathUtils.clamp((p.getY(i) - 2.2) / 2.6, 0, 1);
      const lit = Math.pow(1 - h, 2.2);
      col[i * 3] = 0.025 + 0.42 * lit;
      col[i * 3 + 1] = 0.05 + 0.36 * lit;
      col[i * 3 + 2] = 0.03 + 0.12 * lit;
    }
    out.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return out;
  });
}

function Trees() {
  const day = useExteriorMode() === 'day';
  useLayoutEffect(() => {
    leafDay.value = day ? 1 : 0;
  }, [day]);
  const g = useMemo(() => {
    const planter = new Builder();
    const rim = new Builder();
    const soil = new Builder();
    const trunk = new Builder();
    const leaves = new Builder();
    const pools = new Builder();
    const body = lathe([[0, 0], [1.0, 0], [1.1, 0.7], [1.0, 0.72], [0.96, 0.66], [0, 0.66]], 40);
    const ring = lathe(circleProfile(1.06, 0.71, 0.018, 6), 48);
    const stem = lathe([[0, 0], [0.13, 0], [0.1, 1.0], [0.075, 2.25], [0, 2.3]], 12);
    const branch = cyl(0.035, 0.055, 1.0, 8);
    const plane = new THREE.PlaneGeometry(1, 1);
    TREES.forEach(([x, z], i) => {
      const rot = i * 1.37;
      planter.add(body, [x, 0, z]);
      rim.add(ring, [x, 0, z]);
      soil.add(cyl(0.95, 0.95, 0.02, 32), [x, 0.67, z]);
      trunk.add(stem, [x, 0.66, z]);
      trunk.add(branch, [x + 0.25 * Math.cos(rot), 2.3, z + 0.25 * Math.sin(rot)], [0.5, rot, 0]);
      trunk.add(branch, [x - 0.22 * Math.cos(rot), 2.4, z - 0.22 * Math.sin(rot)], [-0.45, rot, 0]);
      leaves.add(canopyGeo(), [x, 0, z], [0, rot, 0], 0.95 + (i % 3) * 0.06);
      pools.add(plane, [x, 0.01, z], [-PI / 2, 0, 0], [4.6, 4.6, 1]);
    });
    return {
      planter: planter.build(), rim: rim.build(), soil: soil.build(),
      trunk: trunk.build(), leaves: leaves.build(), pools: pools.build(),
    };
  }, []);
  return (
    <group>
      <mesh visible={!day} geometry={g.pools} material={amberPoolMat} />
      <mesh geometry={g.planter} material={planterStone} />
      <mesh geometry={g.rim} material={matBrass} />
      <mesh geometry={g.soil} material={soilMat} />
      <mesh geometry={g.trunk} material={barkMat} />
      <mesh geometry={g.leaves} material={leafMat} />
    </group>
  );
}

// ------------------------------------------------------------------ benches
function Benches() {
  const day = useExteriorMode() === 'day';
  const g = useMemo(() => {
    const base = new Builder();
    const slats = new Builder();
    const led = new Builder();
    BENCHES.forEach(([x, z]) => {
      base.add(rbox(0.56, 0.38, 2.6, 0.04), [x, 0.19, z]);
      for (let k = 0; k < 5; k++) slats.add(rbox(0.088, 0.045, 2.64, 0.015), [x - 0.2 + k * 0.1, 0.405, z]);
      led.add(box(0.02, 0.02, 2.4), [x - 0.29, 0.05, z]);
      led.add(box(0.02, 0.02, 2.4), [x + 0.29, 0.05, z]);
    });
    return { base: base.build(), slats: slats.build(), led: led.build() };
  }, []);
  return (
    <group>
      <mesh geometry={g.base} material={curbStone} />
      <mesh geometry={g.slats} material={WALNUT} />
      <mesh geometry={g.led} material={day ? matBronze : em(PAL.amber, 2)} />
    </group>
  );
}

// ------------------------------------------------------------------ street lamps + bollards
function StreetFurniture() {
  const day = useExteriorMode() === 'day';
  const g = useMemo(() => {
    const pole = new Builder();
    const head = new Builder();
    const pools = new Builder();
    const plane = new THREE.PlaneGeometry(1, 1);
    for (const z of LAMP_Z) {
      for (const [x, dir] of [[LAMP_X, -1], [LAMP_X_FAR, 1]] as [number, number][]) {
        pole.add(lathe(discProfile(0.2, 0.12, 0.04), 24), [x, 0, z]);
        pole.add(cyl(0.055, 0.08, 6.6, 12), [x, 3.3, z]);
        pole.add(rbox(2.0, 0.09, 0.2, 0.035), [x + dir * 0.95, 6.62, z]);
        head.add(box(1.6, 0.014, 0.1), [x + dir * 1.05, 6.568, z]);
        pools.add(plane, [x + dir * 1.4, 0.014, z], [-PI / 2, 0, 0], [8.5, 8.5, 1]);
      }
    }
    const bollard = new Builder();
    const ring = new Builder();
    for (const [x, z] of BOLLARDS) {
      bollard.add(cyl(0.085, 0.1, 0.9, 16), [x, 0.45, z]);
      bollard.add(lathe(discProfile(0.09, 0.03, 0.012, 0.015, 3), 16), [x, 0.9, z]);
      ring.add(cyl(0.091, 0.091, 0.05, 16), [x, 0.72, z]);
    }
    return {
      pole: pole.build(), head: head.build(), pools: pools.build(),
      bollard: bollard.build(), ring: ring.build(),
    };
  }, []);
  return (
    <group>
      <mesh geometry={g.pole} material={matGunmetal} />
      <mesh geometry={g.head} material={day ? lampLensMat : em(PAL.warmWhite, 3)} />
      <mesh visible={!day} geometry={g.pools} material={lampPoolMat} />
      <mesh geometry={g.bollard} material={matGunmetal} />
      <mesh geometry={g.ring} material={day ? matBronze : em(PAL.amber, 2.2)} />
    </group>
  );
}

// ------------------------------------------------------------------ arrival: path, queue, host
function Arrival() {
  const day = useExteriorMode() === 'day';
  const g = useMemo(() => {
    const posts = new Builder();
    const ropes = new Builder();
    const post = lathe(
      [[0, 0], [0.17, 0], [0.17, 0.025], [0.05, 0.045], [0.022, 0.07], [0.022, 0.9],
        [0.034, 0.92], [0.045, 0.96], [0.034, 1.0], [0, 1.0]],
      24,
    );
    for (const line of [POSTS_A, POSTS_B]) {
      line.xs.forEach((x, i) => {
        posts.add(post, [x, 0, line.z]);
        if (i === 0) return;
        const xa = line.xs[i - 1];
        const curve = new THREE.QuadraticBezierCurve3(
          new THREE.Vector3(xa, 0.9, line.z),
          new THREE.Vector3((xa + x) / 2, 0.55, line.z),
          new THREE.Vector3(x, 0.9, line.z),
        );
        ropes.add(new THREE.TubeGeometry(curve, 18, 0.024, 8, false));
      });
    }
    const inlay = new Builder();
    const len = VEST.x1 - PLAZA.x1 - 0.1;
    for (const z of [9.2, 11.6]) inlay.add(box(len, 0.006, 0.035), [(PLAZA.x1 + VEST.x1) / 2, 0.004, z]);
    return { posts: posts.build(), ropes: ropes.build(), inlay: inlay.build() };
  }, []);

  const medallion = textTexture({
    text: '713', color: '#dcffa6', tracking: 190, width: 1024, height: 320,
  });
  const tablet = textTexture({ text: 'GUEST LIST', color: '#bfe9ff', width: 512, height: 128 });

  return (
    <group>
      <mesh geometry={g.posts} material={matBrass} />
      <mesh geometry={g.ropes} material={FAB.plum} />
      {/* acid-green light channels guiding the walk to the door */}
      <mesh geometry={g.inlay} material={day ? matBrass : em(PAL.acid, 2.0)} />

      {/* floor medallion on the approach */}
      <group position={[-33.5, 0.006, DOOR.zc]} rotation={[0, -PI / 2, 0]}>
        <mesh rotation={[-PI / 2, 0, 0]}>
          <planeGeometry args={[3.6, 1.12]} />
          {day
            ? <meshStandardMaterial map={medallion.tex} transparent roughness={0.65} metalness={0} opacity={0.9} />
            : <meshBasicMaterial map={medallion.tex} transparent toneMapped={false} opacity={0.9} />}
        </mesh>
        {/* acid glow ring framing the medallion */}
        <mesh visible={!day} rotation={[-PI / 2, 0, 0]} position={[0, -0.001, 0]} material={acidPoolMat}>
          <planeGeometry args={[6, 3.4]} />
        </mesh>
      </group>

      {/* layered pools of light under the canopy: warm core, acid halo */}
      <mesh visible={!day} position={[(CANOPY.x1 + FX) / 2, 0.012, DOOR.zc]} rotation={[-PI / 2, 0, 0]} material={acidPoolMat}>
        <planeGeometry args={[11, 12]} />
      </mesh>
      <mesh visible={!day} position={[(CANOPY.x1 + FX) / 2, 0.014, DOOR.zc]} rotation={[-PI / 2, 0, 0]} material={amberPoolMat}>
        <planeGeometry args={[8, 9]} />
      </mesh>

      {/* host podium */}
      <group position={[PODIUM.x, 0, PODIUM.z]} rotation={[0, PI, 0]}>
        <mesh position={[0, 0.52, 0]} geometry={rbox(0.62, 1.04, 0.5, 0.05)} material={matOnyx} />
        <mesh position={[0, 1.06, 0]} geometry={rbox(0.7, 0.035, 0.58, 0.012)} material={matBrass} />
        <mesh position={[0, 0.06, 0.26]} material={day ? matBrass : em(PAL.amber, 2.2)}>
          <boxGeometry args={[0.56, 0.02, 0.02]} />
        </mesh>
        <mesh position={[0, 1.085, 0.02]} rotation={[-PI / 2 + 0.25, 0, 0]}>
          <planeGeometry args={[0.34, 0.24]} />
          {day
            ? <meshStandardMaterial color="#15242f" roughness={0.2} metalness={0.4} />
            : <meshBasicMaterial map={tablet.tex} toneMapped={false} color="#9fdcff" />}
        </mesh>
      </group>
    </group>
  );
}

export function Plaza() {
  return (
    <group>
      <Ground />
      <CarPark />
      <Trees />
      <Benches />
      <StreetFurniture />
      <Arrival />
    </group>
  );
}

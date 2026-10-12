import { useMemo } from 'react';
import * as THREE from 'three';
import { ROOM, MEZZ_Y } from './collision';
import { MEZZANINE_LAYOUT as M } from './mezzanineLayout';
import { matPanel, matBrass, matBlack, em } from './materials';
import { rbox } from './furn/geo';
import { useLightTheme } from './lightTheme';

/**
 * Closes the open pocket under the east staircase / mezzanine (opposite the
 * entrance side) with a full-height partition, and sets two modern closed
 * doors into it: the washroom and a plain under-stair room. No openings, no
 * interior — just a finished wall with flush doors.
 */
export const PARTITION = {
  x: M.stairInnerX,                 // room-facing face lines up with the stair edge
  z1: M.frontZ,                     // stair column already closes z < 8
  z2: ROOM.z,
  h: MEZZ_Y - 0.25,                 // up to the underside of the deck
  t: 0.2,
};

export const DOOR_WASHROOM_Z = 11.45;
export const DOOR_STAIR_Z = 9.25;
const DOOR_W = 1.0;
const DOOR_H = 2.3;

const doorMat = new THREE.MeshStandardMaterial({ color: '#2a1d16', roughness: 0.55, metalness: 0.15 });
const frameMat = new THREE.MeshStandardMaterial({ color: '#141418', roughness: 0.4, metalness: 0.6 });

/** restroom pictogram (figures only, no text) */
function pictogramTexture() {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d')!;
  g.fillStyle = '#ffffff';
  const figure = (cx: number, dress: boolean) => {
    g.beginPath();
    g.arc(cx, 62, 20, 0, Math.PI * 2);
    g.fill();
    if (dress) {
      g.beginPath();
      g.moveTo(cx - 14, 92);
      g.lineTo(cx + 14, 92);
      g.lineTo(cx + 32, 170);
      g.lineTo(cx - 32, 170);
      g.closePath();
      g.fill();
      g.fillRect(cx - 14, 170, 10, 46);
      g.fillRect(cx + 4, 170, 10, 46);
    } else {
      g.fillRect(cx - 24, 92, 48, 80);
      g.fillRect(cx - 22, 172, 18, 46);
      g.fillRect(cx + 4, 172, 18, 46);
    }
  };
  figure(72, false);
  figure(184, true);
  g.fillRect(126, 40, 4, 180);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function Door({ z, sign }: { z: number; sign?: THREE.Texture }) {
  const theme = useLightTheme();
  return (
    // local +Z faces into the room (world -X)
    <group position={[PARTITION.x - 0.005, 0, z]} rotation={[0, -Math.PI / 2, 0]}>
      {/* slim black metal frame */}
      <mesh position={[0, DOOR_H / 2 + 0.03, 0.01]} material={frameMat}>
        <boxGeometry args={[DOOR_W + 0.1, DOOR_H + 0.06, 0.04]} />
      </mesh>
      {/* flush door leaf */}
      <mesh position={[0, DOOR_H / 2, 0.035]} geometry={rbox(DOOR_W, DOOR_H, 0.04, 0.008)} material={doorMat} />
      {/* vertical brass pull bar on stand-offs */}
      <mesh position={[DOOR_W / 2 - 0.13, 1.05, 0.11]} material={matBrass}>
        <cylinderGeometry args={[0.014, 0.014, 0.9, 12]} />
      </mesh>
      {[0.68, 1.42].map((y) => (
        <mesh key={y} position={[DOOR_W / 2 - 0.13, y, 0.08]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
          <cylinderGeometry args={[0.008, 0.008, 0.06, 8]} />
        </mesh>
      ))}
      {/* kick plate */}
      <mesh position={[0, 0.12, 0.057]} material={matBrass}>
        <boxGeometry args={[DOOR_W - 0.06, 0.2, 0.004]} />
      </mesh>
      {/* concealed light line above the frame */}
      <mesh position={[0, DOOR_H + 0.14, 0.04]} material={em(theme.warm, 1.6)}>
        <boxGeometry args={[DOOR_W + 0.1, 0.02, 0.02]} />
      </mesh>
      {/* restroom pictogram plate */}
      {sign && (
        <group position={[0, 1.62, 0.06]}>
          <mesh material={matBlack}>
            <boxGeometry args={[0.22, 0.22, 0.008]} />
          </mesh>
          <mesh position={[0, 0, 0.006]}>
            <planeGeometry args={[0.17, 0.17]} />
            <meshBasicMaterial map={sign} transparent toneMapped={false} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export function Washroom() {
  const sign = useMemo(pictogramTexture, []);
  const len = PARTITION.z2 - PARTITION.z1;
  return (
    <group>
      {/* full-height partition closing the under-stair / under-mezzanine pocket */}
      <mesh
        position={[PARTITION.x + PARTITION.t / 2, PARTITION.h / 2, (PARTITION.z1 + PARTITION.z2) / 2]}
        material={matPanel}
      >
        <boxGeometry args={[PARTITION.t, PARTITION.h, len]} />
      </mesh>
      {/* bronze skirting along the new wall */}
      <mesh position={[PARTITION.x - 0.01, 0.07, (PARTITION.z1 + PARTITION.z2) / 2]} material={frameMat}>
        <boxGeometry args={[0.02, 0.14, len]} />
      </mesh>
      <Door z={DOOR_WASHROOM_Z} sign={sign} />
      <Door z={DOOR_STAIR_Z} />
    </group>
  );
}

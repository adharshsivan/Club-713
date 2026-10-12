import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { showState } from './director';
import { wallVert, wallFrag } from './wallShader';
import { useLightTheme } from '../lightTheme';

// Screen geometry (kept identical to the previous wall so the frame still fits)
export const WALL_W = 6.6;
export const WALL_H = 4.4;
export const WALL_Y = 4.15;
export const WALL_Z = -12.42;
export const WALL_RES: [number, number] = [132, 88];

/** the big centre LED wall — the show's main stage visual */
export function CenterWall() {
  const theme = useLightTheme();
  const mat = useRef<THREE.ShaderMaterial>(null!);
  const uniforms = useMemo(() => ({
    uBeat: { value: 0 },
    uTime: { value: 0 },
    uBass: { value: 0 },
    uMid: { value: 0 },
    uTreble: { value: 0 },
    uKick: { value: 0 },
    uEnergy: { value: 0.45 },
    uDrop: { value: 0 },
    uSceneA: { value: 0 },
    uSceneB: { value: 1 },
    uBlend: { value: 0 },
    uVig: { value: 0.5 },
    uOffset: { value: new THREE.Vector2(0, 0) },
    uA: { value: new THREE.Color(theme.floorA) },
    uB: { value: new THREE.Color(theme.cool) },
    uC: { value: new THREE.Color(theme.floorC) },
    uDeep: { value: new THREE.Color('#070912') },
    uRes: { value: new THREE.Vector2(WALL_RES[0], WALL_RES[1]) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(() => {
    const s = showState();
    const u = mat.current.uniforms;
    u.uBeat.value = s.beat;
    u.uTime.value = s.t;
    u.uBass.value = s.bass;
    u.uMid.value = s.mid;
    u.uTreble.value = s.treble;
    u.uKick.value = s.kick;
    u.uEnergy.value = s.energy;
    u.uDrop.value = s.drop;
    u.uSceneA.value = s.sceneA;
    u.uSceneB.value = s.sceneB;
    u.uBlend.value = s.blend;
    u.uA.value.set(theme.floorA);
    u.uB.value.set(theme.cool);
    u.uC.value.set(theme.floorC);
  });

  return (
    <mesh position={[0, WALL_Y, WALL_Z + 0.04]}>
      <planeGeometry args={[WALL_W, WALL_H]} />
      <shaderMaterial ref={mat} vertexShader={wallVert} fragmentShader={wallFrag} uniforms={uniforms} />
    </mesh>
  );
}

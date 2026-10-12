import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import {
  matBlack, matGunmetal, matBrass, em, PAL,
  matCabinet, matSpeakerCone, matSpeakerRubber,
} from './materials';
import { rbox } from './furn/geo';
import { speakerGeos } from './furn/pieces';
import { STAGE } from './stageLayout';
import { PixelScreens } from './PixelScreens';
import { CenterWall, WALL_H, WALL_Y, WALL_Z } from './show/CenterWall';
import { wallVert, wallFrag } from './show/wallShader';
import { showState } from './show/director';
import { useLightTheme } from './lightTheme';

const tmp = new THREE.Object3D();

/** glossy black stage deck that mirrors the video wall and moving heads */
const stageDeckMat = new THREE.MeshStandardMaterial({ color: '#08080b', roughness: 0.12, metalness: 0.7 });

/** plain UV passthrough (the VU bridge is a simple canvas-style panel) */
const eqVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;

/** CDJ-style deck display: track BPM + elapsed time + waveform overview + sync state */
function deckDisplayTexture(time: string, synced: boolean) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 80;
  const g = c.getContext('2d')!;
  const bg = g.createLinearGradient(0, 0, 0, 80);
  bg.addColorStop(0, '#061826');
  bg.addColorStop(1, '#020a12');
  g.fillStyle = bg;
  g.fillRect(0, 0, 256, 80);
  g.fillStyle = 'rgba(120,180,255,0.06)';
  for (let y = 0; y < 80; y += 3) g.fillRect(0, y, 256, 1);
  // waveform overview
  g.strokeStyle = 'rgba(70,255,140,0.75)';
  g.lineWidth = 1;
  g.beginPath();
  for (let x = 6; x < 250; x += 2) {
    const h = (Math.sin(x * 0.31) * 0.4 + Math.sin(x * 0.11 + 2) * 0.6) * 11 + Math.sin(x * 0.9) * 3;
    const y = 58 - Math.abs(h);
    if (x === 6) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.stroke();
  g.fillStyle = '#3dff6e';
  g.font = 'bold 30px monospace';
  g.fillText('124.0', 10, 32);
  g.fillStyle = '#9fb4cc';
  g.font = '11px monospace';
  g.fillText('BPM', 118, 30);
  g.fillStyle = '#ffffff';
  g.font = 'bold 20px monospace';
  g.fillText(time, 168, 30);
  if (synced) {
    g.fillStyle = '#1c5fd6';
    g.fillRect(196, 42, 50, 22);
    g.fillStyle = '#ffffff';
    g.font = 'bold 14px monospace';
    g.fillText('SYNC', 202, 58);
  }
  g.fillStyle = '#ff5a3d';
  g.fillRect(10, 44, 26, 3); // playhead marker
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** stereo master VU bridge: segmented green/yellow/red ladders with peak-hold dots */
const vuFrag = /* glsl */ `
  varying vec2 vUv;
  uniform float uL, uR, uPl, uPr;
  vec3 segColor(float i) {
    if (i < 6.5) return vec3(0.25, 1.0, 0.35);
    if (i < 8.5) return vec3(1.0, 0.85, 0.25);
    return vec3(1.0, 0.2, 0.2);
  }
  void main() {
    float col = vUv.x < 0.5 ? 0.0 : 1.0;
    float u = col < 0.5 ? vUv.x * 2.0 : (vUv.x - 0.5) * 2.0;
    float row = floor(vUv.y * 10.0);
    float lvl = col < 0.5 ? uL : uR;
    float pk = col < 0.5 ? uPl : uPr;
    float inBar = step(0.22, u) * step(u, 0.78);
    float gap = step(0.1, fract(vUv.y * 10.0));
    float on = step(row / 10.0 + 0.05, lvl);
    float peak = (1.0 - step(0.5, abs(row - floor(pk * 9.999)))) * step(0.02, pk);
    vec3 c = vec3(0.008, 0.01, 0.014);
    c += segColor(row) * on * gap * inBar * 1.15;
    c += vec3(1.0) * peak * gap * inBar * 0.9;
    gl_FragColor = vec4(c, 1.0);
  }
`;

function DJPodium() {
  const theme = useLightTheme();
  const mat = useRef<THREE.ShaderMaterial>(null!);
  // the desk plays the SAME "Liquid Prism" programme as the big wall: identical
  // scene timing, colours and beat response, just re-fitted to the wide
  // fascia strip so both read as one continuous LED system
  const uniforms = useMemo(() => ({
    uBeat: { value: 0 }, uTime: { value: 0 },
    uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 },
    uKick: { value: 0 }, uEnergy: { value: 0.45 }, uDrop: { value: 0 },
    uSceneA: { value: 0 }, uSceneB: { value: 1 }, uBlend: { value: 0 },
    uVig: { value: 0.22 },
    uOffset: { value: new THREE.Vector2(0, 0) },
    uA: { value: new THREE.Color(theme.floorA) },
    uB: { value: new THREE.Color(theme.cool) },
    uC: { value: new THREE.Color(theme.floorC) },
    uDeep: { value: new THREE.Color('#070912') },
    uRes: { value: new THREE.Vector2(88, 16) },
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  // spinning jog wheels, VU bridge levels, deck LCDs, small hardware materials
  const jogs = useRef<(THREE.Group | null)[]>([]);
  const vuMat = useRef<THREE.ShaderMaterial>(null!);
  const vuUniforms = useMemo(() => ({
    uL: { value: 0 }, uR: { value: 0 }, uPl: { value: 0 }, uPr: { value: 0 },
  }), []);
  const peaks = useRef({ l: 0, r: 0 });
  const displays = useMemo(
    () => [deckDisplayTexture('03:47', true), deckDisplayTexture('01:12', true)],
    [],
  );
  const silver = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c9ced6', roughness: 0.25, metalness: 1 }), [],
  );
  const labelRed = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#7a1f2a', roughness: 0.6, metalness: 0.1 }), [],
  );
  const capWhite = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.5, metalness: 0 }), [],
  );
  const cableGeo = useMemo(() => {
    const pts = [
      new THREE.Vector3(-2.15, 1.20, 0.12),
      new THREE.Vector3(-2.02, 1.197, 0.46),
      new THREE.Vector3(-1.2, 1.196, 0.47),
      new THREE.Vector3(-0.5, 1.20, 0.44),
      new THREE.Vector3(-0.40, 1.24, 0.30),
      new THREE.Vector3(-0.385, 1.24, 0.16),
    ];
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.008, 6, false);
  }, []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
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
    // vinyl-speed jog wheels (33 1/3 rpm)
    jogs.current.forEach((g) => {
      if (g) g.rotation.y += dt * 3.49;
    });
    // VU levels with authentic slow-falling peak hold
    const l = s.bass;
    const r = Math.min(1, s.mid * 0.7 + s.treble * 0.5);
    peaks.current.l = Math.max(l, peaks.current.l - dt * 0.9);
    peaks.current.r = Math.max(r, peaks.current.r - dt * 0.9);
    vuUniforms.uL.value = l;
    vuUniforms.uR.value = r;
    vuUniforms.uPl.value = peaks.current.l;
    vuUniforms.uPr.value = peaks.current.r;
  });
  return (
    <group position={[0, 0.9, STAGE.podiumZ]}>
      {/* Recessed plinth, faceted body, and a rounded worktop. Both ends stay open to walk around. */}
      <mesh position={[0, 0.095, 0]} geometry={rbox(4.25, 0.19, 0.82, 0.055)} material={matBrass} />
      <mesh position={[0, 0.62, 0]} geometry={rbox(4.55, 0.98, 1.01, 0.085)} material={matGunmetal} />
      <mesh position={[0, 1.125, 0]} geometry={rbox(4.7, 0.09, 1.14, 0.032)} material={matBrass} />
      <mesh position={[0, 1.18, 0]} geometry={rbox(4.55, 0.025, 1.02, 0.012)} material={matBlack} />
      {/* fascia LED band: the SAME animation as the big wall, continued below */}
      <mesh position={[0, 0.62, 0.516]}>
        <planeGeometry args={[4.35, 0.77]} />
        <shaderMaterial ref={mat} vertexShader={wallVert} fragmentShader={wallFrag} uniforms={uniforms} />
      </mesh>
      <mesh position={[0, 0.21, 0.525]} material={em(PAL.acid, 1.5)}>
        <boxGeometry args={[4.35, 0.018, 0.018]} />
      </mesh>
      {/* Two mirrored CDJ-style decks: spinning jog, LCD, play/cue/shift, pitch fader. */}
      {[-1.37, 1.37].map((x, i) => {
        const s = x > 0 ? 1 : -1; // mirror the control columns per deck
        return (
          <group key={x} position={[x, 1.23, 0]}>
            <mesh geometry={rbox(1.32, 0.06, 0.86, 0.025)} material={matGunmetal} />
            {/* spinning jog wheel */}
            <group
              ref={(g) => { jogs.current[i] = g; }}
              position={[0, 0, 0.06]}
            >
              <mesh position={[0, 0.05, 0]} material={matBlack}>
                <cylinderGeometry args={[0.32, 0.32, 0.025, 40]} />
              </mesh>
              <mesh position={[0, 0.065, 0]} rotation={[Math.PI / 2, 0, 0]} material={matBrass}>
                <torusGeometry args={[0.28, 0.008, 6, 40]} />
              </mesh>
              <mesh position={[0, 0.064, 0]} material={labelRed}>
                <cylinderGeometry args={[0.1, 0.1, 0.006, 24]} />
              </mesh>
              <mesh position={[0, 0.072, 0]} material={silver}>
                <cylinderGeometry args={[0.02, 0.02, 0.03, 12]} />
              </mesh>
              {[0.78, 2.36, 3.92, 5.5].map((a) => (
                <mesh
                  key={a}
                  position={[Math.cos(a) * 0.24, 0.064, Math.sin(a) * 0.24]}
                  material={em(PAL.warmWhite, 0.7)}
                >
                  <cylinderGeometry args={[0.012, 0.012, 0.005, 8]} />
                </mesh>
              ))}
            </group>
            {/* LCD: bezel + BPM / time / waveform / sync */}
            <mesh position={[0, 0.033, -0.35]} material={matBlack}>
              <boxGeometry args={[0.64, 0.008, 0.2]} />
            </mesh>
            <mesh position={[0, 0.038, -0.35]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[0.6, 0.16]} />
              <meshBasicMaterial map={displays[i]} toneMapped={false} />
            </mesh>
            {/* transport cluster: shift, cue, play */}
            <mesh position={[s * 0.52, 0.042, -0.18]} material={em('#3fa9ff', 1.4)}>
              <boxGeometry args={[0.05, 0.012, 0.05]} />
            </mesh>
            <mesh position={[s * 0.52, 0.042, 0.0]} material={em('#ff9a1f', 1.5)}>
              <cylinderGeometry args={[0.042, 0.042, 0.012, 20]} />
            </mesh>
            <mesh position={[s * 0.52, 0.042, 0.22]} material={em('#22ff66', 1.6)}>
              <cylinderGeometry args={[0.055, 0.055, 0.012, 24]} />
            </mesh>
            {/* pitch fader: dark slot + white cap */}
            <mesh position={[-s * 0.55, 0.034, 0.0]} material={matBlack}>
              <boxGeometry args={[0.02, 0.006, 0.32]} />
            </mesh>
            <mesh position={[-s * 0.55, 0.04, s > 0 ? -0.04 : 0.03]} material={capWhite}>
              <boxGeometry args={[0.05, 0.014, 0.03]} />
            </mesh>
          </group>
        );
      })}
      {/* Central mixer: EQ knobs, channel faders, crossfader, master VU bridge. */}
      <mesh position={[0, 1.23, 0]} geometry={rbox(0.78, 0.06, 0.87, 0.024)} material={matGunmetal} />
      {[-0.27, -0.09, 0.09, 0.27].map((x, i) => (
        <group key={x}>
          <mesh position={[x, 1.29, -0.22]} material={matBlack}>
            <cylinderGeometry args={[0.035, 0.038, 0.035, 16]} />
          </mesh>
          <mesh position={[x, 1.308, -0.20]} material={capWhite}>
            <boxGeometry args={[0.008, 0.005, 0.02]} />
          </mesh>
          <mesh position={[x, 1.29, 0.16]} material={matBlack}>
            <boxGeometry args={[0.02, 0.008, 0.18]} />
          </mesh>
          <mesh position={[x, 1.296, [0.1, 0.16, 0.13, 0.2][i]]} material={capWhite}>
            <boxGeometry args={[0.05, 0.016, 0.035]} />
          </mesh>
        </group>
      ))}
      {/* crossfader across the front of the mixer */}
      <mesh position={[0, 1.288, 0.36]} material={matBlack}>
        <boxGeometry args={[0.5, 0.006, 0.02]} />
      </mesh>
      <mesh position={[-0.1, 1.292, 0.36]} material={capWhite}>
        <boxGeometry args={[0.04, 0.014, 0.05]} />
      </mesh>
      {/* tilted master VU bridge behind the mixer */}
      <group position={[0, 1.19, -0.50]} rotation={[-0.28, 0, 0]}>
        <mesh position={[0, 0.13, 0]} material={matBlack}>
          <boxGeometry args={[0.5, 0.26, 0.03]} />
        </mesh>
        <mesh position={[0, 0.13, 0.017]}>
          <planeGeometry args={[0.44, 0.2]} />
          <shaderMaterial ref={vuMat} vertexShader={eqVert} fragmentShader={vuFrag} uniforms={vuUniforms} />
        </mesh>
      </group>
      {/* headphones resting on the end of the worktop, cable running to the mixer */}
      <group position={[-2.19, 1.20, 0.05]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} material={matBlack}>
          <torusGeometry args={[0.085, 0.016, 10, 28]} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.085, 0.005, 0]}>
            <mesh material={matBlack}>
              <cylinderGeometry args={[0.05, 0.055, 0.045, 16]} />
            </mesh>
            <mesh position={[0, 0.024, 0]} material={matSpeakerRubber}>
              <cylinderGeometry args={[0.035, 0.035, 0.008, 16]} />
            </mesh>
          </group>
        ))}
      </group>
      <mesh geometry={cableGeo} material={matBlack} />
    </group>
  );
}

// ------------------------------------------------------------------ dark pleated stage drape
const drapeMat = new THREE.MeshStandardMaterial({ color: '#07070a', roughness: 1, metalness: 0 });

function StageDrape() {
  const ref = useRef<THREE.InstancedMesh>(null!);
  const N = 44;
  useLayoutEffect(() => {
    for (let i = 0; i < N; i++) {
      const x = -8.6 + (i + 0.5) * (17.2 / N);
      tmp.position.set(x, 4.95, -12.62 + (i % 2) * 0.07);
      tmp.rotation.set(0, (i % 2 ? 1 : -1) * 0.5, 0);
      tmp.scale.set(0.44, 8.1, 0.05);
      tmp.updateMatrix();
      ref.current.setMatrixAt(i, tmp.matrix);
    }
    ref.current.instanceMatrix.needsUpdate = true;
  }, []);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, N]} material={drapeMat}>
      <boxGeometry args={[1, 1, 1]} />
    </instancedMesh>
  );
}

/** backdrop: drape + framed LED triptych (centre video wall, dancer wings) */
function Backdrop() {
  const theme = useLightTheme();

  // one continuous black truss frame wraps all three screens
  const frameW = 13.4;
  const frameH = WALL_H + 0.5;

  // dedicated frame materials breathe with the music (never flash)
  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({
      color: '#050505', emissive: new THREE.Color(theme.haloA),
      emissiveIntensity: 1.5, roughness: 1, metalness: 0,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  useFrame(() => {
    const s = showState();
    frameMat.emissive.set(theme.haloA);
    frameMat.emissiveIntensity = 1.25 + s.bass * 0.8 + s.drop * 0.7;
  });

  return (
    <group>
      <StageDrape />

      <group position={[0, WALL_Y, WALL_Z - 0.06]}>
        <mesh geometry={rbox(frameW, frameH, 0.18, 0.05)} material={matBlack} />
        {/* thin mullions between the three panels */}
        {[-3.55, 3.55].map((x) => (
          <mesh key={x} position={[x, 0, 0.1]} geometry={rbox(0.12, frameH - 0.12, 0.06, 0.02)} material={matGunmetal} />
        ))}
        {/* quiet light lines tracing the outer frame — the wall is the star */}
        <mesh position={[0, frameH / 2 + 0.02, 0.1]} material={frameMat}>
          <boxGeometry args={[frameW, 0.035, 0.035]} />
        </mesh>
        <mesh position={[0, -frameH / 2 - 0.02, 0.1]} material={frameMat}>
          <boxGeometry args={[frameW, 0.035, 0.035]} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * (frameW / 2 + 0.02), 0, 0.1]} material={frameMat}>
            <boxGeometry args={[0.035, frameH, 0.035]} />
          </mesh>
        ))}
      </group>

      <CenterWall />
    </group>
  );
}

function LineArray({ x }: { x: number }) {
  return (
    <group position={[x, 0, -8.2]}>
      <mesh position={[0, 7.6, 0]} material={matGunmetal}>
        <cylinderGeometry args={[0.04, 0.04, 2.6, 6]} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={i} position={[0, 6.3 - i * 0.42, i * 0.07]} rotation={[i * 0.09, 0, 0]} material={matBlack}>
          <boxGeometry args={[0.95, 0.38, 0.55]} />
        </mesh>
      ))}
    </group>
  );
}

/** 2x2 PA stack: dual 15" subs below, horn-loaded tops above, LED rings riding the half-beat */
function SubStack({ x, accent }: { x: number; accent: string }) {
  const sub = useMemo(() => speakerGeos('sub'), []);
  const top = useMemo(() => speakerGeos('top'), []);
  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#050505', emissive: new THREE.Color(accent),
        emissiveIntensity: 1, roughness: 1, metalness: 0,
      }),
    [accent],
  );
  useFrame(() => {
    const s = showState();
    ledMat.emissiveIntensity = 0.5 + s.bass * 1.1 + s.drop * 0.5;
  });

  const Cab = ({ geo, y }: { geo: typeof sub; y: number }) => (
    <group position={[0, y, 0]}>
      <mesh geometry={geo.body} material={matCabinet} />
      <mesh geometry={geo.rubber} material={matSpeakerRubber} />
      <mesh geometry={geo.driver} material={matSpeakerCone} />
      <mesh geometry={geo.led} material={ledMat} />
    </group>
  );

  return (
    <group position={[x, 0, -10.1]}>
      {[0, 1].map((c) => (
        <group key={c} position={[(c - 0.5) * 1.26, 0, 0]}>
          <Cab geo={sub} y={0.62} />
          <Cab geo={top} y={1.86} />
        </group>
      ))}
    </group>
  );
}

export function Stage() {
  const theme = useLightTheme();
  const edge = useRef<THREE.MeshStandardMaterial>(null!);
  useFrame(() => {
    const s = showState();
    edge.current.emissiveIntensity = 1.0 + s.bass * 0.8 + s.drop * 0.4;
  });
  return (
    <group>
      {/* platform: matte black fascia, glossy onyx deck */}
      <mesh position={[0, 0.44, -10.18]} material={matBlack}>
        <boxGeometry args={[17, 0.88, 5.15]} />
      </mesh>
      <mesh position={[0, 0.895, -10.18]} material={stageDeckMat}>
        <boxGeometry args={[17, 0.03, 5.15]} />
      </mesh>
      {/* recessed shadow-gap in the fascia + glowing front edge */}
      <mesh position={[0, 0.45, -7.59]} material={em(theme.cool, 0.9)}>
        <boxGeometry args={[17, 0.03, 0.03]} />
      </mesh>
      <mesh position={[0, 0.895, -7.58]}>
        <boxGeometry args={[17, 0.05, 0.05]} />
        <meshStandardMaterial ref={edge} color="#111" emissive={theme.haloA} emissiveIntensity={1.4} />
      </mesh>
      {/* front steps with themed nosings + softly lit risers */}
      {[0, 1, 2, 3].map((i) => (
        <group key={i} position={[0, 0, -6.375 - i * 0.35]}>
          <mesh position={[0, (i + 1) * 0.1125, 0]} material={matBlack}>
            <boxGeometry args={[4.4, (i + 1) * 0.225, 0.35]} />
          </mesh>
          <mesh position={[0, (i + 1) * 0.225, 0.16]} material={em(theme.haloA, 1.6)}>
            <boxGeometry args={[4.4, 0.02, 0.03]} />
          </mesh>
          <mesh position={[0, i * 0.225 + 0.11, 0.177]} material={em(theme.cool, 0.35)}>
            <planeGeometry args={[4.36, 0.16]} />
          </mesh>
        </group>
      ))}
      <DJPodium />
      <Backdrop />
      <PixelScreens />
      <LineArray x={6.9} />
      <LineArray x={-6.9} />
      <SubStack x={9.95} accent={theme.haloA} />
      <SubStack x={-9.95} accent={theme.haloA} />
    </group>
  );
}

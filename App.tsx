import { useCallback, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ClubScene } from './three/ClubScene';
import { Player } from './three/Player';
import { Overlay } from './ui/Overlay';
import { startAudio, stopAudio } from './three/clock';

export default function App() {
  const [entered, setEntered] = useState(false);
  const [sound, setSound] = useState(true);

  const enter = useCallback(() => {
    setEntered(true);
    if (sound) startAudio();
  }, [sound]);

  const toggleSound = useCallback(() => {
    setSound((s) => {
      const next = !s;
      if (next && entered) startAudio();
      if (!next) stopAudio();
      return next;
    });
  }, [entered]);

  return (
    <div className="h-screen w-screen overflow-hidden bg-black">
      <Canvas
        camera={{ fov: 72, near: 0.22, far: 260, position: [-45, 4, 6] }}
        dpr={[1, 1.75]}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
      >
        <ClubScene />
        <Player active={entered} />
      </Canvas>
      <Overlay entered={entered} sound={sound} onEnter={enter} onToggleSound={toggleSound} />
    </div>
  );
}

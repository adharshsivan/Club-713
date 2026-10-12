import { useRef, useState } from 'react';
import { input, pushLook, isTouchDevice } from '../three/input';
import { LOCATIONS } from '../three/collision';
import { LIGHT_THEMES, setLightTheme, useLightTheme } from '../three/lightTheme';
import { setExteriorMode, useExteriorMode } from '../three/exterior/mode';

interface Props {
  entered: boolean;
  sound: boolean;
  onEnter: () => void;
  onToggleSound: () => void;
}

function Joystick() {
  const base = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const R = 48;

  const update = (clientX: number, clientY: number) => {
    const el = base.current!;
    const r = el.getBoundingClientRect();
    let dx = clientX - (r.left + r.width / 2);
    let dy = clientY - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    input.joy.x = dx / R;
    input.joy.y = dy / R;
    input.joy.active = true;
    input.sprint = d > R * 0.92;
    setThumb({ x: dx, y: dy });
  };
  const end = () => {
    input.joy.x = 0; input.joy.y = 0; input.joy.active = false; input.sprint = false;
    setThumb({ x: 0, y: 0 });
  };

  return (
    <div
      ref={base}
      className="pointer-events-auto fixed bottom-8 left-6 z-30 h-32 w-32 rounded-full border border-white/15 bg-white/5 backdrop-blur-sm"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => update(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchMove={(e) => update(e.touches[0].clientX, e.touches[0].clientY)}
      onTouchEnd={end}
      onTouchCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 h-12 w-12 rounded-full bg-amber-200/30 ring-1 ring-amber-200/50"
        style={{ transform: `translate(calc(-50% + ${thumb.x}px), calc(-50% + ${thumb.y}px))` }}
      />
    </div>
  );
}

function LookPad() {
  const last = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="pointer-events-auto fixed bottom-0 right-0 z-20 h-[70%] w-[55%]"
      style={{ touchAction: 'none' }}
      onTouchStart={(e) => { const t = e.touches[0]; last.current = { x: t.clientX, y: t.clientY }; }}
      onTouchMove={(e) => {
        const t = e.touches[0];
        if (last.current) pushLook((t.clientX - last.current.x) * 2.4, (t.clientY - last.current.y) * 2.4);
        last.current = { x: t.clientX, y: t.clientY };
      }}
      onTouchEnd={() => { last.current = null; }}
    />
  );
}

function LightingPicker() {
  const theme = useLightTheme();
  const [open, setOpen] = useState(false);

  return (
    <div className="pointer-events-auto absolute right-4 top-[5.5rem] z-40 flex flex-col items-end gap-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-[11px] tracking-[0.2em] text-amber-100/90 backdrop-blur-sm transition hover:bg-black/60"
      >
        ◐ LIGHTING
      </button>
      {open && (
        <div className="flex flex-col gap-1 rounded-2xl border border-white/10 bg-black/60 p-2 backdrop-blur-sm">
          {LIGHT_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setLightTheme(t.id)}
              className={`flex items-center gap-2 rounded-xl px-2 py-1 text-left text-[10px] tracking-[0.15em] transition hover:bg-white/10 ${
                theme.id === t.id ? 'bg-white/10 text-white' : 'text-white/60'
              }`}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/40"
                style={{
                  background: `linear-gradient(135deg, ${t.warm}, ${t.cool})`,
                  boxShadow: theme.id === t.id ? `0 0 8px ${t.dot}` : undefined,
                }}
              />
              {t.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DayNightToggle() {
  const mode = useExteriorMode();
  const day = mode === 'day';

  return (
    <button
      type="button"
      aria-label={day ? 'Switch exterior to night mode' : 'Switch exterior to day mode'}
      aria-pressed={day}
      onClick={() => setExteriorMode(day ? 'night' : 'day')}
      className="pointer-events-auto absolute right-4 top-12 z-40 flex items-center gap-2 rounded-full border border-white/20 bg-black/60 px-3.5 py-1.5 text-[11px] tracking-[0.18em] text-white/90 backdrop-blur-md transition-colors hover:border-white/50 hover:bg-black/75"
    >
      <span
        aria-hidden="true"
        className={`h-3 w-3 rounded-full border transition-colors ${day ? 'border-amber-100 bg-amber-300 shadow-[0_0_9px_rgba(255,219,148,0.9)]' : 'border-white/75 bg-[#273452] shadow-[inset_-2px_-1px_0_#d7e4ff]'}`}
      />
      {day ? 'DAY MODE' : 'NIGHT MODE'}
    </button>
  );
}

export function Overlay({ entered, sound, onEnter, onToggleSound }: Props) {
  const touch = isTouchDevice();
  const day = useExteriorMode() === 'day';

  return (
    <div className="pointer-events-none fixed inset-0 z-10 select-none font-sans">
      {/* ---------- persistent brand + sound ---------- */}
      <div className="absolute left-5 top-4">
        <span className="text-lg font-black tracking-[0.45em] text-lime-300/90">713</span>
      </div>
      <button
        onClick={onToggleSound}
        className="pointer-events-auto absolute right-4 top-3 z-40 rounded-full border border-white/15 bg-black/40 px-4 py-1.5 text-[11px] tracking-[0.2em] text-amber-100/90 backdrop-blur-sm transition hover:bg-black/60"
      >
        {sound ? '♪ SOUND ON' : '♪ SOUND OFF'}
      </button>
      <DayNightToggle />

      {/* ---------- intro ---------- */}
      {!entered && (
        <div className={`pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-6 ${day ? 'bg-gradient-to-b from-black/45 via-black/10 to-black/65' : 'bg-gradient-to-b from-black/70 via-black/40 to-black/80'}`}>
          <div className="max-w-xl text-center">
            <h1
              className="bg-gradient-to-r from-lime-200 via-lime-400 to-violet-400 bg-clip-text text-6xl font-black tracking-[0.4em] text-transparent sm:text-7xl"
              style={{ textShadow: '0 0 60px rgba(182,255,46,0.3)' }}
            >
              713
            </h1>
            <p className="mx-auto mt-6 max-w-md text-[13px] leading-relaxed text-white/55">
              Follow the light through the entrance. A kinetic dance floor, animated stage, a bar
              and a <span className="text-pink-300/90">VIP</span> mezzanine await inside.
            </p>

            <button
              onClick={onEnter}
              className="mt-8 rounded-full border border-lime-300/40 bg-gradient-to-r from-lime-500/20 to-violet-500/20 px-10 py-3 text-sm font-semibold tracking-[0.35em] text-lime-100 shadow-[0_0_40px_rgba(182,255,46,0.25)] transition hover:scale-105 hover:shadow-[0_0_60px_rgba(139,92,246,0.4)]"
            >
              ARRIVE AT 713
            </button>

            <div className="mt-6 text-[11px] tracking-[0.15em] text-white/35">
              {touch ? 'LEFT STICK — MOVE · SWIPE RIGHT SIDE — LOOK' : 'CLICK TO LOOK · WASD — MOVE · SHIFT — SPRINT · ESC — RELEASE CURSOR'}
            </div>
          </div>
        </div>
      )}

      {/* ---------- in-club HUD ---------- */}
      {entered && (
        <>
          <LightingPicker />
          {/* quick travel */}
          <div className="pointer-events-auto absolute left-1/2 top-[8.1rem] z-40 flex max-w-[calc(100vw-2rem)] -translate-x-1/2 flex-wrap justify-center gap-1 rounded-2xl border border-white/10 bg-black/40 p-1 backdrop-blur-sm sm:top-3 sm:flex-nowrap sm:rounded-full">
            {LOCATIONS.map((l) => (
              <button
                key={l.id}
                onClick={(e) => {
                  e.stopPropagation();
                  input.teleport = { x: l.x, z: l.z, y: l.y, yaw: l.yaw };
                }}
                className="rounded-full px-3 py-1 text-[9px] font-semibold tracking-[0.2em] text-amber-100/80 transition hover:bg-amber-400/20 hover:text-amber-50 sm:text-[10px]"
              >
                {l.label}
              </button>
            ))}
          </div>
          {!touch && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/35 px-5 py-1.5 text-[10px] tracking-[0.25em] text-white/40 backdrop-blur-sm">
              WASD MOVE · MOUSE LOOK · SHIFT SPRINT · FOLLOW THE LIGHT PATH TO THE DOOR
            </div>
          )}
          {touch && (
            <>
              <Joystick />
              <LookPad />
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-white/35">
                STICK — MOVE · SWIPE — LOOK
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

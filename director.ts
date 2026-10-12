import { clubTime, isAudioPlaying, sampleAudio } from '../clock';

/**
 * Show director — the single source of truth for the stage performance.
 * Blends live analyser levels (when music plays) with a beat-locked
 * synthesized groove (idle / fallback), then derives one coherent timeline:
 * energy arcs, drop hits, and seamless 16-beat visual scenes.
 *
 * Frame-rate independent: smoothing integrates with real dt, and the result
 * is cached per frame so every consumer (wall, dancers, lights) stays in sync.
 */
export interface ShowState {
  t: number;
  beat: number;
  bar: number;
  pulse: number;
  pulse2: number;
  bass: number;    // smoothed low-end 0..1 — drives big motion
  mid: number;     // smoothed mids 0..1 — drives medium motion
  treble: number;  // smoothed highs 0..1 — drives sparkle / detail
  kick: number;    // fast kick envelope 0..1
  energy: number;  // slow show energy 0..1 (calm <-> peak)
  drop: number;    // drop-hit flash 0..1, decays over ~1.5 beats
  sceneA: number;  // current visual scene 0..3
  sceneB: number;  // next visual scene 0..3
  blend: number;   // crossfade 0..1 into sceneB
  phrase: number;  // 4-beat phrase index (drives dancer choreography)
  cycleBeat: number; // position 0..64 inside the show loop
  playing: boolean;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const S = {
  bass: 0, mid: 0, treble: 0, energy: 0.45,
  lastT: -1,
  snap: null as ShowState | null,
};

/** target show energy for each 16-beat section of the 64-beat loop */
function energyTarget(cb: number): number {
  if (cb < 16) return 0.55 + 0.3 * smoothstep(0, 16, cb);          // buildup
  if (cb < 32) return 0.95;                                        // drop — full send
  if (cb < 48) return 0.72;                                        // groove
  return 0.36 + 0.14 * smoothstep(48, 64, cb);                     // breathe — visual calm
}

export function showState(): ShowState {
  const ct = clubTime();
  const t = ct.t;
  if (S.snap && Math.abs(t - S.lastT) < 0.0004) return S.snap;
  const dt = S.lastT < 0 ? 1 / 60 : Math.min(0.05, Math.max(0.001, t - S.lastT));
  S.lastT = t;

  const playing = isAudioPlaying();
  let tb: number, tm: number, tt: number;
  if (playing) {
    const s = sampleAudio();
    tb = s.bass; tm = s.mid; tt = s.treble;
  } else {
    // idle groove: gentle beat-locked motion so the room never looks dead
    const ph = ct.beat % 1;
    tb = Math.exp(-ph * 4.5) * 0.55 + 0.08;
    tm = 0.22 + 0.1 * Math.sin(ct.beat * Math.PI * 0.5);
    tt = 0.14 + 0.08 * Math.sin(t * 2.3 + 1);
  }

  // fast attack, slow release — feels like real music dynamics
  const follow = (cur: number, target: number, atk: number, rel: number) => {
    const k = 1 - Math.exp(-dt * (target > cur ? atk : rel));
    return cur + (target - cur) * k;
  };
  S.bass = follow(S.bass, Math.min(1, Math.max(0, tb)), 18, 6);
  S.mid = follow(S.mid, Math.min(1, Math.max(0, tm)), 14, 7);
  S.treble = follow(S.treble, Math.min(1, Math.max(0, tt)), 20, 9);

  // slow energy arc toward the timeline target
  const cb = ((ct.beat % 64) + 64) % 64;
  const eTarget = playing ? energyTarget(cb) : 0.3 + 0.08 * Math.sin(t * 0.4);
  S.energy += (eTarget - S.energy) * (1 - Math.exp(-dt * 1.4));

  // drop hits at the section boundaries (main at 16, lift at 32)
  let drop = 0;
  if (playing) {
    if (cb >= 16) drop = Math.max(drop, Math.exp(-(cb - 16) * 1.8));
    if (cb >= 32) drop = Math.max(drop, 0.55 * Math.exp(-(cb - 32) * 2.2));
  }

  // four 16-beat visual scenes with a 2-beat crossfade tail
  const sf = ct.beat / 16;
  const sceneA = ((Math.floor(sf) % 4) + 4) % 4;
  const f = (ct.beat % 16) / 16;
  const blend = smoothstep(0.86, 1.0, f);
  const sceneB = (sceneA + 1) % 4;

  S.snap = {
    t, beat: ct.beat, bar: ct.bar, pulse: ct.pulse, pulse2: ct.pulse2,
    bass: S.bass, mid: S.mid, treble: S.treble,
    kick: playing ? Math.max(ct.pulse, S.bass * 0.9) : ct.pulse * 0.6,
    energy: S.energy, drop,
    sceneA, sceneB, blend,
    phrase: Math.floor(ct.beat / 4),
    cycleBeat: cb,
    playing,
  };
  return S.snap;
}

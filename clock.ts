// 713 global club clock + procedural audio engine (no assets, pure WebAudio)
export const BPM = 124;
const BEAT_MS = 60000 / BPM;
const epoch = performance.now();

export interface ClubTime {
  t: number;      // seconds since load
  beat: number;   // continuous beat counter (float)
  bar: number;    // continuous bar counter (float)
  pulse: number;  // 1 -> 0 exponential decay after each beat
  pulse2: number; // decay after each half beat
}

export function clubTime(): ClubTime {
  const now = performance.now();
  const t = (now - epoch) / 1000;
  const beat = (now - epoch) / BEAT_MS;
  const frac = beat - Math.floor(beat);
  const frac2 = (beat * 2) - Math.floor(beat * 2);
  return {
    t,
    beat,
    bar: beat / 4,
    pulse: Math.exp(-frac * 5),
    pulse2: Math.exp(-frac2 * 6),
  };
}

// ---------------------------------------------------------------- audio
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let analyser: AnalyserNode | null = null;
let freqData: Uint8Array | null = null;
let timer: number | null = null;
let nextStep = 0;        // 16th-note index
let nextStepTime = 0;    // ctx time
let noiseBuf: AudioBuffer | null = null;
let playing = false;

const STEP = BEAT_MS / 4000; // 16th note in seconds

// A-minor-ish rolling bassline (semitones from A1 = 55Hz), 16 steps
const BASS = [0, 0, 12, 0, 3, 0, 10, 0, 0, 7, 0, 12, 5, 0, 3, 7];
const BASS_ON = [1, 0, 1, 0, 1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 1];

function makeNoise(c: AudioContext) {
  const b = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function kick(time: number) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(150, time);
  o.frequency.exponentialRampToValueAtTime(42, time + 0.12);
  g.gain.setValueAtTime(1.0, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
  o.connect(g).connect(master);
  o.start(time); o.stop(time + 0.32);
}

function hat(time: number, open: boolean) {
  if (!ctx || !master || !noiseBuf) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'highpass'; f.frequency.value = 8200;
  const g = ctx.createGain();
  const dur = open ? 0.18 : 0.05;
  g.gain.setValueAtTime(open ? 0.14 : 0.09, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + dur);
  s.connect(f).connect(g).connect(master);
  s.start(time); s.stop(time + dur + 0.02);
}

function clap(time: number) {
  if (!ctx || !master || !noiseBuf) return;
  const s = ctx.createBufferSource();
  s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.9;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.28, time);
  g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
  s.connect(f).connect(g).connect(master);
  s.start(time); s.stop(time + 0.25);
}

function bass(time: number, semi: number, duck: boolean) {
  if (!ctx || !master) return;
  const o = ctx.createOscillator();
  o.type = 'sawtooth';
  o.frequency.value = 55 * Math.pow(2, semi / 12);
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(900, time);
  f.frequency.exponentialRampToValueAtTime(160, time + STEP * 0.9);
  f.Q.value = 6;
  const g = ctx.createGain();
  const lvl = duck ? 0.05 : 0.16;
  g.gain.setValueAtTime(0.0001, time);
  g.gain.exponentialRampToValueAtTime(lvl, time + 0.015);
  g.gain.exponentialRampToValueAtTime(0.001, time + STEP * 0.95);
  o.connect(f).connect(g).connect(master);
  o.start(time); o.stop(time + STEP);
}

function schedule() {
  if (!ctx) return;
  while (nextStepTime < ctx.currentTime + 0.15) {
    const s16 = nextStep % 16;
    if (s16 % 4 === 0) kick(nextStepTime);
    if (s16 % 4 === 2) hat(nextStepTime, s16 % 8 === 6);
    if (s16 === 4 || s16 === 12) clap(nextStepTime);
    if (BASS_ON[s16]) bass(nextStepTime, BASS[s16], s16 % 4 === 0);
    nextStepTime += STEP;
    nextStep++;
  }
}

export function startAudio() {
  if (playing) return;
  if (!ctx) {
    ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.42;
    muffleFilter = ctx.createBiquadFilter();
    muffleFilter.type = 'lowpass';
    muffleFilter.Q.value = 0.7;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18; comp.ratio.value = 6;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.55;
    freqData = new Uint8Array(analyser.frequencyBinCount);
    master.connect(muffleFilter);
    muffleFilter.connect(comp);
    comp.connect(analyser);
    analyser.connect(ctx.destination);
    applyMuffle(true);
    noiseBuf = makeNoise(ctx);
  }
  ctx.resume();
  // align the scheduler to the global visual beat grid
  const now = performance.now();
  const beatFloat = (now - epoch) / BEAT_MS;
  const nextBeat = Math.ceil(beatFloat * 4) / 4 + 0.25;
  nextStep = Math.round(nextBeat * 4);
  nextStepTime = ctx.currentTime + (nextBeat - beatFloat) * (BEAT_MS / 1000);
  timer = window.setInterval(schedule, 40);
  playing = true;
}

export function stopAudio() {
  if (!playing) return;
  if (timer !== null) window.clearInterval(timer);
  timer = null;
  ctx?.suspend();
  playing = false;
}

export function isAudioPlaying() { return playing; }

/** Live frequency levels 0..1 (drives the stage show). Silent-safe when audio is off. */
export function sampleAudio(): { bass: number; mid: number; treble: number } {
  const zero = { bass: 0, mid: 0, treble: 0 };
  if (!analyser || !freqData || !playing || !ctx || ctx.state !== 'running') return zero;
  analyser.getByteFrequencyData(freqData as Uint8Array<ArrayBuffer>);
  const avg = (a: number, b: number) => {
    let s = 0;
    const n = Math.min(b, freqData!.length - 1) - a + 1;
    for (let i = a; i <= Math.min(b, freqData!.length - 1); i++) s += freqData![i];
    return n > 0 ? s / n / 255 : 0;
  };
  const bass = Math.min(1, avg(1, 4) * 1.5);
  const mid = Math.min(1, avg(5, 20) * 1.8);
  const treble = Math.min(1, avg(21, 70) * 2.2);
  return { bass, mid, treble };
}

// ---------------------------------------------------------------- muffle (heard through the walls)
let muffleFilter: BiquadFilterNode | null = null;
let muffle = 0;

function applyMuffle(instant = false) {
  if (!ctx || !muffleFilter || !master) return;
  const f = 18000 * Math.pow(340 / 18000, muffle);
  const gain = 0.42 * (1 - 0.35 * muffle);
  if (instant) {
    muffleFilter.frequency.value = f;
    master.gain.value = gain;
  } else {
    muffleFilter.frequency.setTargetAtTime(f, ctx.currentTime, 0.18);
    master.gain.setTargetAtTime(gain, ctx.currentTime, 0.18);
  }
}

/** 0 = inside the club, 1 = out on the plaza (bass thumping through the façade) */
export function setMuffle(m: number) {
  muffle = Math.min(1, Math.max(0, m));
  applyMuffle();
}

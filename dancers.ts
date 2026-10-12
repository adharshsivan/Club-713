import { Px, hash, clamp01, lerp, mix } from '../pixel/engine';
import type { ShowState } from './director';

/**
 * Side-screen stars: Nova (left, beanie + varsity jacket) and Volt (right,
 * spiky hair + headband + vest). 24 fully keyframed moves — bounces,
 * moonwalk, backflip, floss, dab, headbang, windmill, freeze, air guitar and
 * more — with eased interpolation, squash & stretch, afterimages, landing
 * dust, blinking, outfits with secondary motion, and beat-synced stagecraft.
 *
 * Local character space: origin at the feet, x+ right, y+ DOWN.
 * Feet rest at y=0, hips y=-10, shoulders y=-18, head spans y=-27..-21.
 */

interface KF {
  dx: number; dy: number; lean: number; tilt: number; squash: number;
  hL: [number, number]; hR: [number, number];
  fL: [number, number]; fR: [number, number];
  narrow?: 1; face?: -1 | 0 | 1 | 2; // 2 = back of head (spin)
  mouth?: 0 | 1 | 2 | 3;             // 0 smile, 1 open shout, 2 grin, 3 singing ooh
  open?: 1;                          // open palms instead of fists
}

const B: KF = {
  dx: 0, dy: 0, lean: 0, tilt: 0, squash: 0,
  hL: [-6, -8], hR: [6, -8], fL: [-3, 0], fR: [3, 0],
};

const MOVES: Record<string, KF[]> = {
  bounce: [
    B,
    { ...B, dy: 1, squash: 0.5, tilt: 1, hL: [-6, -7], hR: [6, -7] },
    { ...B, tilt: -1, dy: -0.5 },
    { ...B, dy: 1, squash: 0.5, tilt: 1, hL: [-6, -7], hR: [6, -7] },
  ],
  step: [
    { ...B, dx: -2, lean: -1, hL: [-7, -9], hR: [5, -7], fL: [-5, 0], fR: [2, 0] },
    { ...B, dx: -1, squash: 0.3, fL: [-3, 0], fR: [2, 0] },
    { ...B, dx: 2, lean: 1, hL: [-5, -7], hR: [7, -9], fL: [-2, 0], fR: [5, 0] },
    { ...B, dx: 1, squash: 0.3, fL: [-3, 0], fR: [2, 0] },
  ],
  shuffle: [
    { ...B, dy: 1, squash: 0.4, tilt: -1, hL: [-7, -10], hR: [5, -6], fL: [-5, 0], fR: [1, 0] },
    { ...B, dy: 1, squash: 0.4, tilt: 1, hL: [-5, -6], hR: [7, -10], fL: [-1, 0], fR: [5, 0] },
    { ...B, dy: 1, squash: 0.4, tilt: -1, hL: [-7, -10], hR: [5, -6], fL: [-5, 0], fR: [1, 0] },
    { ...B, dy: 0, tilt: 1, hL: [-5, -8], hR: [7, -10], fL: [-1, -1], fR: [5, 0] },
  ],
  wave: [
    { ...B, hL: [-4, -25], hR: [4, -25], open: 1 },
    { ...B, lean: -1, tilt: -1, hL: [-8, -19], hR: [3, -27], open: 1 },
    { ...B, hL: [-4, -25], hR: [4, -25], open: 1 },
    { ...B, lean: 1, tilt: 1, hL: [-3, -27], hR: [8, -19], open: 1 },
  ],
  twist: [
    { ...B, lean: -1, tilt: -1, face: -1, hL: [0, -12], hR: [-7, -10], fL: [-4, 0], fR: [3, 0] },
    { ...B, lean: 1, tilt: 1, face: 1, hL: [7, -10], hR: [0, -12], fL: [-3, 0], fR: [4, 0] },
    { ...B, lean: -1, tilt: -1, face: -1, dy: -1, hL: [0, -13], hR: [-7, -11], fL: [-4, 0], fR: [3, 0] },
    { ...B, lean: 1, tilt: 1, face: 1, dy: -1, hL: [7, -11], hR: [0, -13], fL: [-3, 0], fR: [4, 0] },
  ],
  clap: [
    { ...B, hL: [-8, -14], hR: [8, -14], open: 1 },
    { ...B, dy: -1, hL: [-1, -20], hR: [1, -20], mouth: 1 },
    { ...B, hL: [-8, -14], hR: [8, -14], open: 1 },
    { ...B, dy: 1, squash: 0.5, hL: [-1, -12], hR: [1, -12] },
  ],
  knee: [
    { ...B, tilt: -1, hL: [-3, -22], hR: [6, -10], fL: [-2, -6], fR: [3, 0], mouth: 1 },
    { ...B, squash: 0.3 },
    { ...B, tilt: 1, hL: [-6, -10], hR: [3, -22], fL: [-3, 0], fR: [2, -6], mouth: 1 },
    { ...B, squash: 0.3 },
  ],
  jump: [
    { ...B, dy: 2, squash: 1, hL: [-6, -6], hR: [6, -6], fL: [-4, 0], fR: [4, 0] },
    { ...B, dy: -8, hL: [-5, -25], hR: [5, -25], fL: [-2, -3], fR: [2, -3], open: 1, mouth: 1 },
    { ...B, dy: -5, hL: [-5, -24], hR: [5, -24], fL: [-3, -2], fR: [3, -2], open: 1, mouth: 1 },
    { ...B, dy: 1, squash: 1, hL: [-7, -6], hR: [7, -6], fL: [-4, 0], fR: [4, 0] },
  ],
  spin: [
    { ...B, hL: [-9, -14], hR: [9, -14], open: 1 },
    { ...B, narrow: 1, face: 1, hL: [-3, -12], hR: [3, -12] },
    { ...B, face: 2, hL: [-9, -14], hR: [9, -14], open: 1 },
    { ...B, narrow: 1, face: -1, hL: [-3, -12], hR: [3, -12] },
  ],
  robot: [
    { ...B, tilt: -1, hL: [-6, -22], hR: [6, -8], face: -1 },
    { ...B, tilt: 1, hL: [-6, -8], hR: [6, -22], face: 1 },
    { ...B, hL: [-2, -14], hR: [2, -14], lean: 0 },
    { ...B, tilt: -1, hL: [-6, -22], hR: [6, -8], face: -1 },
  ],
   slide: [
    { ...B, dx: -2, tilt: -1, lean: -1, hL: [-7, -9], hR: [5, -7], fL: [-5, 0], fR: [1, 0] },
    { ...B, dx: -1, hL: [-6, -8], hR: [6, -8], fL: [-2, 0], fR: [2, 0] },
    { ...B, dx: 1, tilt: 1, lean: 1, hL: [-5, -7], hR: [7, -9], fL: [-1, 0], fR: [5, 0] },
    { ...B, dx: 2, hL: [-6, -8], hR: [6, -8], fL: [-2, 0], fR: [2, 0] },
  ],
  // gliding backward — feet stay planted, heels lift, body eases back
  moonwalk: [
    { ...B, dy: -1, lean: -1, tilt: -1, hL: [-5, -9], hR: [6, -7], fL: [-3, 0], fR: [3, -1], face: -1 },
    { ...B, dx: -1, dy: -1, lean: -1, hL: [-6, -9], hR: [7, -8], fL: [-4, 0], fR: [2, -1], face: -1 },
    { ...B, dx: -2, dy: -1, lean: -1, tilt: -1, hL: [-6, -10], hR: [8, -8], fL: [-5, 0], fR: [1, -1], face: -1 },
    { ...B, dx: -3, dy: 0, lean: -1, hL: [-5, -8], hR: [7, -8], fL: [-4, 0], fR: [2, 0], face: -1 },
  ],
  // full backflip: crouch, launch tucked (back of head, limbs folded), open, squash land
  backflip: [
    { ...B, dy: 2, squash: 1, hL: [-6, -6], hR: [6, -6], fL: [-4, 0], fR: [4, 0], mouth: 1 },
    { ...B, dy: -8, narrow: 1, face: 2, hL: [-2, -11], hR: [2, -11], fL: [-1, -4], fR: [1, -4], mouth: 1 },
    { ...B, dy: -6, hL: [-6, -24], hR: [6, -24], fL: [-3, -3], fR: [3, -3], open: 1, mouth: 1 },
    { ...B, dy: 1, squash: 1, hL: [-7, -6], hR: [7, -6], fL: [-4, 0], fR: [4, 0] },
  ],
  // floss: whipping arms alternating with a body twist
  floss: [
    { ...B, lean: -1, tilt: -1, face: -1, hL: [-9, -15], hR: [4, -7], fL: [-5, 0], fR: [1, 0], open: 1 },
    { ...B, lean: 1, tilt: 1, face: 1, hL: [4, -7], hR: [9, -15], fL: [-1, 0], fR: [5, 0], open: 1 },
    { ...B, dy: -1, lean: -1, tilt: -1, face: -1, hL: [-9, -13], hR: [5, -8], fL: [-4, 0], fR: [2, 0], open: 1 },
    { ...B, dy: -1, lean: 1, tilt: 1, face: 1, hL: [5, -8], hR: [9, -13], fL: [-2, 0], fR: [4, 0], open: 1 },
  ],
  // the dab: head tucked into the elbow, other arm extended, held on the beat
  dab: [
    { ...B, dy: 1, squash: 0.3, lean: 1, tilt: 2, face: 1, hL: [-7, -14], hR: [10, -20] },
    { ...B, dy: 1, squash: 0.3, lean: 1, tilt: 2, face: 1, hL: [-7, -14], hR: [11, -21] },
    { ...B, dy: 0.5, lean: 1, tilt: 1, face: 1, hL: [-6, -10], hR: [8, -16] },
    B,
  ],
  // headroll: head circles with arms swaying in counterpoint
  headroll: [
    { ...B, tilt: -2, face: -1, hL: [-8, -9], hR: [6, -7] },
    { ...B, tilt: 0, face: 0, dy: -1, hL: [-6, -11], hR: [7, -9] },
    { ...B, tilt: 2, face: 1, hL: [-7, -9], hR: [9, -7] },
    { ...B, tilt: 0, face: 0, hL: [-6, -8], hR: [6, -8] },
  ],
  // airplane: one wing out, hip on a hop, body twist
  airplane: [
    { ...B, lean: 1, tilt: 1, face: 1, hL: [-3, -10], hR: [10, -12], fL: [-4, 0], fR: [2, 0] },
    { ...B, dy: -1, lean: 1, tilt: 1, face: 1, hL: [-3, -9], hR: [11, -13], fL: [-3, -1], fR: [2, 0], open: 1 },
    { ...B, lean: -1, tilt: -1, face: -1, hL: [-10, -12], hR: [3, -10], fL: [-2, 0], fR: [4, 0] },
    { ...B, dy: -1, lean: -1, tilt: -1, face: -1, hL: [-11, -13], hR: [3, -9], fL: [-2, -1], fR: [3, 0], open: 1 },
  ],
  // groove: loose hip sway with low arms, riding the bass
  groove: [
    { ...B, dx: -1, tilt: -1, hL: [-7, -6], hR: [5, -8], fL: [-4, 0], fR: [2, 0] },
    { ...B, dx: 1, tilt: 1, hL: [-5, -8], hR: [7, -6], fL: [-2, 0], fR: [4, 0] },
    { ...B, dx: -1, tilt: -1, dy: -1, hL: [-7, -5], hR: [5, -9], fL: [-4, 0], fR: [2, 0] },
    { ...B, dx: 1, tilt: 1, dy: -1, hL: [-5, -9], hR: [7, -5], fL: [-2, 0], fR: [4, 0] },
  ],
  // double hop — two quick bounces with arms flying up
  bunny: [
    { ...B, dy: 1, squash: 0.5, hL: [-6, -7], hR: [6, -7] },
    { ...B, dy: -4, hL: [-6, -24], hR: [6, -24], fL: [-3, -2], fR: [3, -2], open: 1, mouth: 2 },
    { ...B, dy: 1, squash: 0.5, hL: [-6, -7], hR: [6, -7] },
    { ...B, dy: -4, hL: [-6, -24], hR: [6, -24], fL: [-3, -2], fR: [3, -2], open: 1, mouth: 2 },
  ],
  // headbang — neck pumps while one arm stays locked up
  headbang: [
    { ...B, hR: [-9, -17], hL: [6, -10], tilt: -2, dy: 1, mouth: 1 },
    { ...B, hR: [-9, -17], hL: [6, -10], tilt: 2, dy: -1 },
    { ...B, hR: [-9, -17], hL: [6, -10], tilt: -2, dy: 1, mouth: 1 },
    { ...B, hR: [-9, -17], hL: [6, -10], tilt: 2, dy: -1, open: 1 },
  ],
  // windmill — arms circle overhead while the body rocks
  windmill: [
    { ...B, hL: [-3, -25], hR: [3, -25], open: 1, mouth: 2 },
    { ...B, hL: [-9, -14], hR: [9, -14], open: 1 },
    { ...B, dy: 1, hL: [-6, -4], hR: [6, -4], open: 1 },
    { ...B, hL: [-2, -20], hR: [2, -20], open: 1 },
  ],
  // breakdance freeze — arms in a V, one leg crossed up, held
  freeze: [
    { ...B, face: 1, hL: [-8, -22], hR: [8, -22], open: 1, mouth: 2 },
    { ...B, face: 1, hL: [-8, -22], hR: [8, -22], open: 1, fR: [0, -5], mouth: 2 },
    { ...B, face: 1, hL: [-8, -22], hR: [8, -22], open: 1, fR: [0, -6], mouth: 2 },
    { ...B, face: 1, hL: [-8, -18], hR: [8, -18], open: 1, fR: [2, -2] },
  ],
  // air guitar — strumming the imaginary neck while singing
  airguitar: [
    { ...B, lean: 1, hL: [-10, -12], hR: [4, -6], face: 1, mouth: 3 },
    { ...B, lean: -1, hL: [-11, -15], hR: [5, -4], face: -1 },
    { ...B, lean: 1, dy: -1, hL: [-10, -11], hR: [4, -7], face: 1, mouth: 3 },
    { ...B, lean: -1, dy: -1, hL: [-11, -14], hR: [5, -5], face: -1 },
  ],
  sync: [
    { ...B, lean: 1, tilt: 1, face: 1, hL: [-5, -8], hR: [10, -14], fL: [-2, 0], fR: [4, 0], mouth: 2 },
    { ...B, dy: -2, hL: [-4, -25], hR: [4, -25], open: 1, mouth: 1 },
    { ...B, lean: 1, tilt: 1, face: 1, hL: [-5, -8], hR: [10, -14], fL: [-2, 0], fR: [4, 0], mouth: 2 },
    { ...B, dy: -5, hL: [-4, -25], hR: [4, -25], fL: [-2, -2], fR: [2, -2], open: 1, mouth: 1 },
  ],
};

// 24 phrases = one full 96-beat choreography loop; every move lands once per
// cycle, arranged so big stunts follow warm-ups and calm moves cool things down
const ORDER = [
  'bounce', 'groove', 'wave', 'bunny',         // warm up
  'shuffle', 'slide',                           // get loose
  'backflip', 'headbang', 'jump', 'floss', 'spin', // the send section
  'moonwalk', 'robot', 'dab', 'freeze',        // funky breaks
  'twist', 'knee', 'clap', 'airplane', 'sync', // trade moves
  'headroll', 'airguitar', 'windmill', 'step', // cool down
];

const STAR: KF = {
  ...B, dy: -8, hL: [-6, -26], hR: [6, -26],
  fL: [-3, -3], fR: [3, -3], open: 1, mouth: 1,
};

interface Outfit {
  skin: string; skinD: string;
  jacket: string; jacketD: string; sleeve: string;
  pants: string; pantsD: string;
  shoe: string; shoeA: string;
  hat: string; hatTrim: string; hair: string;
  trim: string; vest?: boolean;
}

const NOVA: Outfit = {
  skin: '#f2b98a', skinD: '#c98a5e',
  jacket: '#4b2a86', jacketD: '#33205e', sleeve: '#e8e0d0',
  pants: '#232a4d', pantsD: '#161b33',
  shoe: '#f2f5ff', shoeA: '#b6ff2e',
  hat: '#20222e', hatTrim: '#b6ff2e', hair: '#3a2c22',
  trim: '#8b5cf6',
};

const VOLT: Outfit = {
  skin: '#8d5a3b', skinD: '#6b4229',
  jacket: '#5c1f4d', jacketD: '#421438', sleeve: '#8d5a3b',
  pants: '#2b1c33', pantsD: '#1d1224',
  shoe: '#f2f5ff', shoeA: '#ff3d81',
  hat: '#14141c', hatTrim: '#ff3d81', hair: '#14141c',
  trim: '#38e8ff', vest: true,
};

const OUTLINE = '#0b0714';

function mirrorKf(k: KF): KF {
  const m = (v: [number, number]): [number, number] => [-v[0], v[1]];
  return {
    ...k,
    dx: -k.dx, lean: -k.lean, tilt: -k.tilt,
    hL: m(k.hR), hR: m(k.hL), fL: m(k.fR), fR: m(k.fL),
    face: k.face === 2 ? 2 : k.face ? (-k.face as -1 | 0 | 1) : k.face,
  };
}

const easeSmooth = (t: number) => t * t * (3 - 2 * t);
const easeBack = (t: number) => {
  const c = 1.4;
  const u = t - 1;
  return 1 + (c + 1) * u * u * u + c * u * u;
};

function lerpKF(a: KF, b: KF, t: number, move: string): KF {
  const bodyT = move === 'robot' ? (t < 0.8 ? 0 : 1) : easeSmooth(t);
  const handT = move === 'robot' ? bodyT : move === 'wave' || move === 'jump' || move === 'spin'
    ? easeBack(Math.min(1, t * 1.05)) : bodyT;
  const L = (x: number, y: number) => lerp(x, y, bodyT);
  const H = (x: number, y: number) => lerp(x, y, handT);
  const V = (p: [number, number], q: [number, number]): [number, number] => [H(p[0], q[0]), H(p[1], q[1])];
  const pick = bodyT < 0.5;
  return {
    dx: L(a.dx, b.dx), dy: L(a.dy, b.dy),
    lean: L(a.lean, b.lean), tilt: L(a.tilt, b.tilt),
    squash: L(a.squash, b.squash),
    hL: V(a.hL, b.hL), hR: V(a.hR, b.hR),
    fL: [L(a.fL[0], b.fL[0]), L(a.fL[1], b.fL[1])],
    fR: [L(a.fR[0], b.fR[0]), L(a.fR[1], b.fR[1])],
    narrow: pick ? a.narrow : b.narrow,
    face: pick ? a.face : b.face,
    mouth: pick ? a.mouth : b.mouth,
    open: pick ? a.open : b.open,
  };
}

/** pose at an absolute beat position (drives main pose, ghosts and velocity) */
function poseAt(beat: number, move: string, canon: number): KF {
  const frames = MOVES[move];
  const n = frames.length;
  const sf = beat * 2 + canon;
  const i0 = ((Math.floor(sf) % n) + n) % n;
  const i1 = (i0 + 1) % n;
  return lerpKF(frames[i0], frames[i1], sf - Math.floor(sf), move);
}

interface DrawOpts {
  mirror: boolean;
  kick: number;
  t: number;
  velDy: number;
  blink: boolean;
  rim: 1 | -1;
  glow: string;
  ghost?: boolean;
}

function drawDancer(
  p: Px, cx: number, feetY: number, kf: KF, o: Outfit,
  style: 'nova' | 'volt', opt: DrawOpts,
) {
  const k = opt.mirror ? mirrorKf(kf) : kf;
  const wide = k.narrow ? 0.55 : 1;
  const squash = clamp01(k.squash + Math.max(0, opt.velDy) * 0.09);
  const stretch = clamp01(Math.max(0, -opt.velDy) * 0.06);
  // characters render slightly oversized so they own the screen
  const S = 1.18;
  const nx = (x: number) => Math.round(cx + (k.dx + x * wide) * S);
  const ny = (y: number) => Math.round(feetY + (k.dy + y - stretch * 1.5) * S);
  const leanX = k.lean * 1.5;
  const ghost = !!opt.ghost;

  const R = (x: number, y: number, w: number, h: number, c: string, ol = !ghost) => {
    const W = Math.max(1, Math.round(w * S)), H = Math.max(1, Math.round(h * S));
    const X = nx(x), Y = ny(y);
    if (ol) p.rect(X - 1, Y - 1, W + 2, H + 2, OUTLINE);
    p.rect(X, Y, W, H, ghost ? opt.glow : c);
  };
  const Ln = (ax: number, ay: number, bx: number, by: number, c: string, t = 2) => {
    if (!ghost) p.line(nx(ax), ny(ay), nx(bx), ny(by), OUTLINE, t + 2);
    p.line(nx(ax), ny(ay), nx(bx), ny(by), ghost ? opt.glow : c, t);
  };

  if (!ghost) {
    // glow silhouette pops the dancer off the background
    p.alpha(0.22 + opt.kick * 0.22);
    p.ellipse(cx + k.dx, feetY - 16, 10, 17, opt.glow);
    p.alpha(1);
    // ground shadow shrinks as they leave the floor
    const air = clamp01(-k.dy / 8);
    p.alpha(0.5 * (1 - air * 0.6));
    p.ellipse(cx + k.dx, feetY + 1, (k.narrow ? 3 : 5) * (1 - air * 0.3), 1, '#000000');
    p.alpha(1);
  }

  // legs
  const leg = (hipX: number, foot: [number, number], c: string) => {
    const knee: [number, number] = [(hipX + foot[0]) / 2 + (foot[0] > hipX ? 1 : -1), -5];
    Ln(hipX, -10, knee[0], knee[1], c);
    Ln(knee[0], knee[1], foot[0], foot[1], c);
  };
  leg(-2, k.fL, o.pants);
  leg(2, k.fR, o.pantsD);
  if (!ghost) {
    // ankle cuffs
    p.dot(nx(k.fL[0]), ny(-2), o.trim);
    p.dot(nx(k.fR[0]), ny(-2), o.trim);
  }
  // chunky sneakers: body + sole + laces + heel tab
  const shoe = (f: [number, number], flip: boolean) => {
    const sx = f[0] + (flip ? 0 : -1);
    R(sx - 1, -1, 4, 2, o.shoe);
    p.rect(nx(sx - 1), ny(1), Math.round(4 * S), 1, ghost ? opt.glow : '#1a1420');
    if (!ghost) {
      p.dot(nx(sx), ny(-1), '#ffffff');
      p.dot(nx(sx + 1), ny(-1), '#ffffff');
      p.dot(nx(sx + (flip ? 3 : 0)), ny(-1), o.shoeA);
    }
  };
  shoe(k.fL, false);
  shoe(k.fR, true);

  // torso (squash widens, stretch lengthens)
  const tw = (k.narrow ? 5 : 8) + squash * 2;
  const th = 10 - squash * 1.5;
  R(-tw / 2 + leanX, -19 - stretch, tw, th, o.jacket);
  if (!ghost) {
    R(-tw / 2 + leanX, -19 - stretch, 1, th, o.jacketD, false);
    R(tw / 2 + leanX - 1, -19 - stretch, 1, th, o.jacketD, false);
    if (o.vest) {
      // open vest: bright tee + lightning bolt
      R(-1 + leanX, -18, 2, 5, o.trim, false);
      p.dot(nx(leanX), ny(-17), opt.glow);
      p.dot(nx(leanX + 1), ny(-16), opt.glow);
      p.dot(nx(leanX), ny(-15), opt.glow);
    } else {
      // varsity zip + chest stripe + cream star patch
      R(leanX, -18, 1, 6, o.trim, false);
      R(-tw / 2 + leanX + 1, -16, tw - 2, 1, o.sleeve, false);
      const stx = leanX - 2;
      p.dot(nx(stx), ny(-18), o.sleeve);
      p.dot(nx(stx - 1), ny(-17), o.sleeve);
      p.dot(nx(stx + 1), ny(-17), o.sleeve);
      p.dot(nx(stx), ny(-17), '#ffffff');
      p.dot(nx(stx), ny(-16), o.sleeve);
    }
    R(-tw / 2 + leanX, -10, tw, 1, o.jacketD, false);
    // chain swinging with the lean
    const sw = k.lean * 1.2 + Math.sin(opt.t * 6) * 0.4;
    p.dot(nx(-2 + leanX + sw), ny(-13), '#d7dce6');
    p.dot(nx(0 + leanX + sw), ny(-12), '#d7dce6');
    p.dot(nx(2 + leanX + sw), ny(-13), '#d7dce6');
  }

  // arms
  const arm = (sx: number, hand: [number, number], sleeve: string) => {
    const ex = (sx + hand[0]) / 2 + (hand[0] > sx ? 1 : -1);
    const ey = (-18 + hand[1]) / 2;
    Ln(sx + leanX, -18, ex, ey, sleeve);
    Ln(ex, ey, hand[0], hand[1], o.vest ? o.skin : o.trim);
    if (k.open && !ghost) {
      R(hand[0] - 1, hand[1] - 1, 3, 3, o.skin);
      p.dot(nx(hand[0]), ny(hand[1]), o.skinD);
    } else {
      R(hand[0] - 1, hand[1] - 1, 2, 2, o.skin);
    }
    if (!ghost) p.dot(nx(ex), ny(ey), o.trim); // elbow stitch
  };
  arm(-4, k.hL, o.sleeve);
  arm(4, k.hR, o.vest ? o.skinD : o.sleeve);
  if (!ghost) {
    // wristbands
    p.dot(nx(k.hL[0]), ny(k.hL[1] + 1), o.trim);
    p.dot(nx(k.hR[0]), ny(k.hR[1] + 1), o.trim);
  }

  // head
  const hx = leanX + k.tilt;
  const hy = -24 - stretch;
  const hw = k.narrow ? 4 : 6;
  const back = k.face === 2;
  R(hx - hw / 2, hy - 3, hw, 6, back ? o.hair : o.skin);
  if (!ghost && !back) {
    R(hx - hw / 2, hy + 2, hw, 1, o.skinD, false);
    const f = k.face ?? 0;
    if (!k.narrow) {
      // 2x2 eyes with a highlight that tracks the facing direction
      const eye = (ex: number) => {
        if (opt.blink) {
          p.rect(nx(ex), ny(hy - 1), 2, 1, '#1a1420');
          return;
        }
        p.rect(nx(ex), ny(hy - 2), 2, 2, '#1a1420');
        p.dot(nx(ex + f), ny(hy - 2), '#ffffff');
      };
      eye(hx - 2 + f);
      eye(hx + 1 + f);
      // brows: Nova soft, Volt angled and confident
      if (style === 'volt') {
        p.dot(nx(hx - 2 + f), ny(hy - 3), o.hair);
        p.dot(nx(hx - 1 + f), ny(hy - 4), o.hair);
        p.dot(nx(hx + 2 + f), ny(hy - 3), o.hair);
        p.dot(nx(hx + 1 + f), ny(hy - 4), o.hair);
      } else {
        p.dot(nx(hx - 2 + f), ny(hy - 3), o.hair);
        p.dot(nx(hx + 2 + f), ny(hy - 3), o.hair);
      }
      const m = k.mouth ?? 0;
      if (m === 1) {
        // open shout with a teeth row
        p.rect(nx(hx - 1 + f), ny(hy + 1), 3, 1, '#ffffff');
        p.rect(nx(hx - 1 + f), ny(hy + 2), 3, 1, '#7a1f2a');
      } else if (m === 2) {
        // wide grin with teeth + jaw shadow
        p.rect(nx(hx - 2 + f), ny(hy + 1), 5, 1, '#ffffff');
        p.rect(nx(hx - 1 + f), ny(hy + 2), 3, 1, '#7a1f2a');
      } else if (m === 3) {
        // singing "ooh"
        p.rect(nx(hx - 1 + f), ny(hy + 1), 2, 2, '#7a1f2a');
      } else {
        p.rect(nx(hx - 1 + f), ny(hy + 1), 3, 1, '#a34a5e');
        p.dot(nx(hx - 2 + f), ny(hy + 1), '#a34a5e');
        p.dot(nx(hx + 2 + f), ny(hy + 1), '#a34a5e');
      }
      if (opt.kick > 0.55) {
        p.dot(nx(hx - 3), ny(hy), '#ff9db0');
        p.dot(nx(hx + 3), ny(hy), '#ff9db0');
      }
    } else {
      p.dot(nx(hx + f), ny(hy - 1), '#1a1420');
    }
  }

  if (ghost) return;

  if (style === 'nova') {
    if (back) {
      // back of beanie + big pom
      R(hx - hw / 2 - 1, hy - 7, hw + 2, 5, o.hat);
      R(hx - 1, hy - 10, 3, 3, o.hatTrim);
    } else {
      // beanie brim + crown + lagging pom
      const lag = clamp01(Math.max(0, opt.velDy) * 0.25) * 2 + Math.sin(opt.t * 9) * 0.5;
      R(hx - hw / 2 - 1, hy - 5, hw + 2, 2, o.hatTrim);
      R(hx - hw / 2, hy - 9, hw, 4, o.hat);
      R(hx - 1, hy - 11 + Math.round(lag), 3, 2, o.hatTrim);
      if (opt.kick > 0.5) p.dot(nx(hx), ny(hy - 11 + Math.round(lag)), '#ffffff');
    }
  } else {
    if (back) {
      R(hx - hw / 2, hy - 6, hw, 4, o.hair);
    } else {
      // spiky hair with tip highlights + neon headband
      const spikes = k.narrow ? [3, 2] : [3, 4, 2, 4, 3];
      spikes.forEach((hh, i) => {
        const sx = hx - Math.floor(spikes.length / 2) + i;
        R(sx, hy - 3 - hh, 1, hh, o.hair);
        // one neon tip so the hair has a signature accent
        p.dot(nx(sx), ny(hy - 3 - hh), i === spikes.length - 1 ? o.hatTrim : '#4a4a58');
      });
      R(hx - hw / 2, hy - 3, hw, 1, o.hatTrim, false);
      // knot tails waving behind
      const w1 = Math.round(Math.sin(opt.t * 8) * 1.5);
      const w2 = Math.round(Math.sin(opt.t * 8 + 1.5) * 1.5);
      p.dot(nx(hx - hw / 2 - 1), ny(hy - 2 + w1), o.hatTrim);
      p.dot(nx(hx - hw / 2 - 2), ny(hy - 1 + w2), o.hatTrim);
    }
  }

  if (!ghost) {
    // rim light on the room-facing edge
    p.alpha(0.75);
    const rx = opt.rim > 0 ? tw / 2 + leanX : -tw / 2 + leanX - 1;
    p.rect(nx(rx), ny(-19), 1, 9, opt.glow);
    p.alpha(1);
  }
}

function drawHeart(p: Px, x: number, y: number, c: string) {
  const rows = ['0110110', '1111111', '1111111', '0111110', '0011100', '0001000'];
  rows.forEach((r, j) => {
    for (let i = 0; i < r.length; i++) if (r[i] === '1') p.dot(x + i - 3, y + j - 3, c);
  });
}

function drawNote(p: Px, x: number, y: number, c: string) {
  p.rect(x + 2, y, 1, 4, c);
  p.rect(x, y + 3, 2, 2, c);
  p.dot(x + 3, y + 1, c);
}

function drawStar(p: Px, x: number, y: number, c: string) {
  p.dot(x, y - 1, c);
  p.rect(x - 1, y, 3, 1, c);
  p.dot(x, y + 1, c);
}

function drawBackground(
  p: Px, s: ShowState, a: DancerAccents, cx: number, chestY: number,
) {
  const { w, h } = p;
  const top = mix('#0a0618', a.main, 0.10 + s.energy * 0.12);
  const bot = mix('#150a2e', a.soft, 0.14 + s.energy * 0.10);
  p.vgrad(0, h, top, bot);

  // twinkling starfield riding the treble
  for (let i = 0; i < 14; i++) {
    const x = Math.floor(hash(i * 3.7 + 11) * w);
    const y = Math.floor(hash(i * 9.1 + 5) * (h - 12));
    const tw = hash(i * 1.3 + Math.floor(s.t * 3 + i) * 0.23);
    if (tw > 0.55 - s.treble * 0.25) p.dot(x, y, tw > 0.88 ? '#ffffff' : a.soft);
  }

  // crossing spot beams sweeping opposite directions
  const sw = Math.sin(s.beat * Math.PI * 0.25) * (4 + s.energy * 3);
  p.alpha(0.10 + s.energy * 0.08 + s.kick * 0.06);
  p.line(2, 0, cx + sw, h - 6, a.main, 3);
  p.line(w - 3, 0, cx - sw, h - 6, a.soft, 3);
  p.alpha(1);

  // expanding kick rings from the dancer's chest
  const ring = (ph: number, r0: number, col: string) => {
    const r = 2 + (1 - ph) * 13;
    const al = ph * 0.5;
    if (al <= 0.02) return;
    p.alpha(al);
    p.ring(cx, chestY, r + r0, col);
    p.alpha(1);
  };
  ring(s.pulse, 0, a.main);
  ring(s.pulse2, 4, a.soft);

  // halo doublet behind the head
  p.alpha(0.4 + s.kick * 0.4);
  p.ring(cx, chestY - 8, 7 + s.kick * 2.5, a.main);
  p.alpha(0.25);
  p.ring(cx, chestY - 8, 9.5 + s.kick * 3, a.soft);
  p.alpha(1);

  // rising motes, notes and sparks
  for (let i = 0; i < 9; i++) {
    const sp = 2 + hash(i * 1.7) * (3 + s.energy * 4);
    const x = Math.floor(hash(i * 3.1 + 21) * w);
    let y = (hash(i * 7.3 + 9) * (h + 8) - s.t * sp) % (h + 8);
    if (y < 0) y += h + 8;
    const yy = Math.floor(y) - 4;
    if (hash(i + Math.floor(s.t * 2)) < 0.3) continue;
    if (i % 4 === 0) drawNote(p, x, yy, a.main);
    else if (i % 4 === 1) drawStar(p, x, yy, '#ffffff');
    else p.dot(x, yy, a.soft);
  }

  // floor: scrolling dashes + glow pool under the dancer
  const scroll = (s.beat * 6) % 4;
  for (let x = -4; x < w + 4; x += 4) p.dot(x + scroll, h - 6, a.soft);
  p.alpha(0.30 + s.kick * 0.35);
  p.ellipse(cx, h - 5, 9, 2, a.main);
  p.alpha(1);
  p.rect(0, h - 6, w, 1, a.soft);
  p.alpha(0.4);
  p.rect(0, h - 5, w, 1, a.main);
  p.alpha(1);

  // crisp inner frame that breathes with the kick
  p.alpha(0.45 + s.kick * 0.35);
  p.rect(0, 0, w, 1, a.soft);
  p.rect(0, h - 1, w, 1, a.soft);
  p.rect(0, 0, 1, h, a.soft);
  p.rect(w - 1, 0, 1, h, a.soft);
  p.alpha(1);
  p.rect(0, 0, 3, 1, a.main);
  p.rect(0, 0, 1, 3, a.main);
  p.rect(w - 3, 0, 3, 1, a.main);
  p.rect(w - 1, 0, 1, 3, a.main);
  p.rect(0, h - 1, 3, 1, a.main);
  p.rect(w - 3, h - 1, 3, 1, a.main);
}

export interface DancerAccents { main: string; soft: string }

export function drawDancerScreen(
  p: Px, side: 'L' | 'R', s: ShowState, a: DancerAccents,
) {
  const { w, h } = p;
  const mirror = side === 'R';

  // camera: bass bob + drop shake
  const bobY = Math.round(-s.bass * 1.2);
  let shX = 0, shY = 0;
  if (s.drop > 0.25) {
    shX = Math.round((hash(Math.floor(s.t * 30) + (mirror ? 50 : 0)) - 0.5) * s.drop * 3);
    shY = Math.round((hash(Math.floor(s.t * 30) + 7) - 0.5) * s.drop * 3);
  }
  const cx = Math.floor(w / 2) + shX;
  const feetY = h - 7 + bobY + shY;

  // choreography: 4-beat phrases, 2 pose steps per beat, canon delay on the right
  const bip = ((s.beat % 4) + 4) % 4; // beats into phrase
  const moveIdx = ((s.phrase % ORDER.length) + ORDER.length) % ORDER.length;
  const move = ORDER[moveIdx];
  const prevMove = ORDER[(moveIdx - 1 + ORDER.length) % ORDER.length];
  const canon = mirror && move !== 'sync' ? 1 : 0; // Volt answers half a beat late

  let kf = poseAt(s.beat, move, canon);
  // smooth handoff from the previous move over the first half beat
  if (s.playing && bip < 0.6) {
    const prevFrames = MOVES[prevMove];
    const k = bip / 0.6;
    kf = lerpKF(prevFrames[prevFrames.length - 1], kf, k * k * (3 - 2 * k), 'blend');
  }
  // drops override everything: both dancers hit a star leap together
  const dropAmt = clamp01((s.drop - 0.18) / 0.6);
  if (s.playing && dropAmt > 0) kf = lerpKF(kf, STAR, dropAmt, 'jump');

  // idle breathing + weight shift keeps the duo alive between big moves
  const breathe = Math.sin(s.t * 2.1 + (mirror ? 2.6 : 0)) * 0.5;
  const sway = Math.sin(s.t * 1.2 + (mirror ? 1.4 : 0)) * 0.35;
  kf = { ...kf, dy: kf.dy + breathe, dx: kf.dx + sway };

  // velocity + previous pose drive squash, ghosts and landing dust
  const kfPrev = poseAt(s.beat - 0.14, move, canon);
  const velDy = kf.dy - kfPrev.dy;
  const blink = Math.floor(s.t * 0.9 + (mirror ? 1.7 : 0)) % 4 === 3 && s.drop < 0.3;

  const chestY = feetY - 17;
  drawBackground(p, s, a, cx, chestY);

  const outfit = side === 'L' ? NOVA : VOLT;
  const style = side === 'L' ? 'nova' : 'volt';
  const o: Outfit = { ...outfit, hatTrim: a.main, shoeA: a.main, trim: a.soft };
  const rim = (side === 'L' ? 1 : -1) as 1 | -1;
  const baseOpt = { mirror, kick: s.kick, t: s.t, velDy, blink, rim, glow: a.main };

  // motion-smear ghost on fast moves and drops
  const fast = move === 'jump' || move === 'spin' || move === 'shuffle' || move === 'floss' || s.drop > 0.2;
  if (fast && s.playing) {
    p.alpha(0.20);
    drawDancer(p, cx, feetY, { ...kfPrev, dy: kfPrev.dy + breathe }, o, style, { ...baseOpt, ghost: true });
    p.alpha(1);
  }
  drawDancer(p, cx, feetY, kf, o, style, baseOpt);

  // landing dust when slamming down
  if (velDy > 3.5 && kf.dy > 0.5) {
    const n = Math.min(6, Math.round(velDy));
    for (let i = 0; i < n; i++) {
      const dir = i % 2 ? 1 : -1;
      p.dot(cx + kf.dx + dir * (3 + i), feetY + 1 - (i % 2), '#cfd4e6');
    }
  }

  // move-change whoosh: speed lines radiating from the dancer
  const trans = 1 - clamp01(bip / 0.45);
  if (s.playing && trans > 0 && bip > 0.02) {
    p.alpha(trans * 0.55);
    for (let i = 0; i < 8; i++) {
      const ang = (i / 8) * Math.PI * 2 + s.t;
      const r0 = 10, r1 = 16 + trans * 4;
      p.line(
        cx + Math.cos(ang) * r0, chestY + Math.sin(ang) * r0,
        cx + Math.cos(ang) * r1, chestY + Math.sin(ang) * r1,
        a.main, 1,
      );
    }
    p.alpha(1);
  }

  // sync interaction: reach across + beating heart at the shared edge
  if (move === 'sync') {
    const edgeX = side === 'L' ? w - 4 : 3;
    const ey = Math.floor(h * 0.34) + Math.round(Math.sin(s.t * 3) * 1);
    // dotted energy tether from the pointing hand toward the edge
    const hx = cx + kf.dx + (mirror ? -kf.hR[0] : kf.hR[0]);
    const hy = feetY + kf.dy + kf.hR[1];
    p.alpha(0.7);
    for (let d = 2; d < Math.abs(edgeX - hx) - 1; d += 2) {
      const t = d / Math.max(1, Math.abs(edgeX - hx));
      p.dot(Math.round(lerp(hx, edgeX, t)), Math.round(lerp(hy, ey, t * 0.6)), a.main);
    }
    p.alpha(1);
    p.alpha(clamp01(0.65 + s.kick * 0.45));
    drawHeart(p, edgeX, ey, a.main);
    p.alpha(clamp01(s.kick * 0.8));
    p.ring(edgeX, ey, 5 + (1 - s.kick) * 5, '#ffffff');
    p.alpha(1);
  }

  // drop payoff: GO! tag + confetti + flash
  if (s.playing && s.drop > 0.15) {
    const n = Math.round(s.drop * 22);
    for (let i = 0; i < n; i++) {
      const fx = Math.floor(hash(i * 3.3 + 5) * w);
      const fy = Math.floor((hash(i * 7.1 + 2) * (h + 10) + s.t * 26) % (h + 10)) - 5;
      const cols = [a.main, a.soft, '#ffffff', '#ffd23a'];
      p.rect(fx, fy, 1, 2, cols[i % 4]);
    }
    if (s.drop > 0.55) {
      const label = 'GO!';
      const lx = Math.floor((w - p.textWidth(label)) / 2);
      p.text(label, lx + 1, 7, a.soft);
      p.text(label, lx, 6, '#ffffff');
    }
    p.alpha(s.drop * 0.28);
    p.rect(0, 0, w, h, a.main);
    p.alpha(1);
  }
}

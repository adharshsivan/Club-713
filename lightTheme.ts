import { useSyncExternalStore } from 'react';

// 713 interior lighting — swappable colour moods. Every field has a role
// used by a specific fixture family, so switching themes re-skins the whole
// room coherently instead of just tinting one light.
export interface LightTheme {
  id: string;
  label: string;
  dot: string;             // swatch colour for the UI picker
  heads1: [string, string, string, string]; // Halo moving-head rig
  heads2: [string, string, string, string]; // stage truss moving-head rig
  haloA: string;            // Halo outer ring / column rings / entry frame / fascia + ledge glow
  haloB: string;            // Halo inner ring / gradient-blade cool end / ceiling cove cool ring
  floorA: string;           // dance-floor bright sector colour
  floorB: string;           // dance-floor base wash
  floorC: string;           // dance-floor + booth cyan accent
  floorD: string;           // dance-floor amber wave accent
  warm: string;             // general warm wash (stage/pod/VIP lights, gradient-blade warm end)
  cool: string;             // general cool wash (VIP west light)
  white: string;            // neutral key-light tint
  pulseA: string;           // beat-pulse colour A / wall blades / ceiling cove violet ring
  pulseB: string;           // beat-pulse colour B / env accent light
}

export const LIGHT_THEMES: LightTheme[] = [
  {
    id: 'acid', label: 'Acid Night', dot: '#ffb25e',
    heads1: ['#8b5cf6', '#ff3d81', '#38e8ff', '#ff9e45'],
    heads2: ['#ff9e45', '#ff3d81', '#8b5cf6', '#38e8ff'],
    haloA: '#ffb25e', haloB: '#6d3df0',
    floorA: '#b6ff2e', floorB: '#6d3df0', floorC: '#38e8ff', floorD: '#ff9e45',
    warm: '#ff9e45', cool: '#6d3df0', white: '#ffe8cf',
    pulseA: '#8b5cf6', pulseB: '#ff3d81',
  },
  {
    id: 'sunset', label: 'Sunset Amber', dot: '#ff8a3d',
    heads1: ['#ff8a3d', '#ffd23a', '#ff3d6e', '#ffb25e'],
    heads2: ['#ffb25e', '#ff3d6e', '#ff8a3d', '#ffd23a'],
    haloA: '#ffb25e', haloB: '#ff6a3d',
    floorA: '#ffd23a', floorB: '#ff6a3d', floorC: '#ff9a4d', floorD: '#ffb25e',
    warm: '#ffb25e', cool: '#ff6a3d', white: '#ffe3c2',
    pulseA: '#ff8a3d', pulseB: '#ff3d6e',
  },
  {
    id: 'uv', label: 'Ultraviolet Dream', dot: '#8b5cf6',
    heads1: ['#8b5cf6', '#ff3dc8', '#7df9ff', '#c06bff'],
    heads2: ['#c06bff', '#ff3dc8', '#8b5cf6', '#7df9ff'],
    haloA: '#b388ff', haloB: '#4b1fb0',
    floorA: '#c06bff', floorB: '#4b1fb0', floorC: '#7df9ff', floorD: '#8b5cf6',
    warm: '#b388ff', cool: '#4b1fb0', white: '#e9dcff',
    pulseA: '#8b5cf6', pulseB: '#ff3dc8',
  },
  {
    id: 'cyan', label: 'Cyan Ice', dot: '#38e8ff',
    heads1: ['#38e8ff', '#5ad1ff', '#ffffff', '#8be9ff'],
    heads2: ['#8be9ff', '#5ad1ff', '#38e8ff', '#ffffff'],
    haloA: '#7fe7ff', haloB: '#1f6fb0',
    floorA: '#8be9ff', floorB: '#1f6fb0', floorC: '#ffffff', floorD: '#38e8ff',
    warm: '#7fe7ff', cool: '#1f6fb0', white: '#dff6ff',
    pulseA: '#38e8ff', pulseB: '#5ad1ff',
  },
  {
    id: 'magenta', label: 'Magenta Pulse', dot: '#ff3d81',
    heads1: ['#ff3d81', '#ff3dc8', '#b35aff', '#ff8ab8'],
    heads2: ['#ff8ab8', '#ff3dc8', '#ff3d81', '#b35aff'],
    haloA: '#ff6fb5', haloB: '#7a1fb0',
    floorA: '#ff3dc8', floorB: '#7a1fb0', floorC: '#b35aff', floorD: '#ff6fb5',
    warm: '#ff6fb5', cool: '#7a1fb0', white: '#ffe3f0',
    pulseA: '#ff3d81', pulseB: '#ff3dc8',
  },
  {
    id: 'green', label: 'Acid Green', dot: '#b6ff2e',
    heads1: ['#b6ff2e', '#38e8ff', '#6fd400', '#d6ff5a'],
    heads2: ['#d6ff5a', '#38e8ff', '#b6ff2e', '#6fd400'],
    haloA: '#b6ff2e', haloB: '#1f8b4d',
    floorA: '#b6ff2e', floorB: '#1f8b4d', floorC: '#38e8ff', floorD: '#d6ff5a',
    warm: '#b6ff2e', cool: '#1f8b4d', white: '#eaffd0',
    pulseA: '#b6ff2e', pulseB: '#6fd400',
  },
];

const STORAGE_KEY = '713-light-theme';

function readStored(): LightTheme {
  if (typeof window === 'undefined') return LIGHT_THEMES[0];
  try {
    const id = window.localStorage.getItem(STORAGE_KEY);
    return LIGHT_THEMES.find((t) => t.id === id) ?? LIGHT_THEMES[0];
  } catch {
    return LIGHT_THEMES[0];
  }
}

let current: LightTheme = readStored();
const listeners = new Set<() => void>();

/** non-reactive read — safe to call every frame inside useFrame loops */
export function getLightTheme(): LightTheme {
  return current;
}

export function setLightTheme(id: string) {
  const next = LIGHT_THEMES.find((t) => t.id === id);
  if (!next || next === current) return;
  current = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore (private browsing, etc.) */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** reactive hook — re-renders the component when the lighting theme changes */
export function useLightTheme(): LightTheme {
  return useSyncExternalStore(subscribe, getLightTheme, () => LIGHT_THEMES[0]);
}

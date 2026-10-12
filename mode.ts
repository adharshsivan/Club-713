import { useSyncExternalStore } from 'react';

export type ExteriorMode = 'night' | 'day';

const STORAGE_KEY = '713-exterior-mode';

function storedMode(): ExteriorMode {
  if (typeof window === 'undefined') return 'night';
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'day' ? 'day' : 'night';
  } catch {
    return 'night';
  }
}

let current: ExteriorMode = storedMode();
const listeners = new Set<() => void>();

export const getExteriorMode = () => current;

export function setExteriorMode(mode: ExteriorMode) {
  if (mode === current) return;
  current = mode;
  try {
    window.localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // The toggle should still work when storage is disabled.
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function useExteriorMode(): ExteriorMode {
  return useSyncExternalStore(subscribe, getExteriorMode, () => 'night');
}
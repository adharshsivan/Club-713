// shared mutable input state (keyboard + mobile joystick + touch-look)
export interface Teleport { x: number; z: number; y: number; yaw: number }

export const input = {
  teleport: null as Teleport | null,
  keys: new Set<string>(),
  joy: { x: 0, y: 0, active: false },  // -1..1 from on-screen joystick
  lookDX: 0,
  lookDY: 0,
  sprint: false,
};

export function pushLook(dx: number, dy: number) {
  input.lookDX += dx;
  input.lookDY += dy;
}

export function consumeLook(): [number, number] {
  const r: [number, number] = [input.lookDX, input.lookDY];
  input.lookDX = 0;
  input.lookDY = 0;
  return r;
}

export const isTouchDevice = () =>
  typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

// Shared dimensions keep the stair mesh, continuous guardrail, and traversal aligned.
export const MEZZANINE_LAYOUT = {
  elevation: 3.2,
  frontZ: 8,
  stairStartZ: 2.8,
  stairInnerX: 14.25,
  stairSteps: 14,
  railX: 14.2,
  railHeight: 1.12,
  glassThickness: 0.024,
  guardHalfWidth: 0.06,
  flightPanels: 4,
  balconyPanels: 10,
} as const;

export function stairHeightAt(z: number) {
  const { elevation, frontZ, stairStartZ } = MEZZANINE_LAYOUT;
  const t = Math.max(0, Math.min(1, (z - stairStartZ) / (frontZ - stairStartZ)));
  return elevation * t;
}
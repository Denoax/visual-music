export function clamp01(x: number): number;
export function smooth(x: number): number;
export function envelope(
  t: number,
  start: number,
  end: number,
  attack?: number,
  release?: number,
): number;
export function segmentDistanceXZ(
  p: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number },
): number;
export function footprintRadius(
  width: number,
  depth: number,
  scale?: number,
): number;
export function boundsRadius(
  min: number[],
  max: number[],
  scale?: number,
): number;
export function safeToPlace(
  center: { x: number; z: number },
  radius: number,
  path: { x: number; z: number }[],
  guard?: number,
): boolean;
export function proximityGain(
  center: { x: number; z: number },
  radius: number,
  eye: { x: number; z: number },
  zeroGap?: number,
  fullGap?: number,
): number;
export function footprintMask(
  x: number,
  z: number,
  anchor: { x: number; z: number },
  width: number,
  depth: number,
  angle?: number,
): number;
export function reduceFloorGate(
  originalGate: number,
  mask: number,
  gain: number,
  amount?: number,
): number;

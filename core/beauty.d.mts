export const emitterGLSL: string;
export function clamp01(x: number): number;
export function smooth5(x: number): number;
export function smooth3(a: number, b: number, x: number): number;
export function emitterSample(
  emitted: readonly number[],
  radius: number,
  aa?: number,
  capWeight?: number,
): number[];
export function fogTransmission(distance: number, density?: number): number;
export function horizonRgb(
  direction: readonly number[],
  azimuth?: number,
  gain?: number,
): number[];

export type CameraState = {
  seconds: number;
  x: number;
  z: number;
  angle: number;
  pitchX: number;
  roll: number;
  turbo: number;
  speed: number;
  altitude: number;
  vfov: number;
  tilt: number;
};
export type CameraInput = { x?: number; y?: number; held?: boolean };
export type CameraCue = {
  seconds: number;
  duration: number;
  target: Partial<CameraState>;
};
export const UNIT_SCALE: number;
export const SEGMENTS: any[];
export function compileCues(cues?: CameraCue[], initial?: any): any[];
export function targetsAt(
  t: number,
  segments?: any[],
): { altitude: number; vfov: number; tilt: number; speed: number };
export function initialState(segments?: any[]): CameraState;
export function step(
  state: CameraState,
  t: number,
  dt: number,
  input?: CameraInput,
  scale?: number,
  segments?: any[],
): CameraState;
export function integrate(
  state: CameraState,
  parameters: any,
  t: number,
  dt: number,
  input?: CameraInput,
  scale?: number,
): CameraState;
export function basis(s: CameraState): {
  right: number[];
  up: number[];
  back: number[];
};
export function pose(
  s: CameraState,
  scale?: number,
): {
  position: number[];
  vfov: number;
  basis: ReturnType<typeof basis>;
  yaw: number;
  pitchX: number;
  bank: number;
  referenceSpeed: number;
  sceneSpeed: number;
  turbo: number;
};
export function horizon(downDegrees: number, vfov: number): number;

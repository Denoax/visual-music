export const RETURN_SECONDS: 8;
export const IDLE_PERIOD: 12;
export type VisualReturn =
  | {
      phase: "song";
      blend: 0;
      idleSeconds: 0;
    }
  | {
      phase: "return" | "idle";
      blendAge: number;
      blend: number;
      idleSeconds: number;
      breath: number;
      hueMix: number;
      ripplePhase: number;
      horizonGain: number;
      starGain: number;
    };
export function visualReturn(
  endAge: number | null,
  options?: { reduced?: boolean },
): VisualReturn;
export function idleHeight(
  x: number,
  z: number,
  seconds: number,
  options?: { reduced?: boolean },
): number;

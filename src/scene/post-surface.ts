import { heightGLSL, type WaveState, rawHeight } from "../show/waves";
import { idleHeight, type VisualReturn } from "../../core/visual-return.mjs";
/** Geometry only: keep song light/event lookup frozen at the complete sample.
 * Existing fronts finish naturally during return; no new emitter is introduced. */
export function presentedVertex(
  x: number,
  z: number,
  state: WaveState,
  visual: VisualReturn,
) {
  if (visual.phase === "song") return rawHeight(x, z, state);
  if (visual.blend === 1)
    return idleHeight(x, z, visual.idleSeconds, {
      reduced: state.motion < 0.5,
    });
  const returning = {
    ...state,
    seconds:
      state.seconds +
      Math.min(8, visual.phase === "return" ? visual.blendAge : 8),
  };
  return (
    rawHeight(x, z, returning) * (1 - visual.blend) +
    idleHeight(x, z, visual.idleSeconds, { reduced: state.motion < 0.5 }) *
      visual.blend
  );
}
// The original Gaussian kernel is preserved byte-for-byte in waves.ts.
// Rename its time uniform only, so returned geometry and song lighting cannot
// accidentally share a moving cue clock after the source naturally completes.
export const surfaceHeightGLSL =
  heightGLSL.replaceAll("uTime", "uSurfaceTime") + "\nuniform float uTime;\n";
export const presentedHeightGLSL = `
 uniform vec3 uPassage;
 uniform float uEndBlend,uIdleSeconds,uReducedSurface;
 float idleVertex(vec2 p){float a=6.283185307179586*uIdleSeconds/12.;return (1.-uReducedSurface)*(.48*sin(p.x*.021+a)+.32*sin(p.y*.018-a)+.16*sin((p.x+p.y)*.013+2.*a));}
 float renderVertexHeight(vec2 p){if(uEndBlend<=0.)return heightAt(p);if(uEndBlend>=1.)return idleVertex(p);return mix(heightAt(p),idleVertex(p),uEndBlend);}
`;

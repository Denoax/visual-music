import { emitterGLSL } from "../../core/beauty.mjs";
/** Adapter strings for field.ts. Preserve the original vertex wave/emitter
 * functions and every gate, density decision, world ID and depth test.
 * These are not a whole-file replacement or automatically applied patch.
 */
export const pointFragment = `${emitterGLSL}
 varying vec3 vColour;varying float vFade,vLod;
 void main(){float r=length(gl_PointCoord-.5)*2.;
   if(r>1.||vFade<.001)discard;
   vec3 c=beautyEmitter(vColour,r,max(fwidth(r),.015),vLod);
   gl_FragColor=vec4(c*vFade,1.);
 }`;

// Add vertex varying vCapRadius and assignment length(position.xz)/.345.
// The existing hardware base remains dim and separate from emitted light;
// retain its approved .0015*uBrightness, never insert it into beautyCore.
export const capFragment = `${emitterGLSL}
 uniform float uBrightness;varying vec3 vColour;
 varying float vFade,vShade,vBase,vCapRadius;
 void main(){if(vFade<.001)discard;
   vec3 emitted=beautyCap(vColour,vCapRadius,vShade);
   vec3 hardware=vec3(.0015)*uBrightness+vColour*.035;
   gl_FragColor=vec4(mix(emitted,hardware,vBase)*vFade,1.);
 }`;

// Add to the existing ground fragment after all raw wave/surface functions.
// Supply uHorizonGain/uHorizonAzimuth to field from the same authored sky cue.
// Apply this to floor background only, not cap/point OFF gates or depthMesh.
// Add varying vec3 vSurfaceWorld to ground vertex and assign the very same
// displaced position used by gl_Position. Do not re-evaluate height per pixel.
export const groundFragmentMain = `
 uniform float uGroundGain,uHorizonGain,uHorizonAzimuth;
 varying vec2 vWorld;varying vec3 vSurfaceWorld;
 void main(){
   vec3 p=vSurfaceWorld;
   float distanceMetres=distance(p,cameraPosition);
   float ownership=1.-smoothstep(520.,600.,distance(vWorld,uCameraXZ));
   float transmission=beautyFogTransmission(distanceMetres,.00135);
   vec3 scattered=beautyHorizon(p-cameraPosition,uHorizonAzimuth,uHorizonGain);
   vec3 emitted=surfaceLight(vWorld,fineWeight(vWorld))*uGroundGain;
   gl_FragColor=vec4((emitted*transmission*ownership+scattered*(1.-transmission*ownership))*uTerrainVisible,1.);
 }`;

// Keep the current quarter-size two-pass Gaussian. Initial candidate values
// preserve approximately the current average image energy. GPU comparison is
// required before adoption: do not stack a second bloom or output conversion.
export const softnessComposite = `
 uniform sampler2D map,soft;varying vec2 vUv;
 void main(){vec3 c=texture2D(map,vUv).rgb,b=texture2D(soft,vUv).rgb;
 gl_FragColor=vec4(mix(c,b,.105)+b*.035,1.);}`;

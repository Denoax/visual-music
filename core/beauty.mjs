/** Original linear-light profiles. Reuse the existing emission and OFF gates.
 * The functions never normalise a dim cell or invent ungated white energy.
 */
export const emitterGLSL = `
 vec3 beautyCore(vec3 emitted){
   float l=dot(emitted,vec3(.2126,.7152,.0722));
   return mix(emitted,vec3(l),.62);
 }
 vec3 beautyEmitter(vec3 emitted,float radius,float aa,float capWeight){
   float r=max(0.,radius),a=max(aa,.01);
   float disk=1.-smoothstep(.30-a,.30+a,r);
   float pearl=exp(-r*r*92.);
   float shoulder=exp(-r*r*24.);
   float halo=.095*exp(-r*r*6.)*(1.-smoothstep(.65,1.,r));
   return capWeight*(beautyCore(emitted)*pearl*.65+emitted*(disk*.48+shoulder*.26))+emitted*halo;
 }
 vec3 beautyCap(vec3 emitted,float normalizedRadius,float shade){
   float r=clamp(normalizedRadius,0.,1.);
   return (beautyCore(emitted)*exp(-r*r*6.)*.55+emitted*.68)*shade;
 }
 float beautyFogTransmission(float distanceMetres,float density){
   float d=max(0.,distanceMetres)*max(0.,density);
   return exp(-d*d);
 }
 vec3 beautyHorizon(vec3 direction,float azimuth,float gain){
   vec3 ray=normalize(direction);
   float band=exp(-pow((ray.y-.018)/.055,2.));
   float upper=1.-smoothstep(.10,.23,ray.y),lower=smoothstep(-.16,-.055,ray.y);
   vec3 dir=vec3(sin(azimuth),0.,-cos(azimuth));
   float lobe=pow(.5+.5*dot(ray,dir),4.);
   return mix(vec3(.020,.033,.080),vec3(.055,.012,.035),lobe*.5)*band*upper*lower*clamp(gain,0.,1.);
 }
`;

export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export function smooth5(x) {
  const t = clamp01(x);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
export function smooth3(a, b, x) {
  const t = clamp01((x - a) / (b - a));
  return t * t * (3 - 2 * t);
}
export function emitterSample(emitted, r, aa = 0.015, capWeight = 1) {
  const l = emitted.reduce((s, x, i) => s + x * [0.2126, 0.7152, 0.0722][i], 0);
  const disk = 1 - smooth3(0.3 - aa, 0.3 + aa, Math.max(0, r));
  const pearl = Math.exp(-r * r * 92),
    shoulder = Math.exp(-r * r * 24);
  const halo = 0.095 * Math.exp(-r * r * 6) * (1 - smooth3(0.65, 1, r));
  return emitted.map(
    (x, i) =>
      capWeight *
        ((x * 0.38 + l * 0.62) * pearl * 0.65 +
          x * (disk * 0.48 + shoulder * 0.26)) +
      x * halo,
  );
}
export function fogTransmission(distance, density = 0.00135) {
  return Math.exp(-Math.pow(Math.max(0, distance) * Math.max(0, density), 2));
}
// Establish gentle depth before the existing 520--600 m ownership fade.
// This is an optical attenuation, not an emitter visibility gate.
export function horizonRgb(direction, azimuth = 0, gain = 1) {
  const length = Math.hypot(...direction);
  if (!length) return [0, 0, 0];
  const [x, y, z] = direction.map((q) => q / length);
  const band = Math.exp(-Math.pow((y - 0.018) / 0.055, 2));
  const upper = 1 - smooth3(0.1, 0.23, y);
  const below = smooth3(-0.16, -0.055, y);
  const lobe = Math.pow(
    0.5 + 0.5 * (x * Math.sin(azimuth) - z * Math.cos(azimuth)),
    4,
  );
  const cool = [0.02, 0.033, 0.08],
    warm = [0.055, 0.012, 0.035];
  return cool.map(
    (v, i) =>
      (v * (1 - lobe * 0.5) + warm[i] * lobe * 0.5) *
      band *
      upper *
      below *
      clamp01(gain),
  );
}

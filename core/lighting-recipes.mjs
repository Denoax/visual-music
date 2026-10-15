// Original integration aids. Keep the app's shared renderer and transport owner.
export const clamp01 = (x) => Math.max(0, Math.min(1, x));
export const smooth5 = (x) => {
  const u = clamp01(x);
  return u * u * u * (u * (u * 6 - 15) + 10);
};
export const mod = (x, n) => ((x % n) + n) % n;
export function hashCell(ix, iz, epoch = 0) {
  let x = (ix ^ Math.imul(iz, 0x9e3779b1) ^ Math.imul(epoch, 0x85ebca6b)) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b) >>> 0;
  return ((x ^ (x >>> 16)) >>> 0) / 4294967296;
}
export function worldBank(ix, iz, { blockCells = 8, axis = "x" } = {}) {
  if (!Number.isInteger(ix) || !Number.isInteger(iz) || blockCells < 1)
    throw new TypeError("Canonical integer IDs required");
  return mod(Math.floor((axis === "z" ? iz : ix) / blockCells), 2);
}
// One handoff per beat (or slower via beatsPerHandoff); true OFF plateaus.
// A smooth crossfade trades light without two permanent faintly-lit banks.
export function pairedBankGate(
  bank,
  beatPhase,
  { beatsPerHandoff = 1, fadeFraction = 0.16 } = {},
) {
  if (!(beatsPerHandoff > 0 && fadeFraction > 0 && fadeFraction < 0.5))
    throw new RangeError("Invalid handoff");
  const cycle = beatPhase / beatsPerHandoff,
    step = Math.floor(cycle),
    f = mod(cycle, 1);
  const current = mod(step, 2),
    mix = smooth5(f / fadeFraction);
  return mod(bank, 2) === current ? mix : 1 - mix;
}
// Random-looking, repeatable activation. New membership is chosen per musical
// epoch and blended briefly. It never changes when the same frame is redrawn.
export function dropoutGate(
  ix,
  iz,
  beatPhase,
  { beatsPerEpoch = 4, density = 0.28, fadeFraction = 0.08 } = {},
) {
  if (
    !(
      beatsPerEpoch > 0 &&
      density >= 0 &&
      density <= 1 &&
      fadeFraction > 0 &&
      fadeFraction <= 1
    )
  )
    throw new RangeError("Invalid dropout");
  const x = beatPhase / beatsPerEpoch,
    e = Math.floor(x),
    mix = smooth5(mod(x, 1) / fadeFraction);
  const a = hashCell(ix, iz, e - 1) < density ? 1 : 0,
    b = hashCell(ix, iz, e) < density ? 1 : 0;
  return a + (b - a) * mix;
}
// Apply this LAST to head, halo and that emitter's spill, including wave accents.
// Thin independent ground strips have their own scored gate.
export function gateEmitter({ head, halo, spill }, gate) {
  const g = clamp01(gate),
    scale = (a) => a.map((c) => Math.max(0, c) * g);
  return { head: scale(head), halo: scale(halo), spill: scale(spill) };
}
export function entryGain(songSeconds, { delay = 0.08, duration = 2.6 } = {}) {
  return smooth5((songSeconds - delay) / duration);
}
// presentedEndAge is supplied by the EXISTING presentation-clock owner after
// natural buffer completion. Song time remains clamped to decoded duration.
export function exitGain(presentedEndAge, { hold = 0.2, duration = 2.4 } = {}) {
  return presentedEndAge == null
    ? 1
    : 1 - smooth5((presentedEndAge - hold) / duration);
}
export function starLifeGain(
  age,
  { lifetime = 4, fadeIn = 0.7, fadeOut = 1 } = {},
) {
  if (age <= 0 || age >= lifetime) return 0;
  return (
    smooth5(age / fadeIn) * (1 - smooth5((age - lifetime + fadeOut) / fadeOut))
  );
}
export function loopRing(
  distance,
  flowPhase,
  { spacing = 48, width = 1.6 } = {},
) {
  if (!(spacing > 0 && width > 0))
    throw new RangeError("Positive geometry sizes required");
  const d = Math.abs(
    mod(distance - flowPhase * spacing + spacing / 2, spacing) - spacing / 2,
  );
  return Math.exp(-0.5 * (d / width) ** 2);
}
export function stripeDistance(coordinate, { spacing = 24, phase = 0 } = {}) {
  return Math.abs(
    mod(coordinate - phase * spacing + spacing / 2, spacing) - spacing / 2,
  );
}
export function shortHue(from, to, t) {
  return mod(from + (mod(to - from + 180, 360) - 180) * clamp01(t), 360);
}
function oklchRaw(L, C, h) {
  const a = C * Math.cos((h * Math.PI) / 180),
    b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}
// Conservative chroma reduction at fixed hue/lightness; not a CSS MINDE clone.
// Values are LINEAR sRGB, suitable for a once-authored GPU palette LUT.
export function paletteRgb(L, C, h) {
  if (!(L >= 0 && L <= 1 && C >= 0 && Number.isFinite(h)))
    throw new RangeError("Invalid palette");
  const inside = (a) => a.every((c) => c >= -1e-9 && c <= 1 + 1e-9);
  let out = oklchRaw(L, C, h);
  if (!inside(out)) {
    let lo = 0,
      hi = C;
    for (let i = 0; i < 18; i++) {
      const mid = (lo + hi) / 2;
      if (inside(oklchRaw(L, mid, h))) lo = mid;
      else hi = mid;
    }
    out = oklchRaw(L, lo, h);
  }
  return out.map(clamp01);
}

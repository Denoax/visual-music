# Scoped source review — 2026-10-15

Read/applied `$reference-led-design`. Read-only review of the runtime correction and the first-entry Pause repair; no GPU/browser execution or implementation changes in this review. **No material source defect found within the inspected scope.** This is technical source review, not human visual/listening approval.

- **Shared surface and births:** immutable formation parameters are selected from event birth time, with a bounded cache. CPU and GLSL use matching units/formulas; physical fronts and decorative drivers upload their corresponding formation arrays in the same order and reset unused slots. Ground/depth, mounted caps and points share the terrain uniforms/kernel. Fixed XZ lattice, triangle interpolation and saturation preserve the 14m height bound. Opening circles and quiet circular returns remain. Ridge support is compact in normal crest distance; its transverse Gaussian is deliberately not globally compact.
- **OFF optimization:** `floorLight` computes the original activation/landscape gate first. Only exact zero with song blend zero returns zero activation, emission and spill. Partial gates and historical idle blends take the original path. All consumers were checked: point/cap emission and attributable ground spill remain zero; dim fixture housing and independent surface line art remain separate. The skipped path has no side effects; no explicit derivatives move into the conditional. The palette LUT uses linear filtering without mipmaps. Depth and independent `surfaceRecipe` derivatives are unchanged.
- **Camera/input preservation:** `flight.ts` is unchanged. The only comfort-policy change is held attack 1.25→0.45s; travel 0.45, turn 0.65, held cap 1.2 and release 0.85s remain. Canvas-only primary-left input, pointer cancellation/lost capture, blur clearing and Settings blocking remain. Loading plus playback operation guards still prevent duplicate Continue/song starts.
- **Pause lifecycle:** first visible field entry sets `fieldEntered` once and queues `controls` as a microtask. The current tick schedules its sole RAF before that refresh; `invalidate` observes the existing RAF and does not create another owner. The refresh exposes Pause without changing audio/source time or route state. Existing pause/recovery ownership is unchanged.
- **Black sky/colour:** background API is black and atmospheric ground scattering is removed. Crest colour shifts existing palette lookup coordinates before shared emitter gating; white LUT remains neutral. Discrete stars/halos are retained. No new scene objects or binary assets are introduced.

Current evidence inspected: `tests.log` reports 91 core + 59 TypeScript checks passing; the assigned wave test file is 12/12 passing and covers late rotations, overlapping boundary births, packet life edges, triangle seams and full 220s no-input equivalence. `browser-final-regressions.log` reports 3 passing tests for frozen route, first-entry Pause/Settings/audio controls, and real M1/cancel/blur behavior. The supplied old clock-equality assertion was replaced with stable route/floor snapshots because device output estimates can regress; the audio clock freeze is independently asserted by the Settings test.

Actual GPU result records inspected (not rerun by this reviewer): formation audit passed 55776 samples across 13 profiles, with OFF emission/spill and sky exactly zero; lighting audit passed 147576 samples with no mismatches and exact OFF emission/spill. These are meaningful shader contracts, not aesthetic or physical AV approval.

Limitations: this review does not establish uninterrupted motion quality, musical/listening approval, physical-device/display AV behavior or isolated performance causality. Full recordings, actual listening/motion assessment, final benchmark interpretation, publication and clean-archive verification belong to the main delivery evidence. Existing benchmark reports disclose the increased shader cost; do not relabel a low RAF interval as GPU duration or infer subjective approval.

## Inspected file SHA-256

Runtime files present in the current runtime seal matched it when this review was written. Test files are independently hashed below. Later edits invalidate the corresponding review identity.

| File | SHA-256 |
|---|---|
| `core/wave-formations.mjs` | `aa79c9522c782bed9fa8eea7614aceef5a9928fad05586c9afd21dcda5c7c1a3` |
| `core/comfort-motion.mjs` | `95a5080a5398cb1a23d5c4bd4b72a292f05a5ee33583651f89f990443c2104df` |
| `core/beauty.mjs` | `a8c32cd76201d6e93d6528635e44e16ed9adc97586fe3f625858a725894d6e44` |
| `src/show/waves.ts` | `694cf1fc688a96bc9f5274ceb82eece4526b277eaaa00c32dfd9043ac04332bb` |
| `src/show/floor.ts` | `2cec09805ebdd43a83c51d8984bfc63c313410bd0b410d3eadf68dbab8aeecdf` |
| `src/show/arrangement.ts` | `6563dda9e2f9360f02bb927b92534ad842271c2d0bd5d2fc4f52f5d584e33eb3` |
| `src/scene/field.ts` | `85318063cc8f81aa96a58df6602ffd9bafb1d4eb37603a270e3e38a79fac526f` |
| `src/scene/field-adapter-snippets.mjs` | `bb2b0eb9c39a0da3bb72c2b4cb62ff0f320a784ad4dbad6e2a61fb11e71c9c7b` |
| `src/scene/horizon.mjs` | `2a7741d70d30964d88c6d3b6d302548128ef79b42bdfca7a5cd1ad344126d331` |
| `src/scene/post-surface.ts` | `a8e242a907742c7fdf01ed3834619725cc94390a08d9e9724d983af04864ef9f` |
| `src/scene/world.ts` | `ee611bb254f802f17dd74a11d77bae3ea514c7bd10bbc56755482ed9c143b418` |
| `src/scene/flight.ts` | `59a35e833ea38fbd5e415a9979cbf92e21ffa7694c613c0aa80e6ca957094bcb` |
| `src/main.ts` | `9e1f247c45cb177d9be1253b7ee3050e73fbaee1aa5ff9ab5bca119a41c2849f` |
| `src/show/playback.ts` | `19331057bc693e8ceceea22b720f166184f92f952106587a15b85bec4554d26d` |
| `src/input.ts` | `c974d57a7514ddb909d5ad7e62db0e4f4e3505545d12a2b1983267b3f659b70e` |
| `src/ui/controls.ts` | `6d4c0121c1566581c7f6e3577ce1bf3e566ec28990d02137fbbb6f23f8ec6fbe` |
| `tests/wave-variation.test.ts` | `3f9716fdc13fb66ac2bdf9cf2bf1a8cbcda882eefd95ab826cc79fd718ce6ccd` |
| `tests/browser/wave-colour.spec.ts` | `e4fe141d076f9e0db9e4cb74a1575024a0c60c380709f0d2e3bfdb7d2e6ca0c5` |
| `tests/browser/site.spec.ts` | `a7c3cb8f3b35acdfffee1210b5ead6cba9756c7509b2c39e6fd7a88a7c6350c5` |
| `tests/browser/flight-regression.spec.ts` | `f99172a01f1d227fd88026ab2a36826aae632c92fc089b8b401ee8c397e20c60` |

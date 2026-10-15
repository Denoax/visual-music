# Source-to-implementation record — 2026-10-15

| Source | What was actually inspected | Adaptation | Limits / provenance |
|---|---|---|---|
| Supplied `VISUAL_MUSIC_SLOW_ENTRY_REVIEW_10b98cf.zip` | ZIP CRC, all 605 payload hashes; active shader, wave, floor, route/input, lifecycle, palette and tests | Preserve the approved design and fix its specific gaps | Prior low-FPS recordings are historical and do not prove this candidate's motion |
| Mani's latest review | Explicit approval of current site/waves/base pace; four scoped refinements | Black background, section-based wave variety, quicker small M1 response, wave/music-linked colour | This is the governing design direction |
| [HelloEnjoy — Lights](https://helloenjoy.itch.io/lights) | Current creator page identifies the interactive music experience, Three.js and its source link | Retain the existing soft light field, sparse/dark areas and music-owned choreography as the common reference language | Not newly watched through its full runtime in this task; no new claim of perceptual 1:1 copying |
| Existing project source record for `C4RL05/Lights`, commit `44e2b0aaa11764f37c2ad29feea9afc84a5bb380` | The archive's recorded file identities and previous camera/lighting research | Reuse settled research, preserve the current calibrated rig and shared floor structure | Fresh direct source fetch failed in this task. No original source/media is copied; no new reuse licence inferred |
| [Mark Finch / Cyan Worlds, GPU Gems chapter 1, NVIDIA](https://developer.nvidia.com/gpugems/gpugems/part-i-natural-effects/chapter-1-effective-water-simulation-physical-models) | The original chapter's height-field sum, amplitude/wavelength/direction discussion, circular versus directional waves, and warning against changing an active wave's wavelength/direction | Independently authored, bounded wave packets; event-birth parameters; natural overlap across section boundaries | It is a rendering-method reference, not a design target or an assertion that Lights used these exact formulas. This implementation keeps fixed horizontal vertices and does not use Gerstner displacement |

## Findings in the supplied code

- `beautyHorizon` returned coloured low-elevation light; the ground fragment also scattered that colour into distant surfaces. Returning black only at the zenith would not solve the review. The candidate eliminates the scattered term and zeroes the complete background API.
- Every existing event raised a Gaussian circular crest. New shapes retain the same event IDs, origins, attack, speed scale, lifetime and bounded shared terrain, with birth-selected metadata for geometry and lighting.
- Production M1 already targets 1.2× with 1.25s/.85s response. The candidate keeps the ceiling and changes only the attack to .45s. No-input route equality is tested.
- Most non-rainbow palette coordinates depended on static world position; local wave energy mainly changed brightness. The candidate moves the lookup coordinate with signed crest phase and existing music controls, retaining palette cohesion and emitter gating.

## Authorship and evidence

All new JS/GLSL/HTML/Python and equations in this pack are original implementation code. No generated visual media, new third-party visual assets, source demo media, sampled screenshots or shader pack downloads are included. Existing owned code/notices remain.

CPU/triangle and integration tests plus the TypeScript/production build passed. The supplied shader audit is executable but **not executed here**. No new continuous visual, shader arithmetic, physical display, listening or hardware-performance approval is asserted. Actual renderer, captures and source/served-byte seals must be recorded by the local executor.

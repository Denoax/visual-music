# Lights rebuild review

**Implemented for local/private review. Musical and human visual acceptance remain pending.**

The active runtime replaces the rejected courtyard/car study. The supplied MP3 is bundled unchanged, checked by SHA-256 and decoded once for normal playback. One Play gesture starts the recording. The world covers its measured 244.3-second duration with seeds, terrain ignition, growing drops, contour travel, climb, gather/release, floating canopy and settling. Controls, pointer steering, tap bursts, quality tiers, gentle motion and error recovery are implemented.

## Actual evidence

- Production build and type checking passed. Core, score, choreography and transport tests passed. Browser flows cover bundled one-gesture start, pause/seek/resume, failed audio and hash rejection, context loss/retry, portrait/gentle mode, ending/replay, keyboard, context suspension and visibility pause. Test counts establish these contracts, never aesthetic acceptance.
- Sixteen actual product frames were captured in headful Chromium 153.0.8010.12 at 1440×900 and 390×844, DPR 1, using the RTX 4070 renderer. Entrance, rise, field, ribbons, climb, gather, canopy and fade were inspected. Portrait is a desktop viewport emulation, not a phone. Developer diagnostics were hidden for those product frames. See `frames.json`.
- `standard-full.webm` and `gentle-full.webm` contain complete uninterrupted live world playback and the active post-volume audio graph stream, including bounded pointer/tap attempts. The canvas recording excludes DOM controls. The video captures are local artifacts, excluded from Git; their hash/measurement records are committed. The source bytes and compiled bundle hashes are in `captured-runtime.json`.
- Both runs reported zero console/page errors and reached the actual recording end. Raw RAF intervals and 20 candidate-event observations per run are retained in `*-playback.json`.

| Measured run | RAF median / p95 / max | Frames over 50 ms | Candidate event lateness p95 / max | Last minus first residual |
|---|---|---:|---|---|
| Standard desktop, full field | 8.3 / 8.4 / 33.4 ms | 0 | 7.11 / 8.40 ms | +2.00 ms |
| Gentle portrait viewport, lighter field | 8.3 / 8.4 / 25.0 ms | 0 | 6.83 / 7.79 ms | −1.99 ms |

These are RAF observation intervals and software-clock residuals, **not GPU timings**. Both use the local RTX 4070 and include recording overhead. They are descriptive full-playback runs with different workload/settings, not a baseline/candidate speedup benchmark or a population/device guarantee. The 60 Hz project software targets are met in these runs. The event landmarks are selected measured candidates, not twelve listened/approved audiovisual anchors. Timestamp fallbacks are recorded (standard: 9 graph fallbacks among 29,087 observations).

## Decoder and flash records

Chromium’s default 48 kHz decode measured 11,726,262 frames, stereo, 244.297125 seconds. An independently requested 44.1 kHz context decoded the same bytes to 10,773,504 frames, 244.29714285714286 seconds. The fixed seconds coordinate is retained; there is no proportional retiming or sample-rate identity rejection. Digital onset comparison is recorded separately in `decoder-alignment.json`; physical output calibration stays zero/unmeasured.

Complete recordings are screened using `tools/flash_screen.py`. It uses downsampled 60 Hz captured pixels, opposing linear-luminance transitions, separate saturated-red/UCS transitions and rolling frequency/area diagnostics. Standard screening found a maximum of four general pairs at individual pixels, occupying at most 3.83% of a sampled sliding field where frequency was at least four; red maximum was three. This flags small motion-related candidates for full-resolution review. The script is not an independently validated PEAT/Harding analyzer. Neither its tests nor a small-area estimate certifies WCAG conformance; encoding/downsampling, moving groups, physical viewing geometry and all possible interactions remain limitations. Both shipped modes use restrained local accents and slow palette changes, with no full-screen white/red strobe.

## Remaining gates

- This session cannot consume audio input. **No full listening or final musical cue approval is claimed.** `show/score.json` remains candidate; the local listening/annotation utility exports drafts. Review gates deliberately remain partial.
- Complete live playback was captured and frames/telemetry inspected. The agent cannot assess the recording as a human at normal speed with sound. Continuous motion/listening review remains pending.
- The live reference’s entrance ran, but its recording returned 404 and the show stayed loading. Official video attempts did not reach playback. Three creator stills were inspected; no full reference motion observation is claimed.
- Formal full-resolution general/red flash conformance is unverified. Physical-device sustained performance, speaker/display calibration and user visual acceptance are unverified.
- No public deployment or public MP3 redistribution. The existing GitHub repository is private. The rejected `43cb2b6` remains recoverable and its evidence stays under `evidence/v1-rejected/`.

Early shader/empty-frame diagnostics are retained under `diagnostics/`; those are failed intermediate states, not the current visual baseline. The reserved GLSL identifier was fixed and current captures have no shader errors.

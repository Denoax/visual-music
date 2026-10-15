# Visual Music — black sky, wave variety and living colour

Continue the approved slow-entry build. This is an implementation continuation with a real 17-file patch, replacement files, a guarded applicator and validation evidence. It is not a newly captured review build or a claim of GitHub publication.

The supplied review ZIP is verified: 155,918,327 bytes; SHA-256 `3b7e155fab8717709f9e0623bce44669fb84a37537a9273d5f191dcdbb019f30`; CRC passed and all 605 manifest payloads matched. Its review commit is `10b98cf16e18146810860dda96298507ca767b8a`; it records publication commit `69ab1308a264905dc854420b88d8308cda55a9c7`. Current GitHub connector requests for both repository and commit returned 404, so publication is an archive-reported identity, not independently confirmed here.

## Four changes

1. **Black sky.** Zero the retained sky API and cue gain, and remove coloured atmospheric scattering from the ground fragment. Existing depth attenuation only subtracts emitted energy. Keep discrete stars, bounded LED cores/halos and current softness. No replacement gradient, giant glow dome or exposure lift.
2. **Wave formations.** Keep the exact circular opening through 25 seconds. Later event births selectively use oval fronts, diagonal ridges, chevrons, crossed ridges and paired rings. The existing base swell, music events, event origins and 14m saturation remain. Geometry, LED crests and local bank exchange share the same formation parameters. Every event keeps its birth shape until it expires; old waves overlap new ones naturally.
3. **Small mouse-1 boost.** The old code already targets 1.2×, but takes 1.25s per exponential time constant. Change that response to .45s, retain the 1.2× ceiling and .85s release. A 100ms press reaches approximately 1.040×; a 500ms hold reaches 1.134×. Base travel, turning policy, camera height, lens and source diagnostic are unchanged. This is forward motion, not an FOV zoom.
4. **Living floor colour.** Move the existing palette coordinates with each passing crest, using the same signed phase and existing low-band/accent envelopes. Preserve the OKLCH-authored palette families, neutral-white rests and exact OFF gating. Crossed/paired colour lobes blend continuously rather than switching a nearest-crest phase. No independent global hue timer is added.

`core/wave-formations.mjs` is original code, with matching CPU/GLSL functions. No models, textures, image generation, media downloads, new rendering pass or package dependency is required. The choreography is a candidate to tune in motion, not human-approved song interpretation.

## Use

Read `START_CODEX.txt`, `INTEGRATION.md`, `SOURCE_RECORD.md` and `ASSETFILE.md`. `apply_candidate.py PROJECT_ROOT` checks identities without writing; add `--apply` after creating the executor's normal recovery checkpoint. It validates all inputs before writing and saves changed originals outside the project. `changes.patch` is the alternative for a Git-aware merge. Do not apply both methods.

The first implementation build passed; the complete existing suite plus six new checks passed (144 total). See `evidence/`. A Vite server ran, but this environment's browser could not reach its loopback address. Therefore shader execution, actual rendered sky samples, continuous motion and GPU performance have **not** been verified here. `tools/audit-wave-formations.html` is a runnable WebGL2 audit, not a saved passing result. Local Codex must execute it and review actual output before normal publication.

Keep the exact supplied MP3, approved loader/glass/notes, one Settings control, smooth entry, finite thank-you finish, camera score and all recovery/history. Do not restore scenery, cursor objects, extra UI or an ambient ending. Normal push to the existing source repository remains authorized after verification. Do not deploy hosting, force push, change visibility or touch Hermes/portfolio.

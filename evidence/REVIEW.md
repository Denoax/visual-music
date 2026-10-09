# Implementation review

2026-10-09. Status: **working scene/transport implementation; exact-song release blocked**.

Implementation SHA: `3b0388436596a8c64c671704fda229e33482910f`. Captures were taken in the new project's working tree before its first commit. No prior approved BUMER.EXE visual baseline exists. Human acceptance has not been given.

## Build and behaviour — supported

Vite 8.3.4, TypeScript 7.0.2, Three.js 0.186.1; pinned lockfile. Production build and type check pass. 22 Node/TypeScript tests and 10 Python validator tests pass. Three Chromium browser tests pass: load/seek/replay/portrait/settings; synthetic local recording, pause/replay/mismatched cues/editor; failed scene assets with working local audio and touch volume. `unit-tests.log`, `validator-tests.log`, `browser-tests.log` preserve results.

Production preview: `http://127.0.0.1:4175/`. Subpath check: `http://127.0.0.1:4176/bumer-exe/`; `production-subpath.json` records no runtime/console errors, missing asset URLs or active fallback. No public site deployment was performed.

One decoded Web Audio buffer; graph-derived position, valid/fresh output timestamp mapping and explicit fallback; generation-protected source replacement. Repeated pending play, pause cancellation, obsolete end handlers, seek/resume offsets, mute, replay and unexpected suspension have targeted tests. Hidden document pauses; physical browser/tab lifecycle and acoustic output remain unverified. Decode failures provide a real file retry. Context loss pauses audio and keeps transport available with reload recovery. Critical scene shaders are prepared before normal playback.

## Visual inspection — partial, human review pending

Inspected real Iris/Playwright frames at 1440×900 and 390×844: entrance, courtyard chorus, freshener close-up, wide venue, trolley finale and return to courtyard. Additional production captures use the actual low tier on portrait. `?study=35`, `?study=75`, `?study=105`, `?study=116`, `?study=126` are paused **silent scene-study** links; their seconds are not recording cues.

Observed and fixed: per-window emission ignoring instance colour; portrait sedan crop; courtyard ring/car crop; reserved GLSL identifier preventing reflection rendering; trolley basket disappearing into darkness. Added a local basket light, spaced LED cells and absolute-time façade panel unfold. Headlight/chrome bloom remains visible at high tier; further light/material tuning is subject to human review. The sedan is an original stylised mesh, not an inspected E38 scan or a claim of photoreal fidelity. Its interior remains simple and the seats read as blocky in the freshener shot; further interior mesh refinement is outstanding. Geometry inspection records 13,894 triangles across ten meshes in `hero-geometry.json`.

`silent-study-full.webm` is an unedited local browser capture, 1440×900, 25 fps encoded, about 147 seconds including capture preparation and an uninterrupted 130-second silent study. It is intentionally excluded from Git; included in the local delivery archive. The final capture and stills use the refined portrait cameras and settling freshener. Capture pixels were inspected; continuous motion was not watched in a video player. Frame inspection does not establish smooth motion.

## Exact-track sync — blocked

Requested: Seryoga — Чёрный бумер, Spotify `0iVj13fDCDRM7rfYEGF50X`. No recording was supplied in the project inputs or identified local location. Actual runtime hash, recording identity, browser duration/sample rate and analysed onset/band curves remain **null / pending** in the original templates. No full-song listening occurred; no song timing, BPM or sync residual was invented.

The local editor draws the actual browser-decoded waveform and exports candidate boundaries/beats/anchors plus hash/decode records. Drafts stay pending. Playback without reviewed cues holds ignition. A reviewed import must include a verified exact-track identity record, matching SHA-256 and browser decode, complete sections and reviewed marker/anchor data. `combine_review.py` packages those already-reviewed records; it never approves them.

No twelve-anchor song residual p95/max, pause/seek drift, audio loopback or physical speaker/display alignment was measured. Timestamp arithmetic/source lifecycle tests prove their tested software contracts only. Beat/band musical reactions and final song-phrase staging still require analysis and listening.

## Performance and flash behaviour — unverified release gates

Headless Chromium 153.0.8010.36 with software rendering was used for interaction/capture checks. Browser emulation is not a physical phone or real 60 Hz display. Desktop/mobile GPU frame rate, frame-time distribution, memory and real-device display/output latency were not benchmarked. Actual-device targets remain unresolved. Initial texture/font/HDR source bytes and hashes are in `downloads.json`; these are filesystem records, not a transfer benchmark.

The implementation has no strobe and no red-lamp pulse. LED colour chases use 0.39 rad/s (approximately one cycle per 16 seconds); beams move slowly and low light caps intensity at 0.45. These design bounds are not a flash-threshold measurement. General/red flash limits across the complete rendered song, all intensity modes and camera motion remain unverified; release is not certified by a warning or toggle.

## Assets and distribution — recorded

All runtime visuals are original code geometry/shaders or the specified downloaded CC0 Poly Haven material/environment files. Anton's OFL notice is bundled. Original and runtime downloaded bytes are unchanged; SHA-256/source URLs are recorded. `runtime-assets.json` records actual used paths and rendered inspections. The original acquisition-plan manifest and unacquired Sketchfab candidates are retained separately. No external car model or reference artwork is bundled. No generated media was used.

Public-audio mode: **user local file**, read entirely client-side. No song bytes are bundled, uploaded or committed. No permission to distribute the requested recording is asserted.

`scaffold-validation.json` passes. `release-validation.json` intentionally fails with unresolved audio/identity/cue/anchor contracts; it reports no runtime asset/file failures. This validator does not certify aesthetics, rights truth, performance, flash behaviour or physical sync.

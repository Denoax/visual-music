# BUMER.EXE — LIGHTS RESET

## The brief that governs this rebuild

**Rebuild the visual experience around HelloEnjoy’s Lights.** Mani rejected the entire courtyard/car version at `43cb2b6`. The previous assetfile’s narrative and visual direction are superseded. This is a full-screen, one-song, interactive luminous world: the camera glides through colourful light terrain, sculptural glowing forms, bokeh, beams and choreographed transformations. Make the music feel as though it is building and rearranging the world around the viewer. Craft, depth, joyful colour and musical intention come first.

The MP3 in this pack is now the fixed runtime recording. Bundle it; the normal experience must start with one Play gesture. Mani should never have to find and upload the song every visit. Implement the complete website in the existing `Denoax/bumer-exe` project. Keep the rejected commit recoverable. Leave the accepted manimarami.com project alone.

Read and apply **$reference-led-design** before implementing. If it is unavailable, apply the embedded rules in `AGENTS.md`: inspect real human-created references; build original code/meshes/shaders; use owned/licensed assets with provenance; no generated media; inspect the actual rendered experience and continuous playback. This pack is a replacement instruction/asset pack, not a claim that a rebuilt site already exists.

## Reference authority and what was actually inspected

Primary experience: <https://helloenjoy.itch.io/lights>.
Creator’s project page: <https://helloenjoy.com/home#top>.
Creator’s source: <https://github.com/C4RL05/Lights>, inspected tree SHA `44e2b0aaa11764f37c2ad29feea9afc84a5bb380`.

The creator’s three stills were opened and visually inspected. Use these exact compositions as the visual standard:

| Reference | Observed qualities | Original implementation to build |
|---|---|---|
| [Light field](https://helloenjoy.com/images/lights-1.jpg) | Rolling terrain made legible by dense coloured light points; dark recesses; large foreground forms; haze and tiny distant stars; a clear horizon | A continuous undulating landscape with instanced emissive points, smooth sculptural forms, a controlled horizon and layered particle depths |
| [Beams and bokeh](https://helloenjoy.com/images/lights-2.jpg) | Multi-colour luminous spheres with soft edges; strong near/far scale; diagonals from beams; colour trails across the terrain; small bright cores within large glows | Depth-aware glowing billboards plus dimensional meshes, shaped beam cones, restrained bloom, terrain ribbons and deliberate foreground occlusion |
| [Wave of balloons](https://helloenjoy.com/images/lights-3.jpg) | Rounded forms stretching into drop/stem silhouettes; coloured contours flowing over hills; the landscape remains readable between light sources | Original vertex-morphed orb/drop sculptures rising from wave ridges, timed ribbon waves, and a camera moving through the arrangement |

These are research links, not runtime image assets. The deployed experience must render its own world. Do not copy Ellie Goulding’s song, artwork, logos, handles or texture set. No explicit repository licence was found in the inspected root tree: study its techniques, write original implementation, and do not transplant its code/assets without resolving permission.

The live itch experience reached a “browser does not support WebGL” screen in the available cloud browser. **Its continuous motion and interaction were not observed here.** Before building, run it on Codex’s available real browser if possible, and inspect at least entrance, first large transformation, later terrain/sphere phase and ending. If it still cannot run, inspect the creator’s official embedded video and record the gap. Do not claim a full reference playback from static images or source reading.

The inspected source makes the important design mechanism concrete:

- `js/lights/events/Director.js`: explicit musical phase times; soundtrack position drives the phase; beat data has included/excluded events.
- `js/lights/events/BeatEvents.js`: phases activate different terrain, spheres, stars and cannon systems; beat responses vary by phase.
- `js/lights/experience/Player.js`: altitude, speed, tilt and field of view are choreographed; pointer steering and a press-driven turbo add play.
- `js/lights/events/SpectrumEvents.js`: precomputed spectrum data sampled by song time drives terrain displacement.
- `js/lights/tiles/balls/BallsManager.js`: sphere states grow, change shape, release and disappear; raycast interaction triggers explosions.

Transfer the principles—music-directed world changes, shaped light, spatial depth and playful interaction. Modernise the transport, determinism, shaders and performance in original code. Do not inherit the source’s frame-integrated drift or old Three.js APIs. More bloom alone will not produce this quality.

## Why v1 must be replaced

The supplied archive was inspected: `src/main.ts`, transport, cues, choreography, world, project instructions, README, review record and rendered chorus/finale/portrait-bridge frames. The private GitHub connector returned 404 for this repository, so this review uses the supplied archive rather than claiming a current remote checkout.

The screenshots show a mostly static dark courtyard, a literal sedan, hard window grids, thin LED strips, simple cone beams, a shopping trolley/speaker gag and a large persistent player/caption layer. The source uses slow free-running sinusoidal lighting and thirteen preselected car-story sections. The delivered capture is a **130-second silent scene study**, while this supplied recording lasts roughly **244.3 seconds**. Those study poses/times cannot be adapted into song choreography by stretching the duration.

Retain the useful audio transport lifecycle, tested clock arithmetic, hash checks, accessible controls and failure recovery where they fit. Replace the car, freshener, courtyard, streetlights, façade, trolley, captions, pose table and silent-study public flow. Replace the hard-coded section IDs and validator assumption that every recording must fit the old thirteen-part story. Rebuild `src/scene/world.ts`, the scene modules, `src/show/choreography.ts`, `src/show/cues.ts`, entrance UI and CSS around this brief. Preserve old evidence as rejected historical evidence, never as v2 validation.

## Fixed audio asset

| Item | Measured value |
|---|---|
| Included runtime file | `public/audio/chernyy-bumer.mp3` |
| Original upload name | `Чёрный бумер - Серёга.mp3` |
| Encoded SHA-256 | `67d55f6e9551e77002fecb2752b835761da84a5db2a7679e91599e4dc94c2780` |
| Bytes | `9,771,885` |
| Codec | MP3, 320 kb/s, stereo, source 44,100 Hz |
| ffprobe duration | `244.297125` seconds |
| FFmpeg analysis decode | Mono, 48,000 Hz, `11,726,263` frames, `244.29714583333333` seconds |
| Identity basis | User supplied this recording for the requested song, Seryoga — Чёрный бумер; the original Spotify selection is `0iVj13fDCDRM7rfYEGF50X` |

Copy these bytes unchanged to the repository path above. Resolve with `import.meta.env.BASE_URL` so the production subpath also works. Fetch and decode once, verify the hash, prepare the show, then enable Play. Audio must begin only after a user gesture. Do not add Spotify playback, a second hidden media element, an unrelated sample song or a local-file selection gate. An explicit retry may use a file picker after a real load/decode failure; it is not the normal entrance.

The user explicitly authorised including this supplied MP3 in future work. The pack includes it for this rebuild/private project. That instruction is not evidence of a licence for public redistribution. Do not publish the recording publicly without resolving that deployment question; it does not block local/private implementation and review.

`analysis/track.json` contains the byte/decode measurements. Measure `AudioBuffer.duration`, `length`, `sampleRate` and channel count in the target browsers. `decodeAudioData` resamples to the context’s sample rate; do not reject the same encoded file just because one device decodes at 44.1 kHz and another at 48 kHz. Cue time is seconds in the recording. Compare measured browser duration and onset alignment with the offline analysis, record any constant decoder offset, and correct explicitly if required. Do not proportionally retime the show to hide a mismatch.

## The intended visual experience

### First impression

The loaded entrance is already beautiful: a low camera hovering over a deep midnight field with a few large luminous sculptures, a distant coloured horizon, slow small particles and restrained parallax. Sparse original typography names BUMER.EXE and the song. One understated Play control. On Play, the text dissolves and the viewer enters the world. Keep a small pause/mute/fullscreen affordance, and reveal the compact seek/volume controls on interaction or keyboard focus. No bottom dashboard, permanent chapter captions or developer telemetry in the normal show. Development tooling lives behind a query flag.

### Six scene systems, one cohesive world

1. **Luminous terrain.** A smooth, continuous height field. Dense small light points and coloured contour ribbons explain its shape. Valleys remain dark; crests pick up light. Authored low-band waves expand over the terrain at selected musical hits. The ground should still read as land rather than an arbitrary flat point cloud.
2. **Orb/drop sculptures.** Original high-quality rounded forms with a compact radiant core and broad coloured falloff. Some are half-submerged; others stretch upward and detach. Use smooth silhouettes, gradient colour, soft rim response and controlled specular depth. Vary size and spacing with a seeded field. Sparse huge foreground forms create scale; smaller middle/distant forms create density.
3. **Bokeh and stars.** Three depth ranges with different motion, size and focus. Large near discs are occasional, not a screen-wide blur. Occlusion and parallax must make them inhabit the world. Tiny distant points provide contrast. Use procedural shader profiles; no generated textures.
4. **Beams and light sweeps.** Shaped light with taper, a bright core, smooth radial falloff and haze. Beams sweep through space on authored phrases. Their source points, beam directions and pools belong to the composition. LED chases move spatially around ridges and forms. Avoid opaque triangles, detached wire rings and uniform rows of identical poles.
5. **Morph/release system.** On selected accents, whole groups grow from terrain, stretch into drops, release into a floating canopy or collapse into ribbon-like waves. Use coherent group movement and strong silhouettes. The first major change should be recognisable with the sound muted.
6. **Deterministic particle bursts.** Small, crisp luminous fragments from selected impact points or clicked sculptures. Pool particles; initialise from event time and seed; evaluate position from age so pause/seek/replay reconstruct them. Do not spam every analyser peak.

Build smooth, deliberately lit original geometry rather than crude placeholder props. Instancing and shader variation should buy visual density without thousands of scene objects. Use WebGL2/Three.js compatible with the existing tested stack first. WebGPU is optional only if a finished fallback and demonstrated quality/performance justify it. Do not switch engines or dependencies for novelty.

### Colour and rendering

Use Lights’ joyous multi-colour light rather than v1’s near-monochrome grey/lime. A family of electric cyan, saturated pink/violet, warm yellow and smaller lime/orange accents sits against deep blue-black space. Each region has two dominant colours and a smaller contrasting accent; not every object cycles the full rainbow at once. Palette changes happen at musical boundaries and preserve luminance hierarchy.

Render in linear light with appropriate output conversion. Use HDR emission for small bright cores; control exposure and bloom radius so forms retain colour and silhouette. Avoid white-out hotspots, grey fog flattening the horizon and low-contrast dark-on-dark objects. Bloom is finishing treatment, not a substitute for good light gradients. Use depth-aware procedural glow sprites and affordable beam shaders before expensive full-volume effects. Edge aliasing, banding, sorting artefacts and visible repeated tile seams must be fixed in the actual output.

Camera motion supplies the scale: low gliding paths along terrain, gentle rising reveals, passage between large forms, and one major climb into the released canopy. Use position/target/FOV splines with eased, phrase-length transitions. Keep the central world readable in portrait: compose a separate framing envelope and let depth run vertically; do not crop a landscape camera and switch off its essential glow. The low quality tier still needs the same composition and luminous identity.

## Music-directed score: measured input, then listening review

The analysis in this pack was generated from the supplied MP3. It is **not a listened, approved cue sheet**. No full-song listening or audiovisual sync was performed here. Avoid fabricated lyrics, confidently invented chorus times, or an “exact BPM” claim.

Included timing aids:

- `analysis/waveform.json`: peak/RMS every 10 ms.
- `analysis/features.json`: low/mid/high-band and positive spectral-flux curves, independently percentile-normalised; these are control signals, not isolated drums or decibels.
- `analysis/markers.candidates.json`: pulse hypothesis, nearby measured transient peaks, timbral-change candidates and uncertainty. The candidate family is approximately 85/170 BPM; metre and bar phase remain unresolved. Predicted grid points are distinguished from detected transient peaks.
- `analysis/measurement-overview.png`: waveform/band overview.
- `review/listening.html`: local developer utility that plays the bundled recording, displays the measurement data, lets the reviewer annotate and export draft events, and records browser decode/hash information. This is not the website’s visual design.
- `tools/prepare_audio.py` and `tools/propose_markers.py`: reproducible analysis scripts.

### Visual staging proposals to test against the recording

These are **feature-based windows to audition**, not authoritative musical section names or final edit boundaries. Exact proposals and candidate status are also in `show/score.proposal.json`. Listen to the whole track and refine them; use measured accents, real bar/phrase boundaries and any repeated musical motifs. You may change the number of regions.

| Approximate recording window | Evidence available here | Proposed world development |
|---|---|---|
| 0:00–0:18 | Lower low-band energy before a pronounced entrance | A few luminous seeds and faint terrain points; camera starts close, revealing the horizon without prematurely spending the spectacle |
| Around 0:18 | Sharp low-band/RMS entrance | A wave of points ignites over hills; the nearest orb/drop group rises; first confident forward acceleration |
| 0:30–0:52 | A clear change in band balance; dense high-band activity | Enter the full light field, interleaving cyan/pink forms and a warm accent; selected rhythmic accents send spatial ripples rather than screen flashes |
| 0:52–1:26 | Another sustained band pattern | Colour trails develop over the ridges; glide between huge foreground forms; create breathing room before the next reveal |
| 1:26–2:21 | Repeated changes around 1:26 and 1:48 | Reprise the main luminous language at a new scale; group growth/release becomes more prominent; climb briefly to reveal the field’s pattern |
| 2:21–2:44 | Four conspicuous repeated mid/high envelope dips/returns | Choreograph repeated compress/release gestures: the world gathers into suspended droplets, then expands; exact gestures must be placed on listened returns |
| 2:44–3:07 | The repeated envelope pattern ends | Drop back into the terrain corridor; accelerate in depth; build the suspended canopy above the viewer |
| 3:07–3:53 | New band balance, then a later change near 3:30 | The largest transformation: sculptures release into a luminous ceiling while the terrain becomes flowing ribbons; beam fans and local particle bursts accent selected phrases |
| Approximately 3:53–4:04.297 | Broad fade in the measured envelope | Let the structures settle and the field thin out with the actual fade; graceful deceleration; a quiet replay view at the recording’s end |

Make energy and density follow the song. Do not sustain maximum intensity for four minutes. Repeated motifs should reprise recognisable visual motifs with an evolved camera/scale, so the piece has memory. Use the actual fade rather than chopping at a rounded duration. If listening contradicts a proposed window, listening wins and the score record changes.

### A small amount of fun

Interaction should feel like playing with light. A bounded pointer/touch offset lets the viewer look through the world; the main camera score remains intact. Clicking/tapping an orb releases a beautiful small burst. A press-and-hold gesture can gather nearby light toward the pointer and release it on the next reviewed beat, with a restrained camera push. These are local visual accents: they never alter playback rate or move the music clock.

One optional absurd moment can happen deep into the piece: all the large forms briefly squash in the same rubbery rhythm, then recover into an immaculate canopy. It must be musically placed and beautifully animated. No car/trolley scene, meme pop-ups, intrusive lyrics, error windows or joke overlay is required. The surreal world itself supplies the humour.

## Clock and event architecture

Keep one decoded `AudioBuffer` and one active `AudioBufferSourceNode`, with its context start time and song offset as the transport anchor. `requestAnimationFrame` asks the audio transport for presentation song time; it never advances an independent show clock. Keep generation protection around load, resume, source replacement and obsolete end handlers. Preserve pause, seek, replay, volume ramp, visibility pause and context-loss recovery.

Use a fresh valid `AudioContext.getOutputTimestamp()` to map audio output position to the display performance-time coordinate. Record when a fallback is used. Do not add `baseLatency` and `outputLatency` blindly to an already output-aligned timestamp. Keep a documented calibration offset with a clear sign convention; zero is the uncalibrated default. Do not promise speaker/display perfection from a graph clock alone.

The show has two levels:

- **Authored score:** reviewed region boundaries, selected beat/accent events, camera splines, palette transitions, group morphs, release events and deterministic seeds.
- **Continuous detail:** interpolated precomputed band/envelope curves sampled at presentation song time for small surface movement, glow breathing and controlled particles. These curves supply texture, not automatic scene selection.

Replace v1’s rigid cue schema with semantic-neutral, flexible regions and event types. Every time is seconds in this encoded asset’s reviewed browser timeline and bound to its SHA-256. An event includes `id`, `seconds`, `type`, `target`, `duration_seconds`, `seed`, `params`, and an audio-feature/review note. Regions cover the recording without gaps. Camera paths and major state are functions of absolute song time. Event particle positions are functions of `(songTime - eventTime)`.

Seek must reconstruct the same major world/camera/palette state as continuous play at the same time; it must not depend on having visited earlier phases. Reset optional interaction history on replay and define its seek policy. An event dispatcher may notify transient UI/sound-free interactions, but rendering should be able to evaluate directly at any time. If multiple cues were crossed in a dropped frame, evaluate the present state rather than firing a backlog of flashes. No random values inside the render loop.

Development previews may use honestly labelled candidate cues while musical review is underway. Do not freeze the whole show at ignition or expose “cue review pending” as the normal product experience. Final evidence must distinguish measured candidates, reviewed cues, software timing checks and physical output measurements. Promote cue status only with actual evidence; never fix a failed gate by changing a string to `reviewed`.

## Delivery and acceptance

### Implement in this order, keep working through completion

1. Inspect existing repository instructions/source, the three real Lights compositions, available live motion, this MP3 and the analysis aids. Preserve v1 history/evidence. Copy in the unchanged audio asset and replace the active instructions/manifests.
2. Build a **real runtime excerpt** covering one entrance and the first major musical transformation. Use the actual song and proposed/listened events. Concentrate on terrain, sculptural forms, deep glow, camera scale and minimal controls. Inspect it in a browser at desktop and portrait before duplicating the language across four minutes. This is an internal quality checkpoint, not a new permission request or an excuse to deliver a partial site.
3. If the excerpt still reads as empty black space, flat dots, neon wire shapes, cheap cone lights or washed-out blur, revise geometry, depth, lighting and composition first. Compare against the creator’s actual stills. The beauty must survive a paused frame and the authored transformation must survive muted playback.
4. Complete the whole recording’s score, all scene systems, interaction, entrance/ending, recovery and quality tiers. Listen through the full recording, review cues at phrase/beat boundaries, then replay the entire site with audio. Carry out required browser/device verification and report genuine remaining limits.
5. Build and serve a local production preview from the final checkout. Capture actual full-length audio/video, meaningful desktop/portrait frames, score/clock evidence and the final SHA. Prepare the normal GitHub commit/push in the existing authorised workflow; do not force-push or rewrite the rejected history. Keep public deployment and public song distribution separate from local/private implementation.

### What counts as a successful result

- **Visual craft:** terrain relief, near/mid/far scale, shaped luminous forms and controlled colour are visible at entrance and the first major transformation. At least three materially different states belong to the same world. Later spectacle transforms scale/shape/density, not merely light intensity. Portrait has the same visual ambition.
- **Musical craft:** a listened, asset-bound score; major entrances/morphs/returns align to chosen audible landmarks. Different parts have different visual behaviours. No free-running decorative oscillator is used as an excuse for sync.
- **Transport:** bundled song, single gesture start, one source, no duplicate playback, working pause/seek/replay/mute/volume, fresh source per resume, no phase drift after seeking or tab hiding. Failed audio/renderer loads give real recovery with usable controls.
- **Timing evidence:** at least twelve selected audible/visual anchors distributed from entrance through final fade; measure software event timing against the decoded audio timeline. At 60 Hz use p95 ≤30 ms and max ≤50 ms as project software targets, report actual results, and verify no cumulative first-to-last drift. These are project targets, not certified human perception or acoustic latency. Record speaker/display or loopback evidence separately when available.
- **Motion and flash:** deliver LED movement, beam fans, geometry impact and particle accents with stable background luminance. Measure complete rendered playback against general/red flash thresholds in every shipped intensity mode, including moving light fields and user interactions. A warning or “crazy mode” toggle does not replace measurement. If full measurement is unavailable, ship the restrained measured/verified behaviour and report the remaining gate; no unverified full-screen white/red strobe. Provide an immediate Pause and designed reduced-motion/intensity composition.
- **Performance:** examine continuous frame-time distribution and actual sustained motion on representative hardware. Record browser/device/viewport, tier, DPR, renderer, draw calls and frame-time percentiles. Do not describe headless software rendering or an emulated viewport as real phone performance. Degrade density/post effects gracefully while preserving terrain, soft light and score.
- **Evidence:** tests/build are engineering evidence. Actual screenshots, continuous audio/video and listening evidence support visual/music review. User acceptance remains user acceptance. Report these separately; thirty-five passing tests did not make v1 an accepted visual experience.

## Primary technical sources

- Output timestamp mapping: <https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp>
- Browser decode/resampling: <https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData>
- General/red flash criteria: <https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html>

Research inspected 2026-10-09. Keep a short source-to-implementation record as you work. No generated imagery, generated video, generated textures or generated concept art was requested or included.

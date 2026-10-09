# BUMER.EXE — Codex assetfile and implementation brief

Version 1 · 2026-10-09 · Mani Marami Milani / Denoax

## Read first

Implement a complete, standalone, song-driven website. The product is a funny, beautifully executed internet rave: guns.lol entrance attitude, the nostalgia of an NCS visualizer, and an authored audiovisual show that grows into an impossible neighbourhood nightclub. The working title is **BUMER.EXE**. It is a new project, independent of manimarami.com.

Read and apply **$reference-led-design** before visual implementation. If that skill is unavailable, its operative rules are embedded in `AGENTS.md`; record the installation gap and proceed using those rules. Inspect applicable local instructions and existing reusable code before choosing dependencies or rebuilding mechanisms.

The requested song is **Seryoga — Чёрный бумер**, Spotify track ID `0iVj13fDCDRM7rfYEGF50X`: https://open.spotify.com/track/0iVj13fDCDRM7rfYEGF50X. This identifies the intended recording; it is not a runtime audio source or a redistribution grant.

**Critical evidence boundary:** this pack contains no song recording, acquired car model, downloaded texture or verified second-by-second cue sheet. The published song structure was researched; full playback of the exact linked recording was unavailable to the research session. Every cue time therefore starts as `null`. Candidate assets have explicit inspection and acquisition statuses. Never invent timings, audio availability, listening evidence, licenses or approval to make the pack appear complete.

The deliverable from Codex is the actual running website, its source, asset records, measured audio-sync evidence and browser review captures. This document specifies the work; it does not establish the website's visual quality or sync.

## 1. The experience

A black 1990s-style executive sedan sits in a damp courtyard under a streetlamp. A small title and **Start ignition** provide the entrance. One user gesture starts the prepared show and the song together. Chrome edges, headlights and reflections introduce the car before the space expands.

During the first verse, apartment windows answer the rhythm. The first chorus reveals a coordinated courtyard rave. During the second verse, ordinary street objects quietly become part of the rig. The second chorus transforms the surrounding buildings into monumental LED surfaces. A brief surreal interlude focuses on a hanging air freshener. The final chorus reveals the whole venue, with one carefully reserved physical joke. The ending returns to the courtyard and offers replay.

The central joke is scale: a ridiculous car-flex song receives the care of an ambitious concert installation. Keep a straight face. The air freshener is the recurring comic subject; exaggerated motion belongs to it, not to every object or control.

Ship a complete automatically choreographed experience first. Essential controls are start/pause, volume/mute, seek, replay, light intensity/low-flash mode and credits. Cursor movement steers a secondary spotlight with modest influence. Fullscreen is optional and user-controlled. A live multiplayer room, webcam face effects, phone pairing and a generic upload-any-song visualizer are later ideas, outside this first implementation.

## 2. Concrete art direction

### Composition

- Establish three excellent rendered compositions early: entrance car, first chorus courtyard, final chorus venue. Inspect each on desktop and portrait, then continue through the full sequence without waiting for a procedural approval.
- The sedan must read from silhouette, proportion and light. Use a long bonnet, distinct cabin, restrained bright trim, wheels with depth and separated lamp geometry. A stack of cuboids with bloom is a development proxy, not the final hero.
- Maintain one dominant visual subject per shot. Use foreground lamp hardware, midground car and far façades to create depth. The world must remain spatially legible when paused.
- Compose a believable small place before making it impossible. Reuse its windows, parking marks, lamps and rear-light shapes as the enlarged concert architecture. Avoid teleporting into unrelated tunnels or galaxies.
- Portrait has its own camera paths and focal distances. Show the car and upward façade/rig reveal vertically; protect touch controls with safe-area insets. Do not crop the desktop camera and call mobile finished.

### Light and materials

- Base: ink black `#050607`, graphite `#151719`, warm streetlight `#E4B67A`, chrome highlights `#DDE1E4`. Rear-lamp red `#D32A22` is a concentrated accent. Acid lime `#CBF26D` enters for a later reveal rather than cycling continuously. These are initial tuning values, not measurements or fixed physical colours.
- Preserve black areas and the outline of the car. Bloom belongs to luminous lamps and LEDs, not to all geometry or the entire interface.
- Paint should reveal curved surface highlights. Glass should remain darker than the lamps. Rubber needs distinct roughness. Asphalt needs rough aggregate plus local wetness variation; do not make the entire floor a perfect mirror.
- Use the actual light rig as the source of beams and visible reflections. Layered haze should explain depth. Thick transparent quads, clipping fog and white soup are defects.
- Design LED banks with real apparent spacing. Chase patterns travel through the banks. Keep a limited family of optical effects: beam fans, window chases, rear-light echoes and one circular motif.
- Broad saturated-red flashing requires particular care. Every shipping intensity mode must remain inside measured flash limits. A warning or an opt-in toggle does not replace that requirement.

### Motion and humour

- Camera movement follows phrases. Hold a frame long enough to perceive its subject. Reserve fast passages and a small impulse for selected accents; constant shake weakens the show.
- Car, lighting structures and buildings have weight. Humour comes from an impossible action carried out with convincing staging, not from making everything rubbery.
- Make the air freshener a simple original code/mesh object, with a recognizable silhouette, thickness and string attachment. Author a repeatable damped swing as a function of song time; avoid a history-dependent solver that breaks seeking.
- Reserve one final joke. Default: the camera reveals that an absurdly oversized lighting sculpture is sitting on a small shopping trolley. Place and frame it so the viewer can understand the scale. If it is not readable in the real render, refine it or substitute a comparably specific physical joke; record the decision.
- Text remains scarce: project title, song credit and real controls. Do not cover verses with lyric paragraphs, invented system errors, telemetry, badges or explanatory jokes.

## 3. Reference-to-use map

These references supply principles. They are not artwork to copy into the runtime. Research used creator pages, published descriptions, available imagery and source/making-of documentation. Uninterrupted playback of these references was not verified here. Codex must inspect actual available visual material before final adaptation; describe any unavailable material honestly.

| ID / original source | Evidence available in research | Use in BUMER.EXE |
| --- | --- | --- |
| R01 — HelloEnjoy, **Lights**: https://helloenjoy.itch.io/lights ; source https://github.com/c4rl05/Lights | Creator identifies an interactive Three.js experience around Ellie Goulding's single; indexed screenshot imagery shows luminous forms and a flowing coloured environment. | A recognisable motif develops throughout the whole song. Adapt the musical journey; do not reproduce its coloured orbs, branding or recording. |
| R02 — Zach Richter / Jono Brandel / Within, **Under Neon Lights**: https://www.zacharyrichter.com/chemical-brothers-under-neon-lights ; source https://github.com/within-unlimited/under-neon-lights | Director describes a world building in neon colour. The repository documents Three.js and Frame.js; the repository is archived. | Major sections change the scale and architecture of one world. Study timeline-driven scene authoring. Do not import the film's models or characters by default. |
| R03 — Baku Hashimoto / dot by dot, **KAMRA — Deja Vu**: https://www.baku89.com/deja-vu ; making-of https://www.baku89.com/making-of/deja-vu ; source https://github.com/Whatever-Co/KAMRA-Deja-Vu | Creator documents manually authored facial motion, Cinema4D-to-JSON data, composited material and UV transformations. Source code license excludes media. | Give the air freshener and final physical gag authored poses, anticipation and recovery. Use the workflow principle rather than copying faces or videos. |
| R04 — Vincent Morisset / Google Data Arts, **Just A Reflektor**: https://blog.google/products-and-platforms/products/chrome/just-reflektor-virtual-projection-with/ | Official account documents a mobile-controlled spotlight and evolving visual treatments; the old tech sandbox is listed as inactive. | Cursor controls a secondary projected beam. The core show remains coherent when the viewer does nothing. Phone pairing is optional future work. |
| R05 — AC-bu / Baku Hashimoto, **Kindolphin / HAPPENING**: https://www.baku89.com/kindolphin ; making-of https://www.baku89.com/making-of/kindolphin | Creator documents an animated comic music experience with scrolling/scratching and a PWA implementation. The larger app also contains other comics. | Specific absurdity, carefully timed typographic/graphic beats and tactile replay/seek. Do not copy comic art or the electronic-reader parody. |
| R06 — HelloEnjoy, **HelloRun**: https://helloenjoy.itch.io/hellorun | Creator documents a one-song runner whose movement and pulses follow Du Tonc's track. | Rhythmic forward travel for one street passage. Listening must not depend on surviving obstacles. |
| R07 — HelloEnjoy, **Fantasynth One**: https://helloenjoy.com/home ; release https://store.steampowered.com/oldnews/?appids=624460&feed=steam_community_announcements | Creator documents a VR journey through an environment that comes alight with N'to's music. This is a VR reference, not a browser site. | Architectural light reveals, scale and ordered illumination. Do not mislabel its renderer or treat footage as proof of browser performance. |

The source records above distinguish creator documentation from our proposed adaptation. The previous portfolio pack's provenance/evidence method is retained; its galaxy art direction and unrelated asset assumptions are not imported.

## 4. Asset acquisition and preparation

`manifests/assets.json` is a starting register, not a downloaded asset inventory. Obtain source bytes through ordinary permitted downloads. Preserve original notices. Record original and derivative SHA-256, author, license/version, source URL, preparation command, dimensions or geometry counts, local runtime path and a real inspection record.

| Role | Source / acquisition direction | Preparation and acceptance |
| --- | --- | --- |
| Hero sedan | Prefer an owned, provenance-known model. Research candidate: longobarda's photographed BMW E38 scan, https://sketchfab.com/3d-models/bmw-e38-7f3c847956614f62b0e64ba6ffc8614f . Creator states an iPhone scan of their own car; listing reports ~1.4M triangles and CC Attribution, whose link resolves to CC BY 4.0. | Candidate only: no bytes or topology were inspected here. Inspect the actual geometry, wheels, underside, interiors and baked lighting before selecting it. It will need substantial cleanup/retopology, separated lamp surfaces and neutral materials if suitable. Do not ship the raw scan, assume its photographs relight well, or hide defects in darkness. |
| Alternate sedan candidate | INANIS, https://sketchfab.com/3d-models/bmw-e38-cyberbody-ff3d4b9cc7b6425f86cd7bca9c5f7ac6 . Listing located, full page returned 403 during research. | License, provenance, geometry and style remain unresolved. Reinspect before use; no permission or quality is asserted. Keep cyberbody modifications only if they serve this show's specific car silhouette. |
| Asphalt material | Poly Haven **Asphalt 02**, Rob Tuytel: https://polyhaven.com/a/asphalt_02 ; file catalogue https://api.polyhaven.com/files/asphalt_02 ; page identifies CC0. | Choose 1K/2K diffuse, OpenGL normal and roughness/packed maps. Set map colour spaces explicitly. Add original shader-authored wetness variation; keep dry aggregate visible. No need for 8K displacement. |
| Façade / concrete | Poly Haven **Concrete Wall 007**, credited creators on source page: https://polyhaven.com/a/concrete_wall_007 ; catalogue https://api.polyhaven.com/files/concrete_wall_007 ; CC0 listed. | One reusable material with restrained grime variation. Model slabs, windows and balconies as intentional original geometry; build instanced LED windows independently. |
| Reflection environment | Poly Haven **Rooftop Night**, Greg Zaal: https://polyhaven.com/a/rooftop_night ; catalogue https://api.polyhaven.com/files/rooftop_night ; CC0 listed. | Begin with a low-resolution environment for paint/chrome reflections. Its twilight sky is not automatically the background or the show's lighting design. Tune exposure; authored lamps remain dominant. |
| Display font | **Anton**, Anton Project Authors: https://github.com/google/fonts/tree/main/ofl/anton ; verified notice https://raw.githubusercontent.com/google/fonts/main/ofl/anton/OFL.txt . SIL OFL 1.1. | Self-host only necessary glyphs with the notice; verify the actual font contains every used character. Tune optical spacing. Use a readable system sans for transport controls unless an existing owned font is better. |
| LED grids, beams, circular rig, lamps | Original Three.js geometry/shaders, derived from inspected reference principles. | Use instancing/reused geometry. Lights are actual scene objects. Preserve spacing and local contrast. Authored code is valid artwork; generated raster/video media is not. |
| Air freshener and trolley | Original mesh/code with real silhouette references inspected during implementation; owned models may be reused. | Thickness, attachment, contact and materials matter. No low-effort clip-art sticker standing in for the 3D subject. |

If the hero model is unavailable or unsuitable, continue lighting/transport/venue work while sourcing a documented alternative or authoring a refined mesh in Blender from inspected real references. A proxy is explicitly temporary. Choose a deliberate level of stylisation and apply it consistently across the car and environment; a rough photogrammetry car in a toy city is not a cohesive final result. No paid purchases without applicable user authorization.

## 5. Song study and authored cue treatment

Published structure source: https://www.shazam.com/song/933947652/chernyy-bumer . It indicates three verses, recurring choruses, a repeated-title bridge and a doubled closing chorus. This is a related catalogue entry, not proof of the exact Spotify recording's timing. Duration listings and 85/170 BPM estimates elsewhere are deliberately not used as a cue grid. Verify the actual file, tempo/beat interpretation and every boundary by listening and waveform inspection.

`manifests/cues.template.json` holds these semantic anchors with unresolved times. Do not spread evenly spaced events over a guessed four-minute duration. Do not call this song an EDM build/drop structure unless the actual recording supports those cues.

| Cue ID | Anchor to locate in exact audio | Proposed scene / attention |
| --- | --- | --- |
| intro | Audible opening | Headlights, wheel/chrome detail, then readable sedan silhouette. |
| verse_1 | First verse begins | Street-level courtyard; small window groups answer the rhythm. |
| ignition_phrase | Engine / coloured-light narrative in first verse | Reveal interior lights and beam volume. Do not add a competing engine sound over the song. |
| refrain_1 | Repeated pre-chorus boast | Activate the first rig in a deliberate sequence; widen framing. |
| chorus_1 | First chorus | Courtyard becomes the first coordinated venue; signature circular/rear-light motif. |
| verse_2 | Second verse | Lower intensity and closer camera; ordinary street details join the rig. |
| refrain_2 | Second repeated lead-in | Parking lines illuminate and façade panels prepare to unfold. |
| chorus_2 | Second chorus | Reveal monumental LED façades and more spatial depth. |
| bridge | Repeated-title interlude | Simple strong silhouette; turntable-like car staging and air-freshener focus. |
| verse_3 | Third verse | Interior/near-car shot with passing reflections; develop the recurring physical joke. |
| refrain_3 | Final lead-in | Reactivate known motifs in the established order. |
| chorus_final_a | First final chorus pass | Wide venue composition; coordinated beams, LED banks and reflections. |
| chorus_final_b | Closing chorus repetition | Reserve the largest architectural transformation and reveal the trolley gag. |
| outro | Last phrase / instrumental ending, if present | Deactivate in sequence; ordinary courtyard returns; air freshener settles; replay. |

Reconcile this semantic list with the actual recording. If a proposed subsection does not exist, mark its `resolution_status` as `not_present` with a listening note and place its design action in an actual neighbouring phrase. Do not manufacture a pause, bridge or outro. Add real instrumental accents/fills discovered during analysis.

Within a chorus, recurring title phrases use a consistent graphic accent. Brake-light references motivate concentrated rear-lamp/red reflection moments; chase references motivate the forward street passage; window references motivate the façade view. Keep these moments brief rather than displaying full lyric text. Later choruses reinterpret the same motifs at larger scale.

## 6. Audio and synchronisation contract

### Establish the exact audio

First look for the user's supplied recording in the project inputs or specifically identified local audio location. Compare artist/title/version with the requested Spotify entry and listen to it. A file named similarly is not enough. Do not rip Spotify, bypass a download restriction, silently use a remix, substitute another song, or claim full playback occurred when it did not.

Run `tools/prepare_audio.py` on the exact intended runtime file. It hashes bytes, probes metadata and produces a waveform plus band-energy/onset candidates. Its findings are measurement aids, not approved beat or phrase markers. Listen and mark anchors in a development editor that scrubs the actual decoded runtime buffer. Verify the file identity and mark `identity_review_status` accordingly.

Bind the finished cue sheet to `track_sha256`. Runtime must verify the loaded bytes before applying the fixed song-specific cue sheet. If the audio changes or mismatches, stop that cue sheet and show a concise real recovery action. No arbitrary file should get this choreography by filename alone.

Use the same encoded audio bytes for playback, decoding tests and analysis input. An analysis WAV derived by the helper is for analysis; it must not silently replace production audio. If compression/trim/resampling is deliberately introduced, hash the derivative, rebuild/review cues against it and record the transformation. Measure browser-decoded duration and leading padding; seconds in a different master are not automatically interchangeable.

For public hosting, bundle only a recording with documented permission for the intended use. Spotify links/embeds do not grant that permission; official platform terms prohibit synchronising platform recordings with visual media: https://developer.spotify.com/policy and https://developer.spotify.com/documentation/embeds/terms . A complete static website can instead load the user's matching local recording entirely client-side, with no upload, account or secret. If a matching recording is missing, finish independent scene/transport work and provide a polished local-file entry. Report exact-track sync as blocked until the file is analysed; don't declare a silent preview fully complete.

### One audio clock

Preferred transport for this short fixed recording: one decoded `AudioBuffer`, scheduled through `AudioBufferSourceNode` into a gain node and the destination. Create/resume the AudioContext after the entrance gesture. Prepare critical assets/shaders before entering the audible sequence. Loading completion is the real basis of a loading indicator.

Maintain an audio-graph start time, source offset and a transport generation token. Every play/resume/seek creates a new one-shot source. Source end handlers must check generation before changing current state. Stop/disconnect old sources on replacement, preserve volume, and keep the file at playback rate 1.

Transport position comes from the audio graph, not accumulated render deltas. Visual position should use `AudioContext.getOutputTimestamp()` to map an estimated display time to the audible output position where supported. The supplied `core/audio-time.mjs` contains the arithmetic and pure evaluators; it is not a complete browser transport. Codex must implement source lifecycle and integrate/verify it.

Definitions: `anchor = { contextStartSeconds, sourceOffsetSeconds, durationSeconds }`. For a running graph:

```
graphSongSeconds = clamp(sourceOffsetSeconds + currentTime - contextStartSeconds)
outputContextSeconds = timestamp.contextTime +
  (estimatedDisplayPerformanceMs - timestamp.performanceTime) / 1000
visualSongSeconds = clamp(sourceOffsetSeconds + outputContextSeconds - contextStartSeconds)
```

Use only valid/fresh timestamp pairs from the running context. Before the scheduled start, hold the opening state; do not run the show early. A fallback based on `currentTime` is explicitly best-effort and requires separate measurement/calibration. Do not subtract a guessed latency, double-count `baseLatency`/`outputLatency`, or describe software timestamp mapping as a physical guarantee. A measured positive `visualLeadMs` intentionally advances visual sampling; record its sign and value.

Pause/seek/replay, backgrounding and context suspension must preserve the intended state. Auto-pause when the document becomes hidden and offer resume on return. If audio suspends unexpectedly, freeze scene time rather than continuing a wall-clock show. Handle decode/load errors with a real retry/file-load action. Mute changes gain; it does not reset song time. Repeated clicks cannot start overlapping sources.

### Authored macro-events, measured small reactions

Evaluate major scene state directly from absolute song time: camera pose, façade transforms, rig activation, title visibility and air-freshener pose. Sample a paused GSAP timeline or equivalent pure functions with events suppressed. Do not schedule the show with `setTimeout`, autonomous CSS delays or an independently running GSAP clock.

Beat/phrase markers are arrays of measured seconds with method/confidence/review notes. Use a phase-local pulse envelope for kicks and accents. Use offline band-energy curves for subtle speaker motion, highlight variation and low haze modulation; a live analyser may add secondary detail. FFT bass bins do not identify every kick, and overall amplitude does not locate a chorus. No essential visual event depends on live spectral inference.

Particle/haze randomness has a fixed seed. At a given cue time, positions are computed from that time and seed, or from deterministic checkpoints. Seeking to the finale after replay must produce the same major state. Cursor input and optional intensity remain separate from the authoritative timeline.

Suggested mapping: low-band energy → modest speaker excursion/reflection strength; reviewed snare/accents → travelling LED highlights; high-band energy → small specular details; phrases → camera moves/architecture; chorus anchors → major reveal. These are creative mappings, not claims that source-separated drums exist.

### Measured sync acceptance

- At least twelve reviewed audio/visual anchor pairs across the song, including early, middle and late passages. Target software presentation residual p95 ≤ 30 ms and maximum ≤ 50 ms on a real 60 Hz display; these are project targets, not browser guarantees. Report actual results and measurement uncertainty, including video frame quantisation.
- Compare the first and last anchor residuals. Investigate more than one 60 Hz frame of systematic drift. Do not correct drift by adding repeated ad hoc offsets to individual cues.
- Repeat representative anchors after pause/resume, seek forward/backward, replay, resize, hidden-tab resume and intensity changes. These actions must not create cumulative phase drift or duplicate audio.
- Use a rendered cue witness plus captured audio loopback/waveform where available. Capture method, devices, browser, display cadence and Bluetooth/wired output must be stated. Loopback and software timestamp tests do not prove physical speaker/display alignment.
- Listen to uninterrupted full playback and review the continuous browser capture. If listening, real GPU/display tests or physical output tests cannot be performed, state the specific unverified layer and keep that delivery status separate.

Primary technical references: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/getOutputTimestamp ; https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode/start ; https://developer.mozilla.org/en-US/docs/Web/API/BaseAudioContext/decodeAudioData . Consult current installed API documentation when integrating.

## 7. Website architecture and execution

Prefer Vite + TypeScript + Three.js with a small semantic DOM transport. React is optional if it serves existing project code; it must not own per-frame scene state. Use one canvas and one authoritative transport. Pin dependencies and keep the lockfile. Read actual renderer colour-management/tone-mapping documentation for the installed version.

Keep source modules proportionate: audio transport; track identity/analysis; cue evaluation; camera choreography; car/venue; lights/atmosphere; DOM controls; capability/quality tiers. Separate song-specific data from rendering. The package's pure timing helper is reusable; adapt its type boundary rather than building an unnecessary framework.

The first version is static-hostable. Test asset URLs under the configured base path, including a repository subpath if targeting GitHub Pages. No backend, logins, tracking, social badges or fake online counts are required. Credits report real assets, artists and reference influence. Use the user's requested target if hosting is specified later; do not assume access to their physical local preview from this handoff.

Provisional budgets to measure and tune: desktop target 60 fps on the user's real GPU; mobile target at least stable 30 fps while preserving the choreography; cap DPR per tier; ~150k hero-car triangles high tier and ~50k mobile after actual inspection; ~250 draw calls high tier; 1K/2K material maps; ~12 MiB initial visual transfer excluding the soundtrack. These are starting budgets, not accomplished benchmarks or hard excuses for poor imagery. Record deviations and their visual benefit.

Use instanced window/LED banks, shared materials, bounded fog layers, warmed shaders and an inexpensive low tier. Reduce postprocessing/overdraw before removing the scene's main subject. A software-rendered CI session is not a GPU performance benchmark. Dispose resources on teardown and handle WebGL context loss without blasting or silently losing audio controls.

## 8. Quality gates and delivery

### Implement in this order

1. Inspect instructions, existing owned mechanisms and source material; initialise the new standalone project. Keep source/asset acquisition records concise.
2. Locate and analyse the exact recording where available. Build clock/transport and an anchor editor early. Independent visual work continues if audio is missing.
3. Acquire/prepare the hero sedan and compose the entrance, first-chorus and finale frames on desktop and portrait. Replace proxies before completion.
4. Implement the full authored cue sequence with seek/replay coherence. Add secondary audio reactions and one readable recurring joke.
5. Inspect real browser frames and uninterrupted playback; fix the largest visual defect first. Run meaningful transport/identity tests and measured sync checks.
6. Deliver the running preview, production build, source/evidence package and honest status record. Do not stop at a starter, plan, mockup or partial first scene.

### Things that fail review

- A stock spectrum ring on a wallpaper for the whole track; generic gradient nightclub; cuboid hero car; unresolved scan artifacts; a wall of arbitrary particles; constant chromatic glitch; overexposed bloom; unrelated memes.
- A professionally written README attached to a visually weak scene. More documentation is not a fix for imagery.
- Fake cue seconds/BPM grid; matching by filename; wall-clock drift; multiple sources after replay; a camera timeline that continues during pause; a different remix quietly used as the song.
- Tiny inaccessible controls, touch traps, broken portrait framing, forgotten source credits, inaccessible assets silently treated as bundled, or reference footage shipped as original work.
- Calling build success, arithmetic tests, isolated screenshots or an agent score visual approval. Human approval is a separate fact.

Keep flash behaviour below applicable general/red flash thresholds in every mode; provide low-flash controls and immediate pause. Source: https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html . Reduced motion uses fixed strong camera compositions and restrained travelling light while preserving playback and controls.

### Required evidence

`evidence/REVIEW.md` records implementation SHA/dirty status; actual audio hash and identity; runtime decoder details; anchor/cue review; used assets and derivatives; tested browsers/devices; measured sync and performance; unedited full-play capture; entrance/chorus/bridge/finale/outro desktop/portrait frames; fallback/error tests; unresolved limitations. Name concrete defects and improvements, not self-awarded adjectives.

Report independently: build/behaviour, visual review, exact-track sync, measured performance, asset provenance and public-audio distribution mode. The supplied release validator checks missing contracts and hashes; it cannot certify aesthetics, permissions, playback smoothness or physical sync.


<div align="center">

<picture>
  <source media="(prefers-reduced-motion: reduce)" srcset="showcase/github/visual-music-loop-poster.webp?v=clean-title">
  <img src="showcase/github/visual-music-loop.gif?v=clean-title" alt="Visual Music — animated waves across the actual LED floor" width="100%">
</picture>

# Visual Music

**A dance floor you can fly through.**<br>
Raised waves, luminous grids and a continuous journey through *Around the World (La La La La La)*.

[![Three.js](https://img.shields.io/badge/Three.js-0.186-20232a?logo=threedotjs&logoColor=white)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7-20232a?logo=typescript&logoColor=3178c6)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8-20232a?logo=vite&logoColor=bd34fe)](https://vite.dev/)

[**Play Visual Music**](https://denoax.github.io/visual-music/) · [Experience](#the-experience) · [Controls](#controls) · [Run locally](#run-locally) · [Architecture](#architecture) · [Verification](#verification) · [Credits](#credits)

*The banner uses actual scene footage with a short lap edit. Reduced motion selects a still. The live Pages link is the preceding release; this source-only review is available at the local preview until a separate hosting update is authorized.*

</div>

## The experience

The page loads automatically and silently. After real recording/analysis/font/shader readiness, a small landing-page ball falls onto Play and “click to continue” fades in. One Continue action unlocks the existing audio context, plays a soft chime and starts the exact recording at sample zero after a 0.8s lead. Fly low over an endless LED floor while physical waves spread from fixed emitters. The sky stays black throughout. After the circular opening, event-born oval, ridge, chevron, crossed and paired-ring formations travel over the same terrain; quiet circular passages return between them. Crest phase moves colour within the existing cohesive palettes. Local chunks trade light as the waves arrive: bulbs genuinely switch off, leaving dark space between coloured grids, chases and held palettes. Soft stars move through the same world.

The banner and gallery below show the approved preceding build. Current continuation captures and receipts are in [`evidence/black-sky-wave-colour`](evidence/black-sky-wave-colour).

| Cool light | Warm light |
|:---:|:---:|
| <img src="showcase/github/floor-cool.webp" alt="Cyan raised LED terrain with dark unlit regions" width="100%"> | <img src="showcase/github/floor-warm.webp" alt="Amber and rose LED waves beneath depth-tested stars" width="100%"> |

Steering changes the travelled path. Normal travel is 45% of the preceding route speed. Holding the scene gently eases toward 1.2× that speed over a 0.45s time constant; releasing settles over 0.85s. Camera height/lens and raw wave timing are unchanged. The floor carries the musical movement while the horizon stays stable.

The complete recording plays once. Only after its destination-presented tail, the whole scene fades to black over 2.6s. A minimal thank-you page appears with a single restrained 36-piece/four-second confetti burst (omitted for reduced motion). The render loop then stops; there is no perpetual ambient scene or automatic replay.

<details>
<summary><strong>Portrait view</strong></summary>

<br>

<p align="center">
  <img src="showcase/github/portrait.webp" alt="The preceding approved scene in a 390 by 844 portrait browser viewport" width="42%">
</p>

This historical portrait gallery uses browser-emulated touch and viewport geometry. Physical phone performance and touch review remain pending.

</details>

## Controls

| Action | Input |
|:---|:---|
| Begin | Native Play / click to continue, after automatic silent loading |
| Turn and tilt | Move the pointer; drag one primary finger; focus the scene and use arrows or WASD |
| Accelerate | Hold the left pointer button or primary touch on the scene |
| Pause / resume | Inside Settings, or Space while the scene is focused |
| Adjust playback and rendering | Settings: volume, mute, brightness and reduced motion |
| Close a pane | Close or Escape |

Settings is the only visible top-level control during the song. Opening it keeps the music running. Owned portfolio GPU glass samples one clean scene frame for all native button surfaces; quiet original mallet notes share the transport master and respect mute/volume. The native pointer remains visible. Playback interruptions and graphics recovery retain the presentation position; duplicate activation is guarded. Failed loads can be retried, and interrupted entry returns to the invitation.

## Run locally

Requires Node.js 22 and npm. Use the supplied lockfile and exact audio file.

```sh
npm ci
npm run build
npm run preview -- --port 4175 --strictPort
```

Open **http://127.0.0.1:4175/**. For development, run `npm run dev`. The configured server binds to loopback.

The bundled MP3 is unchanged: `public/audio/around-the-world.mp3`. Its browser-decoded duration is 219.66579 seconds. One audio source and `AudioTransport.presentation` own musical time, including pause, recovery and the full ending.

```text
SHA-256: 47119d6e77b41e51ef65fb2fc7fa46a2c3f7a75578a650f394b5df78137861a0
```

## Architecture

| Area | Source | Responsibility |
|:---|:---|:---|
| Application | [`src/main.ts`](src/main.ts), [`src/input.ts`](src/input.ts) | Transport actions, input lifecycle, preferences and recovery |
| Audio | [`src/audio/transport.ts`](src/audio/transport.ts), [`core`](core) | Audio graph, sample-zero playback and presentation time |
| Flight | [`src/scene/flight.ts`](src/scene/flight.ts) | Sole route/camera owner, steering and snapshots |
| Rendering | [`src/scene/world.ts`](src/scene/world.ts), [`src/scene/field.ts`](src/scene/field.ts) | Terrain, mounted bulbs, floor lighting, stars and depth |
| Score | [`analysis`](analysis), [`show`](show) | Hash-bound measurements, events and current as-built records |
| Provenance | [`assets`](assets), [`sources`](sources) | Notices, source studies and recoverable retired work |
| Review | [`tools`](tools), [`evidence/black-sky-wave-colour`](evidence/black-sky-wave-colour) | Runtime checks, captures, audio comparisons and archive verification |

The current scene is dance-floor-only. Mountains, folded fins, floating actors, ribbons and beams have no live construction, update, reset or recovery paths, and no models ship in the production build. Their originals remain under [`sources/retired-stage-scenery-65787fd`](sources/retired-stage-scenery-65787fd) and the local recovery branch. The existing BUMER.EXE source paths and history remain intact. Historical modules and scores are retained records; [`show/CURRENT_AUTHORITY.md`](show/CURRENT_AUTHORITY.md) identifies the active implementation.

## Verification

```sh
npm test
npm run validate
npm run validate:review
npm run test:browser
```

Set `BUMER_CHROME` to an installed compatible Chromium executable for browser checks. The historical checkout and developer API names stay intact.

Current technical evidence and exact checks are listed in the [black-sky/wave-colour review](evidence/black-sky-wave-colour/REVIEW.md). It includes executable CPU/GPU shader comparisons, real OFF emission/spill checks, event-birth/triangle/route regressions, lifecycle/input checks and new full-page desktop/portrait captures with the actual stereo master through the settled thank-you finish. The current score is an authored candidate, not newly approved lyric/downbeat analysis.

The preceding review used slow software WebGL. This continuation has a separate native NVIDIA baseline/candidate foreground benchmark and records the actual backend for every new capture; no old performance or recording is relabelled. Human continuous visual/listening approval, physical devices and audiovisual alignment remain separate from those technical checks.

## Credits

- Project and art direction: **Mani Marami Milani / Denoax**.
- Rendering and interaction studies: [HelloEnjoy Lights](https://helloenjoy.itch.io/lights) and [Fantasynth](https://live.fantasynth.com/), adapted in original Three.js/GLSL. Inspection limits remain in the source records.
- Portfolio-derived controls, original GPU glass sources and Instrument Sans: [source notices and attribution](assets/ATTRIBUTION.md).
- Music: the exact user-supplied *Around the World (La La La La La)* recording; [asset manifest](assets/manifest.json). Bundling does not grant additional music redistribution rights.
- Current repository presentation: real Visual Music browser captures, following the wide banner, centered introduction and screenshot-led structure of [Mani's portfolio](https://github.com/Denoax/portfolio) and [Kona Desktop](https://github.com/Denoax/konata-hyprland-dotfiles). [Showcase source record](showcase/github/README.md).

Retired asset credits remain preserved. No model-generated visual media are used. Apply `$reference-led-design` to visual continuations and preserve the current approval boundary. The source repository stays private. [Play the public GitHub Pages website](https://denoax.github.io/visual-music/); [deployment instructions](PAGES.md). The public deployment repository contains only the exact built website and credits.


## Previous slow-entry and finite-finish review

Previous authority: [as-built record](show/slow-entry-finish.as-built.json) and
[evidence/review scope](evidence/slow-entry-finish/REVIEW.md). The current review
records complete desktop/portrait full-page journeys with their real stereo
master, including the Continue chime, full recording, black fade and thank you.
The README GIF/gallery retain the earlier floor-only review footage; they do
not demonstrate the updated entry, travel speed or finish.

The latest user request authorizes a source push only. The existing public
Pages deployment is deliberately unchanged in this review. Human continuous
visual/listening approval, physical devices/AV and hardware foreground
performance remain separate from build, software-browser and digital-audio checks.

## Black-sky and wave-colour continuation

Current authority: [source-derived as-built](show/black-sky-wave-colour.as-built.json), [source record](sources/black-sky-wave-colour-source-record.md) and [executor evidence/limits](evidence/black-sky-wave-colour/REVIEW.md). Base flight/camera, exact audio, loading/glass/notes and finite finish are preserved. Only mouse1 attack changes from1.25s to.45s; its cap remains1.2x and release.85s. All geometry and lighting use the same event-birth formations; no scenery or generated assets are added. Gallery/banner footage remains historical. The public Pages deployment remains the preceding release; this is a source-only push.

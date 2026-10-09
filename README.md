# BUMER.EXE — Lights

A full-screen luminous landscape for the supplied **Серёга — Чёрный бумер** recording. The song is bundled and verified before Play becomes available. One gesture starts a 244.3-second journey through terrain contours, growing drops and a released canopy. Move to look around; tap a sculpture to release a local particle burst.

```sh
npm ci
npm run dev
npm run build
npm run preview -- --port 4175
npm test
npm run test:browser
npm run validate
```

The prepared local preview runs as a transient user service named `bumer-exe-preview` at http://127.0.0.1:4175/. Stop it with `systemctl --user stop bumer-exe-preview`.

Use Node 22.23+ or a compatible Node 24 release. Play/Pause, seek, volume, mute, replay and fullscreen are accessible with mouse, touch and keyboard. Space pauses, M mutes, F enters fullscreen and arrow keys seek. Settings include a lighter field and a stable gentle-motion composition; the operating-system reduced-motion preference selects the latter automatically.

`src/audio/transport.ts` owns the decoded buffer, single active source and output-timestamp clock. `show/score.json` owns flexible regions, selected events, camera knots and appearance curves, bound to the recording hash. `src/show/choreography.ts` evaluates major state from absolute song time. Small surface detail samples `public/data/features.json`; this is measured band control data, not isolated instruments. Geometry and shaders are original code.

## Review status

The site is implemented through the recording’s actual end. **The score is still a candidate:** this coding session cannot receive audio input and has not listened to the song. Software timing and recorded playback do not replace listening approval, subjective visual approval or physical speaker/display measurements. See [the review record](evidence/lights-v2/REVIEW.md) for actual evidence and limits.

Developer controls appear only with `?dev=1`. `?dev=1&t=211` opens a paused canopy frame. The [listening utility](review/listening.html) is included in both development and the local production build; its exports remain drafts. Run `npm run validate:review` to inspect unresolved review gates. A candidate is allowed in local review, never silently promoted.

The repo is **private**. The supplied MP3 is authorised for this local/private project; public redistribution permission has not been established. There is no public deployment in this rebuild.

The courtyard version at `43cb2b6` is rejected historical work. Its source/assets remain recoverable in Git and its evidence is under `evidence/v1-rejected/`. The active brief is [ASSETFILE.md](ASSETFILE.md). The manimarami.com project is outside this repository.

# BUMER.EXE

A standalone Three.js courtyard that unfolds into a neighbourhood rave. Original sedan, light rig, air freshener and an oversized speaker sculpture on a shopping trolley.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. **Explore without audio** runs a 130-second silent scene study, with pause, seek, replay and distinct portrait cameras. This duration is demonstration timing, not a claim about the song. A paused composition can be linked as `?study=35`.

**Load recording & start** reads a local audio file entirely on the device. No song is included or uploaded. Transport uses one decoded Web Audio buffer, output timestamp sampling and generation-protected source replacement. Playback without reviewed cues holds the ignition composition.

The intended recording is Seryoga — Чёрный бумер, Spotify ID `0iVj13fDCDRM7rfYEGF50X`. The supplied pack did not contain it. Exact identity, cue timing, full-song listening and measured sync remain blocked. This implementation is not an approved song-synchronised release.

## Review the recording

1. Load the exact recording. In settings, open **Listening & cue editor**. Scrub the decoded waveform, mark section starts, beat candidates and anchor candidates, and write listening/identity notes. Export pending drafts.
2. Run `python3 tools/prepare_audio.py /path/to/recording.mp3 --output-dir analysis` using the same encoded bytes. It requires FFmpeg, ffprobe and NumPy. Its onset candidates are measurement aids.
3. Review all section boundaries, mark absent sections explicitly, describe and review at least twelve audiovisual anchors, and finish the track/cue records. Use the schema in `manifests/*.template.json` and `VALIDATION.md`. Exports never mark themselves verified.
4. Create the browser import: `python3 tools/combine_review.py track.json cues.json --output reviewed-show.json`. Load it through settings. Runtime checks recording identity review, exact SHA-256, decoder duration/sample rate, complete section coverage and reviewed markers/anchors.
5. Measure software and physical sync separately. The scene samples the audio clock; this does not itself establish presentation or acoustic alignment. Record real evidence in `evidence/REVIEW.md`.

```sh
npm test
npm run build
npx playwright install chromium ffmpeg
npm run test:browser
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/validate_pack.py --root . --mode scaffold
```

Browser tests can use an installed Chromium via `BUMER_CHROME=/path/to/chrome`. They use a synthetic tone fixture and do not establish song identity or sync. `node tools/capture-study.mjs --video` saves browser frames and a full silent-study capture while a dev server runs.

`npm run preview` serves the production build. Vite uses a relative base; assets work at a repository subpath. No hosting deployment is configured.

Runtime source/asset records: `manifests/runtime-assets.json` and `evidence/SOURCES.md`. Render evidence and limitations: `evidence/REVIEW.md`. The original handoff manifests remain unchanged; release validation intentionally fails while the audio and cue inputs remain unresolved.

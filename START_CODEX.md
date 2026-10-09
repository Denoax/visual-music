# Start Codex

Paste the following into Codex in the extracted pack or new project workspace:

> Read and apply **$reference-led-design**, then read `AGENTS.md` and `ASSETFILE.md` in full. Implement **BUMER.EXE** as a complete new standalone website: a black executive sedan in a courtyard that becomes an impossible song-driven rave. Use the working title and art direction in the assetfile; retain the funny air-freshener motif and one reserved final physical gag. Preserve the accepted portfolio project.
>
> Search existing owned code/assets before creating replacements. Inspect the linked original visual references and acquire suitable documented assets. The source register distinguishes verified source pages from assets that have not been downloaded or visually inspected. Do not generate visual media, treat a proxy as final or substitute reference footage for the website.
>
> The intended song is Seryoga — Чёрный бумер, Spotify ID `0iVj13fDCDRM7rfYEGF50X`. Locate the exact user-supplied recording in authorised project/local inputs, hash and analyse it, then listen and review all cue boundaries. Times are deliberately unresolved in this pack. Never invent seconds or silently use a remix. Use one Web Audio transport and bind every cue to the actual runtime audio hash. The tested helper supplies clock arithmetic, not a complete transport. Implement and verify its browser/source lifecycle.
>
> Work autonomously through the full implementation, visual iteration, portrait composition, pause/seek/replay tests and measured audio/visual sync. If audio is missing, continue independent scene/transport work, implement client-side loading for the matching recording, and state the exact-track verification gap. Do not declare a silent preview complete. If a model fails inspection, source or author a cohesive refined alternative instead of shipping a block car with effects.
>
> Follow the assetfile's scene, rendering, interaction, quality and evidence requirements. Target a running production preview and source/evidence package. Separate technical checks, visual review, real-device performance, software sync and physical output limitations. Do not stop at a scaffold, plan or first scene, and do not ask me to reconfirm routine implementation choices.

## Package commands

Run from the extracted package root:

```bash
node --test core/audio-time.test.mjs
python3 -m unittest discover -s tools -p 'test_*.py' -v
python3 tools/validate_pack.py --root . --mode scaffold
python3 tools/prepare_audio.py /absolute/path/to/the-matching-song.mp3 --output-dir analysis
```

The preparation command requires `ffmpeg`, `ffprobe` and NumPy; the validator and timing tests use standard Python/Node runtimes. The audio helper does not infer song identity, approve detected beats or grant distribution rights. Use its waveform/candidate data to perform the actual listening/review.

After implementing and completing the manifests, run the release validator with `--mode release`, `--track`, `--cues` and `--assets` pointing to the actual project's completed files. See `core/README.md`. Expected failure of the untouched release templates is intentional.


# Timing helper and verification tools

`audio-time.mjs` is original portable arithmetic for mapping audio graph/output timestamps to song time, selecting a half-open section and evaluating marker pulses. It does not create an AudioContext, decode audio, check hash identity, manage source lifecycle, implement a renderer or prove acoustic/display synchronisation. Integrate those layers as specified in the assetfile.

The pure API is importable in a Vite/TypeScript project. Add a typed adapter or declaration file matching the actual application; do not assume per-frame React state is needed. Node's test runner exercises scheduling, output-latency mapping, pause sampling, offsets, seek reconstruction, bounds, marker envelopes and invalid inputs.

All test positions/durations are synthetic fixtures. None establish the requested song's duration, timestamps or observed playback sync.

## Audio preparation

```bash
python3 tools/prepare_audio.py /absolute/path/song.mp3 --output-dir analysis
```

The helper reads the original file, computes SHA-256, probes it, decodes a fixed 48 kHz mono analysis stream, and writes measured metadata, 10 ms waveform samples and spectral/onset candidate curves. It never copies the music into `public/`, changes the runtime file or automatically marks a beat/chorus as reviewed. Output identity remains pending. The decoded analysis duration is not the browser-decoded duration; record the latter during runtime integration.

For local-file mode, `runtime_audio_path` can remain null in the completed manifest; the browser verifies the user's loaded bytes against the reviewed `runtime_sha256`. For bundled-audio mode, record and validate the actual runtime path and documented distribution basis. Do not expose private source paths in public metadata.

## Validator

```bash
python3 tools/validate_pack.py --root . --mode scaffold
python3 tools/validate_pack.py --root /absolute/path/to/project --mode release \
  --track path/to/track.json --cues path/to/cues.json --assets path/to/assets.json
```

Paths supplied by these options are relative to `--root`. Scaffold mode checks the handoff templates/data structure and preserves unresolved fields. Release mode requires reviewed audio identity and browser duration, matching cue hash, resolved non-overlapping major sections, reviewed marker arrays, local runtime asset hashes and completed license/inspection records. Candidate-only and reference-only resources cannot satisfy required runtime assets.

The validator checks consistency of supplied records, not the truth of their assertions. It cannot determine visual quality, authorship, licensing permission, missed musical phrases, device performance or physical audiovisual alignment. Use actual evidence and the full review contract.


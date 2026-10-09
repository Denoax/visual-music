# Handoff validation — 2026-10-09

This is an implementation handoff, not a built or visually approved website. All numerical test fixtures are synthetic. The actual requested recording was not decoded or listened to in this session.

| Check | Observed result | What it establishes |
| --- | --- | --- |
| `node --test core/audio-time.test.mjs` | 11 passed, 0 failed | Pure clock arithmetic, scheduling hold, output timestamp/fallback selection, positive lead, frozen pause, offset/seek/replay sampling, non-accumulated time, half-open section selection, pulses and invalid input rejection. |
| `python3 -m unittest discover -s tools -p 'test_*.py' -v` | 10 passed, 0 failed | Record consistency and rejection of wrong cue hash, unresolved identity/times, gaps/overlaps, malformed marker/asset fields, unsorted/out-of-range markers, changed asset bytes, escaping paths and undocumented bundled audio. |
| `python3 tools/validate_pack.py --root . --mode scaffold` | Passed | Included templates and acquisition register have the expected handoff structure. |
| Same validator with `--mode release` | Failed as expected | Untouched templates cannot pass as acquired, reviewed, exact-song production records. |
| `prepare_audio.py` on a temporary 2.25-second mono test tone | Passed; 108,000 decoded samples, 225 waveform rows, 225 feature rows; input hash matched | Hashing, probing, measured curves and metadata output function on the synthetic fixture. Identity stayed pending; browser duration stayed null; audio was not copied to the output directory. |

Test environment: Node v24.19.0; Python 3.12.14; NumPy 2.3.5; FFmpeg 6.1.1-3ubuntu5. These are the verification environment, not mandated production versions.

No song recording, synthetic test audio, downloaded model, texture, font binary or rendered website is included. `manifests/assets.json` records acquisition candidates and original-code roles. It is not an inventory of acquired source bytes.

Still to establish during website implementation: exact recording identity and hash; browser decode; reviewed cue times; real scene rendering; asset/license evidence for the chosen runtime files; uninterrupted listening and browser capture; measured presentation sync; portrait interaction and real-device performance. See `ASSETFILE.md` for the complete delivery contract.

`PACKAGE_MANIFEST.json` inventories and hashes every other payload file. It deliberately excludes itself to avoid a self-referential hash. The final ZIP is checked for CRC errors and inventory/byte consistency before delivery. This verifies package integrity only.

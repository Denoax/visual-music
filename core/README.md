# Audio clock arithmetic

`audio-time.mjs` maps an anchored source offset and context start time into recording seconds. `visualSongTime` uses a fresh, plausible `AudioContext.getOutputTimestamp()` when available, otherwise reports `fallback_graph`. Positive calibration offsets advance visual sampling. Latency fields are not added a second time.

The browser lifecycle is in `src/audio/transport.ts`; the recording-bound score is in `show/score.json`. Pure tests use synthetic coordinates and establish arithmetic contracts, not acoustic synchronisation or listened musical boundaries. `sectionAt` and `markerPulse` remain general helpers covered by those tests; the new show uses flexible regions and deterministic event envelopes.

`npm run validate` checks the current recording, analysis and score structure. `npm run validate:review` reports pending review gates. The original v1 validator and templates are preserved only under rejected historical evidence.

# Audio clock arithmetic

`audio-time.mjs` maps the anchored source offset/context start to recording seconds. `visualSongTime` uses a fresh output timestamp estimate or explicitly reports graph fallback. Calibration offset stays zero; latency is not added twice. Browser lifecycle belongs to `src/audio/transport.ts`; the wave score and event reconstruction belong to `src/show/waves.ts` and `show/`.

Pure synthetic-coordinate checks prove arithmetic contracts. Digital comparisons, build success and saved screenshots supply no human listening or physical AV alignment approval. The generic section/pulse helpers remain available and tested; the active scene uses its own continuously sampled cue/event model.

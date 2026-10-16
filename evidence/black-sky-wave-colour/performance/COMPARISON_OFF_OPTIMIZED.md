# Same-boot comparison including exact-zero OFF optimization

The adverse unoptimized candidate is retained alongside the approved baseline and optimized candidate. All variants use the same harness, same boot/backend and production quality; the optimization skips only fragments whose gated emission is exactly zero.

Every variant contains24 native foreground records: desktop1280×720 and portrait390×844, DPR1,30/84/112/184s,2s warmup +4s measurement, three repetitions, neutral input and no recorder. All records were focused/visible with advancing playback, actual GPU queries and zero runtime/ownership errors.

Same native monitor: DP-4, monitor ID1, 240.299Hz, scale1. Browser: 153.0.8010.12. The partial monitor2/60Hz run remains in `monitor-mismatch/` and is excluded.

Times are milliseconds. GPU values are genuine asynchronous non-disjoint elapsed queries. RAF values are wall-clock cadence.

| Viewport | Variant | RAF median / p95 / max | RAF >50ms | GPU median / p95 / max |
|---|---|---:|---:|---:|
| desktop | baseline-post-reboot | 4.200 / 8.400 / 45.800 | 0 | 1.927 / 2.548 / 4.658 |
| desktop | candidate-post-reboot | 4.200 / 4.300 / 29.200 | 0 | 3.180 / 3.847 / 9.801 |
| desktop | candidate-off-optimized | 4.200 / 4.300 / 24.900 | 0 | 2.960 / 3.617 / 4.968 |
| portrait | baseline-post-reboot | 4.200 / 12.400 / 33.200 | 0 | 0.970 / 1.707 / 3.023 |
| portrait | candidate-post-reboot | 4.200 / 12.400 / 37.500 | 0 | 1.550 / 2.218 / 4.396 |
| portrait | candidate-off-optimized | 4.200 / 12.400 / 37.500 | 0 | 1.533 / 2.264 / 3.566 |

| Viewport | Anchor | Baseline GPU replicate medians | Unoptimized GPU replicate medians | Optimized GPU replicate medians | Optimized vs baseline | Optimized vs unoptimized |
|---|---:|---:|---:|---:|---:|---:|
| desktop | 30s | 1.875 / 1.954 / 1.903 | 3.050 / 3.032 / 3.014 | 3.112 / 3.090 / 3.103 | +63.1% | +2.3% |
| desktop | 84s | 1.948 / 1.877 / 1.999 | 3.394 / 3.418 / 3.163 | 2.915 / 2.835 / 2.909 | +49.4% | -14.3% |
| desktop | 112s | 1.995 / 1.854 / 1.962 | 3.406 / 3.376 / 3.364 | 2.978 / 2.991 / 3.001 | +52.5% | -11.4% |
| desktop | 184s | 2.003 / 1.881 / 1.883 | 3.139 / 3.185 / 3.077 | 2.859 / 2.859 / 2.869 | +51.8% | -8.9% |
| portrait | 30s | 0.808 / 0.834 / 0.783 | 1.167 / 1.318 / 1.158 | 1.124 / 1.060 / 1.061 | +31.3% | -9.1% |
| portrait | 84s | 0.989 / 0.987 / 0.983 | 1.637 / 1.718 / 1.644 | 1.622 / 1.677 / 1.607 | +64.3% | -1.3% |
| portrait | 112s | 0.968 / 0.977 / 0.982 | 1.625 / 1.669 / 1.648 | 1.582 / 1.611 / 1.578 | +61.9% | -4.0% |
| portrait | 184s | 0.957 / 0.966 / 0.968 | 1.574 / 1.567 / 1.597 | 1.532 / 1.631 / 1.546 | +60.1% | -1.8% |

The workstation remains shared; unrelated applications/services were not stopped or modified. Resource snapshots, all raw arrays, source hashes and adverse outcomes are retained. Sequential shared-load measurements do not establish isolated causality. No human visual/listening, physical AV or mobile-device approval follows from these numbers.

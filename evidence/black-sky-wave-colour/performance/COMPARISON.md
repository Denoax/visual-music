# Native baseline/candidate comparison

The following pair was rerun after the host reboot; pre-reboot files remain historical and were not mixed into the comparison.

Renderer: ANGLE (NVIDIA Corporation, NVIDIA GeForce RTX 4070/PCIe/SSE2, OpenGL 4.5.0). Browser: 153.0.8010.12. Boot ID: `360ffb3d-8595-4c42-acaf-a0d4b92a4791`.

Desktop1280×720 and portrait390×844, DPR1; neutral input;30/84/112/184s;2s warmup +4s measurement; three repeats per section; unchanged production defaults and no recorder. Native owned-window focus was reasserted/sampled every250ms. All24 records per variant were visible/focused, ownership checks passed and runtime errors were zero.

Times are milliseconds. GPU columns are genuine asynchronous non-disjoint elapsed queries; RAF values are wall-clock cadence.

| Viewport | Variant | RAF median / p95 / max | RAF >50ms | GPU median / p95 / max |
|---|---|---:|---:|---:|
| desktop | baseline | 4.200 / 8.400 / 45.800 | 0 | 1.927 / 2.548 / 4.658 |
| desktop | candidate | 4.200 / 4.300 / 29.200 | 0 | 3.180 / 3.847 / 9.801 |
| portrait | baseline | 4.200 / 12.400 / 33.200 | 0 | 0.970 / 1.707 / 3.023 |
| portrait | candidate | 4.200 / 12.400 / 37.500 | 0 | 1.550 / 2.218 / 4.396 |

| Viewport | Anchor | Baseline replicate GPU medians | Candidate replicate GPU medians | Median-of-medians change |
|---|---:|---:|---:|---:|
| desktop | 30s | 1.875 / 1.954 / 1.903 | 3.050 / 3.032 / 3.014 | +59.4% |
| desktop | 84s | 1.948 / 1.877 / 1.999 | 3.394 / 3.418 / 3.163 | +74.2% |
| desktop | 112s | 1.995 / 1.854 / 1.962 | 3.406 / 3.376 / 3.364 | +72.1% |
| desktop | 184s | 2.003 / 1.881 / 1.883 | 3.139 / 3.185 / 3.077 | +66.7% |
| portrait | 30s | 0.808 / 0.834 / 0.783 | 1.167 / 1.318 / 1.158 | +44.5% |
| portrait | 84s | 0.989 / 0.987 / 0.983 | 1.637 / 1.718 / 1.644 | +66.5% |
| portrait | 112s | 0.968 / 0.977 / 0.982 | 1.625 / 1.669 / 1.648 | +68.7% |
| portrait | 184s | 0.957 / 0.966 / 0.968 | 1.574 / 1.567 / 1.597 | +63.0% |

All raw per-frame/per-query arrays, foreground samples, source script hashes and resource snapshots remain in the JSON. The shared GPU workload was not isolated and measurements are sequential rather than randomized; percentages describe this observed comparison and do not establish isolated causality. No subjective smoothness/listening or physical-device/AV approval follows from these results.

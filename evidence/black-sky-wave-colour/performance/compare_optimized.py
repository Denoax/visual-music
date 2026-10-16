"""Compare same-boot baseline, retained adverse candidate, and exact-zero-OFF optimization."""
from pathlib import Path
import hashlib
import json
import statistics

root = Path(__file__).resolve().parent
labels = ['baseline-post-reboot', 'candidate-post-reboot', 'candidate-off-optimized']
runs = {label: json.loads((root / f'{label}.json').read_text()) for label in labels}
baseline = runs[labels[0]]
monitor = next(item for item in json.loads((root / 'monitor-reference.json').read_text())['monitors'] if item['id'] == 1)
for data in runs.values():
    assert data['status'] == 'COMPLETED'
    assert data['host']['bootId'] == baseline['host']['bootId']
    assert data['conditions'] == baseline['conditions']
    assert data['chromiumVersion'] == baseline['chromiumVersion']
    assert data['probes'] == baseline['probes']
    assert len(data['records']) == 24 and not data['errors']
    for record in data['records']:
        assert record['visibility'] == 'visible' and record['focused']
        assert all(sample.get('ownedActive') is True for sample in record['foreground'])
        assert record['foregroundBefore']['monitor'] == 1
        assert all(sample['monitor'] == 1 for sample in record['foreground'])
        assert record['world']['gpuTimerAvailable']
        assert record['state'] == 'playing' and record['anchor'] + 5 <= record['position'] <= record['anchor'] + 8
        assert record['gpu'] and record['intervals']
        assert record['decode']['hash'] == baseline['records'][0]['decode']['hash']

def stats(values):
    values = sorted(values)
    return {'samples': len(values), 'median': values[int((len(values) - 1) * .5)], 'p95': values[int((len(values) - 1) * .95)], 'max': max(values), 'over50Ms': sum(value > 50 for value in values)}

def describe(records):
    return {'rafMs': stats([value for record in records for value in record['intervals']]), 'gpuElapsedMs': stats([value for record in records for value in record['gpu']]), 'replicateGpuMediansMs': [record['gpuElapsedSummary']['median'] for record in records], 'recordCount': len(records)}

result = {'status': 'MEASURED_WITH_LIMITS', 'optimization': 'Exact-zero OFF fragment early-out; parity audits independently validate unchanged visible output/quality.', 'harnessSha256': hashlib.sha256((root.parents[2] / 'tools/benchmark-wave-colour.mjs').read_bytes()).hexdigest(), 'bootId': baseline['host']['bootId'], 'monitor': monitor, 'chromiumVersion': baseline['chromiumVersion'], 'renderer': baseline['probes'][0], 'conditions': baseline['conditions'], 'runs': {label: {'rawFile': f'{label}.json', 'sha256': hashlib.sha256((root / f'{label}.json').read_bytes()).hexdigest(), 'runtime': data['runtime'], 'nativeBefore': data['nativeBefore'], 'nativeAfter': data['nativeAfter']} for label, data in runs.items()}, 'runtimeErrors': [], 'focusFailures': 0, 'limits': ['Same boot/backend/settings and no recorder; independent shared GPU activity remains uncontrolled.', 'Sequential rather than randomized runs; relative costs are observations, not isolated causality.', 'RAF cadence is wall-clock, not GPU timing or physical-display proof.', 'Actual elapsed GPU queries are asynchronous accepted non-disjoint samples.', 'Native owned-window focus was sampled/reasserted every250ms, not continuously observed.', 'All adverse unoptimized/pre-reboot runs remain retained; pre-reboot results are excluded.', 'No subjective listening/motion, physical AV or mobile-device approval.'], 'viewports': {}}
for portrait in [False, True]:
    name = 'portrait' if portrait else 'desktop'
    records = {label: [record for record in data['records'] if record['portrait'] == portrait] for label, data in runs.items()}
    sections = {}
    for anchor in baseline['conditions']['anchors']:
        rows = {label: describe([record for record in group if record['anchor'] == anchor]) for label, group in records.items()}
        median = {label: statistics.median(row['replicateGpuMediansMs']) for label, row in rows.items()}
        sections[str(anchor)] = {'runs': rows, 'optimizedVsBaselineGpuPercent': (median[labels[2]] / median[labels[0]] - 1) * 100, 'optimizedVsUnoptimizedGpuPercent': (median[labels[2]] / median[labels[1]] - 1) * 100}
    result['viewports'][name] = {'runs': {label: describe(group) for label, group in records.items()}, 'sections': sections}
(root / 'comparison-off-optimized.json').write_text(json.dumps(result, indent=2) + '\n')
lines = ['# Same-boot comparison including exact-zero OFF optimization', '', 'The adverse unoptimized candidate is retained alongside the approved baseline and optimized candidate. All variants use the same harness, same boot/backend and production quality; the optimization skips only fragments whose gated emission is exactly zero.', '', 'Every variant contains24 native foreground records: desktop1280×720 and portrait390×844, DPR1,30/84/112/184s,2s warmup +4s measurement, three repetitions, neutral input and no recorder. All records were focused/visible with advancing playback, actual GPU queries and zero runtime/ownership errors.', '', f"Same native monitor: {monitor['name']}, monitor ID1, {monitor['refreshRate']}Hz, scale{monitor['scale']}. Browser: {baseline['chromiumVersion']}. The partial monitor2/60Hz run remains in `monitor-mismatch/` and is excluded.", '', 'Times are milliseconds. GPU values are genuine asynchronous non-disjoint elapsed queries. RAF values are wall-clock cadence.', '', '| Viewport | Variant | RAF median / p95 / max | RAF >50ms | GPU median / p95 / max |', '|---|---|---:|---:|---:|']
for name, data in result['viewports'].items():
    for label, row in data['runs'].items():
        raf, gpu = row['rafMs'], row['gpuElapsedMs']
        lines.append(f"| {name} | {label} | {raf['median']:.3f} / {raf['p95']:.3f} / {raf['max']:.3f} | {raf['over50Ms']} | {gpu['median']:.3f} / {gpu['p95']:.3f} / {gpu['max']:.3f} |")
lines += ['', '| Viewport | Anchor | Baseline GPU replicate medians | Unoptimized GPU replicate medians | Optimized GPU replicate medians | Optimized vs baseline | Optimized vs unoptimized |', '|---|---:|---:|---:|---:|---:|---:|']
for name, data in result['viewports'].items():
    for anchor, section in data['sections'].items():
        rows = [' / '.join(f'{value:.3f}' for value in section['runs'][label]['replicateGpuMediansMs']) for label in labels]
        lines.append(f"| {name} | {anchor}s | {' | '.join(rows)} | {section['optimizedVsBaselineGpuPercent']:+.1f}% | {section['optimizedVsUnoptimizedGpuPercent']:+.1f}% |")
lines += ['', 'The workstation remains shared; unrelated applications/services were not stopped or modified. Resource snapshots, all raw arrays, source hashes and adverse outcomes are retained. Sequential shared-load measurements do not establish isolated causality. No human visual/listening, physical AV or mobile-device approval follows from these numbers.', '']
(root / 'COMPARISON_OFF_OPTIMIZED.md').write_text('\n'.join(lines))
print(json.dumps(result['viewports'], indent=2))

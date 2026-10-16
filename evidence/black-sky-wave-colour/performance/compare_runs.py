"""Summarize the same-boot native pair without discarding adverse samples."""
from pathlib import Path
import hashlib
import json
import statistics

root = Path(__file__).resolve().parent
baseline = json.loads((root / 'baseline-post-reboot.json').read_text())
candidate = json.loads((root / 'candidate-post-reboot.json').read_text())
assert baseline['status'] == candidate['status'] == 'COMPLETED'
assert baseline['host']['bootId'] == candidate['host']['bootId']
assert baseline['conditions'] == candidate['conditions']
assert baseline['chromiumVersion'] == candidate['chromiumVersion']
assert baseline['probes'] == candidate['probes']
assert len(baseline['records']) == len(candidate['records']) == 24
assert not baseline['errors'] and not candidate['errors']
assert all(r['visibility'] == 'visible' and r['focused'] for d in [baseline, candidate] for r in d['records'])
assert all(s.get('ownedActive') is True for d in [baseline, candidate] for r in d['records'] for s in r['foreground'])
assert all(r['world']['gpuTimerAvailable'] for d in [baseline, candidate] for r in d['records'])
assert all(r['state'] == 'playing' and r['anchor'] + 5 <= r['position'] <= r['anchor'] + 8 for d in [baseline, candidate] for r in d['records'])
assert all(len(r['gpu']) > 0 and len(r['intervals']) > 0 for d in [baseline, candidate] for r in d['records'])
assert all(r['decode']['hash'] == baseline['records'][0]['decode']['hash'] for d in [baseline, candidate] for r in d['records'])

def stats(values):
    values = sorted(values)
    if not values:
        return {'samples': 0, 'median': None, 'p95': None, 'max': None, 'over50Ms': 0}
    return {'samples': len(values), 'median': values[int((len(values) - 1) * .5)], 'p95': values[int((len(values) - 1) * .95)], 'max': max(values), 'over50Ms': sum(v > 50 for v in values)}

def describe(records):
    return {'rafMs': stats([v for r in records for v in r['intervals']]), 'gpuElapsedMs': stats([v for r in records for v in r['gpu']]), 'replicateGpuMediansMs': [r['gpuElapsedSummary']['median'] for r in records], 'recordCount': len(records)}

result = {'status': 'MEASURED_WITH_LIMITS', 'method': 'Same-boot native foreground, unchanged production quality, neutral input, 2s warmup +4s per section, 3repeats, no recording', 'harnessSha256': hashlib.sha256((root.parents[2] / 'tools/benchmark-wave-colour.mjs').read_bytes()).hexdigest(), 'bootId': baseline['host']['bootId'], 'browser': baseline['chromiumVersion'], 'renderer': baseline['probes'][0], 'conditions': baseline['conditions'], 'sourceRuntime': {'baseline': baseline['runtime'], 'candidate': candidate['runtime']}, 'rawFiles': {label: {'path': f'{label}-post-reboot.json', 'sha256': hashlib.sha256((root / f'{label}-post-reboot.json').read_bytes()).hexdigest()} for label in ['baseline', 'candidate']}, 'resources': {label: {'before': data['nativeBefore'], 'after': data['nativeAfter']} for label, data in [('baseline', baseline), ('candidate', candidate)]}, 'focusFailures': 0, 'runtimeErrors': [], 'limits': ['Shared workstation GPU load is not isolated; unrelated apps/services were left running.', 'Foreground ownership was reasserted and sampled every250ms; not continuous observation between samples.', 'RAF cadence is not a GPU timing or physical presentation guarantee.', 'GPU samples are asynchronous non-disjoint elapsed query results, not one result per RAF.', 'Measurements do not establish human motion/listening, physical AV, mobile-device or subjective approval.', 'Earlier baseline-native/probe files are pre-reboot history and are excluded from this comparison.'], 'viewports': {}}
for portrait in [False, True]:
    name = 'portrait' if portrait else 'desktop'
    left = [r for r in baseline['records'] if r['portrait'] == portrait]
    right = [r for r in candidate['records'] if r['portrait'] == portrait]
    sections = {}
    for anchor in baseline['conditions']['anchors']:
        a, b = [r for r in left if r['anchor'] == anchor], [r for r in right if r['anchor'] == anchor]
        before, after = describe(a), describe(b)
        central_before, central_after = statistics.median(before['replicateGpuMediansMs']), statistics.median(after['replicateGpuMediansMs'])
        sections[str(anchor)] = {'baseline': before, 'candidate': after, 'medianOfReplicateGpuMediansPercentChange': (central_after / central_before - 1) * 100}
    result['viewports'][name] = {'baseline': describe(left), 'candidate': describe(right), 'sections': sections}
(root / 'comparison.json').write_text(json.dumps(result, indent=2) + '\n')
lines = ['# Native baseline/candidate comparison', '', 'The following pair was rerun after the host reboot; pre-reboot files remain historical and were not mixed into the comparison.', '', f"Renderer: {result['renderer']['renderer']}. Browser: {result['browser']}. Boot ID: `{result['bootId']}`.", '', 'Desktop1280×720 and portrait390×844, DPR1; neutral input;30/84/112/184s;2s warmup +4s measurement; three repeats per section; unchanged production defaults and no recorder. Native owned-window focus was reasserted/sampled every250ms. All24 records per variant were visible/focused, ownership checks passed and runtime errors were zero.', '', 'Times are milliseconds. GPU columns are genuine asynchronous non-disjoint elapsed queries; RAF values are wall-clock cadence.', '', '| Viewport | Variant | RAF median / p95 / max | RAF >50ms | GPU median / p95 / max |', '|---|---|---:|---:|---:|']
for name, data in result['viewports'].items():
    for label in ['baseline', 'candidate']:
        r,g=data[label]['rafMs'],data[label]['gpuElapsedMs']
        lines.append(f"| {name} | {label} | {r['median']:.3f} / {r['p95']:.3f} / {r['max']:.3f} | {r['over50Ms']} | {g['median']:.3f} / {g['p95']:.3f} / {g['max']:.3f} |")
lines += ['', '| Viewport | Anchor | Baseline replicate GPU medians | Candidate replicate GPU medians | Median-of-medians change |', '|---|---:|---:|---:|---:|']
for name, data in result['viewports'].items():
    for anchor, section in data['sections'].items():
        a=' / '.join(f'{x:.3f}' for x in section['baseline']['replicateGpuMediansMs'])
        b=' / '.join(f'{x:.3f}' for x in section['candidate']['replicateGpuMediansMs'])
        lines.append(f"| {name} | {anchor}s | {a} | {b} | {section['medianOfReplicateGpuMediansPercentChange']:+.1f}% |")
lines += ['', 'All raw per-frame/per-query arrays, foreground samples, source script hashes and resource snapshots remain in the JSON. The shared GPU workload was not isolated and measurements are sequential rather than randomized; percentages describe this observed comparison and do not establish isolated causality. No subjective smoothness/listening or physical-device/AV approval follows from these results.', '']
(root / 'COMPARISON.md').write_text('\n'.join(lines))
print(json.dumps(result['viewports'], indent=2))

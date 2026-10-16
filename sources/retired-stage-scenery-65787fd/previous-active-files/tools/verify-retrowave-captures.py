"""Check delivered AV, frozen implementation identities and post-song ownership."""
from pathlib import Path
import hashlib
import json
import statistics
import subprocess

root = Path(__file__).resolve().parents[1]
evidence = root / 'evidence/retrowave-beauty'

def sha(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()

def stats(values):
    values = sorted(values)
    assert values, 'Missing performance samples'
    return dict(count=len(values), median=statistics.median(values),
                p95=values[int(.95 * (len(values)-1))], max=max(values),
                above_50ms=sum(value > 50 for value in values))

rows = []
for view in ['desktop', 'portrait']:
    media = evidence / 'final-capture' / f'{view}-full.webm'
    record = json.loads(media.with_name(f'{view}-full-trace.json').read_text())
    end = record['fullEnd']
    assert not record['errors'], record['errors']
    assert len(end['sourceEvents']) == 1
    assert end['sourceEvents'][0]['offsetSeconds'] == 0
    assert abs(end['seconds'] - 219.66579166666668) < 1e-9
    assert [event['kind'] for event in end['completionEvents']] == ['graph_end', 'presented_end']
    assert end['endAge'] >= 32, 'Eight-second return plus two twelve-second periods missing'
    assert end['finalWorld']['visual']['phase'] == 'idle'
    assert end['finalWorld']['visual']['idleSeconds'] >= 24
    assert end['finalWorld']['reveal']['exit'] == 1
    assert end['finalWorld']['visual']['blend'] == 1
    for name, identity in record['implementation_hashes'].items():
        assert sha(root / name) == identity, name
    probe = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_entries',
        'format=duration:stream=codec_name,width,height,sample_rate,channels',
        '-of', 'json', str(media)]))
    assert float(probe['format']['duration']) > 252
    assert {stream['codec_name'] for stream in probe['streams']} == {'vp9', 'opus'}
    known = {}
    maximum = structural_samples = 0
    post_pose = None
    for sample in record['trace']:
        world = sample['world']
        assert not sample['audio']['muted'] and abs(sample['audio']['volume']-.7) < 1e-8
        assert sample['state'] in ['playing', 'ended']
        assert world['background'] == 'black zenith; faint world-oriented low horizon'
        assert 25 <= world['cameraLens'] <= 40
        assert world['overview'] == 0
        if world['groundVisible']:
            assert world['clearance'] > 8.8
        if sample['endAge'] is not None:
            assert abs(sample['song']-end['seconds']) < 1e-9
            assert world['visual']['phase'] in ['return', 'idle']
            pose = [world['camera'], world['cameraQuaternion'], world['cameraLens']]
            if post_pose is None:
                post_pose = pose
            assert pose == post_pose, 'Post-song route moved'
        landscape = world['landscapes']
        maximum = max(maximum, len(landscape['active']))
        assert len(landscape['active']) <= landscape['familyLimit']
        assert landscape['depthTest'] and not landscape['depthWrite']
        structural_samples += bool(landscape['active'])
        for anchor in landscape['scheduled']:
            if anchor:
                if anchor['id'] in known:
                    assert known[anchor['id']] == anchor
                known[anchor['id']] = anchor
        for item in landscape['active']:
            anchor, eye = item['anchor'], world['camera']
            gap = ((anchor['x']-eye[0])**2 + (anchor['z']-eye[2])**2)**.5-anchor['radius']
            assert gap >= 38-1e-6
    assert structural_samples > 50 and len(known) > 15
    gpu = [value for sample in record['trace'] for value in sample['gpu_recent_ms']]
    rows.append(dict(view=view, file=str(media.relative_to(root)), bytes=media.stat().st_size,
        sha256=sha(media), probe=probe, bound_files=len(record['implementation_hashes']),
        decode=end['decode'], end_age=end['endAge'], idle_seconds=end['finalWorld']['visual']['idleSeconds'],
        RAF_ms=stats(end['metrics']['intervals']), GPU_elapsed_ms=stats(gpu),
        trace_samples=len(record['trace']), landmark_ids=len(known),
        structural_trace_samples=structural_samples, maximum_family_objects=maximum,
        minimum_visible_ground_clearance=min(s['world']['clearance'] for s in record['trace'] if s['world']['groundVisible']),
        source_events=end['sourceEvents'], completion_events=end['completionEvents'],
        recording_backend=record['capture_backend'], errors=record['errors']))
report = dict(status='passed', rows=rows, scope=
    'Current source/runtime/recorder hashes; uninterrupted sample-zero full219.66579s song, destination-presented tail, eight-second return and two12s idle periods with no automatic source loop, fixed post-song pose and immutable structure anchors. Real master-output VP9/Opus media. Headless hardware captures are separate from native foreground/device evidence. RAF is not GPU time. Canvas captures exclude DOM controls. Audio-band provenance, CPU/GPU periodic geometry, OFF and depth receipts are separate. These checks do not approve semantic listening, continuous perceptual quality, physical device/AV or formal flash safety.')
(evidence / 'capture-verification.json').write_text(json.dumps(report, indent=2)+'\n')
print(json.dumps(dict(status='passed', recordings=[(r['view'],r['bytes'],r['sha256']) for r in rows]), indent=2))

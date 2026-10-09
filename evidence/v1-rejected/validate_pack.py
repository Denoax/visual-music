#!/usr/bin/env python3
"""Validate handoff data or completed runtime records; never certify aesthetics."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import re
import sys


SHA = re.compile(r'^[0-9a-f]{64}$')


def validate(root, track_path, cues_path, assets_path, release=False):
    root = Path(root).resolve()
    errors = []

    def require(condition, message):
        if not condition:
            errors.append(message)

    def number(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)

    def nonempty(value):
        return isinstance(value, str) and bool(value.strip())

    def object_field(data, key):
        value = data.get(key, {})
        require(isinstance(value, dict), f'{key}: object required')
        return value if isinstance(value, dict) else {}

    def path_inside(relative):
        if not nonempty(relative):
            return None
        path = (root / relative).resolve()
        if Path(relative).is_absolute() or not path.is_relative_to(root):
            errors.append(f'Path must remain inside project: {relative}')
            return None
        return path

    def load(relative):
        path = path_inside(relative)
        if path is None:
            return {}
        try:
            data = json.loads(path.read_text())
            require(isinstance(data, dict), f'{relative}: expected an object')
            return data if isinstance(data, dict) else {}
        except (OSError, ValueError) as error:
            errors.append(f'{relative}: {error}')
            return {}

    def check_file(relative, digest, label):
        path = path_inside(relative)
        require(path is not None and path.is_file(), f'{label}: local file is missing')
        require(isinstance(digest, str) and bool(SHA.fullmatch(digest)), f'{label}: SHA-256 is unresolved')
        if path is not None and path.is_file() and isinstance(digest, str) and SHA.fullmatch(digest):
            require(hashlib.sha256(path.read_bytes()).hexdigest() == digest, f'{label}: bytes do not match SHA-256')

    track, cues, assets = (load(path) for path in (track_path, cues_path, assets_path))
    for label, data in [('track', track), ('cues', cues), ('assets', assets)]:
        require(data.get('schema_version') == 1, f'{label}: schema_version must be 1')
    require(track.get('requested_spotify_id') == '0iVj13fDCDRM7rfYEGF50X', 'Requested Spotify recording changed')
    sections = cues.get('sections', [])
    events = cues.get('events', [])
    entries = assets.get('assets', [])
    for label, items in [('sections', sections), ('events', events), ('assets', entries)]:
        require(isinstance(items, list) and len(items) > 0, f'{label}: nonempty array required')
        if not isinstance(items, list):
            continue
        require(all(isinstance(item, dict) and nonempty(item.get('id')) for item in items), f'{label}: IDs required')
        ids = [item.get('id') for item in items if isinstance(item, dict) and nonempty(item.get('id'))]
        require(len(ids) == len(set(ids)), f'{label}: duplicate IDs')
    for item in sections if isinstance(sections, list) else []:
        if not isinstance(item, dict):
            continue
        require(item.get('resolution_status') in ['unresolved', 'reviewed', 'not_present'], f'{item.get("id")}: invalid resolution status')
        for key in ['start_seconds', 'end_seconds']:
            value = item.get(key)
            require(value is None or number(value), f'{item.get("id")}: {key} must be null or finite')

    if not release:
        return errors

    sha = track.get('runtime_sha256')
    require(isinstance(sha, str) and bool(SHA.fullmatch(sha)), 'Exact runtime audio hash is unresolved')
    source_sha = track.get('source_sha256')
    require(isinstance(source_sha, str) and bool(SHA.fullmatch(source_sha)), 'Source audio hash is unresolved')
    if source_sha != sha:
        require(nonempty(track.get('derivative_record')), 'Changed audio bytes need a derivative/review record')
    require(track.get('identity_review_status') == 'verified', 'Exact recording identity has not been reviewed')
    require(nonempty(track.get('identity_review_notes')), 'Audio identity review notes are missing')
    duration = track.get('runtime_decoded_duration_seconds')
    valid_duration = number(duration) and duration > 0
    require(valid_duration, 'Browser-decoded duration is unresolved')
    rate = track.get('runtime_sample_rate_hz')
    require(number(rate) and rate > 0, 'Browser sample rate is unresolved')
    require(nonempty(track.get('runtime_decoder_record')), 'Browser decoder evidence record is missing')
    mode = track.get('runtime_audio_mode')
    require(mode in ['user_local_file', 'bundled'], 'Unknown audio distribution mode')
    if mode == 'bundled':
        permission = object_field(track, 'distribution_permission')
        require(permission.get('status') == 'documented' and nonempty(permission.get('record')),
                'Bundled song needs a documented distribution basis')
        check_file(track.get('runtime_audio_path'), sha, 'Runtime audio')
    elif track.get('runtime_audio_path') is not None:
        check_file(track.get('runtime_audio_path'), sha, 'Local reference audio')

    require(cues.get('track_sha256') == sha, 'Cue sheet audio hash does not match runtime audio')
    require(cues.get('review_status') == 'reviewed', 'Cue review is incomplete')
    previous_end = 0.0
    active_count = 0
    for item in sections if isinstance(sections, list) else []:
        if not isinstance(item, dict):
            continue
        label = item.get('id')
        status = item.get('resolution_status')
        require(status in ['reviewed', 'not_present'], f'{label}: section unresolved')
        require(nonempty(item.get('review_notes')), f'{label}: review notes missing')
        if status == 'not_present':
            require(item.get('start_seconds') is None and item.get('end_seconds') is None, f'{label}: absent section must have null times')
            continue
        start, end = item.get('start_seconds'), item.get('end_seconds')
        valid = number(start) and number(end) and start >= 0 and end > start
        require(valid, f'{label}: unresolved or invalid times')
        if valid:
            require(abs(start - previous_end) <= 0.001, f'{label}: section coverage gap/overlap')
            if valid_duration:
                require(end <= duration + 0.001, f'{label}: past decoded end')
            previous_end = end
            active_count += 1
    require(active_count > 0, 'No reviewed major sections')
    if valid_duration:
        require(abs(previous_end - duration) <= 0.001, 'Major sections do not cover the full decoded recording')

    for item in events if isinstance(events, list) else []:
        if not isinstance(item, dict):
            continue
        label = item.get('id')
        status = item.get('resolution_status')
        require(status in ['reviewed', 'not_present'], f'{label}: event unresolved')
        require(nonempty(item.get('review_notes')), f'{label}: event review notes missing')
        if status == 'reviewed':
            when = item.get('seconds')
            require(number(when) and when >= 0 and (not valid_duration or when <= duration), f'{label}: invalid event time')
        else:
            require(item.get('seconds') is None, f'{label}: absent event must have null time')

    markers = object_field(cues, 'markers')
    require(markers.get('review_status') == 'reviewed', 'Beat/accent marker review is missing')
    require(nonempty(markers.get('review_notes')), 'Marker review notes are missing')
    for name in ['beats_seconds', 'accents_seconds']:
        values = markers.get(name)
        require(isinstance(values, list), f'{name}: array required')
        if not isinstance(values, list):
            continue
        require(all(number(x) and x >= 0 and (not valid_duration or x <= duration) for x in values), f'{name}: invalid marker')
        if all(number(x) for x in values):
            require(all(a < b for a, b in zip(values, values[1:])), f'{name}: markers must be strictly increasing')
    beats = markers.get('beats_seconds')
    require(isinstance(beats, list) and len(beats) >= 4, 'Reviewed beat markers are missing')
    anchors = cues.get('anchors', [])
    require(isinstance(anchors, list) and len(anchors) >= 12, 'At least 12 reviewed sync anchors are required')
    for item in anchors if isinstance(anchors, list) else []:
        require(isinstance(item, dict), 'Anchor must be an object')
        if not isinstance(item, dict):
            continue
        when = item.get('seconds')
        require(number(when) and when >= 0 and (not valid_duration or when <= duration), 'Anchor time is invalid')
        require(item.get('reviewed') is True and nonempty(item.get('audio_feature')) and
                nonempty(item.get('visual_event')) and nonempty(item.get('method')), 'Anchor review details are missing')
    require(nonempty(cues.get('sync_evidence_record')), 'Measured sync evidence record is missing')

    for item in entries if isinstance(entries, list) else []:
        if not isinstance(item, dict):
            continue
        if not item.get('used_in_runtime') and not item.get('runtime_required'):
            continue
        label = item.get('id')
        require(item.get('status') == 'ready', f'{label}: runtime asset has not been acquired/authored and reviewed')
        require(nonempty(item.get('inspection_record')), f'{label}: rendered asset inspection record missing')
        rights = object_field(item, 'rights')
        require(rights.get('status') == 'documented' and nonempty(rights.get('basis')) and nonempty(rights.get('record')),
                f'{label}: runtime rights/source record incomplete')
        require(item.get('kind') in ['external_asset', 'authored_code', 'owned_asset'], f'{label}: unknown runtime asset kind')
        check_file(item.get('runtime_path'), item.get('runtime_sha256'), label)
    return errors


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, required=True)
    parser.add_argument('--mode', choices=['scaffold', 'release'], default='scaffold')
    parser.add_argument('--track', default='manifests/track.template.json')
    parser.add_argument('--cues', default='manifests/cues.template.json')
    parser.add_argument('--assets', default='manifests/assets.json')
    args = parser.parse_args()
    errors = validate(args.root.resolve(), args.track, args.cues, args.assets, args.mode == 'release')
    print(json.dumps({'mode': args.mode, 'status': 'failed' if errors else 'passed',
                      'errors': errors, 'note': 'Record consistency only; not visual, rights or physical-sync certification'}, indent=2))
    return 1 if errors else 0


if __name__ == '__main__':
    sys.exit(main())


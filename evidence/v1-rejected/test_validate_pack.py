"""Synthetic validator fixtures. No actual song or runtime asset is supplied."""
import copy
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from validate_pack import validate


class PackValidationTests(unittest.TestCase):
    def setUp(self):
        self.directory = tempfile.TemporaryDirectory()
        self.addCleanup(self.directory.cleanup)
        self.root = Path(self.directory.name)
        self.asset = self.root / 'fixture.mjs'
        self.asset.write_text('// synthetic asset for consistency tests only\n')
        self.digest = hashlib.sha256(self.asset.read_bytes()).hexdigest()
        self.audio_digest = hashlib.sha256(b'NOT AN AUDIO RECORDING').hexdigest()
        self.track = {
            'schema_version': 1, 'requested_spotify_id': '0iVj13fDCDRM7rfYEGF50X',
            'source_sha256': self.audio_digest, 'runtime_sha256': self.audio_digest,
            'identity_review_status': 'verified', 'identity_review_notes': 'synthetic fixture',
            'runtime_decoded_duration_seconds': 10.0, 'runtime_sample_rate_hz': 48000,
            'runtime_decoder_record': 'synthetic fixture',
            'runtime_audio_mode': 'user_local_file', 'runtime_audio_path': None,
        }
        self.cues = {
            'schema_version': 1, 'track_sha256': self.audio_digest, 'review_status': 'reviewed',
            'sections': [
                {'id': 'first', 'resolution_status': 'reviewed', 'start_seconds': 0,
                 'end_seconds': 5, 'review_notes': 'synthetic fixture'},
                {'id': 'second', 'resolution_status': 'reviewed', 'start_seconds': 5,
                 'end_seconds': 10, 'review_notes': 'synthetic fixture'},
            ],
            'events': [{'id': 'hit', 'resolution_status': 'reviewed',
                        'seconds': 2, 'review_notes': 'synthetic fixture'}],
            'markers': {'review_status': 'reviewed', 'review_notes': 'synthetic fixture',
                        'beats_seconds': [0, 1, 2, 3], 'accents_seconds': [2]},
            'anchors': [{'seconds': i * 0.8, 'reviewed': True,
                         'audio_feature': 'synthetic impulse', 'visual_event': 'synthetic flash',
                         'method': 'fixture only'} for i in range(12)],
            'sync_evidence_record': 'synthetic fixture; no actual playback tested',
        }
        self.assets = {
            'schema_version': 1,
            'assets': [{'id': 'fixture', 'runtime_required': True, 'used_in_runtime': True,
                        'status': 'ready', 'inspection_record': 'synthetic fixture',
                        'kind': 'authored_code', 'runtime_path': 'fixture.mjs',
                        'runtime_sha256': self.digest,
                        'rights': {'status': 'documented', 'basis': 'test fixture',
                                   'record': 'synthetic fixture'}}],
        }

    def errors(self, release=True):
        for filename, data in [('track.json', self.track), ('cues.json', self.cues),
                               ('assets.json', self.assets)]:
            (self.root / filename).write_text(json.dumps(data))
        return validate(self.root, 'track.json', 'cues.json', 'assets.json', release)

    def expect_error(self, phrase):
        self.assertTrue(any(phrase in item for item in self.errors()), phrase)

    def test_complete_local_reference_records_are_consistent(self):
        self.assertEqual(self.errors(), [])

    def test_wrong_audio_hash_is_rejected(self):
        self.cues['track_sha256'] = 'a' * 64
        self.expect_error('Cue sheet audio hash')

    def test_unresolved_identity_and_timing_are_rejected(self):
        self.track['identity_review_status'] = 'pending'
        self.cues['sections'][0]['start_seconds'] = None
        errors = self.errors()
        self.assertTrue(any('identity has not' in error for error in errors))
        self.assertTrue(any('invalid times' in error for error in errors))

    def test_gaps_and_overlaps_are_rejected(self):
        for start in [4.5, 5.5]:
            with self.subTest(start=start):
                self.cues['sections'][1]['start_seconds'] = start
                self.expect_error('coverage gap/overlap')

    def test_markers_must_be_sorted_and_in_range(self):
        for markers in [[0, 1, 1, 2], [0, 2, 1, 3], [0, 1, 2, 11]]:
            with self.subTest(markers=markers):
                self.cues['markers']['beats_seconds'] = markers
                self.assertTrue(self.errors())

    def test_asset_byte_changes_are_rejected(self):
        self.asset.write_text('// changed bytes\n')
        self.expect_error('bytes do not match')

    def test_escape_path_is_rejected(self):
        self.assets['assets'][0]['runtime_path'] = '../outside.mjs'
        self.expect_error('Path must remain inside')

    def test_malformed_fields_return_errors_without_crashing(self):
        mutations = [
            ('assets', lambda: self.assets['assets'][0].update(id={})),
            ('rights', lambda: self.assets['assets'][0].update(rights=None)),
            ('markers', lambda: self.cues.update(markers=None)),
            ('beats', lambda: self.cues['markers'].update(beats_seconds=None)),
            ('sections', lambda: self.cues.update(sections=None)),
        ]
        originals = copy.deepcopy((self.track, self.cues, self.assets))
        for label, mutate in mutations:
            with self.subTest(field=label):
                self.track, self.cues, self.assets = copy.deepcopy(originals)
                mutate()
                self.assertTrue(self.errors())

    def test_bundled_audio_requires_actual_bytes_and_permission_record(self):
        self.track['runtime_audio_mode'] = 'bundled'
        self.track['distribution_permission'] = None
        self.expect_error('documented distribution basis')

    def test_absent_semantic_section_can_be_explicitly_recorded(self):
        self.cues['sections'].insert(1, {'id': 'absent', 'resolution_status': 'not_present',
                                       'start_seconds': None, 'end_seconds': None,
                                       'review_notes': 'synthetic absent section'})
        self.assertEqual(self.errors(), [])


if __name__ == '__main__':
    unittest.main()

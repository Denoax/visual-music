#!/usr/bin/env python3
"""Measure the supplied runtime audio; output candidates, never approved cues."""
import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import sys


def write_json(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('audio', type=Path)
    parser.add_argument('--output-dir', type=Path, required=True)
    args = parser.parse_args()
    if not args.audio.is_file():
        parser.error('Input audio file does not exist')
    for binary in ('ffmpeg', 'ffprobe'):
        if not shutil.which(binary):
            parser.error(f'{binary} is required')
    try:
        import numpy as np
    except ImportError:
        parser.error('NumPy is required for measured analysis curves')

    digest = hashlib.sha256(args.audio.read_bytes()).hexdigest()
    probe_cmd = ['ffprobe', '-v', 'error', '-select_streams', 'a:0',
                 '-show_streams', '-show_format', '-of', 'json', str(args.audio)]
    probe = json.loads(subprocess.check_output(probe_cmd))
    if not probe.get('streams'):
        parser.error('Input contains no audio stream')
    stream = probe['streams'][0]
    sample_rate = 48000
    decode_cmd = ['ffmpeg', '-v', 'error', '-i', str(args.audio), '-map', '0:a:0',
                  '-vn', '-ac', '1', '-ar', str(sample_rate), '-f', 'f32le', 'pipe:1']
    pcm_bytes = subprocess.check_output(decode_cmd)
    pcm = np.frombuffer(pcm_bytes, dtype='<f4')
    if not len(pcm) or not np.all(np.isfinite(pcm)):
        parser.error('Decoded audio is empty or has invalid samples')
    duration = len(pcm) / sample_rate
    if duration > 900:
        parser.error('This fixed-song helper accepts recordings up to 15 minutes')

    hop = 480  # 10 ms at the fixed analysis rate.
    waveform = []
    for index in range(0, len(pcm), hop):
        frame = pcm[index:index + hop]
        waveform.append([round(index / sample_rate, 6),
                         round(float(np.max(np.abs(frame))), 6),
                         round(float(np.sqrt(np.mean(frame.astype('float64') ** 2))), 6)])

    size = 2048
    window = np.hanning(size)
    frequencies = np.fft.rfftfreq(size, 1 / sample_rate)
    bands = [(20, 160), (160, 1200), (1200, 8000)]
    masks = [(frequencies >= low) & (frequencies < high) for low, high in bands]
    padded = np.pad(pcm, (size // 2, size // 2))
    features = []
    previous = np.zeros(size // 2 + 1)
    for index in range(0, len(pcm), hop):
        frame = padded[index:index + size]
        spectrum = np.abs(np.fft.rfft(frame * window))
        flux = float(np.maximum(0, spectrum - previous).sum())
        energies = [float(np.sqrt(np.mean(spectrum[mask] ** 2))) for mask in masks]
        features.append([index / sample_rate, *energies, flux])
        previous = spectrum
    data = np.array(features, dtype='float64')
    # Independent percentile scaling produces visual control signals, not dB.
    scales = np.percentile(data[:, 1:], 95, axis=0)
    scales = np.maximum(scales, 1e-12)
    data[:, 1:] = np.clip(data[:, 1:] / scales, 0, 1)

    output = args.output_dir
    output.mkdir(parents=True, exist_ok=True)
    write_json(output / 'waveform.json', {
        'schema_version': 1, 'runtime_sha256': digest,
        'columns': ['seconds_block_start', 'peak', 'rms'],
        'hop_seconds': hop / sample_rate, 'samples': waveform})
    write_json(output / 'features.json', {
        'schema_version': 1, 'runtime_sha256': digest,
        'status': 'unreviewed_analysis_candidates',
        'columns': ['seconds_window_center', 'low_20_160', 'mid_160_1200', 'high_1200_8000', 'positive_spectral_flux'],
        'window_samples': size, 'hop_samples': hop, 'sample_rate_hz': sample_rate,
        'normalization': 'each feature divided by its 95th percentile and clipped to [0,1]; not decibels or isolated drums',
        'edge_policy': 'zero-pad half window on each side',
        'samples': np.round(data, 6).tolist()})
    write_json(output / 'track.json', {
        'schema_version': 1,
        'requested_spotify_id': '0iVj13fDCDRM7rfYEGF50X',
        'requested_artist': 'Seryoga', 'requested_title': 'Чёрный бумер',
        'identity_review_status': 'pending', 'identity_review_notes': None,
        'runtime_sha256': digest, 'source_sha256': digest,
        'source_filename': args.audio.name, 'source_size_bytes': args.audio.stat().st_size,
        'runtime_audio_mode': 'user_local_file', 'runtime_audio_path': None,
        'distribution_permission': {'status': 'not_granted_by_this_pack', 'record': None},
        'source_probe': {'codec': stream.get('codec_name'),
                         'sample_rate_hz': stream.get('sample_rate'),
                         'channels': stream.get('channels'),
                         'duration_seconds': stream.get('duration', probe.get('format', {}).get('duration'))},
        'analysis': {'sample_rate_hz': sample_rate, 'channels': 1,
                     'duration_seconds': duration, 'frame_count': len(pcm),
                     'decoded_pcm_sha256': hashlib.sha256(pcm_bytes).hexdigest(),
                     'decode_command': [part if part != str(args.audio) else '<INPUT_AUDIO>' for part in decode_cmd]},
        'runtime_decoded_duration_seconds': None,
        'runtime_sample_rate_hz': None, 'runtime_decoder_record': None,
        'measurement_note': 'Song identity and cue times require listening; browser decode must be measured independently.'})
    write_json(output / 'analysis-provenance.json', {
        'input_sha256': digest, 'tool': 'BUMER.EXE prepare_audio.py',
        'probe_command': [part if part != str(args.audio) else '<INPUT_AUDIO>' for part in probe_cmd],
        'ffmpeg_version': subprocess.check_output(['ffmpeg', '-version'], text=True).splitlines()[0],
        'numpy_version': np.__version__, 'identity_reviewed': False,
        'beat_markers_reviewed': False, 'phrase_markers_reviewed': False})
    print(json.dumps({'status': 'measured_unreviewed', 'runtime_sha256': digest,
                      'analysis_duration_seconds': round(duration, 6),
                      'output_directory': str(output.resolve())}))


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(f'Audio tool failed with exit code {error.returncode}; no cue review is implied.')


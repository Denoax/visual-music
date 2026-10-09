#!/usr/bin/env python3
"""Reproducible timing aids for the supplied recording, never listening approval."""
import argparse
import hashlib
import json
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter1d
from scipy.signal import find_peaks


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + '\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--analysis-dir', type=Path, required=True)
    args = ap.parse_args()
    root = args.analysis_dir
    feature = json.loads((root / 'features.json').read_text())
    wave = json.loads((root / 'waveform.json').read_text())
    track = json.loads((root / 'track.json').read_text())
    if not feature['runtime_sha256'] == wave['runtime_sha256'] == track['runtime_sha256']:
        raise ValueError('Analysis input hashes differ')
    a = np.asarray(feature['samples'], dtype=float)
    t, dt = a[:, 0], feature['hop_samples'] / feature['sample_rate_hz']
    duration = track['analysis']['duration_seconds']
    flux = np.maximum(0, a[:, 4] - gaussian_filter1d(a[:, 4], .20 / dt))
    # This file has strong pulse-family evidence around 85/170 BPM. Search the
    # slower hypothesis, without pretending autocorrelation resolves the metre.
    use = (t > 10) & (t < min(230, duration - 5))
    bpms = np.linspace(83.5, 86.5, 3001)
    score = np.asarray([abs(np.sum(flux[use] * np.exp(-2j * np.pi * t[use] * bpm / 60)))
                        for bpm in bpms])
    bpm = float(bpms[int(np.argmax(score))])
    period = 60 / bpm
    c = np.sum(flux[use] * np.exp(-2j * np.pi * t[use] * bpm / 60))
    phase = float((-np.angle(c) / (2 * np.pi) * period) % period)
    grid = np.arange(phase, duration, period)
    peaks, _ = find_peaks(flux, distance=max(1, round(.12 / dt)),
                          prominence=.025)
    transients = [{'seconds': round(float(t[p]), 6),
                   'strength': round(float(flux[p]), 6)} for p in peaks]
    snapped = []
    for predicted in grid:
        nearby = peaks[np.abs(t[peaks] - predicted) <= .09]
        if len(nearby):
            p = int(nearby[np.argmax(flux[nearby])])
            snapped.append({'predicted_seconds': round(float(predicted), 6),
                            'transient_seconds': round(float(t[p]), 6),
                            'residual_ms': round(float((t[p] - predicted) * 1000), 2),
                            'strength': round(float(flux[p]), 6)})
    windows = []
    for lo, hi in [(10, 50), (50, 90), (90, 130), (130, 170), (170, 220)]:
        m = (t >= lo) & (t < hi)
        c = np.sum(flux[m] * np.exp(-2j * np.pi * t[m] * bpm / 60))
        q = float((-np.angle(c) / (2 * np.pi) * period) % period)
        windows.append({'start_seconds': lo, 'end_seconds': hi, 'phase_seconds': round(q, 6),
                        'phase_difference_ms': round(((q-phase+period/2) % period-period/2)*1000, 2)})
    # Peaks in the change between left/right 1-second band means. These are
    # timbral change candidates, not semantic verse/chorus or bar annotations.
    smooth = np.column_stack([gaussian_filter1d(a[:, k], .30 / dt) for k in (1, 2, 3)])
    reach = round(1 / dt)
    novelty = np.zeros(len(a))
    novelty[reach:-reach] = np.linalg.norm(smooth[2*reach:] - smooth[:-2*reach], axis=1)
    changes, _ = find_peaks(novelty, distance=round(5 / dt), prominence=.075)
    change_rows = [{'seconds': round(float(t[p]), 6), 'band_change_score': round(float(novelty[p]), 6)}
                   for p in changes if 2 < t[p] < duration-2]
    result = {
        'schema_version': 2, 'runtime_sha256': track['runtime_sha256'],
        'status': 'machine_measured_candidates_not_listening_reviewed',
        'analysis_duration_seconds': duration,
        'pulse_hypothesis': {'bpm': round(bpm, 6), 'period_seconds': period,
                             'phase_seconds': phase, 'metre': 'unresolved',
                             'alternative_bpm': round(2*bpm, 6),
                             'method': 'coherent comb search on detrended clipped spectral flux, 10–230s, search 83.5–86.5 BPM; slower pulse selected as a hypothesis',
                             'window_phase_checks': windows},
        'predicted_pulses_seconds': np.round(grid, 6).tolist(),
        'nearby_transients': snapped, 'transients': transients,
        'timbral_change_candidates': change_rows,
        'uncertainty': {'analysis_hop_ms': dt*1000,
                        'window_ms': feature['window_samples']/feature['sample_rate_hz']*1000,
                        'note': 'Prediction is not a detected beat. Flux windows smear onsets. No kick/snare/vocal isolation, bar numbering, full-song listening, browser decode alignment or audiovisual sync measurement is implied.'},
        'input_files_sha256': {n: hashlib.sha256((root/n).read_bytes()).hexdigest()
                              for n in ['features.json','waveform.json','track.json']},
    }
    write(root/'markers.candidates.json', result)
    print(json.dumps({'candidate_bpm': round(bpm, 6), 'predicted_pulses': len(grid),
                      'transients': len(peaks), 'timbral_changes': change_rows}))


if __name__ == '__main__':
    main()

"""Package reviewed identity and cue records for client-side import; never marks them reviewed."""
import argparse,json
from pathlib import Path
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('track',type=Path)
parser.add_argument('cues',type=Path)
parser.add_argument('--output',type=Path,default=Path('reviewed-show.json'))
a=parser.parse_args()
track=json.loads(a.track.read_text());cues=json.loads(a.cues.read_text())
if track.get('identity_review_status')!='verified' or cues.get('review_status')!='reviewed':
    parser.error('Identity and cue review must already be completed.')
if not track.get('runtime_sha256') or track['runtime_sha256'] != cues.get('track_sha256'):
    parser.error('Track and cue hashes must match.')
a.output.write_text(json.dumps({'track':track,'cues':cues},indent=2)+'\n')
print(a.output)

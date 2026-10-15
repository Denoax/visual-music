"""Extract labelled real full-recording frames; a contact sheet is not motion approval."""
from pathlib import Path
import hashlib
import json
import subprocess
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
evidence = root / 'evidence/black-sky-wave-colour'
review = evidence / 'review'
records = []
for view in ['desktop', 'portrait']:
    folder = evidence / f'capture-{view}'
    trace = json.loads((folder / f'{view}-trace.json').read_text())
    media = folder / f'{view}-full.webm'
    size = (320, 180) if view == 'desktop' else (195, 422)
    columns = 3 if view == 'desktop' else 4
    targets = [2, 28, 43, 59, 78, 97, 109, 126, 142, 161, 178, 193, 204]
    height = size[1] + 24
    sheet = Image.new('RGB', (size[0] * columns, height * ((len(targets) + columns - 1) // columns)), 'black')
    draw = ImageDraw.Draw(sheet)
    frames = []
    for i, target in enumerate(targets):
        row = min(trace['trace'], key=lambda row: abs(row['presentation']['seconds'] - target))
        seconds = (row['wall'] - trace['videoEpochObservation']['selected']) / 1000
        png = review / f'final-{view}-song-{target}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(seconds), '-i', str(media), '-frames:v', '1', '-threads', '1', str(png)], check=True)
        with Image.open(png) as image:
            thumbnail = image.convert('RGB').resize(size, Image.Resampling.LANCZOS)
        x, y = (i % columns) * size[0], (i // columns) * height
        sheet.paste(thumbnail, (x, y))
        draw.text((x + 5, y + size[1] + 4), f"song {row['presentation']['seconds']:.2f}s / video {seconds:.2f}s", fill='white')
        frames.append({'path': str(png.relative_to(root)), 'sha256': hashlib.sha256(png.read_bytes()).hexdigest(), 'presentationSeconds': row['presentation']['seconds'], 'videoSeconds': seconds})
    output = review / f'final-{view}-contact.png'
    sheet.save(output)
    records.append({'view': view, 'recordingSha256': hashlib.sha256(media.read_bytes()).hexdigest(), 'contactSheet': str(output.relative_to(root)), 'frames': frames})
(review / 'final-frame-inspection.json').write_text(json.dumps({'scope': 'Actual decoded full-recording frames, labelled using nearest logged presentation sample and bounded page-video epoch. No retiming or invented frames; frame inspection is not continuous motion/listening approval.', 'records': records}, indent=2) + '\n')
print('Extracted26 actual final-recording frames and two contact sheets')

"""Measure actual glass screenshots; text contrast is not subjective approval."""
from pathlib import Path
import json, statistics, re
from PIL import Image

root = Path(__file__).resolve().parents[1]
evidence = root / 'evidence/ui-loops'
folder = evidence / '02-glass'

def body(image, button):
    r = button['bounds']
    x = round(r['x'] + r['width'] * (.2 if button['id'] == 'start' else .5))
    y = round(r['y'] + r['height'] * (.5 if button['id'] == 'start' else .78))
    pixels = [image.getpixel((x + dx, y + dy))[:3] for dx in range(-2, 3) for dy in range(-1, 2)]
    return [statistics.median(p[i] for p in pixels) for i in range(3)]

def luma(rgb):
    values = [v / 255 for v in rgb]
    linear = [v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4 for v in values]
    return sum(v * w for v, w in zip(linear, [.2126, .7152, .0722]))

results = []
for view in ['desktop', 'portrait']:
    before = next((evidence / '01-final-browser').glob('**/' + ('ready.png' if view == 'desktop' else 'portrait-ready.png')))
    with Image.open(before) as source:
        baseline = source.convert('RGB')
    for mode in ['gpu', 'solid', 'forced']:
        metadata = json.loads((folder / f'{view}-{mode}.json').read_text())
        with Image.open(folder / f'{view}-{mode}.png') as source:
            image = source.convert('RGB')
        assert image.size == baseline.size, 'Unmatched viewport'
        for button in metadata['buttons']:
            old, new = body(baseline, button), body(image, button)
            ink = [float(v) for v in re.findall(r'[\d.]+', button['text'])[:3]]
            a, b = sorted([luma(ink), luma(new)])
            contrast = (b + .05) / (a + .05)
            assert contrast >= 4.5, (view, mode, button['id'], contrast)
            if mode == 'gpu':
                assert max(new) - min(new) <= 2, 'Unrequested tint'
                assert min(new) >= 10 and min(new) - max(old) >= 8, 'Substrate remains unreadably dark'
                assert image.getpixel((10, 10)) == (0, 0, 0), 'Background changed'
            results.append({'view': view, 'mode': mode, 'button': button['id'], 'beforeInteriorRGB': old, 'afterInteriorRGB': new, 'nativeLabelContrast': contrast, 'renderer': metadata['renderer']})
report = {'status': 'passed', 'scope': 'Matched actual entry viewports; label-free body samples and CSS native label colour. Contrast values concern label versus substrate, not WCAG approval of the complete interface. Motion/device/human approval remains separate.', 'results': results}
(folder / 'pixel-audit.json').write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))

"""Bind captures to current source, complete production bytes and owned preview."""
from pathlib import Path
import hashlib,json,sys,urllib.request
root=Path(__file__).resolve().parents[1]
evidence=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--evidence=')), 'evidence/slow-entry-finish')
file=root/evidence/'runtime-identity.json'
def row(f,base):return {'path':str(f.relative_to(base)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
source=[]
for folder in ['src','core','analysis','show','public']:
 source.extend(row(f,root) for f in sorted((root/folder).rglob('*')) if f.is_file())
source.extend(row(root/f,root) for f in ['index.html','package-lock.json','vite.config.ts','assets/manifest.json'])
production=[row(f,root/'dist') for f in sorted((root/'dist').rglob('*')) if f.is_file()]
if '--verify' in sys.argv:
 old=json.loads(file.read_text());assert old['source']==source and old['production']==production,'Source/build drift since capture seal'
else:file.write_text(json.dumps({'source':source,'production':production,'scope':'Current source/build sealed before final capture. No asset substitution; owned HTTP preview verified byte for byte.'},indent=2)+'\n')
for r in production:
 with urllib.request.urlopen('http://127.0.0.1:4175/'+r['path']) as response:assert hashlib.sha256(response.read()).hexdigest()==r['sha256'],r['path']
print('Source/build/owned preview verified:',len(source),'source files,',len(production),'production files')

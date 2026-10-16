"""Seal ONE complete four-task UI-loop source/assets/evidence review ZIP."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
root=Path(__file__).resolve().parents[1]
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root).strip(),'Commit source/evidence before packaging'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
baseline='1c86a4d'
out=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/f'VISUAL_MUSIC_UI_LOOPS_REVIEW_{commit[:7]}'
out.mkdir(exist_ok=False);prefix=out.name

def digest(path):
 with path.open('rb') as f:return hashlib.file_digest(f,'sha256').hexdigest()

def row(path,name=None):return {'path':name or 'source/'+str(path.relative_to(root)),'bytes':path.stat().st_size,'sha256':digest(path),'file':path}

rows=[]
tracked_showcase=set(subprocess.check_output(['git','ls-files','showcase'],cwd=root,text=True).splitlines())
for directory in ['src','core','analysis','show','assets','sources','tools','tests','public','showcase']:
 for f in sorted((root/directory).rglob('*')):
  if directory=='showcase' and str(f.relative_to(root)) not in tracked_showcase:continue
  if f.is_file() and '__pycache__' not in f.parts and f.suffix not in ['.webm','.mp4','.pyc']:
   rows.append(row(f))
evidence=root/'evidence/ui-loops'
capture_identity=json.loads((evidence/'runtime-identity.json').read_text())
for source in capture_identity['source']:
 assert digest(root/source['path'])==source['sha256'],'Source changed since full-song capture; record the current runtime before packaging a new complete review'

assert (root/'show/ui-loops.as-built.json').is_file(),'Current UI-loop authority is required'
assert (evidence/'REVIEW.md').is_file(),'Current UI-loop review record is required'

verification=json.loads((evidence/'capture-verification.json').read_text())
assert verification['status']=='passed','Both current complete captures must pass verification'
for result in verification['results']:
 assert digest(evidence/f"capture-{result['view']}"/f"{result['view']}-full.webm")==result['sha256'],'Capture changed after verification'
assert {result['view'] for result in verification['results']}=={'desktop','portrait'}

def include_evidence(relative):
 # Keep current checks, failed-attempt records and their exact probe sources.
 # Only selected final movies are added below: stage tails/raw streams stay local.
 if any('preliminary' in part or part=='raw' for part in relative.parts):return False
 if relative.suffix in ['.json','.log','.md','.mjs']:return True
 if relative.suffix!='.png':return False
 return len(relative.parts)==1 or relative.parts[0] in [
  '01-final-browser','02-glass','03-tail-desktop','03-tail-portrait',
  'capture-desktop','capture-portrait','review','performance',
 ]

for f in sorted(evidence.rglob('*')):
 if f.is_file() and include_evidence(f.relative_to(evidence)):rows.append(row(f))
for f in sorted(root.iterdir()):
 if f.is_file() and (f.suffix in ['.md','.json','.ts'] or f.name in ['index.html','.gitignore']):rows.append(row(f))
changes=out/'changes';changes.mkdir()
publication=json.loads((evidence/'publication.json').read_text())
(changes/'commit.json').write_text(json.dumps({'review_commit':commit,'publication':publication,'baseline':baseline,'push_authorized':True,'hosting_deployment':False},indent=2)+'\n')
(changes/'change-list.txt').write_bytes(subprocess.check_output(['git','diff','--name-status',baseline,commit],cwd=root))
(changes/'changes.patch').write_bytes(subprocess.check_output(['git','diff','--binary','--no-ext-diff',baseline,commit,'--','.',':!evidence',':!showcase',':!sources/slow-entry-owned-portfolio'],cwd=root))
(changes/'PATCH_SCOPE.md').write_text('Patch excludes separately inventoried evidence/showcase/owned donor files. The complete current payload is included directly. Original captures and history stay recoverable locally; current check/failure records and exact probe sources are included. Deliver one final page+actual-master recording per viewport plus the explicitly labelled unique silent M1 diagnostic; duplicate Task03 tail movies and raw streams remain local.\n')
rows.extend(row(f,'changes/'+f.name) for f in sorted(changes.iterdir()))
media=[]
for view in ['desktop','portrait']:
 file=evidence/f'capture-{view}'/f'{view}-full.webm';assert file.is_file();entry=row(file);rows.append(entry);media.append({k:v for k,v in entry.items() if k!='file'})
diagnostic=evidence/'04-visible-current-silent-diagnostic.webm'
assert diagnostic.is_file(),diagnostic
entry=row(diagnostic);rows.append(entry)
diagnostics=[{
 **{k:v for k,v in entry.items() if k!='file'},
 'label':'Silent trusted-pointer M1 comparison diagnostic',
 'scope':'Focused native-canvas neutral/held movement comparison; silent and deliberately separate from the complete actual-audio review journeys.',
}]
assert len({r['path'] for r in rows})==len(rows),'Duplicate payload'
index={'application':'Visual Music','implementation_commit':commit,'pushed_commit':publication['commit'],'pushed_url':publication['url'],'preview':'http://127.0.0.1:4175/','format':'ONE complete rebuildable ZIP','media':media,'diagnostics':diagnostics,'authority':'source/show/ui-loops.as-built.json and source/evidence/ui-loops/REVIEW.md','scope':'Four serial UI tasks: silent real-readiness ring loader with no rail/falling ball; neutral glass brightness with the approved optics and native labels; deterministic staggered one-second finite confetti shower; trusted canvas mouse-chord ownership repair for M1 press/release. Ordinary base motion, 1.2x cap/.45s attack/.85s release, exact complete MP3, shared waves, black sky, true OFF floor lighting, camera and finite presentation-clock finish remain preserved.','capture':'Uninterrupted normal-speed full-page (DOM and WebGL) video with the real shared stereo master, not a replacement soundtrack; final WebM mux preserves video/audio packet payloads. Entire song and final thank-you settle included. Renderer identity, AV-origin observation limits and measured cadence are in each trace.','omissions':'Dependencies/caches/generated dist, duplicate raw video/master streams, Task03-only tail movies, preliminary captures, superseded candidate-browser stills and historical full recordings; originals remain preserved locally. Current task evidence/probe sources, both complete final actual-audio journeys, the unique labelled silent M1 diagnostic and all source/runtime assets are included.','limits':'See REVIEW.md and per-task checkpoints: native GPU/browser checks and trusted-pointer measurements remain distinct from human visual/listening and physical-device/AV approval. The unique silent M1 diagnostic is not an actual-audio full-song review.','hosting_deployment':False,'archive_verification':'Run tools/verify-review.py against this delivery folder; SHA256SUMS and external VERIFIED_EXTRACTION.json avoid cyclic hashes.'}
extras={'REVIEW_INDEX.json':json.dumps(index,indent=2)+'\n','EXTRACTION.md':'Extract this one ZIP once. In source use Node22, npm ci, npm run build, npm test and npm run validate. All current runtime assets, credits, UI-loop task evidence/probe source snapshots and the two final actual-audio recordings are included. The additional 04-visible-current-silent-diagnostic.webm is explicitly a silent native-pointer movement diagnostic, not a replacement song recording. No multi-part assembly. Read/apply $reference-led-design. Current source was pushed normally to the existing private BUMER repo; hosting was deliberately not updated.\n'}
archive=out/(prefix+'.zip');inventory=[{k:v for k,v in e.items() if k!='file'} for e in rows]
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
 for e in rows:z.write(e['file'],prefix+'/'+e['path'],compress_type=zipfile.ZIP_STORED if e['file'].suffix in ['.webm','.gif','.png','.webp','.mp3','.glb','.zip'] else zipfile.ZIP_DEFLATED)
 for name,value in extras.items():
  data=value.encode();z.writestr(prefix+'/'+name,data);inventory.append({'path':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest()})
 z.writestr(prefix+'/ARCHIVE_MANIFEST_'+archive.name+'.json',json.dumps(inventory,indent=2)+'\n')
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 for e in inventory:
  with z.open(prefix+'/'+e['path']) as f:assert hashlib.file_digest(f,'sha256').hexdigest()==e['sha256'],e['path']
summary={'file':archive.name,'bytes':archive.stat().st_size,'sha256':digest(archive),'payload_files':len(inventory),'crc_and_hashes':'passed'}
report={'archive':summary,'implementation_commit':commit,'publication':publication,'media_files':media,'diagnostic_files':diagnostics,'root':str(out),'delivery_format':'one_complete_zip'}
(out/'DELIVERY.json').write_text(json.dumps(report,indent=2)+'\n');(out/'SHA256SUMS').write_text(summary['sha256']+'  '+archive.name+'\n');print(json.dumps(report,indent=2))

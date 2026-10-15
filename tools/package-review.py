"""Seal ONE complete current source/assets/evidence/actual-audio review ZIP."""
from pathlib import Path
import hashlib,json,subprocess,sys,zipfile
root=Path(__file__).resolve().parents[1]
assert not subprocess.check_output(['git','status','--porcelain'],cwd=root).strip(),'Commit source/evidence before packaging'
commit=subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()
baseline='10b98cf'
out=Path(sys.argv[1]) if len(sys.argv)>1 else root.parent/f'VISUAL_MUSIC_BLACK_SKY_WAVE_COLOUR_REVIEW_{commit[:7]}'
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
evidence=root/'evidence/black-sky-wave-colour'
for f in sorted(evidence.rglob('*')):
 if not f.is_file():continue
 rel=f.relative_to(evidence)
 if any('preliminary' in part or part=='raw' for part in rel.parts):continue
 if f.name.startswith('before-') or f.name=='browser-tests.log':continue
 if f.suffix in ['.json','.log','.md'] or (f.suffix=='.png' and (rel.parts[0] in ['capture-desktop','capture-portrait','review','performance'] or f.name.endswith('-gpu-audit.png'))):rows.append(row(f))
for f in sorted(root.iterdir()):
 if f.is_file() and (f.suffix in ['.md','.json','.ts'] or f.name in ['index.html','.gitignore']):rows.append(row(f))
changes=out/'changes';changes.mkdir()
publication=json.loads((evidence/'publication.json').read_text())
(changes/'commit.json').write_text(json.dumps({'review_commit':commit,'publication':publication,'baseline':baseline,'push_authorized':True,'hosting_deployment':False},indent=2)+'\n')
(changes/'change-list.txt').write_bytes(subprocess.check_output(['git','diff','--name-status',baseline,commit],cwd=root))
(changes/'changes.patch').write_bytes(subprocess.check_output(['git','diff','--binary','--no-ext-diff',baseline,commit,'--','.',':!evidence',':!showcase',':!sources/slow-entry-owned-portfolio'],cwd=root))
(changes/'PATCH_SCOPE.md').write_text('Patch excludes separately inventoried evidence/showcase/owned donor files. The complete current payload is included directly. Original captures, failed attempts and historical history stay recoverable locally; only one final page+actual-master recording per viewport is delivered.\n')
rows.extend(row(f,'changes/'+f.name) for f in sorted(changes.iterdir()))
media=[]
for view in ['desktop','portrait']:
 file=evidence/f'capture-{view}'/f'{view}-full.webm';assert file.is_file();entry=row(file);rows.append(entry);media.append({k:v for k,v in entry.items() if k!='file'})
assert len({r['path'] for r in rows})==len(rows),'Duplicate payload'
index={'application':'Visual Music','implementation_commit':commit,'pushed_commit':publication['commit'],'pushed_url':publication['url'],'preview':'http://127.0.0.1:4175/','format':'ONE complete rebuildable ZIP','media':media,'authority':'source/show/black-sky-wave-colour.as-built.json and source/evidence/black-sky-wave-colour/REVIEW.md','scope':'Black sky without atmosphere; immutable event-born wave formations on the shared bounded triangle surface; crest-carried cohesive colour with genuine OFF banks; unchanged base camera and1.2x M1 cap with .45s attack. Exact MP3, approved loader/glass/controls and finite thank-you finish preserved.','capture':'Uninterrupted normal-speed full-page (DOM and WebGL) video with the real shared stereo master, not a replacement soundtrack; final WebM mux preserves video/audio packet payloads. Entire song and final thank-you settle included. Renderer identity, AV-origin observation limits and measured cadence are in each trace.','omissions':'Dependencies/caches/generated dist, duplicate raw video/master streams, preliminary captures and historical full recordings; originals remain preserved locally. No source/runtime asset or required final capture tail omitted.','limits':'See REVIEW.md: human listening/motion and physical-device/AV approval remain separate; actual matched native foreground GPU benchmarks are distinguished from recording cadence and software diagnostics.','hosting_deployment':False,'archive_verification':'Run tools/verify-review.py against this delivery folder; SHA256SUMS and external VERIFIED_EXTRACTION.json avoid cyclic hashes.'}
extras={'REVIEW_INDEX.json':json.dumps(index,indent=2)+'\n','EXTRACTION.md':'Extract this one ZIP once. In source use Node22, npm ci, npm run build, npm test and npm run validate. All current runtime assets, credits and the two final actual-audio recordings are included. No multi-part assembly. Read/apply $reference-led-design. Current source was pushed normally to the existing private BUMER repo; hosting was deliberately not updated.\n'}
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
report={'archive':summary,'implementation_commit':commit,'publication':publication,'media_files':media,'root':str(out),'delivery_format':'one_complete_zip'}
(out/'DELIVERY.json').write_text(json.dumps(report,indent=2)+'\n');(out/'SHA256SUMS').write_text(summary['sha256']+'  '+archive.name+'\n');print(json.dumps(report,indent=2))

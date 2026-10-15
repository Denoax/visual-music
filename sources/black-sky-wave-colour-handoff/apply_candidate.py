"""Hash-guarded application; checks first, backs up only changed files on apply."""
from pathlib import Path
import argparse, hashlib, json, shutil, tempfile

p=argparse.ArgumentParser()
p.add_argument('project_root',type=Path)
p.add_argument('--apply',action='store_true',help='Apply after checking all files; default is read-only')
a=p.parse_args();root=a.project_root.resolve();pack=Path(__file__).resolve().parent
rows=json.loads((pack/'PATCH_MANIFEST.json').read_text());plan=[];errors=[]
def digest(path):return hashlib.sha256(path.read_bytes()).hexdigest() if path.is_file() else None
for r in rows:
 rel=Path(r['path']);dest=root/rel;source=pack/'candidate-files'/rel
 if rel.is_absolute() or '..' in rel.parts or not dest.resolve().is_relative_to(root):raise SystemExit('Unsafe target path')
 if digest(source)!=r['candidate_sha256']:raise SystemExit('Damaged pack: '+str(rel))
 current=digest(dest)
 if current==r['candidate_sha256']:continue
 if current!=r['base_sha256'] or (dest.exists() and not dest.is_file()):errors.append(str(rel))
 else:plan.append((r,source,dest))
if errors:raise SystemExit('Source drift. Adapt deliberately; no files written: '+', '.join(errors))
if not a.apply:
 print(json.dumps({'status':'check passed','files_to_apply':len(plan),'already_candidate':len(rows)-len(plan)},indent=2));raise SystemExit()
if not plan:print('Already applied; no changes.');raise SystemExit()
backup=Path(tempfile.mkdtemp(prefix='visual-music-wave-recovery-',dir=root.parent))
receipt=[]
for r,source,dest in plan:
 existed=dest.exists()
 if existed:
  saved=backup/r['path'];saved.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(dest,saved)
 receipt.append({'path':r['path'],'existed':existed,'base_sha256':r['base_sha256'],'candidate_sha256':r['candidate_sha256']})
(backup/'RESTORE.json').write_text(json.dumps(receipt,indent=2)+'\n')
for r,source,dest in plan:
 dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(source.read_bytes())
print(json.dumps({'status':'applied','files':len(plan),'backup':str(backup),'note':'Source candidate only. Runtime verification and publication remain separate.'},indent=2))

"""Audit actual source, timeline, complete mixed audio and finite full-page captures."""
from pathlib import Path
import json,hashlib,subprocess,array,math
root=Path(__file__).resolve().parents[1];e=root/'evidence/slow-entry-finish'
identity=json.loads((e/'runtime-identity.json').read_text());identity_sha=hashlib.sha256((e/'runtime-identity.json').read_bytes()).hexdigest()
for row in identity['source']:assert hashlib.sha256((root/row['path']).read_bytes()).hexdigest()==row['sha256'],row['path']
rate=24000

def decode(file):
 b=subprocess.check_output(['ffmpeg','-v','error','-i',str(file),'-map','0:a:0','-ac','1','-ar',str(rate),'-af','highpass=f=20','-f','f32le','-']);a=array.array('f');a.frombytes(b);return a
ref=decode(root/'public/audio/around-the-world.mp3');results=[]
for view in ['desktop','portrait']:
 folder=e/f'capture-{view}';file=folder/f'{view}-full.webm';trace=json.loads((folder/f'{view}-trace.json').read_text());end=trace['fullEnd']
 assert trace['runtimeIdentitySha256']==identity_sha
 starts=[x for x in end['sourceEvents'] if x['kind']=='start'];assert len(starts)==1 and starts[0]['offsetSeconds']==0
 assert [x['kind'] for x in end['completionEvents']]==['graph_end','presented_end']
 assert end['lifecycle']['finish']['worldGain']==0 and end['lifecycle']['finish']['pageGain']==1 and end['lifecycle']['finish']['confettiAge'] is None
 assert end['lifecycle']['raf']==0
 assert end['decode']['channels']==2 and abs(end['decode']['duration']-219.66579166666668)<.0001
 assert not trace['errors']
 assert all(b['presentation']['seconds']>=a['presentation']['seconds'] for a,b in zip(trace['trace'],trace['trace'][1:]))
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-count_frames','-show_entries','format=duration:stream=index,codec_type,codec_name,width,height,nb_read_frames,channels','-of','json',str(file)]))
 assert set(s['codec_type'] for s in probe['streams'])=={'video','audio'}
 assert next(s for s in probe['streams'] if s['codec_type']=='audio')['channels']==2
 # Correlate the original master-only recording before its container offset;
 # final output uses those exact audio packets. The full recording tail remains.
 recorded=decode(folder/'master.webm');seed=round((starts[0]['contextSeconds']-end['captureStart']['contextSeconds']+.0065)*rate)
 def corr(t,lag):
  start=round(t*rate);length=min(rate,len(ref)-start);a=ref[start:start+length:12];b=recorded[start+lag:start+lag+length:12]
  if len(a)!=len(b) or not a:return -1
  aa=sum(x*x for x in a);bb=sum(x*x for x in b);return sum(x*y for x,y in zip(a,b))/math.sqrt(aa*bb) if aa*bb else -1
 _,coarse=max((corr(3,lag),lag) for lag in range(seed-int(.25*rate),seed+int(.25*rate)+1,8))
 quality,offset=max((corr(3,lag),lag) for lag in range(coarse-16,coarse+17));assert quality>.985,(view,quality)
 windows=[]
 for t in [3,30,84,145,180,212,218.6,219.5]:
  c,lag=max((corr(t,lag),lag) for lag in range(offset-128,offset+129));assert c>.985,(view,t,c)
  windows.append({'source_seconds':t,'correlation':c,'offset_ms':lag/rate*1000})
 assert len(recorded)/rate>(offset/rate+219.66579+6.6)
 # Measure each actual mixed stereo output, including chime and Settings notes.
 stats=subprocess.run(['ffmpeg','-hide_banner','-i',str(folder/'master.webm'),'-af','astats=metadata=0:reset=0','-f','null','-'],capture_output=True,text=True,check=True).stderr
 (folder/'mixed-audio-astats.log').write_text(stats)
 intervals=sorted(end['intervals']);pct=lambda p:intervals[min(len(intervals)-1,round((len(intervals)-1)*p))] if intervals else None
 results.append({'view':view,'bytes':file.stat().st_size,'sha256':hashlib.sha256(file.read_bytes()).hexdigest(),'renderer':end['renderer'],'software':trace['software'],'probe':probe,'single_source_and_complete_presented_tail':True,'finite_finish_raf_zero':True,'audio_windows':windows,'cadence_ms':{'median':pct(.5),'p95':pct(.95),'max':max(intervals) if intervals else None},'av_origin_uncertainty_ms':trace['videoEpochObservation']['uncertaintyMs']})
report={'status':'passed','scope':'Identity, source-zero/whole presented tail, actual-mix audio provenance, full-page record, finite ending and measured frame intervals. Digital audio correlation is not lossless fidelity, physical AV or listening approval. Software cadence is not hardware performance.','results':results}
(e/'capture-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))

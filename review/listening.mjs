const $ = id => document.getElementById(id);
const EXPECTED = '67d55f6e9551e77002fecb2752b835761da84a5db2a7679e91599e4dc94c2780';
const ctx = new AudioContext({latencyHint:'interactive'});
const gain = ctx.createGain();gain.gain.value=.65;gain.connect(ctx.destination);
let buffer, source, generation=0, playing=false, offset=0, start=0;
let wave, features, markers, track, viewStart=0, viewEnd=245, decodeRecord;
const events=[];
const canvas=$('wave'),g=canvas.getContext('2d');
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const status=s=>$('status').textContent=s;
const duration=()=>buffer?.duration ?? track?.analysis.duration_seconds ?? 245;
function songTime(){return playing?clamp(offset+ctx.currentTime-start,offset,duration()):offset;}
function stopSource(){++generation;if(source){source.onended=null;source.stop();source.disconnect();source=null;}}
function update(){ $('play').textContent=playing?'Pause':'Play'; $('seek').value=String(songTime()); }
function pause(){offset=songTime();playing=false;stopSource();update();}
async function play(){
  if(!buffer||playing)return;
  const request=++generation;await ctx.resume();if(request!==generation)return;
  if(ctx.state!=='running')throw new Error('Audio context did not resume. Press Play to retry.');
  if(offset>=duration())offset=0;
  stopSource();source=ctx.createBufferSource();source.buffer=buffer;source.connect(gain);
  const token=generation;start=ctx.currentTime+.04;
  source.onended=()=>{if(token!==generation)return;source.disconnect();source=null;offset=duration();playing=false;update();};
  source.start(start,offset);playing=true;update();
}
function seek(t){const was=playing;pause();offset=clamp(t,0,duration());if(was&&offset<duration())void play().catch(e=>status(e.message));update();}
$('play').onclick=()=>playing?pause():void play().catch(e=>status(e.message));
$('replay').onclick=()=>{pause();offset=0;void play().catch(e=>status(e.message));};
$('seek').oninput=()=>seek(Number($('seek').value));
$('volume').oninput=()=>gain.gain.setTargetAtTime(Number($('volume').value),ctx.currentTime,.015);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
ctx.addEventListener('statechange',()=>{if(ctx.state!=='running'&&playing)pause();});
document.addEventListener('keydown',e=>{if(e.code==='Space'&&!['INPUT','SELECT','TEXTAREA','BUTTON'].includes(e.target.tagName)){e.preventDefault();$('play').click();}});
function table(){
  $('events').replaceChildren();
  events.sort((a,b)=>a.seconds-b.seconds);
  for(const event of events){const tr=document.createElement('tr');
    for(const text of [event.seconds.toFixed(3),event.type,event.note]){const td=document.createElement('td');td.textContent=text;tr.append(td);}
    const td=document.createElement('td'),go=document.createElement('button'),remove=document.createElement('button');
    go.textContent='Seek';go.onclick=()=>seek(event.seconds);remove.textContent='Remove';remove.onclick=()=>{events.splice(events.indexOf(event),1);table();};
    td.append(go,' ',remove);tr.append(td);$('events').append(tr);
  }
}
$('mark').onclick=()=>{const note=$('note').value.trim();if(!note){status('Write the audible feature and visual proposal before adding a draft.');return;}
  events.push({id:crypto.randomUUID(),seconds:Number(songTime().toFixed(6)),type:$('kind').value,note,review_status:'draft'});table();$('note').value='';status('Draft landmark added.');};
$('export').onclick=()=>{
  const data={schema_version:2,runtime_sha256:EXPECTED,status:'listening_draft_not_approved_score',exported_at:new Date().toISOString(),browser_decode:decodeRecord,events,
    note:'These annotations are drafts. No visual output timing, physical sync, complete listening approval or final cue review is certified by this export.'};
  const a=document.createElement('a'),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)+'\n'],{type:'application/json'}));a.href=url;a.download='bumer-listening-draft.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();seek(viewStart+(e.clientX-r.left)/r.width*(viewEnd-viewStart));});
function line(x,color,top=0,bottom=330){g.strokeStyle=color;g.beginPath();g.moveTo(x,top);g.lineTo(x,bottom);g.stroke();}
function draw(){
  const t=songTime();$('time').textContent=`${t.toFixed(3)} s`;if(playing)$('seek').value=String(t);
  const span=$('zoom').value==='full'?duration():Number($('zoom').value);
  viewStart=span>=duration()?0:clamp(t-span/2,0,Math.max(0,duration()-span));viewEnd=Math.min(duration(),viewStart+span);
  const x=q=>(q-viewStart)/(viewEnd-viewStart)*canvas.width;
  g.fillStyle='#151b25';g.fillRect(0,0,canvas.width,canvas.height);
  g.font='14px system-ui';
  const step=span>100?20:span>10?2:.5;
  for(let q=Math.ceil(viewStart/step)*step;q<=viewEnd;q+=step){line(x(q),'#273449');g.fillStyle='#9cb1c9';g.fillText(q.toFixed(span>10?0:1)+'s',x(q)+3,320);}
  if(wave){
    g.strokeStyle='#78d8cc';g.beginPath();let began=false;
    for(const row of wave.samples){if(row[0]<viewStart)continue;if(row[0]>viewEnd)break;const px=x(row[0]),y=130-row[1]*108;if(!began){g.moveTo(px,y);began=true;}else g.lineTo(px,y);}g.stroke();
    g.strokeStyle='#54727f';g.beginPath();for(const row of wave.samples){if(row[0]<viewStart)continue;if(row[0]>viewEnd)break;g.moveTo(x(row[0]),130);g.lineTo(x(row[0]),130+row[2]*50);}g.stroke();
  }
  if(features){for(const [k,color] of [[1,'#59a6ff'],[2,'#fc90d0'],[3,'#f4d386']]){g.strokeStyle=color;g.beginPath();let began=false;for(const row of features.samples){if(row[0]<viewStart)continue;if(row[0]>viewEnd)break;const px=x(row[0]),y=285-row[k]*75;if(!began){g.moveTo(px,y);began=true;}else g.lineTo(px,y);}g.stroke();}}
  if(markers&&$('grid').checked){for(const q of markers.predicted_pulses_seconds){if(q>=viewStart&&q<=viewEnd)line(x(q),'#41666c',185,205);}}
  if(markers&&$('flux').checked){for(const m of markers.transients){if(m.seconds>=viewStart&&m.seconds<=viewEnd)line(x(m.seconds),'#b48ad0',185-m.strength*55,185);}}
  for(const e of events){if(e.seconds>=viewStart&&e.seconds<=viewEnd)line(x(e.seconds),'#f2a25d',0,305);}
  line(x(t),'#ffffff');g.fillStyle='#9cb1c9';g.fillText('peak / RMS',10,20);g.fillText('candidate pulses / measured flux peaks',10,203);g.fillText('low / mid / high control curves',10,298);
  $('view-caption').textContent=`${viewStart.toFixed(3)}–${viewEnd.toFixed(3)} seconds · grid ≈${markers?.pulse_hypothesis.bpm ?? '…'} BPM hypothesis; metre unresolved · curves from offline FFmpeg decode, browser alignment unreviewed`;
  requestAnimationFrame(draw);
}
draw();
try{
  const root='../analysis/';
  const files=await Promise.all(['waveform.json','features.json','markers.candidates.json','track.json'].map(async n=>{const r=await fetch(root+n);if(!r.ok)throw new Error(`${n}: HTTP ${r.status}`);return r.json();}));
  [wave,features,markers,track]=files;
  for(const d of files)if(d.runtime_sha256!==EXPECTED)throw new Error('Analysis is bound to different encoded audio bytes.');
  const r=await fetch('../audio/chernyy-bumer.mp3');if(!r.ok)throw new Error(`MP3: HTTP ${r.status}`);
  const bytes=await r.arrayBuffer();const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');if(hash!==EXPECTED)throw new Error('Bundled MP3 hash differs. Restore the unchanged supplied file.');
  buffer=await ctx.decodeAudioData(bytes.slice(0));
  decodeRecord={runtime_sha256:hash,encoded_size_bytes:bytes.byteLength,decoder:'Browser AudioContext.decodeAudioData',duration_seconds:buffer.duration,length_frames:buffer.length,sample_rate_hz:buffer.sampleRate,channels:buffer.numberOfChannels,offline_duration_seconds:track.analysis.duration_seconds,duration_difference_ms:(buffer.duration-track.analysis.duration_seconds)*1000,user_agent:navigator.userAgent,output_timestamp_available:typeof ctx.getOutputTimestamp==='function',alignment_review_status:'pending',full_listening_review_status:'pending'};
  $('decode').textContent=JSON.stringify(decodeRecord,null,2);$('seek').max=String(buffer.duration);
  for(const id of ['play','replay','seek','mark','export'])$(id).disabled=false;
  status(`Bundled file verified and decoded: ${buffer.duration.toFixed(6)} seconds. Press Play to listen.`);
}catch(e){status(`Review could not load: ${e.message}. Serve the complete extracted pack from localhost.`);}

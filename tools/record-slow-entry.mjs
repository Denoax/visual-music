/** Full-page actual-master evidence. Default: uninterrupted complete song.
 * Explicit --tail-from enables a labelled diagnostic seek, never a final run. */
import {chromium} from 'playwright';
import {mkdir,writeFile,appendFile,readFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareRecordingOutput,recordingOutput} from './recording-output.mjs';
import {focusOwnedPreview,foregroundState} from './native-foreground.mjs';
const portrait=process.argv.includes('--portrait'),software=process.argv.includes('--software');
const evidence=process.argv.find(a=>a.startsWith('--evidence='))?.slice(11)||'evidence/slow-entry-finish';
const headed=process.argv.includes('--headed');
const tailText=process.argv.find(a=>a.startsWith('--tail-from='))?.slice(12);
const tailFrom=tailText===undefined?null:Number(tailText);
if(tailFrom!==null&&(!Number.isFinite(tailFrom)||tailFrom<0))throw Error('Invalid diagnostic tail offset');
const captureKind=tailFrom===null?'full-song':'tail-diagnostic';
const view=portrait?'portrait':'desktop',viewport=portrait?{width:390,height:844}:{width:1280,height:720};
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||`${evidence}/capture-${view}`;
await mkdir(out,{recursive:true});
const identityBytes=await readFile(`${evidence}/runtime-identity.json`);
const runtimeIdentitySha256=createHash('sha256').update(identityBytes).digest('hex');
const identity=JSON.parse(identityBytes);
for(const row of identity.source){if(createHash('sha256').update(await readFile(row.path)).digest('hex')!==row.sha256)throw Error('Capture source drift: '+row.path);}

const args=software?['--no-sandbox','--enable-unsafe-swiftshader']:['--no-sandbox','--enable-automation','--ozone-platform=x11','--use-gl=angle','--use-angle=gl'];
const browser=await chromium.launch({headless:!headed,executablePath:process.env.BUMER_CHROME||'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args});
const context=await browser.newContext({viewport,deviceScaleFactor:1,hasTouch:portrait,isMobile:portrait,recordVideo:{dir:`${out}/raw`,size:viewport}});
const beforePage=Date.now(),page=await context.newPage(),afterPage=Date.now();
page.setDefaultTimeout(180000);
const errors=[],trace=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
let audioQueue=Promise.resolve();await page.exposeBinding('__captureChunk',(_,{data})=>{audioQueue=audioQueue.then(()=>appendFile(`${out}/master.webm`,Buffer.from(data,'base64')));return audioQueue;});
const timer=setInterval(()=>console.log(view,'capture running',Math.round((Date.now()-afterPage)/1000),'s'),30000);
try{
 await page.addInitScript(()=>{document.addEventListener('DOMContentLoaded',()=>{const s=document.createElement('style');s.textContent='#developer{display:none!important}';document.head.append(s);});});
 await page.goto('http://127.0.0.1:4175/?dev=1');
 const foreground=headed?await focusOwnedPreview(page):{scope:'Headless capture; no native foreground claim'};
 await page.locator('#start:enabled').waitFor({timeout:180000});
 const renderer=await page.evaluate(()=>{const gl=document.querySelector('#world').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return e?gl.getParameter(e.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER);});
 if(!software&&/swiftshader|llvmpipe|software/i.test(renderer))throw Error('Requested hardware capture received software renderer: '+renderer);
 await page.locator('#start:enabled').waitFor({timeout:180000});
 await page.evaluate(async({prepare,output})=>{
  const b=window.__BUMER__,ctx=b.transport.audioContext;
  await Function(`return (${prepare})`)()(ctx);
  const tap=Function(`return (${output})`)()(ctx,b.transport.masterOutput);
  const recorder=new MediaRecorder(tap.stream,{mimeType:'audio/webm;codecs=opus',audioBitsPerSecond:192000});
  const state=window.__capture={recorder,tap,queue:Promise.resolve(),audioEpoch:null,startContext:null,done:false};
  recorder.ondataavailable=e=>{if(!e.data.size)return;state.queue=state.queue.then(async()=>{const bytes=new Uint8Array(await e.data.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));await window.__captureChunk({data:btoa(binary)});});};
  recorder.onstop=()=>{void state.queue.then(()=>{tap.dispose();state.done=true;});};
  document.addEventListener('click',(event)=>{if(!event.target.closest('button')||state.audioEpoch!==null)return;state.audioEpoch=performance.timeOrigin+performance.now();state.startContext=ctx.currentTime;recorder.start(1000);},{capture:true});
 },{prepare:prepareRecordingOutput.toString(),output:recordingOutput.toString()});
 await page.waitForTimeout(1400);await page.screenshot({path:`${out}/ready.png`});
 await page.locator('#settings-button').press('Enter');await page.waitForTimeout(350);await page.locator('#settings .pane-close').press('Enter');await page.waitForTimeout(250);
 if(portrait)await page.locator('#start').tap();else await page.locator('#start').click();
 await page.waitForFunction(()=>window.__BUMER__.lifecycle().fieldEntered,{timeout:120000});
 if(tailFrom!==null)await page.evaluate(t=>{const b=window.__BUMER__;if(t>=b.transport.duration)throw Error('Tail offset exceeds recording');b.seek(t);},tailFrom);
 let nextShower=0;const showerAges=[.15,.55,1.05,2.2,3.8];
 let next=0;const actions=tailFrom!==null?[]:[
  {t:20,kind:'right'},{t:24,kind:'left'},{t:28,kind:'up'},{t:32,kind:'down'},{t:36,kind:'neutral'},
  {t:42,kind:'hold'},{t:48,kind:'release'},
 ];
 while(true){
  const row=await page.evaluate(()=>{const b=window.__BUMER__;return{wall:performance.timeOrigin+performance.now(),presentation:b.transport.presentation(),state:b.transport.state,world:b.world.diagnostics(),lifecycle:b.lifecycle()};});
  if(headed){row.foreground=foregroundState(foreground.address);if(row.foreground.ownedActive===false)throw Error('Owned recording lost native foreground; preserved as an interrupted attempt');}
  trace.push(row);
  while(next<actions.length&&row.presentation.seconds>=actions[next].t){
   const action=actions[next++].kind;const cx=viewport.width/2,cy=viewport.height/2;
   if(action==='right')await page.mouse.move(viewport.width*.82,cy);
   if(action==='left')await page.mouse.move(viewport.width*.18,cy);
   if(action==='up')await page.mouse.move(cx,viewport.height*.20);
   if(action==='down')await page.mouse.move(cx,viewport.height*.80);
   if(action==='neutral'||action==='release')await page.mouse.move(cx,cy);
   if(action==='hold'){await page.mouse.move(cx,cy);await page.mouse.down();}
   if(action==='release')await page.mouse.up();
   if(action==='settings')await page.locator('#settings-button').press('Enter');
   if(action==='close')await page.locator('#settings .pane-close').press('Enter');
  }
  if(tailFrom!==null&&row.presentation.endAge!==null&&nextShower<showerAges.length&&row.presentation.endAge>=2.6+showerAges[nextShower]){
   await page.screenshot({path:`${out}/shower-${nextShower}.png`});nextShower++;
  }
  if(row.presentation.endAge!==null&&row.presentation.endAge>=7.2)break;
  await page.waitForTimeout(tailFrom===null?650:100);
 }
 await page.screenshot({path:`${out}/thanks.png`});
 const fullEnd=await page.evaluate(()=>{const b=window.__BUMER__,c=window.__capture;const gl=document.querySelector('#world').getContext('webgl2'),e=gl.getExtension('WEBGL_debug_renderer_info');return{confettiCanvases:document.querySelectorAll('.thank-you-confetti').length,decode:b.decodeRecord(),sourceEvents:b.transport.sourceEvents,completionEvents:b.transport.completionEvents,lifecycle:b.lifecycle(),audioEpoch:c.audioEpoch,captureStart:{contextSeconds:c.startContext},renderer:gl.getParameter(e.UNMASKED_RENDERER_WEBGL),intervals:b.metrics.intervals};});
 await page.evaluate(()=>window.__capture.recorder.stop());await page.waitForFunction(()=>window.__capture.done,{timeout:30000});await audioQueue;
 if(errors.length)throw Error(JSON.stringify(errors));
 if(fullEnd.lifecycle.raf!==0||fullEnd.confettiCanvases!==0||fullEnd.lifecycle.finish.phase!=='thanks')throw Error('Finite finish did not settle cleanly');
 await page.waitForTimeout(500);const video=page.video();await context.close();await video.saveAs(`${out}/page-video.webm`);
 const videoEpoch=(beforePage+afterPage)/2,delay=Math.max(0,fullEnd.audioEpoch-videoEpoch);
 // Insert only the measured pre-gesture silence. Preserve source video/Opus
 // packets; page video begins in the newPage() observation interval below.
 execFileSync('ffmpeg',['-v','error','-y','-i',`${out}/page-video.webm`,'-itsoffset',String(delay/1000),'-i',`${out}/master.webm`,'-map','0:v:0','-map','1:a:0','-c','copy',`${out}/${view}-${tailFrom===null?'full':'tail'}.webm`]);
 const media=await readFile(`${out}/${view}-${tailFrom===null?'full':'tail'}.webm`);
 await writeFile(`${out}/${view}-trace.json`,JSON.stringify({status:'captured',captureKind,diagnosticSeekSeconds:tailFrom,runtimeIdentitySha256,recorderSha256:createHash('sha256').update(await readFile(import.meta.filename)).digest('hex'),scope:(tailFrom===null?'Full-song uninterrupted capture. ':'Tail diagnostic with one explicit seek; not a full-song recording. ')+'Normal-speed full-page browser recording plus actual master output. No playback-rate change, replacement audio or viewport-quality reduction; any diagnostic seek is explicitly recorded. Renderer and native foreground ownership are measured; capture cadence is not an uncaptured performance benchmark or human/device approval.',viewport,software,headed,foreground,fullEnd,trace,errors,videoEpochObservation:{beforePage,afterPage,selected:videoEpoch,uncertaintyMs:(afterPage-beforePage)/2},audioVideoOffsetMs:delay,alignmentLimit:'Page-video origin is bounded by newPage observation times; digital source correlation checks audio duration/drift separately. Physical AV alignment remains pending.',output:{bytes:media.length,sha256:createHash('sha256').update(media).digest('hex')}},null,2)+'\n');
 console.log(tailFrom===null?'FULL_CAPTURE_PASS':'TAIL_DIAGNOSTIC_PASS',view,media.length);
}catch(e){await writeFile(`${out}/FAILED.json`,JSON.stringify({error:String(e),errors,trace},null,2));throw e;}
finally{clearInterval(timer);await browser.close();}

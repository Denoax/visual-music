/** Trusted-input route diagnostic for serial UI task04. Read/apply $reference-led-design.
 * No runtime mutation: pointer state is changed only by real Playwright gestures. */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const out = 'evidence/ui-loops';
const recording = process.argv.includes('--record');
const prefix = process.argv.find(value => value.startsWith('--prefix='))?.slice(9) || '04-baseline';
const preview = process.env.BUMER_PREVIEW || 'http://127.0.0.1:4175/';
const sha = value => createHash('sha256').update(value).digest('hex');
await mkdir(out,{recursive:true});
const index = await fetch(preview).then(response=>response.text());
const script = index.match(/src="([^"]+\.js)"/)?.[1];
if(!script)throw Error('Expected current production build');
const record = {scope:'Bounded trusted-pointer input/camera diagnostic, not a performance benchmark or human motion/listening approval. Real MP3 source runs at normal rate; developer seeking establishes identical song windows; no direct mutation of held/turbo/route state.',createdUtc:new Date().toISOString(),commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),harnessSha256:sha(await readFile(new URL(import.meta.url))),preview,runtime:{indexSha256:sha(index),script,scriptSha256:sha(Buffer.from(await fetch(new URL(script,preview)).then(response=>response.arrayBuffer())))},conditions:{headless:true,viewport:{width:1280,height:720},deviceScaleFactor:1,seekSeconds:84,comparisonWindow:[84.25,88.25],gesture:'Trusted Playwright mousemove centre; left mouse.down/up only on native #world canvas; no synthetic/direct held assignment'},errors:[],runs:[]};
let video, context;
const browser = await chromium.launch({headless:true,executablePath:process.env.BUMER_CHROME||'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--enable-automation','--ozone-platform=x11','--use-gl=angle','--use-angle=gl']});
try {
 const page = await browser.newPage({viewport:{width:1280,height:720},deviceScaleFactor:1,...(recording?{recordVideo:{dir:out,size:{width:1280,height:720}}}:{})});
 if(recording){context=page.context();video=page.video();record.video={scope:'SILENT normal-speed browser diagnostic; includes loader/start, neutral84s seek, held84s seek and release. No audio track; not an actual-audio recording/full song/foreground performance approval.',viewport:{width:1280,height:720},deviceScaleFactor:1,retimed:false};}
 page.setDefaultTimeout(120000);
 page.on('pageerror',error=>record.errors.push(error.stack??error.message));
 page.on('console',message=>{if(message.type()==='error')record.errors.push(message.text());});
 await page.goto(`${preview}?dev=1`);
 await page.locator('#start:not([disabled])').waitFor({state:'visible'});
 await page.locator('#developer').evaluate(node=>node.hidden=true);
 record.gl = await page.locator('#world').evaluate(canvas=>{const gl=canvas.getContext('webgl2'),ext=gl?.getExtension('WEBGL_debug_renderer_info');return gl?{available:true,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),timerAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2')}:{available:false};});
 if(!record.gl.available||/swiftshader|llvmpipe|lavapipe|software/i.test(record.gl.renderer))throw Error('Native NVIDIA GL required; no software substitution');
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.__BUMER__?.lifecycle().fieldEntered);
 await page.evaluate(()=>{
  window.__BOOST_EVENTS__=[];
  for(const type of ['pointerdown','pointerup','pointercancel','lostpointercapture','blur'])document.addEventListener(type,event=>{const b=window.__BUMER__;const item={type,trusted:event.isTrusted,target:event.target.id??event.target.tagName,button:event.button??null,pointerId:event.pointerId??null,atMs:performance.now(),presentation:b.transport.presentation().seconds};window.__BOOST_EVENTS__.push(item);queueMicrotask(()=>{item.pointerAfter={...b.pointer.state};item.flightAfter=b.world.snapshot().flight.input;});},true);
 });
 const centre = await page.locator('#world').evaluate(canvas=>{const r=canvas.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};});
 await page.mouse.move(centre.x,centre.y);
 for(const held of [false,true]) {
  await page.mouse.up({button:'left'});
  await page.mouse.move(centre.x,centre.y);
  await page.evaluate(()=>window.__BUMER__.seek(84));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const before=await page.evaluate(()=>{const b=window.__BUMER__;return {pointer:{...b.pointer.state},snapshot:b.world.snapshot(),world:b.world.diagnostics(),transport:b.transport.presentation(),state:b.transport.state};});
  if(held)await page.mouse.down({button:'left'});
  const samples=await page.evaluate(()=>new Promise(resolve=>{
   const data=[];
   function frame(){const b=window.__BUMER__,world=b.world.diagnostics(),snapshot=b.world.snapshot();data.push({atMs:performance.now(),song:snapshot.last,presentation:b.transport.presentation().seconds,pointer:{...b.pointer.state},flightInput:snapshot.flight.input,turbo:snapshot.flight.state.turbo,pose:world.flight.pose,camera:world.camera,cameraLens:world.cameraLens,cameraQuaternion:world.cameraQuaternion,state:b.transport.state});if(snapshot.last<88.6)requestAnimationFrame(frame);else resolve(data);}requestAnimationFrame(frame);
  }));
  await page.mouse.up({button:'left'});
  const release=held?await page.evaluate(()=>new Promise(resolve=>{const data=[],start=window.__BUMER__.world.snapshot().last;function frame(){const b=window.__BUMER__,s=b.world.snapshot(),w=b.world.diagnostics();data.push({song:s.last,age:s.last-start,pointer:{...b.pointer.state},flightInput:s.flight.input,turbo:s.flight.state.turbo,camera:w.camera});if(s.last-start<2)requestAnimationFrame(frame);else resolve(data);}requestAnimationFrame(frame);})):[];
  const endFrame=recording?`${out}/${prefix}-${held?'held':'neutral'}-end.png`:null;
  if(endFrame)await page.screenshot({path:endFrame});
  record.runs.push({held,before,samples,release,...(recording?{endFrame}:{} )});
 }
 record.events=await page.evaluate(()=>window.__BOOST_EVENTS__);
 record.decode=await page.evaluate(()=>window.__BUMER__.decodeRecord());
 function at(samples,t){const right=samples.findIndex(sample=>sample.song>=t);if(right<1)throw Error(`Missing bracketing samples at${t}`);const a=samples[right-1],b=samples[right],k=(t-a.song)/(b.song-a.song||1);return {camera:a.camera.map((value,index)=>value+(b.camera[index]-value)*k),turbo:a.turbo+(b.turbo-a.turbo)*k,lens:a.cameraLens+(b.cameraLens-a.cameraLens)*k};}
 record.comparison=record.runs.map(run=>{const start=at(run.samples,84.25),end=at(run.samples,88.25);return{held:run.held,start,end,delta:end.camera.map((value,index)=>value-start.camera[index]),horizontalDisplacement:Math.hypot(end.camera[0]-start.camera[0],end.camera[2]-start.camera[2]),heldSamples:run.samples.filter(sample=>sample.pointer.held&&sample.flightInput.held).length,sampleCount:run.samples.length,motionPolicy:run.before.world.flight.motionPolicy};});
 record.displacementGain=record.comparison[1].horizontalDisplacement/record.comparison[0].horizontalDisplacement;
 record.status='MEASURED';
 if(record.errors.length)throw Error(`Runtime errors:${record.errors.join(';')}`);
} catch(error){record.status='FAILED';record.errors.push(error.stack??String(error));throw error;}
finally{
 try{
  if(context)await context.close();
  if(video){const raw=await video.path(),path=`${out}/${prefix}-silent-diagnostic.webm`;await video.saveAs(path);await unlink(raw);const bytes=await readFile(path);record.video={...record.video,path,bytes:bytes.length,sha256:sha(bytes),streams:JSON.parse(execFileSync('ffprobe',['-v','error','-show_entries','stream=codec_name,codec_type,width,height,r_frame_rate:format=duration,size','-of','json',path],{encoding:'utf8'}))};}
 }catch(error){record.status='FAILED';record.errors.push(error.stack??String(error));throw error;}
 finally{await browser.close();await writeFile(`${out}/${prefix}-boost.json`,JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify({status:record.status,renderer:record.gl,comparison:record.comparison,displacementGain:record.displacementGain,video:record.video,errors:record.errors},null,2));}
}

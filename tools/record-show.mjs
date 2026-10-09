/** Capture actual live WebGL + the active transport's post-volume graph output. */
import {chromium} from '@playwright/test';
import {appendFile,writeFile,mkdir} from 'node:fs/promises';
const gentle=process.argv.includes('--gentle'),name=gentle?'gentle':'standard';
const output=new URL('../evidence/lights-v2/',import.meta.url).pathname;await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:false,executablePath:process.env.BUMER_CHROME,args:['--no-sandbox','--ozone-platform=x11','--use-gl=angle','--use-angle=gl']});
const page=await browser.newPage({viewport:gentle?{width:390,height:844}:{width:1440,height:900},deviceScaleFactor:1});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
const file=`${output}${name}-full.webm`;await writeFile(file,'');
await page.exposeFunction('writeCapture',async data=>appendFile(file,Buffer.from(data,'base64')));
await page.goto('http://127.0.0.1:4175/?dev=1');await page.waitForFunction(()=>window.__BUMER__?.world()&&!document.querySelector('#start').disabled);
if(gentle){await page.locator('#settings-button').click();await page.locator('#reduced').check();await page.locator('.close').click();}
await page.evaluate(()=>document.querySelector('#developer').hidden=true);
// Warm the pipeline, then reconstruct the actual entrance. Never trim adverse results.
for(const t of [25,116,211,0]){await page.evaluate(t=>window.__BUMER__.seek(t),t);await page.waitForTimeout(250);}
await page.evaluate(()=>{
 const api=window.__BUMER__,tap=api.transport.captureOutput(),canvas=document.querySelector('#world');
 const stream=canvas.captureStream(60);for(const track of tap.stream.getAudioTracks())stream.addTrack(track);
 const mime=MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')?'video/webm;codecs=vp9,opus':'video/webm;codecs=vp8,opus';
 const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:8_000_000,audioBitsPerSecond:192_000});
 let queue=Promise.resolve(),startedAt=performance.now();
 recorder.ondataavailable=e=>{queue=queue.then(async()=>{const bytes=new Uint8Array(await e.data.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=32768)text+=String.fromCharCode(...bytes.subarray(i,i+32768));await window.writeCapture(btoa(text));});};
 window.finishCapture=()=>new Promise((resolve,reject)=>{recorder.onerror=reject;recorder.onstop=async()=>{try{await queue;tap.dispose();stream.getVideoTracks().forEach(t=>t.stop());resolve({mime,elapsed_seconds:(performance.now()-startedAt)/1000});}catch(e){reject(e);}};recorder.stop();});
 api.resetMetrics();api.transport.setVolume(.7);recorder.start(1500);
});
await page.locator('#start').click();
let clicks=0;
const deadline=Date.now()+Math.ceil(await page.evaluate(()=>window.__BUMER__.transport.duration))*1000+60000;
while(await page.evaluate(()=>window.__BUMER__.transport.state!=='ended')){
 if(Date.now()>deadline){await page.evaluate(()=>window.finishCapture()).catch(()=>{});await browser.close();throw new Error('Capture timed out before the song ended; partial file retained.');}
 await page.waitForTimeout(15000);
 const position=await page.evaluate(()=>window.__BUMER__.transport.position());console.log(`${name}: ${position.toFixed(1)} / 244.3 s`);
 // Exercise bounded pointer steering and repeated sculpture taps during complete playback.
 if(position>43&&position<68){await page.mouse.move(gentle?180:580,gentle?570:520);await page.mouse.click(gentle?180:580,gentle?570:520);clicks++;}
 if(position>82&&position<92)await page.mouse.move(gentle?195:720,gentle?422:450);
 if(position>200&&position<226){await page.mouse.click(gentle?110:540,gentle?420:340);clicks++;}
 if(await page.evaluate(()=>window.__BUMER__.transport.state==='paused')){await page.evaluate(()=>window.finishCapture());await browser.close();throw new Error('Playback paused during capture; partial file retained.');}
}
const capture=await page.evaluate(()=>window.finishCapture());
const record=await page.evaluate(()=>({decode:window.__BUMER__.decodeRecord(),metrics:window.__BUMER__.metrics,scene:window.__BUMER__.world().diagnostics(),viewport:[innerWidth,innerHeight],state:window.__BUMER__.transport.state,lastFrame:window.__BUMER__.getFrame()}));
const percentile=(xs,p)=>{const a=xs.toSorted((x,y)=>x-y);return a[Math.min(a.length-1,Math.floor((a.length-1)*p))]};
const intervals=record.metrics.intervals,lateness=record.metrics.anchors.map(a=>a.lateness_ms);
const summary={interval_ms:{median:percentile(intervals,.5),p95:percentile(intervals,.95),max:Math.max(...intervals),over50:intervals.filter(x=>x>50).length,samples:intervals.length},software_anchor_lateness_ms:{p95:percentile(lateness,.95),max:Math.max(...lateness),anchors:record.metrics.anchors.length,first_to_last_difference:record.metrics.anchors.at(-1).lateness_ms-record.metrics.anchors[0].lateness_ms}};
await writeFile(`${output}${name}-playback.json`,JSON.stringify({name,capture,browser:browser.version(),method:'Single full continuous live canvas recording with active post-gain Web Audio stream; desktop RTX 4070. RAF intervals include video capture overhead; these are not GPU timings. Portrait is viewport emulation, not a phone. No acoustic/display measurement or listening claim.',clickAttempts:clicks,record,summary,errors},null,2));
await browser.close();console.log(JSON.stringify(summary));if(errors.length){console.error(errors);process.exitCode=1;}

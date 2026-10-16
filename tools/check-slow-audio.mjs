/** Audio-only stress of the actual app graph; frame scheduling is explicitly
 * stopped after entry so this is never reported as renderer performance. */
import {chromium} from 'playwright';import {writeFile} from 'node:fs/promises';import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true,executablePath:'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600},reducedMotion:'reduce'});await page.goto('http://127.0.0.1:4175/?dev=1');await page.locator('#start:enabled').waitFor({timeout:120000});await page.locator('#start').press('Enter');await page.waitForFunction(()=>window.__BUMER__.lifecycle().fieldEntered);
 await page.evaluate(async()=>{
  const b=window.__BUMER__,ctx=b.transport.audioContext;cancelAnimationFrame(b.lifecycle().raf);b.transport.setVolume(1);
  const code=`class PeakAudit extends AudioWorkletProcessor{constructor(){super();this.peak=0;this.clips=0;this.frames=0;this.port.onmessage=()=>{this.peak=0;this.clips=0;this.frames=0;};}process(inputs,outputs){for(const c of inputs[0]||[]){for(const s of c){this.peak=Math.max(this.peak,Math.abs(s));if(Math.abs(s)>1)this.clips++;this.frames++;}}for(const c of outputs[0])c.fill(0);this.port.postMessage({peak:this.peak,clippedSamples:this.clips,samples:this.frames});return true;}}registerProcessor('peak-audit',PeakAudit);`;
  const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));try{await ctx.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
  const meter=new AudioWorkletNode(ctx,'peak-audit');b.transport.masterOutput.connect(meter);meter.connect(ctx.destination);window.__audioAudit={meter,result:null};meter.port.onmessage=e=>window.__audioAudit.result=e.data;
  const buf=b.transport.decodedBuffer;let peak=0,index=0;for(let ch=0;ch<buf.numberOfChannels;ch++){const data=buf.getChannelData(ch);for(let i=0;i<data.length;i++)if(Math.abs(data[i])>peak){peak=Math.abs(data[i]);index=i;}}
  window.__audioAudit.peakSourceSeconds=index/buf.sampleRate;b.transport.seek(Math.max(0,index/buf.sampleRate-1));
 });
 for(let i=0;i<20;i++){await page.locator('#settings-button').press('Enter');await page.waitForTimeout(80);}
 await page.waitForTimeout(1200);const stress=await page.evaluate(()=>({...window.__audioAudit.result,sourcePeakSeconds:window.__audioAudit.peakSourceSeconds,master:window.__BUMER__.transport.volumeLevel}));assert.equal(stress.clippedSamples,0);assert.ok(stress.peak>.1&&stress.peak<.98);
 await page.evaluate(()=>{window.__BUMER__.transport.setMuted(true);window.__audioAudit.meter.port.postMessage('reset');});await page.waitForTimeout(200);await page.evaluate(()=>window.__audioAudit.meter.port.postMessage('reset'));await page.waitForTimeout(200);const mute=await page.evaluate(()=>window.__audioAudit.result);assert.ok(mute.peak<.001);
 await writeFile('evidence/slow-entry-finish/mix-stress.json',JSON.stringify({status:'passed',scope:'Actual browser stereo master AudioWorklet sample audit, repeated native Settings actions around the decoded recording peak at master volume1; no duplicate output (meter emits zeros), no music replacement. Frame scheduling intentionally stopped for audio-only isolation; not motion/performance evidence.',stress,mute,human_listening:'pending; digital sample bounds do not approve timbre or speakers/headphones'},null,2)+'\n');console.log('AUDIO_MIX_PASS');
}finally{await browser.close();}

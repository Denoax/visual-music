/** Matched foreground baseline/candidate measurement. Read/apply $reference-led-design.
 * No source edits, recording, quality changes or synthetic GPU timing. */
import { chromium } from 'playwright';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const arg = (name, fallback) => process.argv.find(a => a.startsWith(`--${name}=`))?.slice(name.length + 3) ?? fallback;
const label = arg('label', 'baseline');
const preview = arg('preview', 'http://127.0.0.1:4176/');
const out = arg('out', 'evidence/black-sky-wave-colour/performance');
const headless = process.argv.includes('--headless');
const software = process.argv.includes('--software');
const probeOnly = process.argv.includes('--probe');
const warmupMs = Number(arg('warmup', '2000'));
const measureMs = Number(arg('measure', '4000'));
const repetitions = Number(arg('repetitions', '3'));
const anchors = arg('anchors', '30,84,112,184').split(',').map(Number);
const stamp = new Date().toISOString();
await mkdir(out, {recursive:true});
const errors = [];
const records = [];
const run = { label, startedUtc:stamp, preview, conditions:{headless,software,deviceScaleFactor:1,desktop:{width:1280,height:720},portrait:{width:390,height:844},warmupMs,measureMs,repetitions,anchors,input:'neutral pointer; no held input; same reset/seek and route per anchor',recording:false,quality:'production unchanged; native application defaults; no lowered tier/caps/bloom/resolution'}, errors,records, probes:[], scope:'RAF intervals are wall-clock presentation intervals, never GPU/CPU timing. GPU elapsed samples are only actual EXT_disjoint_timer_query_webgl2. A software backend is not hardware evidence. A native compositor focus failure invalidates the corresponding foreground claim. No listening, motion or physical-device approval.' };
const sha = value => createHash('sha256').update(value).digest('hex');
const native = (cmd,args=[]) => {try{return {ok:true,value:execFileSync(cmd,args,{encoding:'utf8'}).trim()};}catch(error){return {ok:false,error:String(error)};}};
run.host={bootId:(await readFile('/proc/sys/kernel/random/boot_id','utf8')).trim(),uptimeSeconds:Number((await readFile('/proc/uptime','utf8')).split(' ')[0])};
run.nativeBefore = native('nvidia-smi',['--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu','--format=csv,noheader']);
const summary = values => {const sorted=values.filter(Number.isFinite).toSorted((a,b)=>a-b); const q=p=> sorted.length ? sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*p))] : null;return {samples:sorted.length,median:q(.5),p95:q(.95),max:sorted.at(-1)??null,over50Ms:sorted.filter(n=>n>50).length};};
let browser;
const save = async () => {run.nativeAfter=native('nvidia-smi',['--query-gpu=name,driver_version,memory.total,memory.used,memory.free,utilization.gpu','--format=csv,noheader']); await writeFile(`${out}/${label}.json`,JSON.stringify(run,null,2)+'\n');};
try {
  const html=await fetch(preview).then(r=>{if(!r.ok)throw Error(`HTTP ${r.status}`);return r.text();});
  const script=html.match(/src="([^"]+\.js)"/)?.[1];if(!script)throw Error('Not a production Vite build');
  run.runtime={indexSha256:sha(html),script,scriptSha256:sha(Buffer.from(await fetch(new URL(script,preview)).then(r=>r.arrayBuffer())))};
  const args=software ? ['--no-sandbox','--enable-automation','--enable-unsafe-swiftshader'] : ['--no-sandbox','--enable-automation','--ozone-platform=x11','--use-gl=angle','--use-angle=gl'];
  run.conditions.browserArgs=args;
  browser=await chromium.launch({headless,executablePath:process.env.BUMER_CHROME||'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args});
  run.chromiumVersion=browser.version();
  const probe=await browser.newPage();
  const cdp=await probe.context().newCDPSession(probe);
  const command=await cdp.send('Browser.getBrowserCommandLine');
  const profile=command.arguments.find(a=>a.startsWith('--user-data-dir='))?.split('=').slice(1).join('=');
  if(!profile?.startsWith('/tmp/playwright_chromiumdev_profile-'))throw Error('Temporary owned Chromium profile not proven');
  run.profileOwnership=headless ? 'Temporary Playwright Chromium profile obtained from CDP; no native window or foreground claim' : 'Temporary Playwright Chromium profile obtained from CDP; foreground measurement checks match native client process command';
  const gl=await probe.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return {available:false};const ext=gl.getExtension('WEBGL_debug_renderer_info');return {available:true,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),timerAvailable:!!gl.getExtension('EXT_disjoint_timer_query_webgl2'),pointSizeRange:Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE))};});
  run.probes.push(gl);
  console.log('GL_PROBE',JSON.stringify(gl));
  if(!gl.available) {run.status='BLOCKED: native WebGL2 context creation failed';await save();process.exitCode=2;}
  else if(!software && /swiftshader|llvmpipe|software|lavapipe/i.test(gl.renderer)) {run.status='BLOCKED: requested hardware but renderer is software';await save();process.exitCode=2;}
  else if(probeOnly) {run.status='PROBE_COMPLETE';await save();}
  else {
    const foreground=async page=>{
      await page.bringToFront();
      if(headless)return {scope:'headless; no foreground claim'};
      if(process.env.XDG_CURRENT_DESKTOP!=='Hyprland')return {scope:'UNVERIFIED: native compositor unavailable'};
      const clients=JSON.parse(execFileSync('hyprctl',['clients','-j'],{encoding:'utf8'}));
      const owned=[];
      for(const client of clients){if(!client.mapped||client.hidden)continue;try{if((await readFile(`/proc/${client.pid}/cmdline`,'utf8')).includes(profile))owned.push(client);}catch{}}
      if(owned.length!==1)throw Error(`Expected one owned temporary Chromium client; found ${owned.length}`);
      const target=owned[0]; if(!/^0x[0-9a-f]+$/.test(target.address))throw Error('Invalid compositor address');
      execFileSync('hyprctl',['eval',`hl.dispatch(hl.dsp.focus({window=hl.get_window("address:${target.address}")}))`]);
      const active=JSON.parse(execFileSync('hyprctl',['activewindow','-j'],{encoding:'utf8'}));
      return {scope:'native Hyprland, exact temporary profile ownership verified',address:target.address,activeAddress:active.address,ownedActive:active.address===target.address,workspace:active.workspace?.id,monitor:active.monitor};
    };
    await probe.close();
    for(const portrait of [false,true]) {
      const page=await browser.newPage({viewport:portrait?{width:390,height:844}:{width:1280,height:720},deviceScaleFactor:1,hasTouch:portrait,isMobile:portrait});
      page.setDefaultTimeout(180000);
      page.on('pageerror',e=>errors.push(e.stack??e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      await page.goto(`${preview}?dev=1`);
      await foreground(page);
      await page.locator('#start:not([disabled])').waitFor({state:'visible'});
      await page.locator('#developer').evaluate(n=>n.hidden=true);
      await page.locator('#start').click();
      await page.waitForFunction(()=>window.__BUMER__?.lifecycle().fieldEntered);
      for(let repetition=0;repetition<repetitions;repetition++)for(const anchor of anchors){
        const before=await foreground(page);
        await page.evaluate(t=>{window.__BUMER__.pointer.clear();window.__BUMER__.seek(t);},anchor);
        await page.waitForTimeout(warmupMs);
        await page.evaluate(()=>window.__BUMER__.resetMetrics());
        const focus=[];const start=Date.now();
        while(Date.now()-start<measureMs){focus.push({elapsedMs:Date.now()-start,...await foreground(page)});await page.waitForTimeout(250);}
        const record=await page.evaluate(()=>{const b=window.__BUMER__;return {visibility:document.visibilityState,focused:document.hasFocus(),state:b.transport.state,position:b.transport.position(),intervals:[...b.metrics.intervals],gpu:[...b.world.gpuSamples],world:b.world.diagnostics(),decode:b.decodeRecord()};});
        records.push({portrait,repetition,anchor,warmupMs,measureMs,foregroundBefore:before,foreground:focus,...record,rafSummary:summary(record.intervals),gpuElapsedSummary:summary(record.gpu)});
        console.log('SAMPLE',label,portrait?'portrait':'desktop',repetition,anchor,JSON.stringify(records.at(-1).rafSummary),JSON.stringify(records.at(-1).gpuElapsedSummary));
        await save();
      }
      await page.screenshot({path:`${out}/${label}-${portrait?'portrait':'desktop'}.png`});await page.close();
    }
    run.status=errors.length?'COMPLETED_WITH_ERRORS':'COMPLETED';await save();
  }
} catch(error){errors.push(error.stack??String(error));run.status='FAILED';await save();throw error;}
finally {if(browser)await browser.close();await save();}

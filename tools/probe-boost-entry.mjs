import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
const out=process.argv.find(a=>a.startsWith('--out='))?.slice(6)||'evidence/boost-report/current-normal';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--ozone-platform=x11','--use-gl=angle','--use-angle=gl']});
const page=await browser.newPage({viewport:{width:1280,height:720},recordVideo:{dir:out,size:{width:1280,height:720}}});
const records=[],errors=[];
page.on('pageerror',e=>errors.push(String(e)));
try{
 await page.goto('http://127.0.0.1:4175/?dev=1');
 await page.locator('#start:enabled').waitFor();
 await page.locator('#developer').evaluate(e=>e.hidden=true);
 const defaults=await page.evaluate(()=>({reducedPreference:matchMedia('(prefers-reduced-motion:reduce)').matches,reduced:document.querySelector('#reduced').checked}));
 await page.locator('#start').click();
 await page.waitForFunction(()=>window.__BUMER__.lifecycle().fieldEntered);
 await page.mouse.move(640,360);
 const sample=label=>page.evaluate(label=>{const b=window.__BUMER__,s=b.world.snapshot();return{label,t:b.transport.presentation().seconds,state:b.transport.state,focus:document.hasFocus(),target:document.elementFromPoint(640,360)?.id,active:document.activeElement?.id,reduced:document.querySelector('#reduced').checked,settingsOpen:document.querySelector('#settings').open,pointer:{...b.pointer.state},input:s.flight.input,turbo:s.flight.state.turbo,speed:s.flight.state.speed,camera:b.world.diagnostics().camera};},label);
 records.push(await sample('entry'));
 for(const [time,action] of [[1,'down'],[4,'up'],[10,'down'],[14,'up'],[16,'end']]){
  await page.waitForFunction(t=>window.__BUMER__.transport.presentation().seconds>=t,time);
  if(action==='down')await page.mouse.down();
  if(action==='up')await page.mouse.up();
  await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
  records.push(await sample(`${time}:${action}`));
 }
 await page.screenshot({path:`${out}/normal-entry.png`});
 const video=page.video();await page.context().close();await video.saveAs(`${out}/normal-entry-silent.webm`);
 await writeFile(`${out}/normal-entry.json`,JSON.stringify({defaults,records,errors,scope:'Normal-rate/no-seek/default-media trusted mouse diagnostic, silent video; not a full-song listening capture.'},null,2)+'\n');
 console.log(JSON.stringify({defaults,records,errors},null,2));
}finally{await browser.close();}

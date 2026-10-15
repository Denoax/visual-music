/** Native actual-audio section diagnostics. Apply $reference-led-design.
 * Seeks are explicit here; these slices are NOT the uninterrupted full-song captures. */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { focusOwnedPreview, foregroundState } from './native-foreground.mjs';
const headless=process.argv.includes('--headless');
const out='evidence/black-sky-wave-colour/review';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless,executablePath:'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox','--enable-automation','--ozone-platform=x11','--use-gl=angle','--use-angle=gl']});
const rows=[],errors=[],focusEvents=[];
const guardedWait=async(page,milliseconds)=>{if(headless){await page.waitForTimeout(milliseconds);return;}const until=Date.now()+milliseconds;while(Date.now()<until){const f=await focusOwnedPreview(page);focusEvents.push({wall:Date.now(),...f});await page.waitForTimeout(Math.min(200,Math.max(1,until-Date.now())));}};
try{
 for(const portrait of [false,true]){
  const view=portrait?'portrait':'desktop',viewport=portrait?{width:390,height:844}:{width:1280,height:720};
  const page=await browser.newPage({viewport,deviceScaleFactor:1,hasTouch:portrait,isMobile:portrait});
  page.setDefaultTimeout(90000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.goto('http://127.0.0.1:4175/?dev=1');const focus=headless?{scope:'Headless native NVIDIA; no native foreground claim'}:await focusOwnedPreview(page);await page.locator('#start:enabled').waitFor();
  await page.locator('#developer').evaluate(e=>e.hidden=true);await page.locator('#start').press('Enter');await page.waitForFunction(()=>window.__BUMER__.lifecycle().fieldEntered);await page.mouse.move(viewport.width/2,viewport.height/2);
  for(const birth of [0,25,40,56,75,94,106,123,139,158,175,190,201]){
   await page.evaluate(t=>{const b=window.__BUMER__;b.pointer.clear();b.seek(t);b.resetMetrics();},birth);
   const samples=[];
   for(const delay of [20,2600,3050]){await guardedWait(page,delay);samples.push(await page.evaluate(()=>{const b=window.__BUMER__;return{presentation:b.transport.presentation(),world:b.world.diagnostics(),intervals:[...b.metrics.intervals]};}));}
   const ownership=headless?focus:foregroundState(focus.address);if(ownership.ownedActive===false)throw Error('Lost native foreground during section diagnostics');
   await page.screenshot({path:`${out}/${view}-birth-${birth}.png`});rows.push({view,birth,ownership,samples});
   console.log('SECTION_DIAGNOSTIC',view,birth);
  }
  await page.close();
 }
 if(errors.length)throw Error(JSON.stringify(errors));
 await writeFile(`${out}/section-diagnostics.json`,JSON.stringify({status:'passed',headless,scope:'Actual native NVIDIA normal-pace5.67s section slices after explicit diagnostic seeks; actual MP3 graph runs, not a replacement soundtrack. These are not uninterrupted full-song recordings or human listening/motion approval.',rows,errors,focusEvents},null,2)+'\n');
}catch(error){await writeFile(`${out}/section-diagnostics-failure.json`,JSON.stringify({status:'failed',error:String(error),rows,errors,focusEvents},null,2)+'\n');throw error;}finally{await browser.close();}

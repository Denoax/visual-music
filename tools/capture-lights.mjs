import {chromium} from '@playwright/test';
import {writeFile,mkdir} from 'node:fs/promises';
const root=new URL('../evidence/lights-v2/',import.meta.url).pathname;await mkdir(root,{recursive:true});
const browser=await chromium.launch({headless:false,executablePath:process.env.BUMER_CHROME,args:['--no-sandbox','--ozone-platform=x11','--use-gl=angle','--use-angle=gl']});
const records=[],errors=[];
for(const [name,width,height] of [['desktop',1440,900],['portrait',390,844]]){
 const page=await browser.newPage({viewport:{width,height},deviceScaleFactor:1});page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.goto('http://127.0.0.1:4175/?dev=1');await page.waitForFunction(()=>window.__BUMER__?.world()&&!document.querySelector('#start').disabled);await page.waitForTimeout(500);
 await page.evaluate(()=>document.querySelector('#developer').hidden=true);
 await page.screenshot({path:`${root}entrance-${name}.png`});
 await page.locator('#start').click();await page.waitForTimeout(1200);await page.locator('#play').click();
 for(const [label,time] of [['rise',25],['field',43],['ribbons',73],['climb',116],['gather',154],['canopy',211],['fade',241]]){
  await page.evaluate(t=>window.__BUMER__.seek(t),time);await page.waitForTimeout(250);await page.screenshot({path:`${root}${label}-${name}.png`});
 }
 records.push(await page.evaluate(()=>({viewport:[innerWidth,innerHeight],decode:window.__BUMER__.decodeRecord(),scene:window.__BUMER__.world().diagnostics()})));await page.close();
}
await writeFile(`${root}frames.json`,JSON.stringify({browser:browser.version(),method:'Playwright headful Chromium on desktop RTX 4070; portrait viewport is emulation, not a phone; developer drawer hidden for product frames',records,errors},null,2));await browser.close();if(errors.length){console.error(errors);process.exitCode=1;}

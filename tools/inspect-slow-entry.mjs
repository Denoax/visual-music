import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';
const out='evidence/slow-entry-finish/inspection';await mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.BUMER_CHROME||'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:process.env.BUMER_SOFTWARE==='1'?['--no-sandbox','--enable-unsafe-swiftshader']:['--no-sandbox','--ozone-platform=x11','--use-gl=angle','--use-angle=gl']});
try{
 const page=await browser.newPage({viewport:{width:960,height:600}});const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.log('ERROR',e.message);});page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.log('CONSOLE',m.text());}});
 await page.goto('http://127.0.0.1:4175/?dev=1');await page.waitForTimeout(1200);await page.screenshot({path:`${out}/loading.png`});
 await page.locator('#start:enabled').waitFor({timeout:90000});console.log('READY');await page.locator('#developer').evaluate(e=>e.hidden=true);await page.waitForTimeout(1500);await page.screenshot({path:`${out}/ready.png`});
 await page.locator('#start').click();await page.waitForTimeout(1800);console.log('PLAY',await page.evaluate(()=>({state:__BUMER__.transport.state,lifecycle:__BUMER__.lifecycle(),decode:__BUMER__.decodeRecord()})));
 await page.waitForTimeout(11500);await page.screenshot({path:`${out}/opening-13.png`});
 await page.locator('#settings-button').click();await page.waitForTimeout(300);await page.screenshot({path:`${out}/settings.png`});
 await page.locator('#settings .pane-close').click();await page.waitForTimeout(300);
 const result=await page.evaluate(()=>({decode:__BUMER__.decodeRecord(),world:__BUMER__.world.diagnostics(),lifecycle:__BUMER__.lifecycle(),events:__BUMER__.transport.sourceEvents}));
 await writeFile(`${out}/first-pass.json`,JSON.stringify({errors,...result},null,2)+'\n');console.log('INSPECT_COMPLETE',errors.length);
}finally{await browser.close();}

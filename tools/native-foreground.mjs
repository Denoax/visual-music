import {execFileSync} from 'node:child_process';
import {readFile} from 'node:fs/promises';

/** Chromium's document.hasFocus() can remain true beneath another Hyprland
 * window. Focus only our temporary Playwright profile, never a user browser.
 * Other desktops retain normal Playwright foreground handling. */
export async function focusOwnedPreview(page){
 await page.bringToFront();
 if(process.env.XDG_CURRENT_DESKTOP!=='Hyprland')return{scope:'Playwright bringToFront; compositor verification unavailable'};
 const clients=JSON.parse(execFileSync('hyprctl',['clients','-j'],{encoding:'utf8'}));
 const owned=[];
 for(const c of clients){
  if(!c.title?.includes('BUMER.EXE')||!c.mapped||c.hidden)continue;
  const command=await readFile(`/proc/${c.pid}/cmdline`,'utf8');
  if(command.includes('/tmp/playwright_chromiumdev_profile-')&&command.includes('chrome'))owned.push(c);
 }
 if(owned.length!==1)throw Error(`Expected one owned BUMER preview window; found ${owned.length}`);
 const target=owned[0];if(!/^0x[0-9a-f]+$/.test(target.address))throw Error('Invalid compositor address');
 execFileSync('hyprctl',['eval',`hl.dispatch(hl.dsp.focus({window=hl.get_window("address:${target.address}")}))`]);
 return foregroundState(target.address);
}
export function foregroundState(address){
 if(!address)return{scope:'compositor verification unavailable'};
 const c=JSON.parse(execFileSync('hyprctl',['activewindow','-j'],{encoding:'utf8'}));
 return{scope:'Hyprland active window address, temporary Playwright profile ownership verified',address,activeAddress:c.address,ownedActive:c.address===address,workspace:c.workspace?.id,monitor:c.monitor};
}

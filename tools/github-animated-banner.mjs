// A documentation composition from actual renderer footage. No runtime changes.
import { chromium } from 'playwright';
import {createServer} from 'node:http';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve,relative,extname,sep} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=resolve(import.meta.dirname,'..');
const out=resolve(root,'showcase/github');
const work=resolve(root,'evidence/github-publication/banner-work');
await mkdir(work,{recursive:true});
const source=resolve(process.argv.find(a=>a.startsWith('--source='))?.slice(9)||resolve(root,'evidence/dance-floor-only/visual-music-capture/desktop-full.webm'));
const server=createServer(async(req,res)=>{
  try{
    const file=resolve(root,'.'+new URL(req.url,'http://localhost').pathname);
    if(relative(root,file).split(sep).includes('..')){res.writeHead(403).end();return;}
    res.setHeader('Content-Type',extname(file)==='.html'?'text/html; charset=utf-8':'font/woff2');
    res.end(await readFile(file));
  }catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
  browser=await chromium.launch({headless:true,executablePath:process.env.BUMER_CHROME||'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:990,height:352}});
  await page.goto(`http://127.0.0.1:${server.address().port}/showcase/github/animated-banner.html`);
  await page.evaluate(()=>document.fonts.ready);
  await page.screenshot({path:resolve(work,'lettering.png'),omitBackground:true});
}finally{
  if(browser)await browser.close();
  await new Promise(r=>server.close(r));
}
const gif=resolve(out,'visual-music-loop.gif');
execFileSync('ffmpeg',['-v','error','-y','-ss','58','-t','6.5','-i',source,'-loop','1','-i',resolve(work,'lettering.png'),'-filter_complex',
  '[0:v]fps=30,scale=990:-1:flags=lanczos,crop=990:352:0:64,split[front][lap];'+
  '[front]trim=start=0.5:end=6.5,setpts=PTS-STARTPTS[a];[lap]trim=start=0:end=0.5,setpts=PTS-STARTPTS[b];'+
  '[a][b]xfade=transition=fade:duration=0.5:offset=5.5[motion];[motion][1:v]overlay=0:0:shortest=1,split[c][d];'+
  '[c]palettegen=max_colors=64:stats_mode=full[p];[d][p]paletteuse=dither=none:diff_mode=rectangle',
  '-t','6','-an','-loop','0',gif],{maxBuffer:1024*1024});
execFileSync('ffmpeg',['-v','error','-y','-i',gif,'-frames:v','1','-c:v','libwebp','-lossless','1',resolve(out,'visual-music-loop-poster.webp')]);
async function identity(file){const data=await readFile(file);return {path:relative(root,file),bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')};}
await writeFile(resolve(out,'animated-banner-source.json'),JSON.stringify({
  application:'Visual Music',runtime_commit:'41076b775a7c3be27b1867aa410a518cf2be5073',
  source:await identity(source),lettering:await identity(resolve(root,'showcase/github/animated-banner.html')),
  output:await identity(gif),poster:await identity(resolve(out,'visual-music-loop-poster.webp')),
  processing:'Original actual-audio desktop recording media58-64.5s; audio omitted in this documentation GIF. Original-pace30fps sampling, scaled to990px and cropped to990x352 at y64. Static original DOM lettering in existing Instrument Sans. A disclosed0.5s lap crossfade blends the end of the recorded segment into its beginning; it is an edited banner, not an uninterrupted runtime capture or exact periodic simulation.64-colour GIF palette is lossy. Application code/camera/audio are unchanged.',
  reference:'Actual current Denoax portfolio and Kona Desktop README headers;990x352 profile banner convention. Original footage and font retained; no generated imagery.',
  limits:'GIF file cadence is not device performance or human motion approval. Full original recordings remain in the local complete review archive.'
},null,2)+'\n');
console.log(JSON.stringify(await identity(gif)));

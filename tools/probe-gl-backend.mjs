import {chromium} from 'playwright';
for(const args of [['--no-sandbox','--ignore-gpu-blocklist','--disable-gpu-sandbox','--use-gl=angle','--use-angle=gl'],['--no-sandbox','--use-vulkan=native','--enable-features=Vulkan','--use-angle=vulkan'],['--no-sandbox','--use-gl=angle','--use-angle=gl-egl']]){
 const browser=await chromium.launch({headless:true,executablePath:'/home/mani/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args});
 try{const p=await browser.newPage();console.log(args,await p.evaluate(()=>{const gl=document.createElement('canvas').getContext('webgl2');if(!gl)return 'NO_CONTEXT';const e=gl.getExtension('WEBGL_debug_renderer_info');return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);}));}finally{await browser.close();}
}

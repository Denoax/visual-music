import {chromium} from '@playwright/test';
import {writeFile} from 'node:fs/promises';
const b=await chromium.launch({executablePath:process.env.BUMER_CHROME,args:['--no-sandbox']});
const p=await b.newPage();await p.goto('http://127.0.0.1:4175/review/listening.html');await p.waitForFunction(()=>!document.querySelector('#play').disabled);
// Use the recording’s actual same-origin route from the review page.
const result=await p.evaluate(async()=>{
 const bytes=await (await fetch('../audio/chernyy-bumer.mp3')).arrayBuffer(),records=[];
 for(const rate of [48000,44100]){
  const ctx=new AudioContext({sampleRate:rate}),buffer=await ctx.decodeAudioData(bytes.slice(0));
  const left=buffer.getChannelData(0),right=buffer.getChannelData(1),mono=Array.from(left.subarray(0,rate), (v,i)=>(v+right[i])/2);
  const onset=mono.findIndex(v=>Math.abs(v)>1e-4);
  records.push({sampleRate:buffer.sampleRate,duration:buffer.duration,length:buffer.length,channels:buffer.numberOfChannels,first_threshold_frame:onset,first_threshold_seconds:onset/rate,first_second_mono:mono});await ctx.close();
 }
 return {browser:navigator.userAgent,records};
});
await writeFile('evidence/lights-v2/browser-decodes.json',JSON.stringify(result));await b.close();console.log(result.records.map(({first_second_mono,...r})=>r));

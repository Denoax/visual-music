/** Copy the actual shared stereo master. Keeping the processor alive also
 * supplies the master's natural post-song silence, so MediaRecorder flushes
 * its final partial Opus packet. No oscillator/buffer source or soundtrack. */
export async function prepareRecordingOutput(context) {
 const code=`class ReviewMasterCopy extends AudioWorkletProcessor {
  process(inputs,outputs){const input=inputs[0],output=outputs[0];for(let c=0;c<output.length;c++){if(input?.[c])output[c].set(input[c]);else output[c].fill(0);}return true;}
 } registerProcessor('review-master-copy',ReviewMasterCopy);`;
 const url=URL.createObjectURL(new Blob([code],{type:'text/javascript'}));
 try{await context.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}
}
export function recordingOutput(context,master) {
 const node=new AudioWorkletNode(context,'review-master-copy',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2],channelCount:2,channelCountMode:'explicit'}),destination=context.createMediaStreamDestination();
 master.connect(node);node.connect(destination);
 return {stream:destination.stream,dispose(){master.disconnect(node);node.disconnect();destination.stream.getTracks().forEach(track=>track.stop());}};
}

#!/usr/bin/env python3
"""Conservative captured-frame screening, not a certified WCAG/physical-display test.

Downsampling/encoding can hide tiny transitions. Full-mode recordings are inspected,
with separate luminance pairs and saturated-red UCS transitions. Retain raw maxima;
never turn these diagnostics into a conformance certificate.
"""
import argparse, collections, hashlib, json, subprocess
from pathlib import Path
import numpy as np

class Analyzer:
    def __init__(self, height, width, fps=60):
        self.shape=(height,width); self.fps=fps; self.index=0; self.previous=None
        self.lut=np.where(np.arange(256)/255<=.04045,np.arange(256)/255/12.92,((np.arange(256)/255+.055)/1.055)**2.4).astype(np.float32)
        self.general_ring=collections.deque();self.red_ring=collections.deque()
        self.general_count=np.zeros(self.shape,np.uint8);self.red_count=np.zeros(self.shape,np.uint8)
        self.general_pairs=np.zeros(self.shape,np.uint16);self.red_pairs=np.zeros(self.shape,np.uint16)
        self.maxima={'general_max_pairs_in_one_second_per_pixel':0,'red_max_pairs_in_one_second_per_pixel':0,'general_max_field_fraction_at_four_or_more_pairs':0.,'red_max_field_fraction_at_four_or_more_pairs':0.,'general_max_field_fraction_with_any_pair':0.,'red_max_field_fraction_with_any_pair':0.}
    def field_fraction(self,mask):
        h,w=self.shape;fh=max(1,round(h/3));fw=max(1,round(w/3))
        integral=np.pad(mask.astype(np.int32),((1,0),(1,0))).cumsum(0).cumsum(1)
        areas=integral[fh:,fw:]-integral[:-fh,fw:]-integral[fh:,:-fw]+integral[:-fh,:-fw]
        return float(areas.max()/(fh*fw))
    def add(self,rgb):
        linear=self.lut[rgb];r,g,b=np.moveaxis(linear,2,0);y=.2126*r+.7152*g+.0722*b
        x=.4124564*r+.3575761*g+.1804375*b;z=.0193339*r+.1191920*g+.9503041*b
        den=np.maximum(1e-8,x+15*y+3*z);u=4*x/den;v=9*y/den;saturated=r/np.maximum(1e-8,r+g+b)>=.8
        if self.previous is None:
            self.peak=y.copy();self.direction=np.zeros(self.shape,np.int8);self.transitions=np.zeros(self.shape,np.uint16)
            self.red_u=u.copy();self.red_v=v.copy();self.red_saturated=saturated.copy();self.red_du=np.zeros(self.shape,np.float32);self.red_dv=np.zeros(self.shape,np.float32)
            self.red_transitions=np.zeros(self.shape,np.uint16);self.previous=y;self.index+=1;return
        up=(self.direction<=0)&(y-self.peak>=.1)&(self.peak<.8)
        down=(self.direction>=0)&(self.peak-y>=.1)&(y<.8)
        change=up|down;self.transitions+=change
        general=change&(self.transitions%2==0)
        self.direction[up]=1;self.direction[down]=-1;self.peak[change]=y[change]
        self.peak=np.where(self.direction>0,np.maximum(self.peak,y),np.where(self.direction<0,np.minimum(self.peak,y),self.peak))
        du=u-self.red_u;dv=v-self.red_v;distance=np.hypot(du,dv)
        red_change=(distance>.2)&(saturated|self.red_saturated)
        opposite=(du*self.red_du+dv*self.red_dv)<0
        initial=red_change&(self.red_transitions==0);qualify=red_change&(initial|opposite)
        self.red_transitions+=qualify;red=qualify&(self.red_transitions%2==0)
        self.red_du[qualify]=du[qualify];self.red_dv[qualify]=dv[qualify];self.red_u[qualify]=u[qualify];self.red_v[qualify]=v[qualify];self.red_saturated[qualify]=saturated[qualify]
        for label,current,ring,count,total in [('general',general,self.general_ring,self.general_count,self.general_pairs),('red',red,self.red_ring,self.red_count,self.red_pairs)]:
            if len(ring)>=self.fps:count-=ring.popleft()
            ring.append(current);count+=current;total+=current
            self.maxima[f'{label}_max_pairs_in_one_second_per_pixel']=max(self.maxima[f'{label}_max_pairs_in_one_second_per_pixel'],int(count.max()))
            if self.index%3==0:
                for suffix,mask in [('at_four_or_more_pairs',count>=4),('with_any_pair',count>0)]:
                    key=f'{label}_max_field_fraction_{suffix}';self.maxima[key]=max(self.maxima[key],self.field_fraction(mask))
        self.previous=y;self.index+=1
    def result(self):
        return {**self.maxima,'frames':self.index,'seconds_screened':self.index/self.fps,'downsampled_frame':list(self.shape[::-1]),'per_pixel_frequency_screen':'no above-three pairs detected' if self.maxima['general_max_pairs_in_one_second_per_pixel']<=3 and self.maxima['red_max_pairs_in_one_second_per_pixel']<=3 else 'frequency candidates detected; inspect area and original full-resolution material'}

def screen(path):
    probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-select_streams','v:0','-show_entries','stream=width,height','-of','json',str(path)]))['streams'][0]
    scale=384/max(probe['width'],probe['height']);width=round(probe['width']*scale);height=round(probe['height']*scale)
    process=subprocess.Popen(['ffmpeg','-v','error','-i',str(path),'-an','-vf',f'fps=60,scale={width}:{height}:flags=area','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],stdout=subprocess.PIPE)
    analyzer=Analyzer(height,width);size=width*height*3
    while True:
        raw=process.stdout.read(size)
        if not raw:break
        if len(raw)!=size:raise RuntimeError('Truncated frame')
        analyzer.add(np.frombuffer(raw,np.uint8).reshape(height,width,3))
    if process.wait()!=0:raise RuntimeError('Video decode failed')
    return {'file':str(path),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'status':'screening_only_conformance_unverified','method':'60 Hz decode of complete actual canvas recording; area-filtered to maximum dimension 384 px; linear sRGB relative luminance 0.1 opposing-transition hysteresis; separate >=0.8 saturated-red / >0.2 CIE 1976 UCS distance pairs; rolling one-second per-pixel counts and sliding one-third-frame fields. Field areas sampled every third frame.','source':'https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html','limitations':['Not PEAT/Harding or an independently validated conformance analyzer.','Downsampling and VP9 encoding may hide small fast transitions; full-resolution and physical viewing geometry require review.','Per-pixel frequency/area screening does not certify concurrently moving flash groups, every possible interaction or all physical displays.','Recorded world only; DOM controls are reviewed separately.'],**analyzer.result()}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('video',type=Path);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args();result=screen(args.video);args.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2))

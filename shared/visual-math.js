import {terrain} from './world.js';
const heights={ocean:-2.4,shallow:-.45,lake:-.5,sand:.1,grass:.48,forest:.7,highland:2.6,cave:0,wall:4};
export function groundHeight(x,z,layer=0,seed=7){
 if(layer)return terrain(x,z,layer,seed)==='wall'?4:0;
 // Bilinear interpolation makes a continuous surface, including submerged seabed.
 const ix=Math.floor(x-.5), iz=Math.floor(z-.5),u=x-.5-ix,v=z-.5-iz;
 const h=(a,b)=>heights[terrain(a+.5,b+.5,0,seed)]??0;
 return (h(ix,iz)*(1-u)+h(ix+1,iz)*u)*(1-v)+(h(ix,iz+1)*(1-u)+h(ix+1,iz+1)*u)*v;
}
export function cameraDirection(horizontal,vertical,azimuth){
 const x=horizontal*Math.cos(azimuth)+vertical*Math.sin(azimuth);
 const y=-horizontal*Math.sin(azimuth)+vertical*Math.cos(azimuth);
 const n=Math.hypot(x,y);return n?{x:x/n,y:y/n}:{x:0,y:0};
}

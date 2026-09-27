import fs from 'node:fs/promises';
import path from 'node:path';
const endpoint = 'https://www.bytecatcode.org/v1/chat/completions';
const key = process.env.IMAGE_API_KEY;
if (!key) throw new Error('Missing IMAGE_API_KEY');
const out = path.resolve('output/imagegen');
await fs.mkdir(out,{recursive:true});
const prompt = `Generate exactly ONE finished image, not a textual description. Create a breathtaking cinematic environment concept painting for MISTBOUND, an original island survival adventure. Landscape 16:9 composition. Sophisticated realistic fantasy matte painting, exceptionally refined natural detail, film production concept art, NOT low-poly, NOT voxel, NOT cartoon, NOT an isometric map, NOT a simple geometric 3D render. Camera at human eye level with a wide 28mm lens looking along a curving tropical shoreline. Foreground on the right: weathered driftwood, intricately textured dark volcanic rocks, a small believable survivor camp with canvas shelter, rope, wooden supplies, a glowing campfire and subtle rising sparks. A small lone traveler stands near the fire for scale, not a portrait. Midground: translucent turquoise surf, intricate white foam ribbons, wet sand reflecting warm sunset, lush layered palms, ferns and dense coastal rainforest climbing rugged cliffs. Background: towering ancient broken stone arches and mysterious overgrown ruins across a misty island bay, distant sea stacks disappearing into blue atmospheric haze. Golden sunset breaks through dramatic clouds from upper left, volumetric light, luminous sea spray, rich deep teal shadows and amber highlights. Organic asymmetry, rich tactile materials, elegant restrained color grading, beautiful painterly photographic realism. Strong foreground-middle-distance separation and breathtaking depth. Quiet wonder, survival and exploration. Large readable natural forms with exquisite small detail. Edge-to-edge artwork, no lettering, no logo, no watermark, no UI, no frames. Aim for a polished high-end game key visual, not a mockup. Return the actual generated image.`;
await fs.writeFile(path.join(out,'mistbound-coast-prompt.txt'),prompt,'utf8');
let response;
try {
 response=await fetch(endpoint,{method:'POST',redirect:'error',headers:{'Authorization':`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify({model:'gpt-image-2',messages:[{role:'user',content:prompt}],stream:false}),signal:AbortSignal.timeout(600000)});
} catch(e){console.error('Request failed:',e.name, String(e.message).replaceAll(key,'[REDACTED]'));process.exit(1);}
const text=await response.text();
if(!response.ok){console.error('HTTP',response.status,text.slice(0,1600).replaceAll(key,'[REDACTED]'));process.exit(1);}
let data;try{data=JSON.parse(text);}catch{console.error('Response was not JSON; length:',text.length);process.exit(1);}
await fs.writeFile(path.join(out,'generation-response.json'),JSON.stringify(data,null,2).replaceAll(key,'[REDACTED]'));
const candidates=[];
function walk(v,k=''){
 if(typeof v==='string'){
  if(v.startsWith('data:image/')) candidates.push({data:v});
  else if(k==='b64_json') candidates.push({data:'data:image/png;base64,'+v});
  else if((k==='url'||k==='image_url')&&/^https:\/\//.test(v)) candidates.push({url:v});
  else {for(const m of v.matchAll(/!\[[^\]]*\]\((https:\/\/[^\s)]+)\)/g))candidates.push({url:m[1]});for(const m of v.matchAll(/https:\/\/[^\s<>"\)]+\.(?:png|jpe?g|webp)(?:\?[^\s<>"\)]*)?/gi))candidates.push({url:m[0]});}
 }else if(Array.isArray(v))v.forEach(x=>walk(x,k));else if(v&&typeof v==='object')Object.entries(v).forEach(([key,value])=>walk(value,key));
}
walk(data);
if(!candidates.length){console.log('No image found. Response:',JSON.stringify(data).slice(0,3000).replaceAll(key,'[REDACTED]'));process.exit(2);}
const chosen=candidates[0];let bytes;
if(chosen.data)bytes=Buffer.from(chosen.data.slice(chosen.data.indexOf(',')+1),'base64');
else {const image=await fetch(chosen.url,{signal:AbortSignal.timeout(120000)});if(!image.ok)throw new Error('Image download HTTP '+image.status);bytes=Buffer.from(await image.arrayBuffer());}
const ext=bytes[0]===0x89&&bytes[1]===0x50?'png':bytes[0]===0xff&&bytes[1]===0xd8?'jpg':bytes.toString('ascii',8,12)==='WEBP'?'webp':null;
if(!ext)throw new Error('Response asset is not a recognized image');
const file=path.join(out,'mistbound-cinematic-coast-v1.'+ext);await fs.writeFile(file,bytes);console.log(JSON.stringify({file,bytes:bytes.length,requestedModel:'gpt-image-2',returnedModel:data.model??null,usage:data.usage??null}));

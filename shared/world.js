export const WORLD={width:116,height:84,chunk:12};
export const LANDMARKS=[{id:'home',name:'漂流者海岸',x:30,y:51,z:0},{id:'spring',name:'翡翠泉',x:28,y:43,z:0},{id:'cave',name:'幽光洞窟',x:18,y:22,z:0},{id:'ruins',name:'沉眠遗迹',x:87,y:33,z:0},{id:'exit',name:'返回地表',x:8,y:24,z:1},{id:'relic',name:'水晶圣所',x:24,y:9,z:1}];
export const SCENERY=[{x:27.5,y:50.5,z:0,sprite:0,h:135},{x:34,y:63,z:0,sprite:1,h:125},{x:32,y:55,z:0,sprite:2,h:92},{x:27,y:39.8,z:0,sprite:3,h:165},{x:84,y:33,z:0,sprite:4,h:155},{x:90,y:33,z:0,sprite:4,h:145},{x:36,y:62,z:0,sprite:5,h:105},{x:45,y:52,z:0,sprite:6,h:150},{x:18,y:19,z:0,sprite:4,h:128},{x:22,y:11,z:1,sprite:4,h:125}];
export function hash(x,y,seed=7){let n=(Math.imul(Math.floor(x),374761393)+Math.imul(Math.floor(y),668265263)+Math.imul(seed,69069))|0;n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;}
export function terrain(x,y,z=0,seed=7){x=Math.floor(x);y=Math.floor(y);if(z===1){if(x<3||y<3||x>29||y>29)return 'wall';const cave=(Math.hypot((x-11)/8,(y-22)/8)<1.1||Math.hypot((x-22)/9,(y-11)/9)<1.12||Math.abs(x+y-31)<5);return cave?'cave':'wall';}
 if(x<0||y<0||x>=WORLD.width||y>=WORLD.height)return 'ocean';
 const n=Math.sin(x*.36+y*.13)*.05+Math.sin(y*.44-x*.1)*.045+Math.sin(x*.12+y*.24)*.06;
 const a=Math.hypot((x-29)/23,(y-37)/29)+n,b=Math.hypot((x-87)/18,(y-37)/24)+n;
 const d=Math.min(a,b);if(d>1.10)return 'ocean';if(d>1)return 'shallow';if(d>.85)return 'sand';
 if((x-28)**2+(y-43)**2<9)return 'lake';
 if(y>44&&y<65&&Math.abs(x-(27+Math.sin(y*.28)*1.4))<.7)return 'lake';
 if((x-24)**2+(y-25)**2<43||b<.55)return 'highland';
 if(a<.62&&hash(Math.floor(x/4),Math.floor(y/4),seed)>.24)return 'forest';return 'grass';}
export function isWater(t){return t==='ocean'||t==='shallow'||t==='lake';}
export function heightAt(x,y,z=0,seed=7){const t=terrain(x,y,z,seed);return t==='highland'?8:t==='forest'?3:t==='grass'?2:0;}
export function chunkKey(x,y,z=0){return `${z}:${Math.floor(x/WORLD.chunk)}:${Math.floor(y/WORLD.chunk)}`;}
export function biomeAt(x,y,z=0){if(z)return '幽光洞窟';if(x>66)return '遗忘之岛';if(terrain(x,y)==='ocean')return '雾潮海峡';if(y<31)return '密语森林';return '漂流者海岸';}
export function distance(a,b){return a.z===b.z?Math.hypot(a.x-b.x,a.y-b.y):Infinity;}
export function generateChunk(cx,cy,z,seed){const nodes=[],enemies=[];for(let ix=0;ix<12;ix++)for(let iy=0;iy<12;iy++){const x=cx*12+ix+.5,y=cy*12+iy+.5,t=terrain(x,y,z,seed),r=hash(x,y,seed);if(t==='wall'||isWater(t))continue;let type;
 if(z){if(r<.095)type='crystal';else if(r<.14)type='ore';else if(r<.18)type='mushroom';}
 else if(t==='forest'){if(r<.18)type='tree';else if(r<.25)type='branch';else if(r<.30)type='berry';else if(r<.36)type='fiber';}
 else if(t==='highland'){if(r<.12)type='ore';else if(r<.23)type='rock';else if(r<.29)type='tree';}
 else if(t==='sand'){if(r<.06)type='palm';else if(r<.15)type='branch';else if(r<.23)type='stone';}
 else{if(r<.045)type='tree';else if(r<.10)type='rock';else if(r<.17)type='berry';else if(r<.25)type='fiber';else if(r<.29)type='herb';else if(r<.36)type='branch';}
 if(LANDMARKS.some(l=>l.z===z&&Math.hypot(l.x-x,l.y-y)<2)||(!z&&Math.hypot(x-30,y-51)<2)||(!z&&['tree','palm'].includes(type)&&Math.hypot(x-30,y-51)<5))type=null;
 if(type){const hp=['tree','palm','rock','ore','crystal'].includes(type)?(type==='tree'?9:6):1;nodes.push({id:`n${z}_${Math.floor(x)}_${Math.floor(y)}`,type,x,y,z,hp,maxHp:hp,chunk:`${z}:${cx}:${cy}`});}
 if(r>.995&&(!z?Math.hypot(x-30,y-51)>9:true)){const type=z?'shade':t==='sand'?'crab':'boar';enemies.push({id:`e${z}_${Math.floor(x)}_${Math.floor(y)}`,type,x,y,z,homeX:x,homeY:y});}
 }return {nodes,enemies};}
export function placementValid(p,type,x,y,z,buildings,definition,seed=7){if(!Number.isFinite(x)||!Number.isFinite(y)||p.z!==z||Math.hypot(x-p.x,y-p.y)>5)return false;const t=terrain(x,y,z,seed);if(t==='wall'||(definition.water?!isWater(t):isWater(t)))return false;return !buildings.some(b=>b.z===z&&Math.hypot(b.x-x,b.y-y)<(type==='foundation'||type==='roof'?.45:.85)&&!(b.type==='foundation'&&type!=='foundation')&&!(type==='roof'&&b.type!=='roof'));}

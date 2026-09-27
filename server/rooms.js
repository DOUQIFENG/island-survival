import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {emptyBag,add} from '../shared/inventory.js';
import {HOTBAR,ENEMIES} from '../shared/data.js';
import {generateChunk,chunkKey} from '../shared/world.js';
export const rooms=new Map();
const saveDir=process.env.SAVE_DIR||fileURLToPath(new URL('../saves/',import.meta.url));
export const uid=()=>crypto.randomUUID();
export function send(ws,data){if(ws?.readyState===1)ws.send(JSON.stringify(data));}
export function emit(room,data){for(const p of room.players.values())send(p.ws,data);}
export function nearbyEvent(room,event){for(const p of room.players.values())if(p.z===event.z&&Math.hypot(p.x-event.x,p.y-event.y)<28)send(p.ws,{type:'fx',...event});}
export function notify(p,text){send(p.ws,{type:'toast',text});}
export function note(room,text){room.messages.push(text);room.messages=room.messages.slice(-30);emit(room,{type:'chat',text});}
export function createRoom(){let code;do{code=crypto.randomBytes(3).toString('hex').toUpperCase();}while(rooms.has(code));const room={code,seed:Math.floor(Math.random()*90000),time:75,weather:0,weatherAt:130,eventAt:180,event:null,players:new Map(),nodes:new Map(),enemies:new Map(),buildings:[],drops:[],chunks:new Set(),messages:[],bossDead:false};
 for(let i=0;i<5;i++){const n={id:`starter${i}`,type:i<3?'branch':'stone',x:29+(i%3)*1.1,y:52+Math.floor(i/3),z:0,hp:1,maxHp:1,chunk:chunkKey(29,52,0)};room.nodes.set(n.id,n);}
 for(const e of [{id:'beach-crab',type:'crab',x:36,y:60,z:0},{id:'forest-boar',type:'boar',x:24,y:35,z:0},{id:'cave-shade',type:'shade',x:16,y:18,z:1},{id:'warden',type:'boss',x:87,y:32,z:0}])spawnEnemy(room,e);
 rooms.set(code,room);return room;}
export function spawnEnemy(room,e){room.enemies.set(e.id,{homeX:e.x,homeY:e.y,hp:ENEMIES[e.type].hp,maxHp:ENEMIES[e.type].hp,cooldown:0,phase:1,state:'idle',...e});}
export function ensureChunks(room,p){const cx=Math.floor(p.x/12),cy=Math.floor(p.y/12);for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++){const key=`${p.z}:${cx+a}:${cy+b}`;if(room.chunks.has(key))continue;room.chunks.add(key);const data=generateChunk(cx+a,cy+b,p.z,room.seed);for(const n of data.nodes)if(!room.nodes.has(n.id))room.nodes.set(n.id,n);for(const e of data.enemies)if(!room.enemies.has(e.id))spawnEnemy(room,e);}}
export function newPlayer(name){const bag=emptyBag();add(bag,'berry',3);add(bag,'water',3);return {id:uid(),token:crypto.randomBytes(24).toString('hex'),name:String(name||'漂流者').replace(/[<>\u0000-\u001f]/g,'').slice(0,14),x:30,y:51,z:0,hp:100,hunger:100,thirst:100,stamina:100,temp:36.5,sanity:100,bag,hotbar:[...HOTBAR],selected:0,armor:false,level:1,xp:0,progress:{},quest:0,discovered:[],color:Math.floor(Math.random()*5),action:'idle',actionUntil:0,cooldown:0,invulnerable:0,spawn:{x:30,y:51,z:0},input:{x:0,y:0},inputAt:0};}
export function saveAll(){fs.mkdirSync(saveDir,{recursive:true});for(const r of rooms.values()){const data={...r,players:[...r.players.values()].map(({ws,input,rate,...p})=>p),nodes:[...r.nodes.values()],enemies:[...r.enemies.values()],chunks:[...r.chunks]};const target=path.join(saveDir,`${r.code}.json`);fs.writeFileSync(target+'.tmp',JSON.stringify(data));fs.renameSync(target+'.tmp',target);}}
export function loadAll(){fs.mkdirSync(saveDir,{recursive:true});for(const f of fs.readdirSync(saveDir)){if(!/^[A-F0-9]{6}\.json$/.test(f))continue;try{const r=JSON.parse(fs.readFileSync(path.join(saveDir,f),'utf8'));r.players=new Map(r.players.map(p=>[p.id,{...p,input:{x:0,y:0},inputAt:0,boat:null}]));r.nodes=new Map(r.nodes.map(n=>[n.id,n]));r.enemies=new Map(r.enemies.map(e=>[e.id,e]));r.chunks=new Set(r.chunks);if(r.generation!==2){const previous=r.nodes;r.nodes=new Map([...previous].filter(([id])=>!id.startsWith('n')));for(const key of r.chunks){const [z,x,y]=key.split(':').map(Number);for(const n of generateChunk(x,y,z,r.seed).nodes){const old=previous.get(n.id);r.nodes.set(n.id,old&&old.type===n.type&&old.hp<old.maxHp?old:n);}}r.generation=2;r.nodeVersion=(r.nodeVersion||0)+1;}for(const b of r.buildings)if(b.type==='raft'){b.driver=null;b.passengers=[];}rooms.set(r.code,r);}catch(e){console.error('Cannot load',f,e.message);}}}
export function drop(room,id,n,x,y,z,dur){room.drops.push({id:uid(),item:id,n,x,y,z,dur,created:room.time});}

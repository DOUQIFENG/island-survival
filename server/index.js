import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {WebSocketServer} from 'ws';
import {rooms,createRoom,newPlayer,loadAll,saveAll,send,note,ensureChunks} from './rooms.js';
import {tickRoom} from './simulation.js';
import {action} from './actions.js';
import {broadcastStates,snapshot} from './network.js';
const root=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const server=http.createServer((req,res)=>{let pathname;try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400).end();return;}if(pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify({ok:true,rooms:rooms.size}));return;}if(pathname==='/api/rooms'){res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify([...rooms.values()].map(r=>({code:r.code,players:[...r.players.values()].filter(p=>p.ws?.readyState===1).length,day:Math.floor(r.time/600)+1})).filter(r=>r.players>0)));return;}
 const base=pathname.startsWith('/shared/')?root:path.join(root,'public');const file=path.resolve(base,'.'+(pathname==='/'?'/index.html':pathname));if(!file.startsWith(base+path.sep)||pathname.includes('..')){res.writeHead(403).end();return;}const ext=path.extname(file);if(!['.html','.css','.js','.png','.webp','.jpg','.svg','.ico'].includes(ext)){res.writeHead(404).end();return;}fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':{'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml'}[ext]||'application/octet-stream','Cache-Control':ext==='.png'?'public,max-age=3600':'no-cache','X-Content-Type-Options':'nosniff'}).end(data);});});
const wss=new WebSocketServer({server,maxPayload:8192});loadAll();
wss.on('connection',ws=>{let room,p;let budget=0,windowAt=Date.now();const joinTimer=setTimeout(()=>{if(!p)ws.close();},10000);ws.on('message',raw=>{if(Date.now()-windowAt>1000){windowAt=Date.now();budget=0;}if(++budget>80)return;let m;try{m=JSON.parse(raw);}catch{return;}if(!m||typeof m!=='object'||Array.isArray(m))return;
 if(!p){if(m.type!=='join')return;const code=String(m.code||'').toUpperCase();room=m.create?createRoom():rooms.get(code);if(!room){send(ws,{type:'error',text:'房间不存在，请检查邀请码或创建新房间。'});return;}const existing=[...room.players.values()].find(v=>v.token===m.token);if(!existing&&[...room.players.values()].filter(v=>v.ws?.readyState===1).length>=8){send(ws,{type:'error',text:'房间已满，最多 8 人。'});return;}p=existing||newPlayer(m.name);if(existing?.ws){existing.ws.close(4000,'Session resumed elsewhere');}p.ws=ws;p.input={x:0,y:0};p.inputAt=0;room.players.set(p.id,p);ensureChunks(room,p);clearTimeout(joinTimer);send(ws,{type:'welcome',id:p.id,token:p.token,code:room.code,seed:room.seed,messages:room.messages});send(ws,snapshot(room,p));note(room,`${p.name} ${existing?'重新连接':'抵达了海岸'}`);return;}
 if(m.type==='input'){const x=Number(m.x),y=Number(m.y);if(Number.isFinite(x)&&Number.isFinite(y)){p.input={x:Math.max(-1,Math.min(1,x)),y:Math.max(-1,Math.min(1,y)),run:!!m.run,block:!!m.block};p.inputAt=Date.now();}return;}
 if(m.type==='chat'){if(room.time<(p.chatAt||0))return;p.chatAt=room.time+.7;const text=String(m.text||'').replace(/[<>\u0000-\u001f]/g,'').trim().slice(0,100);if(text)note(room,`${p.name}：${text}`);return;}
 if(m.type==='ping'){if(room.time<(p.pingAt||0))return;p.pingAt=room.time+1;for(const other of room.players.values())send(other.ws,{type:'ping',x:p.x,y:p.y,z:p.z,name:p.name});return;}
 if(room.time<(p.lastAction||0)+.07)return;p.lastAction=room.time;action(room,p,m);
 });ws.on('close',()=>{clearTimeout(joinTimer);if(p&&p.ws===ws){p.ws=null;p.input={x:0,y:0};if(p.boat){const b=room.buildings.find(b=>b.id===p.boat);if(b){if(b.driver===p.id)b.driver=null;b.passengers=b.passengers.filter(id=>id!==p.id);}p.boat=null;}note(room,`${p.name} 暂时离线`);}});ws.on('error',()=>{});});
let step=0;setInterval(()=>{for(const room of rooms.values()){if([...room.players.values()].some(p=>p.ws?.readyState===1)){tickRoom(room,.05);if(step%2===0)broadcastStates(room);}}step++;},50);
setInterval(()=>{try{saveAll();}catch(e){console.error('Save failed:',e.message)}},15000);
function shutdown(){saveAll();server.close();process.exit(0);}process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
server.listen(Number(process.env.PORT)||3000,'0.0.0.0',()=>console.log(`Mistbound listening on http://localhost:${process.env.PORT||3000}`));

import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {WebSocket} from 'ws';
const cwd=path.resolve(new URL('..',import.meta.url).pathname.replace(/^\/([A-Za-z]:)/,'$1'));
const scratch=path.resolve(cwd,'..','..','work');fs.mkdirSync(scratch,{recursive:true});const save=fs.mkdtempSync(path.join(scratch,'network-tests-')),port=41000+Math.floor(Math.random()*10000);
let server;const sockets=[];
async function connect(data){const ws=new WebSocket(`ws://127.0.0.1:${port}`);sockets.push(ws);const log=[];ws.on('message',raw=>log.push(JSON.parse(raw)));await new Promise((resolve,reject)=>{ws.once('open',resolve);ws.once('error',reject)});ws.send(JSON.stringify({type:'join',...data}));const welcome=await wait(()=>log.find(m=>m.type==='welcome'||m.type==='error'));return {ws,log,welcome};}
async function wait(fn){const end=Date.now()+5000;while(Date.now()<end){const v=fn();if(v)return v;await new Promise(r=>setTimeout(r,30));}throw new Error('Network condition timed out');}
test('real WebSocket solo host, 8 players, room limit, movement replication and reconnect',async()=>{
 server=spawn(process.execPath,['server.js'],{cwd,env:{...process.env,PORT:String(port),SAVE_DIR:save},stdio:['ignore','pipe','pipe']});let output='';server.stdout.on('data',d=>output+=d);server.stderr.on('data',d=>output+=d);await wait(()=>output.includes('listening'));
 const page=await fetch(`http://127.0.0.1:${port}`);assert.equal(page.status,200);assert.ok((await page.text()).includes('自己开房'));
 const shared=await fetch(`http://127.0.0.1:${port}/shared/data.js`);assert.equal(shared.status,200);assert.match(shared.headers.get('content-type'),/javascript/);
 const host=await connect({create:true,name:'房主'});assert.equal(host.welcome.type,'welcome');const code=host.welcome.code;assert.equal(host.log.find(m=>m.type==='state').players.length,1);
 const peer=await connect({code,name:'队友'});assert.equal(peer.welcome.code,code);const initial=await wait(()=>peer.log.find(m=>m.type==='state'&&m.players.length===2));const start=initial.players.find(p=>p.id===host.welcome.id).x;
 host.ws.send(JSON.stringify({type:'input',x:1,y:0}));await wait(()=>peer.log.find(m=>m.type==='state'&&m.players.some(p=>p.id===host.welcome.id&&p.x>start+.4)));
 host.ws.send(JSON.stringify({type:'input',x:0,y:0}));const countBefore=host.log.length;host.ws.close();await new Promise(r=>host.ws.once('close',r));const resumed=await connect({code,name:'房主',token:host.welcome.token});assert.equal(resumed.welcome.id,host.welcome.id);assert.ok(resumed.log.find(m=>m.type==='state').self.x>start);
 for(let i=0;i<6;i++)await connect({code,name:`旅人${i}`});const denied=await connect({code,name:'第九人'});assert.equal(denied.welcome.type,'error');assert.match(denied.welcome.text,/8/);
 const list=await(await fetch(`http://127.0.0.1:${port}/api/rooms`)).json();assert.equal(list.find(r=>r.code===code).players,8);
 const invalid=await connect({code:'000000',name:'错误邀请码'});assert.equal(invalid.welcome.type,'error');
});
test.after(async()=>{for(const ws of sockets)ws.terminate();if(server){server.kill();await new Promise(resolve=>server.once('exit',resolve));}if(save.startsWith(scratch+path.sep))fs.rmSync(save,{recursive:true,force:true});});

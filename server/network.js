import {send} from './rooms.js';
import {distance} from '../shared/world.js';
export function publicPlayer(p){return {id:p.id,name:p.name,x:p.x,y:p.y,z:p.z,hp:p.hp,color:p.color,action:p.action,actionUntil:p.actionUntil||0,vx:p.vx||0,vy:p.vy||0,facing:p.facing||0,equipped:p.bag.some(s=>s?.id===p.hotbar[p.selected])?p.hotbar[p.selected]:null,armor:p.armor,boat:p.boat,level:p.level,block:p.input?.block};}
export function snapshot(room,p){const nearby=e=>distance(p,e)<28;return {type:'state',time:room.time,weather:room.weather,event:room.event,bossDead:room.bossDead,
 self:{...publicPlayer(p),bag:p.bag,hotbar:p.hotbar,selected:p.selected,hunger:p.hunger,thirst:p.thirst,stamina:p.stamina,temp:p.temp,sanity:p.sanity,quest:p.quest,progress:p.progress,xp:p.xp,discovered:p.discovered,deadUntil:p.deadUntil,dodgeUntil:p.dodgeUntil||0,dodgeX:p.dodgeX||0,dodgeY:p.dodgeY||0},
 players:[...room.players.values()].filter(v=>v.ws?.readyState===1).map(publicPlayer),nodes:[...room.nodes.values()].filter(n=>n.hp>0&&nearby(n)),enemies:[...room.enemies.values()].filter(e=>e.hp>0&&nearby(e)),buildings:room.buildings.filter(nearby),drops:room.drops.filter(nearby)};}
export function broadcastStates(room){for(const p of room.players.values())if(p.ws?.readyState===1){const state=snapshot(room,p),key=`${p.z}:${Math.floor(p.x/4)}:${Math.floor(p.y/4)}:${room.nodeVersion||0}`;if(p.netRegion===key)delete state.nodes;else p.netRegion=key;send(p.ws,state);}}


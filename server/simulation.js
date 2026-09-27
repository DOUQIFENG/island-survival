import {walkable,moveWithCollision,movementSpeed} from '../shared/movement.js';
import {terrain,isWater,distance,WORLD,LANDMARKS} from '../shared/world.js';
import {BUILDINGS,ENEMIES} from '../shared/data.js';
import {count,add} from '../shared/inventory.js';
import {ensureChunks,spawnEnemy,notify,note,nearbyEvent,drop,uid} from './rooms.js';
import {hurtPlayer,advance} from './actions.js';
export const canWalk=walkable;
function move(room,p,dx,dy){moveWithCollision(room,p,dx,dy);}
function enemyTick(room,e,players,dt){if(e.hp<=0){if(e.type!=='boss'&&room.time>e.respawn){e.hp=e.maxHp;e.x=e.homeX;e.y=e.homeY;}return;}const nearest=players.filter(p=>p.hp>0&&p.z===e.z&&!p.boat).sort((a,b)=>distance(e,a)-distance(e,b))[0];if(!nearest||distance(e,nearest)>24)return;
 const d=distance(e,nearest),def=ENEMIES[e.type],boss=e.type==='boss';
 if(boss){const phase=e.hp/e.maxHp<.3?3:e.hp/e.maxHp<.66?2:1;if(phase>e.phase){e.phase=phase;note(room,`潮汐守卫 · 第 ${phase} 阶段`);for(let i=0;i<phase;i++)spawnEnemy(room,{id:uid(),type:'shade',x:e.x+i*1.5-1,y:e.y+2,z:e.z});}}
 if(e.warnUntil){if(room.time>=e.warnUntil){const radius=boss?e.phase===3?4.5:3:1.5;for(const p of players)if(distance(p,{x:e.warnX,y:e.warnY,z:e.z})<radius)hurtPlayer(room,p,def.damage);nearbyEvent(room,{kind:'slam',x:e.warnX,y:e.warnY,z:e.z,radius});e.warnUntil=0;e.cooldown=room.time+(boss?2.5:1.6);}return;}
 if(e.stunUntil>room.time)return;
 const aggro=boss?12:e.type==='crab'?4:7;
 if(d<aggro||e.target){if(d>15||Math.hypot(e.x-e.homeX,e.y-e.homeY)>14){e.target=null;e.state='return';}else{e.target=nearest.id;e.state='chase';if(d<(boss?3:1.3)&&room.time>e.cooldown){e.state='attack';e.warnUntil=room.time+(boss?1.1:.45);e.warnX=nearest.x;e.warnY=nearest.y;return;}const sp=def.speed*(boss&&e.phase===3?1.4:1);const dx=(nearest.x-e.x)/Math.max(d,.1)*sp*dt,dy=(nearest.y-e.y)/Math.max(d,.1)*sp*dt;if(!isWater(terrain(e.x+dx,e.y+dy,e.z,room.seed)))move(room,e,dx,dy);return;}}
 e.state='wander';const angle=room.time*.12+e.homeX;const tx=e.homeX+Math.sin(angle)*2,ty=e.homeY+Math.cos(angle)*2,dist=Math.hypot(tx-e.x,ty-e.y);if(dist>.3&&!isWater(terrain(tx,ty,e.z,room.seed)))move(room,e,(tx-e.x)/dist*.5*dt,(ty-e.y)/dist*.5*dt);
}
export function tickRoom(room,dt=.05){room.time+=dt;const players=[...room.players.values()].filter(p=>p.ws?.readyState===1);if(!players.length)return;
 for(const p of players){if(p.hp<=0){if(room.time>p.deadUntil){Object.assign(p,p.spawn);p.hp=100;p.hunger=70;p.thirst=70;p.stamina=100;p.invulnerable=room.time+5;notify(p,'你已在营地苏醒。地图上的物资仍可拾回。');}continue;}
  if(Date.now()-p.inputAt>700)p.input={x:0,y:0};let {x:dx=0,y:dy=0}=p.input;const len=Math.hypot(dx,dy);if(len>1){dx/=len;dy/=len;}const moving=Math.hypot(dx,dy)>.1;const previousX=p.x,previousY=p.y;if(p.dodgeUntil>room.time){dx=p.dodgeX;dy=p.dodgeY;}
  if(p.boat){const boat=room.buildings.find(b=>b.id===p.boat);if(!boat){p.boat=null;}else if(boat.driver===p.id){const speed=room.weather===3?3.3:4.6;const nx=boat.x+dx*dt*speed,ny=boat.y+dy*dt*speed;if(nx>1&&ny>1&&nx<WORLD.width-1&&ny<WORLD.height-1&&isWater(terrain(nx,ny,0,room.seed))){boat.x=nx;boat.y=ny;}p.x=boat.x;p.y=boat.y;p.z=0;boat.rotation=Math.atan2(dy,dx);for(const other of players)if(other.boat===boat.id){other.x=boat.x;other.y=boat.y;other.z=0;}}else{p.x=boat.x;p.y=boat.y;p.z=0;}}
  else{const water=isWater(terrain(p.x,p.y,p.z,room.seed));const running=moving&&p.input.run&&p.stamina>1;const speed=movementSpeed(p,p.input,room,room.time);move(room,p,dx*speed*dt,dy*speed*dt);p.stamina=Math.max(0,Math.min(100,p.stamina+dt*(water?-7:running?-9:7)));if(water&&p.stamina<1)hurtPlayer(room,p,dt*8);}
  p.vx=(p.x-previousX)/dt;p.vy=(p.y-previousY)/dt;const actualMove=Math.hypot(p.vx,p.vy)>.05;if(actualMove&&!p.boat)p.facing=Math.atan2(p.vy,p.vx);if(p.actionUntil<room.time)p.action=p.boat?'idle':actualMove?(isWater(terrain(p.x,p.y,p.z,room.seed))?'swim':p.input.run&&p.stamina>1?'run':'walk'):'idle';
  p.hunger=Math.max(0,p.hunger-dt*.08);p.thirst=Math.max(0,p.thirst-dt*.12);if(p.hunger===0||p.thirst===0)hurtPlayer(room,p,dt*1.5);
  const night=((room.time%600)/600)>.72,fire=room.buildings.some(b=>b.type==='campfire'&&distance(p,b)<4),shelter=room.buildings.some(b=>b.type==='roof'&&distance(p,b)<2);const target=fire?37:p.z?33:room.weather>=2&&!shelter?30:night?34:36.5;p.temp+=(target-p.temp)*dt*.03;if(p.temp<32)hurtPlayer(room,p,dt*.4);p.sanity=Math.max(0,Math.min(100,p.sanity+dt*(fire?.4:p.z?-.13:night?-.05:.1)));
  ensureChunks(room,p);if(!p.nextExplore||room.time>p.nextExplore){p.nextExplore=room.time+1;const set=new Set(p.discovered);for(let x=-2;x<=2;x++)for(let y=-2;y<=2;y++)set.add(`${p.z}:${Math.floor(p.x/4)+x}:${Math.floor(p.y/4)+y}`);p.discovered=[...set];if(p.x>69&&!p.z)advance(room,p,'island');}
  for(const d of room.drops){if(d.n>0&&distance(p,d)<.8){const left=add(p.bag,d.item,d.n,d.dur),n=d.n-left;if(n){advance(room,p,d.item,n);nearbyEvent(room,{kind:'loot',x:d.x,y:d.y,z:d.z,item:d.item,amount:n});}d.n=left;}}
 }
 room.drops=room.drops.filter(d=>d.n>0&&room.time-d.created<1800);
 for(const e of room.enemies.values()){const near=players.some(p=>distance(p,e)<13);if(near)enemyTick(room,e,players,dt);else if(room.time>(e.nextTick||0)){e.nextTick=room.time+.5;enemyTick(room,e,players,.5);}}
 if(!room.nextResource||room.time>room.nextResource){room.nextResource=room.time+2;for(const n of room.nodes.values())if(n.hp<=0&&room.time>n.respawn){n.hp=n.maxHp;room.nodeVersion=(room.nodeVersion||0)+1;}}
 if(room.time>room.weatherAt){room.weather=(room.weather+1)%4;room.weatherAt=room.time+150;note(room,['阳光穿过了云层。','海雾正在靠近。','细雨落在了岛屿上。','雷暴来袭，远航请注意体温与体力。'][room.weather]);}
 if(room.time>room.eventAt){const p=players[0];let x=p.x+6,y=p.y+3;if(isWater(terrain(x,y,p.z,room.seed))){x=p.x;y=p.y;}room.event={name:'漂流补给',x,y,z:p.z,until:room.time+100};drop(room,'berry',8,x,y,p.z);drop(room,'herb',3,x+.4,y,p.z);drop(room,'wood',6,x,y+.4,p.z);note(room,'世界事件：漂流补给已出现，地图已标记。');room.eventAt=room.time+240;}
 if(room.event&&room.time>room.event.until)room.event=null;
}


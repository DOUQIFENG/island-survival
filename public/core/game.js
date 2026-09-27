import {Connection} from './net.js';
import {Input} from './input.js';
import {Renderer3D as Renderer} from '../render/three-renderer.js';
import {Effects,Audio} from '../render/effects.js';
import {Interface} from '../ui/interface.js';
import {project} from '../render/terrain.js';
import {generateChunk,distance,terrain,isWater} from '/shared/world.js';
import {ITEMS} from '/shared/data.js';
class Game{
 constructor(){this.canvas=document.getElementById('game');this.seed=7;this.self=null;this.predicted=null;this.state={nodes:[],players:[],buildings:[],enemies:[],drops:[],time:110,weather:0};this.pings=[];this.build=null;this.rotation=0;this.snap=true;this.fx=new Effects();this.audio=new Audio();this.renderer=new Renderer(this);this.net=new Connection(m=>this.message(m),s=>this.ui.status(s));this.ui=new Interface(this);this.input=new Input(this);for(let x=0;x<5;x++)for(let y=2;y<7;y++)this.state.nodes.push(...generateChunk(x,y,0,7).nodes);this.last=performance.now();requestAnimationFrame(t=>this.frame(t));}
 nearestBuilding(){if(!this.self)return null;return this.state.buildings.filter(b=>distance(this.self,b)<3).sort((a,b)=>distance(this.self,a)-distance(this.self,b))[0];}
 message(m){if(m.type==='welcome'){this.id=m.id;this.code=m.code;this.seed=m.seed;this.ui.ready(m);}else if(m.type==='state'){this.state={...this.state,...m};this.self=m.self;if(!this.predicted||this.predicted.z!==m.self.z||Math.hypot(this.predicted.x-m.self.x,this.predicted.y-m.self.y)>2){this.predicted={x:m.self.x,y:m.self.y,z:m.self.z};}this.ui.update();}else if(m.type==='chat')this.ui.chat(m.text);else if(m.type==='toast')this.ui.toast(m.text);else if(m.type==='error')this.ui.error(m.text);else if(m.type==='ping'){this.pings.push({...m,until:performance.now()+10000});this.ui.toast(`${m.name} 标记了当前位置`);}else if(m.type==='fx'){const p=project(m.x,m.y);this.fx.emit(p.x,p.y-12,m.kind==='hit'?'#d69879':m.kind==='loot'?'#e7d791':m.material==='stone'?'#afc2bb':'#cba575',m.kind==='slam'?40:12);if(m.target)this.fx.hits.set(m.target,performance.now()/1000);if(m.kind==='hit'){this.fx.text(p.x,p.y-40,(m.crit?'暴击 ':'')+m.amount,'#f1b59a');if(m.target===this.id)this.fx.shake=5;}if(m.kind==='loot')this.fx.text(p.x,p.y-23,`+${m.amount} ${ITEMS[m.item]?.name||''}`);if(m.kind==='heal')this.fx.text(p.x,p.y-38,'+'+m.amount,'#b8de93');if(m.kind==='level')this.fx.text(p.x,p.y-50,'LEVEL UP','#ffe49c');if(m.kind==='slam')this.fx.shake=7;this.audio.play(m.kind);}}
 frame(t){const dt=Math.min(.05,(t-this.last)/1000);this.last=t;this.input.update(t);if(this.self&&this.predicted){const input=this.input.vector();const water=isWater(terrain(this.self.x,this.self.y,this.self.z,this.seed));const speed=this.self.boat?4.6:water?1.25:input.run&&this.self.stamina>1?4.1:2.7;if(this.self.hp>0&&!this.self.boat){const x=this.predicted.x+input.x*speed*dt,y=this.predicted.y+input.y*speed*dt;if(terrain(x,y,this.self.z,this.seed)!=='wall'){this.predicted.x=x;this.predicted.y=y;}}this.predicted.x+=(this.self.x-this.predicted.x)*Math.min(1,dt*5);this.predicted.y+=(this.self.y-this.predicted.y)*Math.min(1,dt*5);}this.pings=this.pings.filter(p=>p.until>t);this.fx.update(dt);this.renderer.draw(t/1000,dt);requestAnimationFrame(v=>this.frame(v));}
}
new Game();




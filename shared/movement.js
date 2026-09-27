import {terrain,isWater,WORLD} from './world.js';
import {BUILDINGS} from './data.js';

// Keyboard axes are screen-space. Invert the 2:1 isometric projection
// before normalizing world velocity so diagonal keys point diagonally.
export function screenDirection(horizontal,vertical){
 const x=horizontal+vertical*2,y=vertical*2-horizontal,n=Math.hypot(x,y);
 return n?{x:x/n,y:y/n}:{x:0,y:0};
}
export function walkable(world,x,y,z){
 if(x<=.2||y<=.2||x>=WORLD.width-.2||y>=WORLD.height-.2||terrain(x,y,z,world.seed)==='wall')return false;
 const nodes=world.nodes instanceof Map?world.nodes.values():world.nodes||[];
 for(const n of nodes)if(n.z===z&&n.hp>0&&['tree','palm','rock','ore'].includes(n.type)&&Math.abs(n.x-x)<.55&&Math.abs(n.y-y)<.55&&Math.hypot(n.x-x,n.y-y)<.48)return false;
 return !(world.buildings||[]).some(b=>b.z===z&&BUILDINGS[b.type]?.solid&&!b.open&&Math.hypot(b.x-x,b.y-y)<.68);
}
export function moveWithCollision(world,p,dx,dy){
 const steps=Math.max(1,Math.ceil(Math.hypot(dx,dy)/.15));
 for(let i=0;i<steps;i++){if(walkable(world,p.x+dx/steps,p.y,p.z))p.x+=dx/steps;if(walkable(world,p.x,p.y+dy/steps,p.z))p.y+=dy/steps;}
}
export function movementSpeed(p,input,world,time){
 if(p.hp<=0||p.boat)return 0;
 if(p.dodgeUntil>time)return 7;
 if(isWater(terrain(p.x,p.y,p.z,world.seed)))return 1.25;
 if(['chop','mine','gather','build','attack','hurt'].includes(p.action)&&p.actionUntil>time)return .55;
 if(input.block)return 1.1;
 return input.run&&p.stamina>1?4.1:2.7;
}

// Simulation angles start at +X; exported characters face +Z.
export function characterYaw(facing=0){return Math.PI/2-facing;}
export function locomotionBlend(previous,moving,dt){return previous+((moving?1:0)-previous)*(1-Math.exp(-Math.max(0,dt)*12));}

export function smoothYaw(previous,target,dt){const delta=Math.atan2(Math.sin(target-previous),Math.cos(target-previous));return previous+delta*(1-Math.exp(-Math.max(0,dt)*14));}
export function isLocomoting(player){return !player.boat && player.hp>0 && Math.hypot(player.vx||0,player.vy||0)>.05;}

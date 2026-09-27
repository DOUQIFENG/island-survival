// Simulation angles start at +X; exported characters face +Z.
export function characterYaw(facing=0){return Math.PI/2-facing;}
export function locomotionBlend(previous,moving,dt){return previous+((moving?1:0)-previous)*(1-Math.exp(-Math.max(0,dt)*12));}

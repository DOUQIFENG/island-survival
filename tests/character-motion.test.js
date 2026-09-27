import test from 'node:test';
import assert from 'node:assert/strict';
import {characterYaw,locomotionBlend} from '../shared/character-motion.js';
test('character forward vector follows all simulation headings',()=>{for(const a of [0,Math.PI/2,Math.PI,-Math.PI/2,0.75]){const yaw=characterYaw(a);assert.ok(Math.abs(Math.sin(yaw)-Math.cos(a))<1e-10);assert.ok(Math.abs(Math.cos(yaw)-Math.sin(a))<1e-10);}});
test('walk transitions ease in and out independently of frame rate',()=>{let a=0,b=0;for(let i=0;i<60;i++)a=locomotionBlend(a,true,1/60);for(let i=0;i<30;i++)b=locomotionBlend(b,true,1/30);assert.ok(Math.abs(a-b)<1e-10);assert.ok(a>.99&&a<1);assert.ok(locomotionBlend(a,false,1/60)<a);assert.equal(locomotionBlend(0,true,0),0);});

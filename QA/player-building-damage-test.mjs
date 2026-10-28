import assert from 'node:assert/strict';
import {DestructionWorld} from '../dist/destruction.js';
const world=new DestructionWorld({maxDynamic:6,playerReserve:2});
for(let i=0;i<4;i++){const c=world.addChunk({type:'wall',building:'old'+i,floor:0,x:i*7,y:15,z:0,size:[2.5,2.72,.32]});world.queueDetach(c,{x:c.x-2,y:15,z:0},1);}
world.step(1/60);assert.equal(world.dynamic.length,4);
const hit=world.addChunk({type:'wall',building:'target',floor:0,x:60,y:15,z:0,size:[2.5,2.72,.32]});world.queueDetach(hit,{x:60,y:15,z:.16},1);world.step(1/60);assert.equal(hit.state,'intact');
for(let i=0;i<2;i++){world.impact({x:60,y:15,z:.16},18,3.8,hit,{player:true});assert.equal(hit.state,'intact');}world.impact({x:60,y:15,z:.16},18,3.8,hit,{player:true});assert.equal(hit.state,'dynamic');assert(!world.pending.has(hit));assert.equal(world.dynamic.length,5);assert(world.dynamic.slice(0,4).every(c=>c.body.position.y>10&&c.state==='dynamic'));
assert.equal(hit.body.shapes[0].halfExtents.x,2.5*.485);for(let i=0;i<30;i++)world.step(1/60);assert(Math.hypot(hit.body.position.x-60,hit.body.position.y-15,hit.body.position.z)>.8);console.log('PASS player strike detaches immediately under a saturated AI budget, frees a queued section and moves it away without freezing airborne debris');
world.reset();assert.equal(hit.body.shapes[0].halfExtents.x,1.25);assert.equal(hit.body.position.z,0);assert.equal(hit.state,'intact');console.log('PASS rebuild restores original collider dimensions and intact structure');

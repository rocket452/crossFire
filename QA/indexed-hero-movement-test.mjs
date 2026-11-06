import assert from 'node:assert/strict';
import {DestructionWorld} from '../dist/destruction.js';
import {RunnerMotion} from '../dist/runner-motion.js';
const world=new DestructionWorld();for(let x=-160;x<=160;x+=8)for(let z=-160;z<=160;z+=8)world.addChunk({type:'wall',building:'fixture',floor:0,x,y:2,z,size:[2.5,4,.32],yaw:Math.abs(x)%3*.3});
const plain=[...world.chunks];for(const dt of[1/30,1/60,.075]){const indexed=new RunnerMotion(),original=new RunnerMotion();for(let i=0;i<180;i++){const input={player:true,forward:i%80<50?1:-1,strafe:Math.sin(i*.08),boost:i%50<25,jump:i%71===0};indexed.step(input,dt,world.chunks);original.step(input,dt,plain);assert.deepEqual(indexed.position,original.position);assert.deepEqual(indexed.normal,original.normal);assert.equal(indexed.mode,original.mode);assert.deepEqual(indexed.near,original.near);}console.log('PASS indexed versus original movement:',dt,'identical nearby sections, positions, normals, jumps and wall transitions');}

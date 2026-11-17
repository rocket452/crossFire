import assert from 'node:assert/strict';
import {RunnerMotion} from '../dist/runner-motion.js';
import {stepAttackMovement} from '../dist/runner-attack-stop.js';
for(const dt of[1/30,1/60,1/120]){
 const m=new RunnerMotion();m.reset({x:0,y:.08,z:0});m.yaw=0;const input={forward:1,boost:true,player:true};
 for(let i=0;i<1/dt;i++)stepAttackMovement(m,input,dt,[],false);
 assert(m.speed>30);const start={...m.position};m.jumpBuffer=.1;
 for(let i=0;i<1/dt;i++)stepAttackMovement(m,{...input,jump:true},dt,[],true);
 assert.equal(m.position.x,start.x);assert.equal(m.position.z,start.z);assert.equal(m.position.y,start.y);assert.equal(m.speed,0);assert.equal(m.jumpBuffer,0);
 stepAttackMovement(m,input,dt,[],false);assert(m.position.z>start.z,'held movement resumes immediately after release');
 m.mode='air';m.position.y=15;m.velocity={x:30,y:0,z:30};const air={...m.position};stepAttackMovement(m,input,dt,[],true);
 assert.equal(m.position.x,air.x);assert.equal(m.position.z,air.z);assert(m.position.y<air.y,'gravity remains active');
}
console.log('PASS immediate stop from boost, sustained stationary fire, blocked jumps, immediate release/resume and airborne momentum stop with gravity at 30/60/120Hz');

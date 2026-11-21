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

const coastDistances=[];
for(const dt of [1/30,1/60,1/120]){
 const m=new RunnerMotion();
 m.reset({x:0,y:.08,z:0});
 m.yaw=0;
 const sprint={forward:1,boost:true,player:true};
 for(let i=0;i<1/dt;i++)stepAttackMovement(m,sprint,dt,[],false);
 const z=m.position.z;
 m.yaw=Math.PI/2;
 stepAttackMovement(m,{...sprint,jump:true},dt,[],true,true);
 assert(m.velocity.z>20,'beam braking carries forward velocity through the first firing frame');
 assert.equal(m.position.x,0,'steering input cannot redirect a firing slide');
 for(let i=1;i<1/dt;i++)stepAttackMovement(m,sprint,dt,[],true,true);
 const slide=m.position.z-z;
 assert(slide>2.8&&slide<3.2);
 coastDistances.push(slide);
 assert.equal(m.position.y,.08,'a jump input cannot launch Volt while firing');
 assert.equal(m.speed,0);
 stepAttackMovement(m,sprint,dt,[],false);
 assert(m.position.x>0,'movement resumes on release');

 m.mode='air';m.position.y=10;m.velocity={x:12,y:4,z:8};
 const before={...m.position};
 stepAttackMovement(m,sprint,dt,[],true,true);
 assert(m.position.x>before.x&&m.position.z>before.z);
 assert(m.position.y>before.y&&m.velocity.y<4,'beam braking preserves the jump arc');
}
assert(Math.max(...coastDistances)-Math.min(...coastDistances)<.12);
console.log('PASS ~3 m boost-speed beam slide, preserved heading and jump arc, no steering, clean stop and release at 30/60/120Hz');

const wall={state:'intact',type:'wall',building:'test',size:[10,6,.2],x:0,y:3,z:2};
const nearWall=new RunnerMotion();
nearWall.reset({x:0,y:.08,z:0});
nearWall.velocity.z=46;
for(let i=0;i<60;i++)stepAttackMovement(nearWall,{player:true},1/60,[wall],true,true);
assert(nearWall.position.z>1&&nearWall.position.z<1.6,'beam slide stops at a wall');
assert.equal(nearWall.velocity.z,0);

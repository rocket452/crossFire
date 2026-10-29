import assert from 'node:assert/strict';
import {RunnerHeading,RUNNER_CAMERA_FOLLOW} from '../dist/runner-heading.js';
import {RunnerMotion} from '../dist/runner-motion.js';
const delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
for(const hz of[30,60,120]){
 const dt=1/hz,h=new RunnerHeading(),m=new RunnerMotion();let yaw=Math.PI;h.reset(yaw);m.reset({x:0,y:.08,z:26});const input={forward:0,strafe:-1,player:true};
 for(let i=0;i<2*hz;i++){m.yaw=h.movementYaw(yaw,input,m.mode);m.step(input,dt,[]);const next=h.follow(yaw,dt,{input,mode:m.mode,velocity:m.velocity,heading:Math.atan2(m.velocity.x,m.velocity.z)});assert(Math.abs(delta(next,yaw))<=RUNNER_CAMERA_FOLLOW.maxTurnRate*dt+1e-9);yaw=next;}
 assert(m.position.x>24&&Math.abs(m.position.z-26)<.02,'held lateral input runs straight while camera turns');assert(Math.abs(delta(yaw,Math.PI/2))<.01,'camera catches up to running turn');
 const reference=h.moveYaw;h.movementYaw(yaw,{...input,strafe:-.99,forward:.03},m.mode);assert.equal(h.moveYaw,reference,'minor thumb noise cannot continuously rebase steering');
 const nextInput={forward:1,strafe:0,player:true};assert(Math.abs(delta(h.movementYaw(yaw,nextInput,m.mode),yaw))<1e-9,'new deliberate direction uses current camera');
 h.manual(-.2);const move=h.moveYaw;assert.equal(h.follow(yaw,dt,{input:nextInput,mode:'ground',velocity:{x:14,z:0},heading:0}),yaw,'manual look takes priority');assert.equal(h.moveYaw,move);
 for(let i=0;i<hz;i++)yaw=h.follow(yaw,dt,{input:nextInput,mode:'ground',velocity:{x:14,z:0},heading:0,aiming:true});assert(!h.following,'held fire preserves aim');
 for(const mode of['wall','air'])assert.equal(h.follow(yaw,dt,{input:nextInput,mode,velocity:{x:14,z:0},heading:0}),yaw,'wall/jump does not spin view');
 assert.equal(h.follow(yaw,dt,{input:{},velocity:{x:14,z:0},heading:0}),yaw,'stopping does not recenter');h.reset(3.13);const wrap=h.follow(3.13,dt,{input:nextInput,velocity:{x:1,z:-14},heading:-3.13});assert(Math.abs(wrap-3.13)<.04,'shortest arc across +/-pi');
 console.log('PASS',hz,'Hz straight held movement, camera alignment/rate cap, changed direction, thumb noise, manual look/aim priority, wall/air/stop stability, angle wrap');
}

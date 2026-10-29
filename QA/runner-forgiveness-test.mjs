import assert from 'node:assert/strict';
import {RunnerMotion,RUNNER_FORGIVENESS as F} from '../dist/runner-motion.js';
const box=(x,y,z,size,type='slab')=>({x,y,z,size,type,state:'intact',hidden:false});
const roof=box(0,10,0,[4,.3,4]),facade=box(0,6,5,[10,12,.32],'wall'),bigRoof=box(0,12,0,[10,.28,10]);
for(const hz of [30,60,120]){
 const dt=1/hz;
 function leave(){const r=new RunnerMotion();r.reset({x:1.8,y:10.15,z:0});r.yaw=Math.PI/2;while(r.mode==='ground')r.step({forward:1},dt,[roof]);return r;}
 let r=leave();for(let i=0;i<Math.floor(.04/dt);i++)r.step({},dt,[roof]);r.step({jump:true},dt,[roof]);assert(r.velocity.y>7,'edge grace jump at '+hz);const jump=r.velocity.y;r.step({jump:true},dt,[roof]);assert(r.velocity.y<jump,'no mid-air double jump');
 r=leave();for(let i=0;i<Math.ceil(.16/dt);i++)r.step({},dt,[roof]);r.step({jump:true},dt,[roof]);assert(r.velocity.y<0,'edge grace expires');
 r=new RunnerMotion();r.reset({x:0,y:.47,z:0});r.mode='air';r.velocity.y=-3;r.step({jump:true},dt,[]);let bounced=false;for(let i=0;i<hz*.4;i++){r.step({},dt,[]);if(r.velocity.y>7)bounced=true;}assert(bounced,'buffered landing jump at '+hz);
 r=new RunnerMotion();r.reset({x:0,y:3,z:0});r.mode='air';r.velocity.y=-1;r.step({jump:true},dt,[]);let falseJump=false;for(let i=0;i<hz;i++){r.step({},dt,[]);if(r.velocity.y>0)falseJump=true;}assert(!falseJump,'buffer expires before distant landing');
 r=new RunnerMotion();r.reset({x:2.15,y:11,z:0});r.mode='air';r.velocity.y=-3;for(let i=0;i<hz*.25;i++)r.step({},dt,[roof]);assert.equal(r.mode,'ground');assert.equal(r.assistedLandings,1);assert(r.position.x<2,'near edge descender lands on actual slab');
 r=new RunnerMotion();r.reset({x:2.6,y:11,z:0});r.mode='air';r.velocity.y=-3;for(let i=0;i<hz*.3;i++)r.step({},dt,[roof]);assert.equal(r.assistedLandings,0,'does not catch distant ledges');assert(r.position.y<10);
 r=new RunnerMotion();r.reset({x:1,y:10.15,z:0});r.yaw=Math.PI/2;for(let i=0;i<hz*.5;i++)r.step({forward:1,boost:true},dt,[roof]);assert(r.position.x>10&&r.mode==='air','running off roof must not stick to lip');
 r=new RunnerMotion();r.reset({x:0,y:11.4,z:5.215});r.mode='wall';r.normal={x:0,y:0,z:1};r.step({forward:1,boost:true},dt,[facade,bigRoof]);assert.equal(r.mode,'ground');assert.equal(r.roofs,1);assert(r.position.z<5&&Math.abs(r.position.y-12.14)<.01);
 r=new RunnerMotion();r.reset({x:0,y:11.4,z:5.215});r.mode='wall';r.normal={x:0,y:0,z:1};r.step({forward:1},dt,[box(0,7,5,[10,14,.32],'wall'),bigRoof]);assert.equal(r.roofs,0,'cannot mantle through facade into intermediate floor');
 r=new RunnerMotion();r.reset({x:0,y:11.4,z:5.215});r.mode='wall';r.normal={x:0,y:0,z:1};bigRoof.state='dynamic';r.step({forward:1},dt,[facade,bigRoof]);assert.equal(r.roofs,0,'no mantle to falling roof');bigRoof.state='intact';
}
console.log('PASS 30/60/120Hz coyote jump, landing buffer and expiry, no double jump, bounded supported edge catch, no roof magnetism, clear lip mantle and facade/falling-roof rejection',F);

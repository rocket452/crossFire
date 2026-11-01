import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {EvacRaider,RAIDER_COMBAT} from '../dist/evac-raider.js';
import {UnitDamage} from '../dist/combat-collision.js';
function fixture(){
 const target=id=>({id,kind:'hero',alive:true,shapes:[{center:{x:0,y:3,z:25},half:{x:.5,y:1,z:.5}}]}),first=target('first'),second=target('second');let selected=first,blocked=false;
 const robot=new EvacRaider(new THREE.Scene(),new UnitDamage(),{spawnPosition:{x:0,y:.1,z:0},objective:()=>new THREE.Vector3(0,.1,0),moveSpeed:0,initialCooldown:0,getTargets:()=>[selected],visible:()=>!blocked,trace:()=>null}),fired=[];const fire=robot.fireBolt.bind(robot);robot.fireBolt=aim=>{const bolt=fire(aim);fired.push({age:robot.age,target:bolt.target,dir:bolt.dir.clone(),speed:bolt.speed,radius:bolt.radius,mode:bolt.aimMode,point:aim.point.clone(),current:aim.current?.clone(),velocity:robot.targetMotion?.velocity.clone(),from:aim.from.clone(),forward:new THREE.Vector3(0,0,1).transformDirection(robot.barrel.matrixWorld),lead:bolt.leadSeconds});return bolt;};robot.spawn();
 return{robot,fired,first,second,block:()=>blocked=true,switchTarget:()=>selected=second};
}
for(const dt of[1/30,1/60,1/120,.075]){
 const f=fixture(),r=f.robot;for(let i=0;i<Math.ceil(14/dt)&&f.fired.length<8;i++)r.update(dt,i*dt);assert.equal(f.fired.length,8);assert.equal(r.bursts,2);assert.equal(r.burstRemaining,0);
 for(const start of[0,4]){assert.deepEqual(f.fired.slice(start,start+4).map(s=>s.mode).sort(),['direct','direct','lead','lead']);}for(const start of[0,4])for(let i=start+1;i<start+4;i++)assert(Math.abs(f.fired[i].age-f.fired[i-1].age-.25)<=dt+1e-7,'quarter-second spacing with bounded frame quantization');
 assert(f.fired[4].age-f.fired[3].age>=RAIDER_COMBAT.cooldown+RAIDER_COMBAT.windup-2*dt-1e-7,'full recovery and fresh windup follow the last burst shot');assert(f.fired.every(s=>s.target==='first'&&s.speed===36&&s.radius===1.32));assert.equal(new Set(r.bolts.map(b=>b.id)).size,r.bolts.length);assert(Math.abs(f.fired[4].age-f.fired[0].age-2.5)<2*dt+1e-7,'four-shot burst cadence');
 console.log('PASS',dt,'two four-shot bursts, 0.25s shot spacing, post-burst recovery, unique real shots and 36m/s/1.32m projectiles');
}
for(const reason of['cover','range','switch','stun','death','reset']){
 const f=fixture(),r=f.robot;for(let i=0;i<600&&!r.shots;i++)r.update(1/60,i/60);assert.equal(r.shots,1);assert.equal(r.burstRemaining,3);const firstBolt=r.bolts[0],position=firstBolt.mesh.position.clone();
 if(reason==='cover')f.block();else if(reason==='range')f.first.shapes[0].center.z=1000;else if(reason==='switch')f.switchTarget();else if(reason==='stun')r.stun(1);else if(reason==='death')r.destroy();else r.reset();
 for(let i=0;i<45;i++)r.update(1/60,12+i/60);assert.equal(r.burstRemaining,0);assert.equal(f.fired.length,1,'cancelled burst never releases a queued shot');if(reason==='stun')assert(firstBolt.mesh.position.distanceTo(position)>10,'already launched projectiles continue flying');if(reason==='reset'){assert.equal(r.bursts,0);assert.equal(r.bolts.length,0);}console.log('PASS pending-burst cancellation:',reason);
}
{
 const f=fixture(),r=f.robot;for(let i=0;i<600&&!r.shots;i++)r.update(1/60,i/60);f.first.shapes[0].center.x=2;for(let i=0;i<40&&r.shots<2;i++)r.update(1/60,10+i/60);assert.equal(r.shots,2);assert(f.fired[1].dir.x>f.fired[0].dir.x+.04,'each round uses fresh torso/weapon aim');
}

// Predictive rounds use recent observed motion, refreshed for every shot.
for(const dt of[1/30,1/60,1/120,.075]){
 const f=fixture(),r=f.robot;let seed=12345;r.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);
 for(let i=0;i<Math.ceil(18/dt)&&f.fired.length<4;i++){const t=i*dt;f.first.shapes[0].center.x=(t-4)*5;r.update(dt,t);}
 assert.equal(f.fired.length,4);assert.deepEqual(f.fired.map(s=>s.mode).sort(),['direct','direct','lead','lead']);
 for(const shot of f.fired){assert(shot.dir.dot(shot.forward)>=Math.cos(RAIDER_COMBAT.alignment+1e-7),'visible barrel aligns for every shot');if(shot.mode==='direct')assert(shot.point.distanceTo(shot.current)<1e-8);else{assert(shot.lead>0);assert(shot.point.x>shot.current.x+1);assert(Math.abs(shot.point.distanceTo(shot.from)/36-shot.lead)<1e-7,'intercept time matches actual projectile speed');const impact=shot.current.clone().addScaledVector(shot.velocity,shot.lead);assert(shot.point.distanceTo(impact)<1e-7);}}
 assert(r.directShots===2&&r.leadShots===2);console.log('PASS',dt,'moving target: exactly 2 live direct points + 2 physical intercepts, with barrel alignment');
 r.target=f.first;r.sampleTargetMotion(dt);f.first.shapes[0].center.x+=100;r.sampleTargetMotion(dt);assert.equal(r.targetMotion.velocity.length(),0,'teleports do not produce runaway leads');r.reset();assert.equal(r.targetMotion,null);assert.equal(r.directShots+r.leadShots,0);
}
{
 const f=fixture(),r=f.robot;let seed=42;r.random=()=>((seed=(1664525*seed+1013904223)>>>0)/4294967296);const orders=new Set();for(let i=0;i<200;i++){r.burstPlan=[];r.prepareBurst();assert.deepEqual([...r.burstPlan].sort(),['direct','direct','lead','lead']);orders.add(r.burstPlan.join(','));}assert.equal(orders.size,6,'all six valid two/direct two/lead orders occur');console.log('PASS shuffled burst plans preserve exact counts and vary among all 6 valid orders');
}

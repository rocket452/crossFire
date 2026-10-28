import assert from 'node:assert/strict';
import fs from 'node:fs';
import {RunnerAI} from '../dist/runner-ai.js';
import {RunnerMotion} from '../dist/runner-motion.js';
import {traceImpact} from '../dist/combat-collision.js';
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
function fixture(){
 const sections=[];for(const b of layout.buildings)for(let f=0;f<b.floors;f++){
  for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;sections.push({type:'wall',building:b.id,floor:f,hp:5.2,state:'intact',size:[2.5,2.72,.32],body:{position:{x:b.x+5*Math.sin(a)+u*Math.cos(a),y:f*3+1.5,z:b.z+5*Math.cos(a)-u*Math.sin(a)},quaternion:{x:0,y:Math.sin(a/2),z:0,w:Math.cos(a/2)}}});}
  for(let x=0;x<3;x++)for(let z=0;z<3;z++)sections.push({type:'slab',building:b.id,floor:f,hp:7.8,state:'intact',size:[10/3,.28,10/3],body:{position:{x:b.x+(x-1)*10/3,y:(f+1)*3,z:b.z+(z-1)*10/3},quaternion:{x:0,y:0,z:0,w:1}}});
 }
 const ai=new RunnerAI(),motion=new RunnerMotion(),target={x:0,y:13,z:0};
 const canShootFrom=p=>!traceImpact({x:p.x,y:p.y+1.65,z:p.z},target,{sections,ground:false});
 const options=()=>({motion,target,robotAlive:true,sections,buildings:layout.buildings,canShootFrom,canShoot:()=>canShootFrom(motion.position)});
 return{ai,motion,sections,target,options};
}
for(const dt of [1/30,1/60,1/120]){
 const f=fixture();let shots=0,descended=false,firstBuilding=null;
 for(let i=0;i<Math.round(40/dt);i++){
  const d=f.ai.update(dt,f.options());
  if(d.rooftopFire){assert.equal(f.motion.mode,'ground');assert(f.motion.position.y>10);assert(f.motion.support?.type==='slab');assert(f.options().canShootFrom(f.motion.position));f.ai.rooftops.recordDamage(150*dt);shots++;firstBuilding??=f.ai.rooftops.plan.building.id;}
  f.motion.yaw=d.yaw;f.motion.step(d.input,dt,f.sections);
  if(f.ai.rooftops.completed&&f.motion.position.y<1)descended=true;
 }
 assert(shots>50);assert(f.ai.rooftops.completed>=1);assert(f.motion.climbs>=2);assert(descended);assert(f.ai.rooftops.damage>100);assert(f.ai.rooftops.visits>=2);console.log('PASS rooftop climb, supported aimed bursts, cooldown, descent and another visit',dt,f.ai.rooftops.diagnostics());
}
const f=fixture();for(let i=0;i<600;i++){
 const d=f.ai.update(1/60,f.options());f.motion.yaw=d.yaw;f.motion.step(d.input,1/60,f.sections);if(d.rooftopFire)break;
}
assert.equal(f.ai.rooftops.plan.phase,'attack');const age=f.ai.rooftops.plan.attackAge;
for(let i=0;i<60;i++)f.ai.update(1/60,{...f.options(),urgent:true});assert.equal(f.ai.rooftops.plan.attackAge,age,'missile defense suspends the rooftop timer');
const b=f.ai.rooftops.plan.building;for(const c of f.sections)if(c.building===b.id&&c.type==='slab'&&c.floor===b.floors-1){c.state='dynamic';c.hp=0;}
for(let i=0;i<20;i++){const d=f.ai.update(1/60,f.options());assert(!d.rooftopFire);f.motion.yaw=d.yaw;f.motion.step(d.input,1/60,f.sections);}
assert(f.ai.rooftops.aborted>0);assert(f.motion.position.y<b.floors*3-.2,'destroyed roof support causes a real fall');
const p={...f.motion.position};f.ai.suspend();assert.equal(f.ai.rooftops.plan,null);assert(!f.ai.update(1/60,f.options()).fire);assert.deepEqual(f.motion.position,p);f.ai.resume(p);assert.equal(f.ai.rooftops.plan,null);assert.equal(f.ai.rooftops.cooldown,2.5);
f.ai.rooftops.cooldown=0;assert(!f.ai.update(1/60,{...f.options(),robotAlive:false}).fire);assert.equal(f.ai.rooftops.plan,null);
f.ai.reset();assert.equal(f.ai.rooftops.visits,0);assert.equal(f.ai.rooftops.damage,0);
const unsafe=fixture();unsafe.ai.rooftops.cooldown=0;assert.equal(unsafe.ai.rooftops.update(.1,{...unsafe.options(),canShootFrom:()=>false}),null);assert.equal(unsafe.ai.rooftops.plan,null);
console.log('PASS missile-defense priority, no shots through cover, destroyed-roof abandonment/gravity, exact player handoff, ceasefire and reset');

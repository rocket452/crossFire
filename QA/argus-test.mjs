import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {gltfModel,spec} from './argus-fixture.mjs';
import {Argus} from '../dist/argus.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {interceptionPath,predictConvoyDistance} from '../dist/convoy-map-config.js';
const config=JSON.parse(fs.readFileSync('dist/argus-config.json')),convoyConfig=JSON.parse(fs.readFileSync('dist/convoy-config.json'));
function setup(obstacles=false){const scene=new THREE.Scene();let boss,mission;const damage=new UnitDamage(u=>{if(!boss?.disable(u))mission?.disable(u);}),physics=new DestructionWorld();mission=new ConvoyMission(scene,damage,structuredClone(convoyConfig));boss=new Argus(scene,damage,gltfModel,spec,structuredClone(config),{physics,getConvoy:()=>mission,onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>physics.removeWreck(b)});if(obstacles){for(const x of[45,48,51])for(const y of[1.5,4.5,7.5,10.5]){const c=physics.addChunk({building:'test',type:'wall',floor:Math.floor(y/3),x,y,z:42,size:[3,2.8,.4]});c.bounds=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x,y,42),new THREE.Vector3(...c.size));}}return{boss,mission,physics,damage};}
const path=interceptionPath(convoyConfig.map,{x:36,z:54},{x:0,z:0});assert.equal(path.distance,90);assert(path.points.some(p=>p.x===36&&p.z===24));assert.equal(interceptionPath(convoyConfig.map,{x:30,z:24},{x:24,z:0}).distance,30);
for(const hz of[30,60,120]){
 const {boss:b,mission:m,physics}=setup();let locked=0,worst=0,sliding=0;const old=new Map();
 for(let i=0;i<130*hz;i++){
  m.update(1/hz);b.update(1/hz,i/hz);physics.step(1/hz);
  for(const f of b.gait.feet){const actual=b.nodes['foot_'+f.side].getWorldPosition(new THREE.Vector3()),wanted=new THREE.Vector3(f.ankle.x,f.ankle.y,f.ankle.z);if(!b.slam)worst=Math.max(worst,actual.distanceTo(wanted));const p=old.get(f.side);if(!b.slam&&p?.grounded&&f.grounded&&p.anchor.x===f.anchor.x&&p.anchor.z===f.anchor.z){locked++;sliding=Math.max(sliding,p.position.distanceTo(actual));}old.set(f.side,{position:actual,anchor:{...f.anchor},grounded:f.grounded&&!b.slam});}
 }
 console.log('gait',hz,{locked,worst,sliding,position:b.root.position.toArray(),slams:b.slams,replans:b.replans});assert(worst<.003,'IK reaches world-space ankle');assert(sliding<.003,'planted rendered feet cannot slide');assert(locked>hz*20);assert(b.replans>15);assert(b.slams>0);assert(m.buses.some(bus=>bus.unit.health<bus.unit.maxHealth));assert(b.plan.busProgress>=0);console.log('PASS planted gait/interception/slam @',hz);
}
{
 const{boss:b,mission:m,damage}=setup();b.replan();assert(b.plan.leadSeconds>0);assert(b.plan.point.x>m.buses[0].root.position.x);let previous=b.strideSpeed;for(const [i,j]of [...b.joints.values()].entries()){const p=b.model.targetPosition(j.id);damage.hurt(b.combatUnit,config.joints.health,p,j.id);assert.equal(j.health,0);assert(j.destroyed);assert(Math.abs(b.speedMultiplier-(1-(i+1)*.15))<1e-8);assert(b.strideSpeed<previous);previous=b.strideSpeed;const hp=b.combatUnit.health;assert.equal(damage.hurt(b.combatUnit,999,p,j.id),0);assert.equal(b.combatUnit.health,hp);assert.equal(b.model.targets.find(t=>t.id===j.id).material.emissiveIntensity,0);}const hp=b.combatUnit.health;damage.hurt(b.combatUnit,999,null,'argus-core-closed');assert.equal(b.combatUnit.health,hp);assert.deepEqual(b.sideDamage(),{l:2,r:2});b.reset();assert.equal(b.speedMultiplier,1);assert(b.joints.size===4);console.log('PASS four permanent joints, 15/30/45/60% stacking penalties, no duplicate damage, closed core and reset');
}
{
 const{boss:b,mission:m,physics}=setup(true);let overlap=0;for(let i=0;i<80*60;i++){m.update(1/60);b.update(1/60,i/60);physics.step(1/60);overlap=Math.max(overlap,b.model.blockers(physics.chunks).length);}console.log('breach',{overlap,breaches:b.breaches,pos:b.root.position.toArray(),slams:b.slams});assert.equal(overlap,0,'never commit a pose through intact geometry');assert(b.breaches>0);assert(b.root.position.z<42);console.log('PASS physical building breach gates progress');
}
{
 const{boss:b,mission:m,physics,damage}=setup();damage.hurt(b.combatUnit,config.health*2,null,'chest');assert(b.dead);assert.equal(m.phase,'starting');for(let i=0;i<160*60;i++){m.update(1/60);b.update(1/60,i/60);physics.step(1/60);b.syncWrecks();}assert.equal(b.model.walker.wrecks.length,18);assert.equal(m.phase,'success');assert.equal(m.diagnostics().saved,80);assert.equal(b.combatUnit.shapes.length,0);b.reset();assert.equal(b.model.walker.wrecks.length,0);assert.equal(physics.wrecks.length,0);assert.equal(damage.units.filter(u=>u.id==='argus').length,1);console.log('PASS collapse into 18 physical wrecks, mission continues through exit and boss reset removes wrecks');
}

{
 const{boss:b}=setup();b.joints.get('argus-hip-l').health=0;b.joints.get('argus-hip-l').destroyed=true;const lengths={l:[],r:[]},durations={l:[],r:[]};
 for(let i=0;i<20*60;i++){b.gait.update(1/60,{x:36,z:-100},b.strideSpeed,b.sideDamage());for(const f of b.gait.feet)if(f.swinging&&f.age<1/60+.00001){const lateral=f.side==='l'?-b.config.gait.lateral:b.config.gait.lateral;lengths[f.side].push(Math.hypot(f.to.x-(b.gait.position.x+Math.cos(b.gait.yaw)*lateral),f.to.z-(b.gait.position.z-Math.sin(b.gait.yaw)*lateral)));durations[f.side].push(f.duration);}}
 const avg=a=>a.reduce((s,n)=>s+n,0)/a.length;assert(avg(lengths.l)<avg(lengths.r));assert(avg(durations.l)>avg(durations.r));console.log('PASS damaged-side shorter, slower swing gives visible limp',lengths.l[0],lengths.r[0]);
}

{
 const{boss:b,mission:m}=setup();m.phase='pickup';m.distance=76;m.remaining=1;b.replan();const original=b.plan;m.remaining=65;b.replan();assert(original.bus!==b.plan.bus||Math.abs(original.point.x-b.plan.point.x)>.1);b.lastConvoyState='pickup:0:'+m.activeBuses.map(b=>b.id).join(',');b.replanClock=99;const n=b.replans;m.depart();b.update(1/60,1);assert(b.replans>n);console.log('PASS read-only stop-delay prediction changes intercept; departure forces immediate replan');
}
{
 const world=new DestructionWorld(),chunk=world.addChunk({building:'parity',type:'column',floor:0,x:0,y:1,z:0,size:[1,2,1]});let before=chunk.hp;world.damageChunk(chunk,1,{source:'argus'});assert.equal(before-chunk.hp,1);before=chunk.hp;world.damageChunk(chunk,1,{source:'siege-walker'});assert.equal(before-chunk.hp,1);before=chunk.hp;world.damageChunk(chunk,1,{source:'volt-rush'});assert(Math.abs(before-chunk.hp-.1)<1e-8);console.log('PASS ARGUS uses full boss building damage; non-boss reduction preserved');
}

{
 const{boss:b,mission:m,physics,damage}=setup();let time=0;while(!b.slam&&time<200){time+=1/60;m.update(1/60);b.update(1/60,time);physics.step(1/60);}assert(b.slam);const slams=b.slams,health=b.slam.bus.unit.health;jointHit: {const j=b.joints.values().next().value;damage.hurt(b.combatUnit,j.health,b.model.targetPosition(j.id),j.id);}b.stun(1);for(let i=0;i<30;i++){m.update(1/60);b.update(1/60,time+i/60);}assert.equal(b.slams,slams);assert.equal(b.speedMultiplier,.85);assert(b.stunRemaining>0);assert.equal(m.buses[0].unit.health,health);console.log('PASS existing stun cancels melee windup without repairing joints');
}

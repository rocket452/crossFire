import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {Argus} from '../dist/argus.js';
import {quakeRingContact,quakeBusContact} from '../dist/argus-pylons.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {gltfModel,spec} from './argus-fixture.mjs';
const config=JSON.parse(fs.readFileSync('dist/argus-config.json')),cc=JSON.parse(fs.readFileSync('dist/convoy-config.json'));
function fixture({height=.08,support=null,hz=60}={}){const scene=new THREE.Scene(),physics=new DestructionWorld(),hits=[],impulses=[],charges=[],hero={root:new THREE.Group(),enabled:true,active:true,motion:{mode:'ground'},shuriken:{teleports:0}};hero.root.position.set(6,height,4);let boss,mission;const damage=new UnitDamage(u=>{if(!boss?.disable(u))mission?.disable(u);});mission=new ConvoyMission(scene,damage,structuredClone(cc));boss=new Argus(scene,damage,gltfModel,spec,structuredClone(config),{physics,getConvoy:()=>mission,getHeroes:()=>[hero],getPylonGround:support||undefined,onHeroHit:(h,p,power,kind)=>hits.push({power,kind}),onImpulse:(h,v)=>impulses.push(v.clone()),onCharge:(k,s)=>charges.push({k,s})});for(const k of['flak','pylons','lance'])boss.config.attacks[k].enabled=false;let time=0;const step=s=>{for(let i=0;i<Math.round(s*hz);i++){time+=1/hz;boss.attacks.update(1/hz,time);boss.attacks.afterHeroes(1/hz);}};const plant=(x=0,z=4)=>{const point=new THREE.Vector3(x,.08,z),ground=boss.attacks.pylons.ground(point);boss.attacks.begin('pylons',{point,ground});return boss.attacks.active.pylon;};return{boss,mission,physics,hero,damage,hits,impulses,charges,step,plant};}
for(const hz of[30,60,120]){
 const f=fixture({hz}),{boss:b,mission:m,plant,step}=f;const bus=m.buses[0];bus.place({x:6,z:4,yaw:Math.PI/2},.08);m.spawnGroup([6,4],12,0);const p=plant();step(.8);assert.equal(p.stage,'placing');assert.equal(p.unit,undefined);assert.equal(f.hits.length,0);step(.2);assert.equal(p.stage,'active');assert.equal(p.unit.health,140);step(.6);assert.equal(f.hits.length,0);assert.equal(bus.unit.health,1680);step(1.4);assert.equal(f.hits.length,1);assert.equal(f.hits[0].power,16);assert(f.impulses[0].x>13.9&&f.impulses[0].y===4);assert.equal(bus.unit.health,1620);assert(m.civilians.every(c=>c.unit.health===35));assert.equal(b.combatUnit.health,10000);assert.equal(b.attacks.pylons.stats.busHits,1);step(.5);assert.equal(bus.unit.health,1620,'no repeated damage while ring fades');step(3);assert.equal(f.hits.length,2,'next pulse can hit without an immunity window');assert.equal(bus.unit.health,1560);assert(!('slow'in b.attacks.state(f.hero)));assert(!('immunity'in b.attacks.state(f.hero)));assert(!('externalSpeedScale'in f.hero.motion));assert(f.charges.every(c=>c.s>=.8));console.log('PASS warned placement + charge, grounded feedback/outward knockback, stopped bus once/ring, no civilian/friendly damage, repeated pulse @',hz);
}
for(const mode of['air','wall','roof']){const f=fixture({height:mode==='air'?2:mode==='roof'?20:.08});f.hero.motion.mode=mode==='roof'?'ground':mode;f.plant();f.step(4);assert.equal(f.hits.length,0);console.log('PASS quake safety',mode);}
{
 const f=fixture();f.plant();f.step(2);f.hero.root.position.set(-20,.08,4);f.boss.attacks.pylons.check();f.hero.root.position.set(20,.08,4);f.boss.attacks.afterHeroes(.05);assert.equal(f.hits.length,1,'fast ground path cannot tunnel through annulus');console.log('PASS fast hero swept crossing');
}
{
 const f=fixture();f.hero.root.position.set(-20,.08,4);f.plant();f.step(2);f.hero.root.position.set(20,.08,4);f.hero.shuriken.teleports++;f.boss.attacks.afterHeroes(.05);assert.equal(f.hits.length,0,'teleport does not traverse the intervening ground');console.log('PASS teleport relocation bypasses intervening rings');
}
{
 const f=fixture(),p=f.plant();f.step(2.1);const bus=f.mission.buses[0];bus.place({x:-25,z:4,yaw:Math.PI/2},.08);f.boss.attacks.pylons.check();bus.place({x:25,z:4,yaw:Math.PI/2},.08);f.boss.attacks.pylons.check();assert.equal(bus.unit.health,1620);f.boss.attacks.pylons.check();assert.equal(bus.unit.health,1620);const hit=traceImpact(p.point.clone().add(new THREE.Vector3(0,1,3)),p.point.clone().add(new THREE.Vector3(0,1,0)),{targets:[p.unit],ground:false});assert.equal(hit?.part,'quake-pylon');f.damage.hurt(hit.unit,140,hit.point,hit.part);assert.equal(f.boss.attacks.pylons.members.length,0);assert.equal(p.rings.length,0);assert.equal(p.unit.shapes.length,0);assert(!f.damage.units.some(u=>u.id===p.id));f.step(.8);assert.equal(f.boss.attacks.pylons.falling.length,0);console.log('PASS moving bus swept footprint, once/ring, shootable stake and complete ring/hit-shape/fall cleanup');
}
for(const failure of['callback','section','body']){let valid=true;const section={state:'intact',hp:10},support=failure==='body'?null:()=>valid?{height:.08,section}:null;const f=fixture({support}),p=f.plant();f.step(2);if(failure==='callback')valid=false;else if(failure==='section')section.state='dynamic';else{const body=p.ground.body;f.physics.world.removeBody(body);}f.step(.1);assert.equal(f.boss.attacks.pylons.members.length,0);assert.equal(p.rings.length,0);assert.equal(f.boss.attacks.pylons.stats.groundLost,1);f.step(.8);assert.equal(f.boss.attacks.pylons.falling.length,0);console.log('PASS invalid support falls and removes rings',failure);}
{
 const f=fixture();f.boss.config.attacks.pylons.enabled=true;f.step(30);const system=f.boss.attacks.pylons;assert.equal(system.members.length,3);assert.equal(system.stats.placed,3);assert.equal(f.boss.attacks.cooldowns.tether,undefined);assert(!f.damage.units.some(u=>u.id.startsWith('argus-anchor')));for(const p of system.members){assert(Math.abs(p.point.z)===4);assert(p.point.distanceTo(f.boss.root.position)<=65);for(const other of system.members)if(other!==p)assert(p.point.distanceTo(other.point)>=10);}
 f.boss.reset();assert.equal(system.members.length,0);assert.equal(system.root.children.length,0);assert(!f.damage.units.some(u=>u.id.startsWith('argus-pylon-')));console.log('PASS remaining-route street preference, placement spacing/range, maximum three, unused retained config, reset without old targets');
}
{
 const f=fixture(),p=f.plant();f.step(2);f.boss.phase=3;const times=[];let last=f.boss.attacks.pylons.stats.pulses;for(let i=0;i<1000;i++){f.step(1/60);if(f.boss.attacks.pylons.stats.pulses>last){times.push(i/60);last++;}}
 for(let i=2;i<times.length;i++)assert(Math.abs(times[i]-times[i-1]-2.8)<.05);assert.equal(p.lastScale,.7);f.boss.config.attacks.pylons.charge=.1;p.nextPulse=0;p.charge=null;f.step(1/60);assert.equal(p.charge.duration,.8);f.boss.destroy();assert.equal(p.rings.length,0);assert.equal(f.boss.attacks.pylons.members.length,0);console.log('PASS phase-3 pulse cadence 2.8s, hard warning minimum and death cleanup');
}
{
 const f=fixture();f.plant();f.step(.3);f.boss.stun(1);assert.equal(f.boss.attacks.pylons.members.length,0);assert.equal(f.boss.attacks.active,null);console.log('PASS boss stun cancels pending placement');
}
assert.equal(quakeRingContact({x:-20,z:0},{x:20,z:0},{x:0,z:0},5,6,.5)!==null,true);
assert.equal(quakeRingContact({x:0,z:20},{x:0,z:20},{x:0,z:0},5,6,.5),null);
assert.equal(quakeBusContact({x:8,z:0},{x:8,z:0},{x:0,z:0},1,2,3.2,10,Math.PI/2,.1),null,'no circumsphere phantom hit');
console.log('PASS analytic annulus and oriented bus footprint');

{
 const f=fixture(),bus=f.mission.buses[0];for(const other of f.mission.buses.slice(1))f.damage.hurt(other.unit,other.unit.health,other.root.position);bus.unit.health=60;bus.place({x:6,z:4,yaw:Math.PI/2},.08);const p=f.plant();f.step(3);assert(f.mission.terminal);assert.equal(f.boss.attacks.pylons.members.length,0);assert.equal(p.rings.length,0);assert.equal(f.boss.attacks.pylons.root.children.length,0);assert.equal(f.boss.attacks.pylons.stats.busDamage,60);console.log('PASS lethal bus ring ends mission and clears stakes immediately, before result pause');
}
{
 const f=fixture();f.plant();f.step(2);f.boss.stun(8);f.step(4);assert(f.boss.attacks.pylons.stats.pulses>=2);console.log('PASS already-deployed stakes remain autonomous during boss stun');
}

{
 const f=fixture();f.hero.root.position.set(18.6,.08,4);const bus=f.mission.buses[0];bus.place({x:23.2,z:4,yaw:Math.PI/2},.08);f.plant();f.step(3.7);assert.equal(f.hits.length,0,'hero body entirely beyond 18m is safe');assert.equal(bus.unit.health,1680,'bus footprint beyond 18m is safe');console.log('PASS damage stays within visible outer radius, with actual hero/bus footprint');
}

for(const hz of[30,60,120]){
 const f=fixture({hz});const p=f.plant();f.step(1);p.charge=null;p.nextPulse=0;f.boss.config.attacks.pylons.charge=.1;f.step(1/hz);assert.equal(p.charge.duration,.8);const before=f.boss.attacks.pylons.stats.pulses;f.step(.8-1/hz);assert.equal(f.boss.attacks.pylons.stats.pulses,before,'actual charge cannot emit before 0.8s');f.step(2/hz);assert.equal(f.boss.attacks.pylons.stats.pulses,before+1);console.log('PASS actual minimum charge elapsed @',hz);
}

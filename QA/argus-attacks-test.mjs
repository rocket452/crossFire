import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {gltfModel,spec} from './walker-fixture.mjs';
import {Argus} from '../dist/argus.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {NinjaMotion} from '../dist/ninja-motion.js';
import {RunnerMotion} from '../dist/runner-motion.js';
const config=JSON.parse(fs.readFileSync('dist/argus-config.json')),cc=JSON.parse(fs.readFileSync('dist/convoy-config.json'));
function hero(x=36,y=32,z=44){const root=new THREE.Group();root.position.set(x,y,z);return{root,enabled:true,active:true,velocity:new THREE.Vector3(),receiveEyeHit(){this.hits=(this.hits||0)+1;}};}
function setup(h=hero()){let boss,mission;const scene=new THREE.Scene(),physics=new DestructionWorld(),damage=new UnitDamage(u=>{if(!boss?.disable(u))mission?.disable(u);});mission=new ConvoyMission(scene,damage,structuredClone(cc));const charges=[],impulses=[],barriers=[],buildings=[];const testConfig=structuredClone(config);testConfig.spawn={x:36,z:54,yaw:Math.PI};boss=new Argus(scene,damage,gltfModel,spec,testConfig,{getConvoy:()=>mission,physics,getHeroes:()=>[h],getBuildings:()=>buildings,roofHeight:p=>h.roof??18,getBarriers:()=>barriers,onHeroHit:(h,p,power)=>h.receiveEyeHit(p,power),onImpulse:(h,v)=>impulses.push(v.clone()),onCharge:(k,s)=>charges.push([k,s]),onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>physics.removeWreck(b)});let t=0;function step(seconds){for(let i=0;i<Math.ceil(seconds*60);i++){t+=1/60;boss.attacks.update(1/60,t);boss.attacks.beforeHeroes(1/60);boss.attacks.afterHeroes(1/60);}}return{boss,mission,physics,damage,h,charges,impulses,barriers,buildings,step};}
function quiet(b){for(const k of ['flak','tether','lance'])b.config.attacks[k].enabled=false;}
{
 const {boss:b,h,step,charges}=setup();quiet(b);b.attacks.begin('flak',{hero:h,center:h.root.position.clone().add(new THREE.Vector3(0,1.2,0))});step(.79);assert.equal(h.hits||0,0);step(1);assert.equal(h.hits,1);assert(charges[0][1]>=.8);assert.equal(b.attacks.stats.flakHits,1);assert.equal(b.combatUnit.health,10000);console.log('PASS warned tracer flak damages airborne hero after delay, never boss');
}
for(const protection of['rooftop','ground','cover','shield']){
 const {boss:b,h,step,physics,barriers}=setup();quiet(b);b.attacks.begin('flak',{hero:h,center:h.root.position.clone().add(new THREE.Vector3(1,1.2,0))});if(protection==='rooftop')h.roof=34;if(protection==='ground')h.motion={mode:'ground'};if(protection==='shield')barriers.push({hero:h,active:true,strength:100,radius:6,onHit:()=>{h.blocked=true;}});if(protection==='cover')physics.addChunk({building:'cover',type:'wall',floor:10,x:36.5,y:33,z:44,size:[.2,6,6]});step(2);assert.equal(h.hits||0,0,protection);if(protection==='shield')assert(h.blocked);console.log('PASS flak protection',protection);
}
{
 const {boss:b,h,step,physics,damage,buildings}=setup(hero(0,.08,-4));quiet(b);h.shuriken={teleports:0};h.motion=new RunnerMotion();h.motion.reset({x:0,y:.08,z:-4});b.pose=b.gait.reset({x:0,z:-12},0);b.model.pose(b.pose,0);
 for(const [i,x]of[-12,12].entries()){const id='B'+i;buildings.push({id,x,z:0});physics.addChunk({building:id,type:'wall',floor:0,x:x+(x<0?5:-5),y:1.5,z:0,size:[.32,2.72,10]});}
 b.attacks.begin('tether',b.attacks.chooseTether());step(2.2);const line=b.attacks.lines[0];assert.equal(line.stage,'active');h.root.position.z=4;h.shuriken.teleports++;b.attacks.afterHeroes(.1);assert.equal(b.attacks.stats.tetherHits,0,'teleports bypass the intervening cable');h.root.position.z=-4;b.attacks.afterHeroes(.1);assert.equal(b.attacks.stats.tetherHits,1);assert.equal(h.motion.externalSpeedScale,.6);assert(b.attacks.state(h).immunity>=4.49);h.root.position.z=-4;b.attacks.afterHeroes(.1);assert.equal(b.attacks.stats.tetherHits,1);step(1.6);assert.equal(h.motion.externalSpeedScale,1);assert(b.attacks.state(h).immunity>2.8);damage.hurt(line.anchors[0].unit,999,line.anchors[0].point,'tether-anchor');assert.equal(b.attacks.lines.length,0);assert(!damage.units.some(u=>u.id.startsWith('argus-anchor-')));
 b.attacks.recovery=0;b.attacks.begin('tether',b.attacks.chooseTether());const second=b.attacks.lines[0];second.anchors[0].section.state='dynamic';step(.1);assert.equal(b.attacks.lines.length,0);console.log('PASS cable crossing yank/40% slow/immunity, killed anchor and collapsed attachment clean both ends');
}
{
 const {boss:b,h,step,impulses}=setup(hero(36,5,42));quiet(b);b.phase=2;b.attacks.begin('lance',h);step(.79);assert.equal(h.hits||0,0);step(.2);assert(b.coreOpen);step(3.4);assert(impulses.length>=3,JSON.stringify(b.attacks.diagnostics()));assert.deepEqual(impulses.map(v=>Math.round(Math.hypot(v.x,v.z))),[10,18,28]);console.log('PASS lance windup, continuous ramp and three increasing impulses');
}
{
 const {boss:b,h,step,physics}=setup(hero(36,5,42));quiet(b);b.phase=2;b.attacks.begin('lance',h);step(1.1);assert(b.coreOpen);physics.addChunk({building:'occluder',type:'wall',floor:2,x:36,y:9,z:47,size:[16,18,.3]});step(.7);assert.equal(b.attacks.active,null);assert(!b.coreOpen);console.log('PASS loss of cover/contact ends lance after grace');
}
{
 const {boss:b,h,step,damage}=setup(hero(36,5,42));quiet(b);b.phase=2;b.attacks.begin('lance',h);step(1.1);const hp=b.combatUnit.health;damage.hurt(b.combatUnit,600,b.model.core.getWorldPosition(new THREE.Vector3()),'argus-core-open');assert.equal(hp-b.combatUnit.health,1500);assert(b.stunRemaining>0);assert.equal(b.attacks.active,null);assert(b.coreOpen);console.log('PASS bonus core damage interrupts lance and opens stun window');
}
{
 const {boss:b,damage}=setup();quiet(b);b.combatUnit.health=6500;b.update(1/60,0);assert.equal(b.phase,2);assert.equal(b.drones.alive.length,2);const joint=b.joints.get('argus-hip-l');joint.health=300;let time=0;for(let i=0;i<15*60;i++){time+=1/60;b.drones.update(1/60);}assert(joint.health>590,joint.health);damage.hurt(b.combatUnit,999,b.model.targetPosition(joint.id),joint.id);assert(joint.destroyed);const penalty=b.speedMultiplier;for(let i=0;i<15*60;i++)b.drones.update(1/60);assert.equal(joint.health,0);assert.equal(b.speedMultiplier,penalty);b.drones.disable(b.drones.alive[0].combatUnit);for(let i=0;i<29*60;i++)b.drones.update(1/60);assert.equal(b.drones.alive.length,1);for(let i=0;i<2*60;i++)b.drones.update(1/60);assert.equal(b.drones.alive.length,2);b.combatUnit.health=3200;b.update(1/60,32);assert.equal(b.phase,3);assert.equal(b.cooldownScale,.7);assert(Math.abs(b.strideSpeed-config.movement.speed*.85*1.25)<1e-8);b.reset();assert.equal(b.drones.alive.length,0);assert.equal(b.phase,1);assert(!damage.units.some(u=>u.id.startsWith('argus-drone-')));console.log('PASS two phase-2 drones repair living joint, never dead joint, respawn one after 30s; phase-3 multipliers/reset');
}

{
 const normal=new RunnerMotion(),slow=new RunnerMotion();for(const m of[normal,slow]){m.reset({x:0,y:.08,z:0});m.yaw=0;m.bounds={minX:-500,maxX:500,minZ:-500,maxZ:500};}slow.externalSpeedScale=.6;for(let i=0;i<60;i++){normal.step({forward:1,boost:true,player:true},1/60,[]);slow.step({forward:1,boost:true,player:true},1/60,[]);}assert(Math.abs(slow.speed/normal.speed-.6)<1e-6);slow.reset();assert.equal(slow.externalSpeedScale,1);console.log('PASS temporary movement multiplier is exactly 40% slow and reset restores default');
}
{
 const{boss:b,h,step}=setup();quiet(b);b.phase=3;b.config.attacks.flak.windup=.1;b.attacks.begin('flak',{hero:h,center:h.root.position.clone().add(new THREE.Vector3(0,1.2,0))});assert.equal(b.attacks.active.windup,.8);step(.79);assert.equal(b.attacks.stats.damage,0);b.destroy();step(2);assert.equal(b.attacks.active,null);assert.equal(b.attacks.lines.length,0);assert.equal(b.attacks.zones.length,0);assert(!b.coreOpen);console.log('PASS hard minimum warning survives phase3; death clears all hazards and core');
}

{
 const ninja=new NinjaMotion();ninja.body.reset({x:0,y:.08,z:0});ninja.body.bounds={minX:-500,maxX:500,minZ:-500,maxZ:500};ninja.body.externalSpeedScale=.6;assert(ninja.startDash({x:0,y:1.2,z:100}));ninja.step({},.1,[]);assert(ninja.active);assert(Math.abs(ninja.position.z-128.8*.6*.1)<.001);console.log('PASS temporary slow scales Kage dash speed without false collision cancellation');
}

// Exercise autonomous scheduling, rather than forcing begin('lance') in a phase-2 fixture.
{
 const {boss:b,h,step}=setup(hero(36,.08,42));h.motion={mode:'ground'};
 b.config.attacks.flak.enabled=b.config.attacks.tether.enabled=false;
 step(b.config.attacks.lance.initialDelay+.05);
 assert.equal(b.phase,1);assert.equal(b.combatUnit.health,b.combatUnit.maxHealth);
 assert.equal(b.attacks.active?.kind,'lance','full-health ARGUS must engage a directly controlled ground hero');
 assert.equal(b.attacks.active.stage,'windup');assert.equal(h.hits||0,0);
 step(.7);assert.equal(h.hits||0,0,'opening counterattack still respects its warning');
 step(1.5);assert(b.attacks.stats.lanceHits>0);assert(b.attacks.stats.impulses>0);
 assert.equal(b.attacks.stats.flakHits,0);console.log('PASS autonomous full-health lance counter to controlled ground hero, warning and ramp impulses');
}
{
 const {boss:b,h,step}=setup(hero(36,.08,42));h.active=false;h.motion={mode:'ground'};
 b.config.attacks.flak.enabled=b.config.attacks.tether.enabled=false;step(5);
 assert.equal(b.attacks.active,null,'CPU heroes retain their phase-2 lance unlock');
 b.phase=2;step(.1);assert.equal(b.attacks.active?.kind,'lance');
 console.log('PASS CPU phase gate preserved, phase 2 unlocks lance naturally');
}
{
 const {boss:b,physics,step}=setup(hero(36,.08,42));b.config.attacks.flak.enabled=b.config.attacks.tether.enabled=false;
 physics.addChunk({building:'solo-cover',type:'wall',floor:1,x:36,y:6,z:47,size:[20,14,.4]});
 step(5);assert.equal(b.attacks.active,null,'opening lance never acquires through intact cover');
 console.log('PASS solo counterattack respects cover during target acquisition');
}

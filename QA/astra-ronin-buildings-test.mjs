import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {damageRoninBuildings} from '../dist/ronin-building-damage.js';
import {AstraRonin,RONIN} from '../dist/astra-ronin.js';
const panel=(w,x,z,y=1.5,size=[2,2,.3],yaw=0,type='wall')=>w.addChunk({type,building:'B',floor:0,x,y,z,size,yaw});
const city=()=>{const w=new DestructionWorld({maxDynamic:12});for(let i=0;i<60;i++)panel(w,150+i,150);return w;};
const area={center:new THREE.Vector3(0,.24,0),radius:18,height:6,damage:RONIN.dashBuildingDamage,edgeMultiplier:RONIN.buildingEdgeMultiplier};
const w=city(),targets=['wall','slab','column'].map((t,i)=>panel(w,2+i*4,0,1.5,[1,2,1],0,t)),edge=panel(w,18.5,0),long=panel(w,0,24,1.5,[16,2,.3],Math.PI/2),outside=panel(w,21,0),above=panel(w,0,0,9);
const result=damageRoninBuildings(w,area);
assert.equal(result.panels,5);assert.equal(result.destroyed,5);assert.equal(result.buildings,1);
for(const c of [...targets,edge,long]){assert.equal(c.hp,0);assert(w.pending.has(c));assert(c.scorch>0);}
assert.equal(outside.hp,outside.maxHp);assert.equal(above.hp,above.maxHp);
assert.equal(damageRoninBuildings(w,area).panels,0,'already broken panels are not damaged twice');
w.step(1/60);assert(w.dynamic.length>0&&w.dynamic.length<=w.maxDynamic,'existing debris activation remains bounded');
w.reset();assert([...targets,edge,long].every(c=>c.hp===c.maxHp&&c.state==='intact'&&c.scorch===0));
const sector=city(),front=panel(sector,0,9),back=panel(sector,0,-9),farSide=panel(sector,20,0);
damageRoninBuildings(sector,{...area,radius:RONIN.swordRange,height:RONIN.swordBuildingHeight,damage:RONIN.swordBuildingDamage,forward:new THREE.Vector3(0,0,1),minDot:.05});
assert.equal(front.hp,0);assert.equal(back.hp,back.maxHp);assert.equal(farSide.hp,farSide.maxHp);
const supports=new DestructionWorld();for(const x of[-2,2])for(const z of[7,11])panel(supports,x,z,1.5,[.48,2.72,.48],0,'column');const roof=supports.addChunk({type:'slab',building:'B',floor:1,x:0,y:18,z:9,size:[5,.3,5]});for(let i=0;i<4;i++)panel(supports,0,9,20+i*3);
damageRoninBuildings(supports,{...area,center:new THREE.Vector3(0,.24,9),radius:6});assert.equal(supports.collapses,1);assert(supports.pending.has(roof),'broken supports trigger normal structural collapse');
console.log('PASS heavy full boss damage, radial/height/sector limits, rotated long-wall overlap, edge falloff, scorch, support collapse, bounded physical debris and reset');

const make=(distance,dt,config={})=>{
 const world=city(),c=panel(world,.5,distance);c.hp=c.maxHp=1000;const events=[],damages=[];
 const original=world.damageChunk.bind(world);world.damageChunk=(chunk,power,options)=>{if(chunk===c)damages.push(power);return original(chunk,power,options);};
 const hero={alive:true,kind:'hero',shapes:[{center:new THREE.Vector3(0,1.5,distance)}]};
 const r=new AstraRonin(new THREE.Scene(),new UnitDamage(),{id:'ronin',config,getTargets:()=>[hero],visible:()=>true,trace:()=>null,isPathClear:()=>true,onHeroHit:()=>{},onBuildingStrike:spec=>{events.push(spec);damageRoninBuildings(world,spec);}});
 r.spawnPosition={x:0,y:.1,z:0};r.reset();r.spawn();r.cooldown=0;
 return{r,world,c,events,damages,tick(){r.update(dt,r.age+dt);}};
};
for(const dt of[1/30,1/60,1/120]){
 const s=make(60,dt);s.tick();let remaining=Math.ceil(12/dt);while(s.r.swordState&&remaining-->0)s.tick();assert(remaining>0);
 assert.equal(s.events.length,3,'one building hit per dash in three-strike combo');assert.equal(s.damages.length,3,'no repeated panel damage during active swing frames');
 assert(s.damages.every(d=>d<=RONIN.dashBuildingDamage&&d>=RONIN.dashBuildingDamage*.5));assert(Math.abs(1000-s.c.hp-s.damages.reduce((a,b)=>a+b,0))<1e-8);
 const melee=make(8,dt);melee.tick();while(melee.r.swordState)melee.tick();assert.equal(melee.events.length,1);assert.equal(melee.damages.length,1);assert.equal(melee.events[0].damage,RONIN.swordBuildingDamage);
 for(const stage of['windup','dash']){const interrupted=make(60,dt);interrupted.tick();while(interrupted.r.dashStage!==stage)interrupted.tick();assert.equal(interrupted.events.length,0);interrupted.r.stun(1);for(let i=0;i<.8/dt;i++)interrupted.tick();assert.equal(interrupted.events.length,0,'interrupted windup/travel cannot damage buildings');}
 s.r.reset();s.r.spawn();s.r.cooldown=0;s.world.reset();s.tick();while(s.r.swordState)s.tick();assert.equal(s.events.length,6,'reset allows a fresh full combo');
}
console.log('PASS actual Ronin combat at 30/60/120Hz: one panel hit per swing, all three dash cleaves, normal melee, stun cancellation and city/actor reset');

// Full city tower geometry, not just standalone damage dummies.
const tower=world=>{for(let floor=0;floor<12;floor++){
 for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;world.addChunk({building:'tower',type:'wall',floor,x:5*Math.sin(a)+u*Math.cos(a),y:floor*3+1.5,z:36+5*Math.cos(a)-u*Math.sin(a),yaw:a,size:[2.5,2.72,.32]});}
 for(let x=0;x<3;x++)for(let z=0;z<3;z++)world.addChunk({building:'tower',type:'slab',floor,x:(x-1)*10/3,y:(floor+1)*3,z:36+(z-1)*10/3,size:[10/3,.28,10/3]});
 for(const x of[-4.78,4.78])for(const z of[-4.78,4.78])world.addChunk({building:'tower',type:'column',floor,x,y:floor*3+1.5,z:36+z,size:[.48,2.72,.48]});
}};
const live=make(36,1/60,{dashComboCount:1});live.world.maxDynamic=160;tower(live.world);const neighbor=panel(live.world,40,36);live.tick();while(!live.events.length)live.tick();
assert.equal(live.world.collapses,1);assert(live.world.queue.length>=348,'a real dash cleave breaks lower supports and queues the complete 12-storey tower');
for(let i=0;i<600;i++)live.world.step(1/60);
const fallen=live.world.buildings.get('tower');assert(fallen.chunks.every(c=>c.hasDetached));assert.equal(neighbor.hp,neighbor.maxHp);assert(!neighbor.hasDetached);
live.world.reset();assert(fallen.chunks.every(c=>c.hp===c.maxHp&&c.state==='intact'&&!c.hasDetached));
console.log('PASS live dash cleave collapses a 348-section 12-storey city tower, keeps an outside neighbor intact, and rebuilds cleanly');

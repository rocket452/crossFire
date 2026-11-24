import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as T from '../dist/vendor/three.module.js';
import {Luxmancer,LuxPlayer} from '../dist/luxmancer.js';
import {traceImpact} from '../dist/combat-collision.js';
import {HeroRoster} from '../dist/hero-roster.js';
registerHooks({resolve(name,context,next){
 return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,context);
}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync('dist/city-assets/licensed-characters/luxmancer.glb');
const model=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new T.Scene(),targets=[],hits=[],ray=new T.Vector3(0,0,1);
const hero=new Luxmancer(scene,model,{getUnits:()=>targets,visible:()=>true,
 traceBolt:(a,b)=>traceImpact(a,b,{targets,ground:false}),onHit:(hit,p,damage)=>hits.push([hit.unit,damage])});
const camera=new T.PerspectiveCamera();camera.position.set(0,1.5,-5);camera.lookAt(0,1.5,50);
const p=Object.assign(Object.create(LuxPlayer.prototype),{hero,camera,keys:new Set(),taps:new Set(),
 hurt:{step(){},applyPose(){}},output:{},grounded:true,yaw:0,move(){},frame(){},available:()=>true});
hero.player=p;hero.active=true;hero.setEnabled(true);
assert(new HeroRoster({maxHeroes:1,luxAvailable:true}).apply(['lux']));
assert.equal(hero.character.bones.length,53);
const origin=new T.Vector3(0,10,0);
hero.shoot('lance',origin,ray);
for(let i=0;i<60;i++)hero.stepShots(1/60);
assert(Math.abs(hero.shots[0].mesh.position.z-205)<.1);
assert(hero.shots[0].mesh.position.y<10&&hero.shots[0].mesh.position.y>9);
assert(hero.effects.streaks.count>1,'Sunlance leaves an afterimage along its path');
hero.reset();p.keys.add('Shield');
for(let i=0;i<30;i++)hero.update(1/60);
assert(hero.shots.length>=5&&hero.shots.every(s=>s.kind==='spray'));
assert(hero.shots.some(s=>Math.abs(s.v.x)>1));
assert(hero.effects.sigil.visible&&hero.effects.sparks.count>0,'Sunburst renders the hand sigil and sparks');
assert.equal(hero.poseKind,'spray');
p.keys.clear();hero.reset();
for(const x of [-8,-4,0,4,8]){
 const center=new T.Vector3(x,1.5,35);
 targets.push({kind:'robot',alive:true,shapes:[{center,half:new T.Vector3(1,1,1),rotation:new T.Quaternion()}]});
}
const step=frames=>{for(let i=0;i<frames;i++)hero.update(1/60);};
p.keys.add('KeyE');step(20);assert.equal(hero.locks.length,0);
assert(hero.pendingMark.visible);
assert.equal(hero.poseKind,'comet');
assert(hero.effects.sigil.visible,'charging Light Volley shows its hand sigil');
assert.match(p.output.textContent,/Acquiring 95%/);
step(1);assert.equal(hero.locks.length,1);
step(10);p.keys.clear();step(1);
assert.equal(hero.shots.length,1,'release fires completed locks only');
assert(!hero.pendingMark.visible);
hero.reset();
p.keys.add('KeyE');step(10);
camera.lookAt(0,1.5,-50);step(1);
assert.equal(hero.pendingTime,0,'breaking aim discards partial progress');
camera.lookAt(0,1.5,50);
for(let expected=1;expected<=4;expected++){
 step(20);assert.equal(hero.locks.length,expected-1);
 step(1);assert.equal(hero.locks.length,expected);
}
step(40);assert.equal(hero.locks.length,4);
assert.equal(hero.marks.filter(m=>m.visible).length,4);
p.keys.clear();hero.update(1/60);assert.equal(hero.shots.length,4);
assert.equal(new Set(hero.shots.map(s=>s.target)).size,4);
for(let i=0;i<120;i++)hero.update(1/60);
assert.equal(hits.filter(([,damage])=>damage===115).length,4);
hero.reset();assert.equal(hero.shots.length+hero.locks.length,0);
assert.equal(hero.effects.streaks.count+hero.effects.sparks.count+hero.effects.bursts.length,0);
assert.equal(hero.effects.sigil.visible,false);
console.log('PASS animated Luxmancer asset, selection, arcing lance, automatic spread fire, four locks, homing impacts and reset');

const {SOLAR_CONFIG}=await import('../dist/lux-solar.js');
Object.assign(p,{
 grounded:true,vertical:0,stick:{value:{x:0,y:0}},
 bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},
 terrain:()=>0,blocked:()=>null,roofBelow:()=>null,getPlatforms:()=>[]
});
delete p.move;
targets.length=0;
hero.root.position.set(0,.1,0);
p.keys.add('KeyW');step(60);p.keys.clear();
assert(Math.abs(hero.root.position.z-14)<.001);
assert.equal(hero.energy,100,'ground movement is free');
hero.shoot('lance',origin,ray);
hero.shoot('spray',origin,ray);
hero.shoot('comet',origin,ray);
assert.equal(hero.energy,100-SOLAR_CONFIG.attackCosts.lance-SOLAR_CONFIG.attackCosts.spray-SOLAR_CONFIG.attackCosts.comet);
const beforeChannel=hero.energy;
step(60);
assert.equal(hero.energy,beforeChannel,'energy never passively regenerates');
const beforeChannelPosition=hero.root.position.clone();
const hitCount=hits.length;
const alreadyInFlight=new Set(hero.shots);
p.keys.add('KeyW');p.keys.add('KeyF');p.keys.add('KeyR');p.taps.add('Space');p.taps.add('KeyQ');
step(45);
assert.equal(hero.solarMode,'communion');
assert(hero.solarEffects.pillar.visible);
assert.equal(hero.energy,beforeChannel,'wind-up grants zero energy');
step(30);
assert(Math.abs(hero.energy-beforeChannel-12.5)<.001,'25 energy per second after channel wind-up');
assert(hero.root.position.distanceTo(beforeChannelPosition)<1e-6,'channel blocks walking, jumping and flight');
assert(hero.shots.every(shot=>alreadyInFlight.has(shot)),'channel blocks new attacks');
assert.equal(hits.length,hitCount);
p.keys.clear();step(1);
assert.equal(hero.solarMode,null);
assert(!hero.solarEffects.pillar.visible);

hero.energy=8;
p.taps.add('KeyQ');p.keys.add('Space');p.keys.add('KeyW');step(60);p.keys.clear();
assert(hero.solarEffects.disc.visible);
assert(Math.abs(hero.energy-3)<.001);
assert(Math.abs(hero.root.position.y-19.1)<.001);
assert(Math.abs(hero.root.position.z-45)<.001);
p.keys.add('KeyR');step(36);
assert.equal(hero.energy,0);
assert.equal(hero.solarMode,'landing');
assert(hero.root.position.y>18,'depletion begins descent without a position jump');
assert.equal(hero.shoot('lance',origin,ray),false);
p.keys.clear();
step(180);
assert.equal(hero.solarMode,null);
assert(p.grounded&&!hero.solarEffects.disc.visible);
assert(Math.abs(hero.root.position.y-.1)<.001,'automatic descent ends at terrain height');
assert.equal(hero.energy,0);

hero.energy=7;
hero.locks=[0,1,2].map(()=>({alive:true,shapes:[{center:new T.Vector3(0,8,60)}]}));
hero.charging=true;step(1);
assert.equal(hero.shots.length,1,'Light Volley fires as many complete locks as the available energy pays for');
assert.equal(hero.energy,1);
hero.reset();
console.log('PASS Solar Energy costs and persistence, grounded communion wind-up and recovery, free ground travel, powered flight and safe landing');

p.keys.add('Fire');step(89);
assert.equal(hero.shots.length,0,'Sunlance waits for a full 1.5-second hold');
assert.equal(hero.energy,100,'charging has no upfront cost');
assert(hero.effects.lanceGather.visible);
p.keys.clear();step(1);
assert.equal(hero.lanceCharge,0);
assert(!hero.effects.lanceGather.visible,'early release disperses the gathered light');
p.keys.add('KeyF');step(89);
assert.equal(hero.shots.length,0,'starting another hold starts a fresh charge');
step(1);
assert.equal(hero.shots[0]?.kind,'lance','fires automatically at 1.5 seconds');
assert.equal(hero.energy,90);
assert(!hero.effects.lanceGather.visible);
step(160);
assert.equal(hero.energy,90,'a continuous hold fires once');
p.keys.clear();step(1);
p.keys.add('Fire');step(90);
assert.equal(hero.energy,80,'releasing rearms the spell');
p.keys.clear();hero.reset();
p.keys.add('Shield');step(1);
const bolt=hero.shots[0],start=bolt.trail[0];
const aim=camera.position.clone().addScaledVector(camera.getWorldDirection(new T.Vector3()),380);
const angle=bolt.v.angleTo(aim.sub(start));
assert(angle<=Math.atan(.10)+1e-7,'Sunburst stays within the tighter half-angle');
p.keys.clear();
console.log('PASS Sunlance hold, cancellation, auto-fire, cost and rearm, plus tighter Sunburst spread');

hero.reset();
hero.root.position.set(0,.1,0);
p.grounded=true;
const distant={kind:'robot',alive:true,shapes:[{
 center:new T.Vector3(0,1.5,135),half:new T.Vector3(1,1,1),rotation:new T.Quaternion()
}]};
targets.push(distant);
p.keys.add('KeyE');step(21);
assert.deepEqual(hero.locks,[distant]);
p.keys.clear();step(1);
assert(Math.abs(hero.shots[0].v.length()-33)<1e-6,'Light Volley flies at half speed');
step(180);
assert.equal(hero.shots.length,1,'the slower comet stays in flight beyond the old lifetime');
step(120);
assert(hits.some(([unit,damage])=>unit===distant&&damage===115),'Light Volley still reaches the far end of lock range');
console.log('PASS half-speed Light Volley and long-range impact');

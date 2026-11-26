import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as T from '../dist/vendor/three.module.js';
import {Luxmancer,LuxPlayer} from '../dist/luxmancer.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {HeroRoster} from '../dist/hero-roster.js';
import {SpiderBruiser} from '../dist/spider-bruiser.js';
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
for(let expected=1;expected<=3;expected++){
 step(20);assert.equal(hero.locks.length,expected-1);
 step(1);assert.equal(hero.locks.length,expected);
}
step(20);
assert.equal(hero.locks.length,3);
assert.equal(hero.marks.filter(m=>m.visible).length,3);
assert.equal(hero.shots.length,0);
step(1);
assert.equal(hero.shots.length,4,'a full volley fires without releasing the input');
p.keys.clear();
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
hero.energy=70;
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

hero.energy=4;
p.taps.add('KeyQ');p.keys.add('Space');p.keys.add('KeyW');step(60);p.keys.clear();
assert(hero.solarEffects.disc.visible);
assert(Math.abs(hero.energy-1.5)<.001);
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

hero.energy=4;
hero.locks=[0,1,2].map(()=>({alive:true,shapes:[{center:new T.Vector3(0,8,60)}]}));
hero.charging=true;step(1);
assert.equal(hero.shots.length,1,'Light Volley fires as many complete locks as the available energy pays for');
assert.equal(hero.energy,1);
hero.reset();
console.log('PASS Solar Energy costs and persistence, grounded communion wind-up and recovery, free ground travel, powered flight and safe landing');

const beforeLance=hero.root.position.clone();
p.keys.add('KeyW');p.taps.add('Space');p.taps.add('KeyQ');
p.keys.add('Fire');step(89);
assert(hero.root.position.distanceTo(beforeLance)<1e-6,'Sunlance hold blocks walking, jumping and disc activation');
assert(hero.effects.lanceSeal.visible&&hero.effects.lanceRings.length===3);
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
assert.equal(hero.energy,95);
assert(!hero.effects.lanceGather.visible);
p.keys.add('KeyW');step(50);
assert.equal(hero.lanceCharge,0,'the next Sunlance waits for the cooldown');
assert.equal(hero.energy,95);
step(90);
assert.equal(hero.energy,95,'the second shot needs a fresh full charge');
step(1);
assert.equal(hero.energy,90,'a continuous hold fires again');
assert(hero.root.position.distanceTo(beforeLance)<1e-6,'movement stays locked until the firing input is released');
p.keys.delete('KeyF');step(1);
assert(hero.root.position.z>beforeLance.z,'releasing the hold restores movement');
p.keys.clear();p.keys.add('Fire');step(90);
assert.equal(hero.energy,90,'releasing and pressing again still respects cooldown');
step(50);
assert.equal(hero.energy,85,'a new hold also fires after cooldown and charge');
p.keys.clear();hero.reset();
p.keys.add('Shield');step(1);
const bolt=hero.shots[0],start=bolt.trail[0];
const aim=camera.position.clone().addScaledVector(camera.getWorldDirection(new T.Vector3()),380);
const angle=bolt.v.angleTo(aim.sub(start));
assert(angle<=Math.atan(.10)*.7+1e-7,'Sunburst half-angle is 30% tighter');
p.keys.clear();
for(const fps of [30,60]){
 hero.reset();
 p.keys.add('Shield');
 for(let i=0;i<2*fps;i++)hero.update(1/fps);
 assert.equal(hero.energy,76.5,'Sunburst fires 47 rounds over a two-second hold at '+fps+' FPS');
 p.keys.clear();
}
hero.reset();hero.solarMode='flight';
hero.root.position.set(0,18,0);p.grounded=false;
for(const key of ['Fire','KeyD','Space'])p.keys.add(key);
step(30);
assert.deepEqual(hero.root.position.toArray(),[0,18,0],'Sunlance hold blocks controlled flight translation');
assert(hero.lanceCharge>.49,'Sunlance can charge while hovering');
p.keys.clear();step(1);
console.log('PASS Sunlance hold, movement lock, cancellation, auto-fire and rearm, plus Sunburst spread and cadence');

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

hero.reset();
const spiderBytes=fs.readFileSync('dist/city-assets/licensed-robots/breaker-spider.glb');
const spiderModel=await new GLTFLoader().parseAsync(
 spiderBytes.buffer.slice(spiderBytes.byteOffset,spiderBytes.byteOffset+spiderBytes.byteLength),'');
const combat=new UnitDamage(unit=>unit.entity.destroy());
const bruiser=new SpiderBruiser(scene,combat,{spiderModel,spawnPosition:{x:0,y:.1,z:25},
 getTargets:()=>[],visible:()=>true,trace:()=>null});
bruiser.spawn();bruiser.root.rotation.y=0;bruiser.sync();
targets.splice(0,targets.length,bruiser.combatUnit);
const body=bruiser.combatUnit.shapes[0].center;
camera.position.set(body.x,body.y,-5);camera.lookAt(body);
let struckPart=null;
hero.onHit=(hit,point,damage)=>{
 struckPart=hit.part;combat.hurt(hit.unit,damage,point,hit.part);
};
assert.equal(bruiser.combatUnit.health,350);
p.keys.add('Fire');step(90);p.keys.clear();step(30);
assert.equal(struckPart,'hull','the shot hits the body');
assert.equal(bruiser.combatUnit.alive,false,'a single charged Sunlance defeats a full-health Bruiser');
assert.equal(combat.damageEvents,1);
console.log('PASS charged Sunlance one-shot to the Bruiser hull');

hero.reset();
hero.root.position.set(0,.1,0);
camera.position.set(0,1.5,-5);camera.lookAt(0,1.5,50);
Object.assign(p,{roofMarker:new T.Object3D(),hud:{toggleAttribute(){}},bounds:{minX:-200,maxX:200,minZ:-200,maxZ:200},
 terrain:()=>0,roofBelow:()=>null,blocked:()=>null,sweep:()=>null,getBuilding:()=>null,buildings:[]});
p.taps.add('KeyX');step(1);
assert(Math.abs(hero.root.position.z-28)<1e-6);
assert(hero.solarEffects.blinkAnchor.visible&&hero.solarEffects.blinkPulses.every(pulse=>pulse.group.visible));
p.taps.add('KeyX');step(1);
assert.deepEqual(hero.root.position.toArray(),[0,.1,0]);
assert(!p.anchor&&!hero.solarEffects.blinkAnchor.visible&&p.blinkCooldown>0);
p.taps.add('KeyX');step(1);
assert.equal(hero.root.position.z,0,'cooldown blocks instant reactivation');
step(151);

const rooftop={id:'solar-roof',x:0,z:83,floors:10};
p.buildings=[rooftop];
p.roofBelow=(x,z,top,bottom)=>top>=30&&bottom<=30&&Math.abs(z-83)<5?
 {section:{building:rooftop.id},point:{x,y:30,z}}:null;
camera.position.set(0,3,-5);camera.lookAt(0,30,83);
step(1);
assert(p.roofMarker.visible,'gold roof preview uses the shared Rift targeting');
p.taps.add('KeyX');step(1);
assert.equal(hero.root.position.y,30.08);
assert(p.anchor);
step(242);
assert(!p.anchor&&!hero.solarEffects.blinkAnchor.visible,'return window expires');
step(152);
assert(!p.roofMarker.visible,'current roof cannot be selected');
hero.reset();
assert(!p.anchor&&!hero.solarEffects.blinkPulses.some(pulse=>pulse.group.visible));
console.log('PASS Solar Blink input, gold effects, return, cooldown, long-range rooftop landing, anchor expiry and reset');


hero.reset();
hero.root.position.set(0,.1,0);
camera.position.set(0,1.5,-5);camera.lookAt(0,1.5,135);
targets.splice(0,targets.length,distant);
hero.onHit=()=>{};
p.keys.add('KeyE');
step(104);
assert.equal(hero.energy,100,'a partial volley leaves time to acquire more targets');
step(1);
assert.equal(hero.energy,97,'one completed lock fires automatically when its window closes');
step(240);
assert.equal(hero.energy,97);
assert.equal(hero.locks.length,0,'no locks are built during the cooldown');
step(105);
assert.equal(hero.energy,94,'continued hold acquires and fires a second partial volley');
step(8);
p.keys.clear();step(250);
assert.equal(hero.energy,94,'releasing during cooldown does not leave a cast queued');
console.log('PASS continuously held Light Volley repeats against a single target and stops on release');

hero.reset();
p.keys.clear();p.taps.clear();p.grounded=true;p.vertical=0;p.yaw=0;
hero.root.position.set(0,.1,0);
p.keys.add('KeyF');step(30);
assert(hero.lanceCharge>0);
for(const key of ['ShiftLeft','KeyW','KeyG','KeyE','KeyR'])p.keys.add(key);
p.taps.add('KeyQ');p.taps.add('KeyX');
step(60);
assert(Math.abs(hero.root.position.z-21)<.001,'Shift moves Luxmancer 50% faster on foot');
assert.equal(hero.energy,100);
assert.equal(hero.shots.length,0);
assert.equal(hero.lanceCharge,0);
assert.equal(hero.locks.length,0);
assert.equal(hero.solarMode,null);
p.keys.delete('ShiftLeft');p.keys.delete('KeyR');
p.keys.delete('KeyG');p.keys.delete('KeyE');
step(90);
assert.equal(hero.energy,95,'releasing Shift lets a fresh Sunlance charge fire');
p.keys.clear();
console.log('PASS ground sprint speed, spell lockout and fresh charge after sprint');

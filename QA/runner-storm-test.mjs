import {SkyStrikeFX} from '../dist/sky-strike-fx.js';
import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {RunnerStorm,VOLT_STORM as C} from '../dist/runner-storm.js';
import {RunnerEnergy} from '../dist/runner-energy.js';
import {UnitDamage} from '../dist/combat-collision.js';
function setup(){const damage=new UnitDamage(),walls=[],energy=new RunnerEnergy();energy.amount=100;const units=[];const s=new RunnerStorm({getUnits:()=>units,getSections:()=>walls,onHit:(hit,p)=>damage.hurt(hit.unit,p,hit.point,hit.part)});const enemy=(id,x,z)=>{const u=damage.add(id,'robot',{},10000);u.shapes=[{part:'hull',center:new T.Vector3(x,2,z),half:{x:.5,y:2,z:.5}}];units.push(u);return u;};return{s,walls,energy,enemy};}
for(const hz of[30,60,120]){const {s,enemy,energy}=setup(),u=enemy('near',0,1);const point=new T.Vector3(0,.08,0);
 energy.amount=74;
 assert(!s.callStrike(point,energy));assert.equal(energy.amount,74);assert.equal(s.strikeCooldown,0);
 energy.amount=75;
 assert(!s.callStrike(null,energy));assert.equal(energy.amount,75);
 assert(s.callStrike(point,energy));assert.equal(energy.amount,0);assert.equal(energy.spent,75);
 for(let i=0;i<hz*3-1;i++)s.update(1/hz);assert.equal(u.health,10000);s.update(1/hz);assert(u.health<10000);assert.equal(s.strikes,1);s.update(1/hz);assert.equal(s.strikes,1);energy.amount=100;assert(!s.callStrike(point,energy));assert.equal(energy.amount,100);}
let t=setup();assert(t.s.launch(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy));assert(Math.abs(t.energy.amount-100/3)<1e-8);assert(!t.s.launch(new T.Vector3(),new T.Vector3(0,0,1),t.energy));const p=t.s.orb.position.clone();t.s.update(.25);assert(Math.abs(p.distanceTo(t.s.orb.position)-C.orbSpeed*.25)<1e-9);const initial=t.s.orb.energy;t.s.recharge(30);assert(t.s.orb.energy>initial);assert(t.s.orb.energy<=C.orbEnergy);let hit=t.s.trace(t.s.orb.position.clone().add(new T.Vector3(0,0,-10)),t.s.orb.position.clone().add(new T.Vector3(0,0,10)));assert(hit?.voltOrb);assert(!t.s.trace(new T.Vector3(10,2,0),new T.Vector3(10,2,20)));
t=setup();const a=t.enemy('a',0,8),b=t.enemy('b',3,9),far=t.enemy('far',0,50);t.s.launch(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy);t.s.update(.01);assert(a.health<10000&&b.health<10000&&far.health===10000);assert.equal(t.s.zaps,2);assert(t.s.orb.energy<C.orbEnergy-12);for(let i=0;i<1000&&t.s.orb;i++)t.s.update(.05);assert(!t.s.orb);const count=t.s.zaps;t.s.update(10);assert.equal(t.s.zaps,count);
t=setup();const covered=t.enemy('covered',0,10);t.walls.push({size:[10,10,.3],body:{position:new T.Vector3(0,3,9),quaternion:new T.Quaternion()}});t.s.launch(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy);t.s.update(1);assert.equal(covered.health,10000);assert(t.s.orb.parked);t.s.reset();assert(!t.s.orb&&!t.s.strike&&t.s.events.length===0);
t=setup();t.energy.amount=66;assert(!t.s.launch(new T.Vector3(),new T.Vector3(0,0,1),t.energy));assert.equal(t.energy.amount,66);console.log('PASS exact 3s delay at 30/60/120Hz, cooldown/no duplicate strike, 2/3 ultimate cost, slow movement, energy spending/depletion, automatic multi-target zaps, range/cover/parking, recharge and projectile contact, insufficient energy and reset');

t=setup();t.s.launch(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy);const old=t.s.orb;t.s.update(16);t.energy.amount=100;assert(t.s.launch(new T.Vector3(0,2,0),new T.Vector3(1,0,0),t.energy));assert(t.s.orb!==old&&t.s.casts===2);assert(Math.abs(t.energy.amount-100/3)<1e-8);console.log('PASS recasting after cooldown replaces the old orb, keeps one active, and charges the full ultimate cost');

assert.equal(C.orbRadius,2.5);assert.equal(C.zapRange,32);assert.equal(C.zapInterval,.45);t=setup();const inRange=t.enemy('extended',0,32),outside=t.enemy('outside',0,45);assert(t.s.beginCast(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy));assert(!t.s.orb);t.s.update(.99);assert(!t.s.orb);t.s.update(.01);assert(t.s.orb);assert(inRange.health<10000&&outside.health===10000);t=setup();t.s.beginCast(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy);t.s.cancelCast();assert.equal(t.energy.amount,100);assert(!t.s.cast&&!t.s.orb);console.log('PASS doubled orb radius, 32m targeting, one-second wind-up and cancellation refund');

t=setup();t.walls.push({size:[10,10,1],body:{position:new T.Vector3(0,3,3.5),quaternion:new T.Quaternion()}});t.s.beginCast(new T.Vector3(0,2,0),new T.Vector3(0,0,1),t.energy);t.s.update(1);assert(!t.s.orb&&!t.s.cast);assert.equal(t.energy.amount,100);assert.equal(t.s.ultimateCooldown,0);console.log('PASS blocked wind-up refunds energy and consumes no cooldown');

for(const hz of[30,60,120])for(const dir of [new T.Vector3(1,0,0),new T.Vector3(-1,0,0),new T.Vector3(0,0,1),new T.Vector3(0,0,-1)]){t=setup();t.s.launch(new T.Vector3(0,3,0),dir,t.energy);const orb=t.s.orb;orb.position.copy(dir).multiplyScalar(56-C.orbRadius-.1);orb.position.y=3;for(let i=0;i<5&&t.s.orb;i++)t.s.update(1/hz);assert(!t.s.orb,'edge contact despawns');assert.equal(t.s.events.filter(e=>e.kind==='fade').length,1);const zaps=t.s.zaps;t.s.update(.1);assert.equal(t.s.zaps,zaps);assert.equal(t.s.recharge(100),0);assert(!t.s.trace(new T.Vector3(),dir.clone().multiplyScalar(100)));assert(t.s.ultimateCooldown>15);}console.log('PASS all four stage edges at 30/60/120Hz: one fade, no further attacks/recharge/collision, existing cooldown retained');

{
 const fx=new SkyStrikeFX(new T.Group()),point=new T.Vector3(8,.1,12);
 const storm={strike:{point,remaining:.25},events:[]};
 fx.update(0,2.75,storm);
 assert.equal(fx.diagnostics().crown,3);
 assert.equal(fx.rings[0].scale.x,C.strikeRadius,'the outside warning ring marks the damage radius');
 storm.strike=null;
 storm.events=[{kind:'strike',point,age:0}];
 fx.update(0,3,storm);
 assert(fx.diagnostics().channel&&fx.core.count>=96);
 assert.equal(fx.diagnostics().crown,0);
 fx.update(.19,3.19,storm);
 assert(fx.channel.material.opacity>.1,'return stroke is visible');
 storm.events=[];
 fx.update(1.5,4.69,storm);
 assert(!fx.diagnostics().channel&&fx.core.count===0&&fx.sparks.count===0);
}

for(const rate of [30,60,120]){
 const {s,energy}=setup();
 s.bounds={minX:-1000,maxX:1000,minZ:-1000,maxZ:1000};
 assert(s.launch(new T.Vector3(0,3,0),new T.Vector3(0,0,1),energy));
 for(let i=0;i<20*rate-1;i++){
  s.update(1/rate);
  s.recharge(100);
 }
 assert(s.orb&&s.orb.energy===C.orbEnergy);
 s.update(1/rate);
 assert.equal(s.orb,null);
 assert(s.events.some(e=>e.kind==='fade'));
}
console.log('PASS maximum 20-second Ball Lightning lifetime across simulation rates even with continuous recharge');

{
 const strikes=[],buildings=[];
 const near=new T.Vector3(1,0,0),unit=(name,y,x=near.x,z=near.z)=>({
  id:name,kind:'robot',alive:true,shapes:[{center:new T.Vector3(x,y,z),half:{x:.5,y:.5,z:.5},part:'hull'}]
 });
 const ground=unit('ground',1),air=unit('air',88),outside=unit('outside',30,9,8),above=unit('above',C.strikeHeight+5);
 air.shapes.push({...air.shapes[0],part:'engine',center:new T.Vector3(1,87,.4)});
 const wall=(y,x)=>({building:'tower',state:'intact',hp:10,size:[2,1,2],body:{position:new T.Vector3(x,y,0)}});
 const lowWall=wall(4,0),highWall=wall(62,0),outsideWall=wall(30,17);
 const storm=new RunnerStorm({getUnits:()=>[ground,air,outside,above],getSections:()=>[lowWall,highWall,outsideWall],
  onHit:(hit,power)=>{strikes.push({hit,power});return power;},
  onStrikeBuildings:ids=>buildings.push(...ids)
 });
 storm.strikeNow(new T.Vector3(0,.08,0));
 assert.deepEqual(strikes.map(v=>v.hit.unit?.id||v.hit.section.body.position.y),['ground','air',4,62]);
 assert.equal(strikes[0].power,strikes[1].power,'same horizontal distance gives the same damage at every elevation');
 assert.deepEqual(buildings,['tower'],'building supports are checked once per strike');
}
console.log('PASS vertical cylinder reaches aerial targets and all in-range floors, with no duplicate hit on a multipart robot');

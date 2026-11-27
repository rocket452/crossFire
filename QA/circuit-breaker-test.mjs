import assert from 'node:assert/strict';
import {Group,Scene,Vector3} from '../dist/vendor/three.module.js';
import {CircuitBreaker,CIRCUIT_BREAKER as config} from '../dist/circuit-breaker.js';
import {RunnerEnergy} from '../dist/runner-energy.js';

for(const fps of [30,60,120]){
 const scene=new Scene(),dealt=[];
 let pops=0,armored=false;
 const power=new RunnerEnergy();power.amount=36;
 const ability=new CircuitBreaker(scene,{
  hit:(_,amount)=>{if(armored)return false;dealt.push(amount);return true;},
  detonate:()=>pops++
 });
 const root=new Group();root.position.y=20;
 const unit={kind:'robot',alive:true,entity:{root},shapes:[{center:new Vector3(0,21,0),half:new Vector3(1,1,1)}]};
 const initial=new Vector3(5,0,0),rightAngle=new Vector3(0,40,5),badAngle=new Vector3(1,0,5);
 const shot={from:initial,end:root.position.clone(),hit:{unit,point:root.position.clone()}};
 assert(!ability.start(power,true));assert.equal(power.amount,36);
 assert(ability.start(power,false));assert(!ability.start(power,false));
 assert.equal(power.amount,24);
 for(let frame=0;frame<=fps*.3;frame++){
  assert(ability.active);
  ability.step(1/fps,()=>shot,initial);
 }
 assert(!ability.active);
 assert.deepEqual(dealt,[55,55,55]);
 const mark=ability.marks.get(unit);
 assert(Math.abs(mark.until-(config.markSeconds+1/fps))<1e-6);
 assert(!ability.primed(unit,badAngle));
 assert(ability.primed(unit,rightAngle));
 assert(!ability.primed(unit,new Vector3(0,45,0)));
 const rotation=mark.ring.quaternion.clone();
 root.rotation.set(.5,1.8,.3);root.position.set(3,25,6);unit.shapes[0].center.set(3,26,6);
 ability.step(.1,null,initial);
 assert.deepEqual(mark.ring.position.toArray(),[3,26,6]);assert(mark.ring.quaternion.equals(rotation));
 const flank=new Vector3(0,0,6);armored=true;ability.register(shot.hit,flank);
 assert.equal(ability.marks.get(unit),mark);
 armored=false;ability.register(shot.hit,flank);
 assert.equal(dealt.at(-1),165);assert.equal(pops,1);assert(!ability.marks.has(unit));
 ability.register(shot.hit,initial);ability.step(4,null,initial);assert.equal(ability.marks.size,0);
 assert(ability.start(power,false));ability.cancel();assert(!ability.active);
 ability.reset();assert.equal(ability.shots,0);
 power.amount=11;assert(!ability.start(power,false));
}
console.log('PASS Circuit Breaker timing at 30/60/120 Hz, charge, blocked starts, world-space flank, moving ring, armor, damage, expiration and reset.');

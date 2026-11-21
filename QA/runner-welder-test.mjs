import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RunnerWelder,WELDING_BEAM as C,weldAimPoint,weldStun} from '../dist/runner-welder.js';
import {RunnerEnergy} from '../dist/runner-energy.js';
import {traceImpact} from '../dist/combat-collision.js';
for(const hz of[30,60,120]){
 const weld=new RunnerWelder(new THREE.Scene()),energy=new RunnerEnergy(),from=new THREE.Vector3(0,1.7,0),direction=new THREE.Vector3(0,0,1),enemy={id:'robot',kind:'robot',alive:true,entity:{stun:n=>assert.equal(n,C.stun)},shapes:[{center:{x:0,y:1.7,z:4},half:{x:.5,y:1,z:.5}}]};energy.amount=100;let damage=0;
 const opts={from,direction,trace:(a,b,r)=>traceImpact(a,b,{targets:[enemy],ground:false,radius:r}),onHit:h=>{assert.equal(h.unit,enemy);const power=C.damagePerSecond/hz;damage+=power;assert(weldStun(h,power));return{damage:power};}};
 for(let i=0;i<hz;i++){weld.step(1/hz,true,energy);weld.update(1/hz,i/hz,opts);}assert(Math.abs(damage-600)<1e-7);assert(Math.abs(energy.amount-75)<1e-7);assert(weld.active&&weld.sparks.count===24);weld.step(1/hz,false,energy);assert(!weld.active&&!weld.root.visible);assert.equal(weld.activations,1);
 let farHit=false;enemy.shapes[0].center.z=8;weld.step(.1,true,energy);weld.update(.1,2,{...opts,onHit:()=>{farHit=true;}});assert(!farHit,'range is enforced');enemy.shapes[0].center.z=4;
 const wall={state:'intact',hp:100,x:0,y:1.7,z:2,size:[2,3,.3]};const blocked=traceImpact(from,new THREE.Vector3(0,1.7,6),{sections:[wall],targets:[enemy],ground:false});assert.equal(blocked.section,wall);
 energy.amount=.25;let power=0;weld.step(.1,true,energy);weld.update(.1,3,{...opts,onHit:(_,p)=>{power=p;return{damage:p};}});assert(Math.abs(power-6)<1e-7);assert.equal(energy.amount,0);weld.step(.1,true,energy);assert(!weld.active);weld.reset();assert.equal(weld.hits,0);assert(!weld.root.visible);console.log('PASS',hz+'Hz','600 DPS / 25 energy per second, release, range, cover, depletion, bounded sparks, reset');
}
let calls=0;const boss={stun:()=>calls++},unit={kind:'robot',alive:true,entity:boss};assert(!weldStun({unit},50,[boss]));assert.equal(calls,0);assert(!weldStun({unit},0));assert(!weldStun({unit:{...unit,kind:'civilian'}},50));unit.alive=false;assert(!weldStun({unit},50));console.log('PASS boss immunity, no stun on blocked damage / civilians / dead enemies');

{
 const camera=new THREE.Vector3(0,1.7,-5),muzzle=new THREE.Vector3(-.5,1.5,0);
 const sight=new THREE.Vector3(0,0,1),energy=new RunnerEnergy(),welder=new RunnerWelder(new THREE.Scene());
 const unit={id:'offset target',kind:'robot',alive:true,shapes:[{center:{x:.59,y:1.7,z:4},half:{x:.5,y:1,z:.5}}]};
 let sections=[],damage=0;
 const trace=(a,b,radius)=>traceImpact(a,b,{sections,targets:[unit],ground:false,radius});
 assert(!trace(camera,camera.clone().addScaledVector(sight,100),0),'the thin reticle ray misses the edge');
 energy.amount=100;
 const update=()=>{const target=weldAimPoint(camera,sight,trace);welder.step(1/60,true,energy);
  welder.update(1/60,1,{from:muzzle,direction:target.sub(muzzle),trace,onHit:(hit,power)=>{
   if(hit.unit===unit)damage+=power;
  }});
 };
 for(let i=0;i<60;i++)update();
 assert.equal(damage,600,'a cursor grazing the target keeps continuous beam damage from the offset muzzle');
 sections=[{state:'intact',x:-.36,y:1.6,z:1,size:[.14,2,.3]}];
 update();
 assert.equal(welder.lastHit,'building');
 assert.equal(damage,600,'cover between the hand and target still blocks the beam');
}

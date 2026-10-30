import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RunnerCharge} from '../dist/runner-charge.js';
import {RunnerElectric} from '../dist/runner-electric.js';
for(const dt of [1/30,1/60,1/120,.075]){
 const charge=new RunnerCharge();let time=0,damage=0,previous=false,starts=[];
 for(let i=0;i<Math.ceil(9/dt);i++){
  const s=charge.step(dt,true);time+=dt;damage+=s.damageSeconds;
  let expected=0;for(let k=0;k<8;k++)expected+=Math.max(0,Math.min(time,.4+1.9*k)-1.9*k);
  assert(Math.abs(damage-expected)<1e-7);assert.notEqual(s.phase,'charging');
  if(i===0){assert(s.damageSeconds>0);assert.equal(s.phase,'firing');}
  if(s.phase==='firing'&&!previous)starts.push(time);previous=s.phase==='firing';
 }
 assert.equal(charge.bursts,5);assert(Math.abs(damage-2)<1e-7);for(let i=1;i<starts.length;i++)assert(starts[i]-starts[i-1]>=1.9-dt-1e-8);
 charge.reset();charge.step(.4,true);assert.equal(charge.phase,'cooldown');const cool=charge.cooldown;charge.cancel();charge.cancel();assert.equal(charge.cooldown,cool);
 for(let i=0;i<8;i++)assert.equal(charge.step(.1,i%2===0).damageSeconds,0);assert(charge.cooldown>.6);charge.step(.8,false);assert.equal(charge.phase,'idle');assert(charge.step(.01,true).damageSeconds>0);charge.cancel();assert.equal(charge.elapsed,0);assert.equal(charge.phase,'cooldown');assert.equal(charge.cooldown,1.5);assert.equal(charge.step(.3,true).damageSeconds,0);charge.reset();assert.equal(charge.phase,'idle');assert.equal(charge.cooldown,0);
}
const fx=new RunnerElectric(new THREE.Scene()),normal=new THREE.Vector3(0,1,0);let maxExtent=0;
for(let i=0;i<180;i++){const position=new THREE.Vector3(0,0,i*46/60);fx.update(1/60,i/60,{position,normal,speed:46});maxExtent=Math.max(maxExtent,fx.trailExtent);assert(fx.core.count<=500);assert(fx.trails.length<=350);}
assert(maxExtent>25&&maxExtent<38,'dash streak retains more than 25m of real path at full sprint');assert.equal(fx.core.count,fx.glow.count);
const from=new THREE.Vector3(0,1.6,140);fx.update(1/60,3.1,{position:new THREE.Vector3(0,0,140),normal,speed:0,beam:{from,end:new THREE.Vector3(0,14,150)}});assert(!fx.chargeBall.visible);assert(fx.firing);for(let i=0;i<60;i++)fx.update(1/60,4+i/60,{position:new THREE.Vector3(0,0,140),normal,speed:0});assert.equal(fx.trails.length,0);fx.clear();assert.equal(fx.core.count,0);assert(!fx.chargeBall.visible);assert(!fx.charging);assert.equal(fx.trailExtent,0);
console.log('PASS instant first-frame firing, capped 0.4s burst / 1.5s cooldown at 30/60/120Hz/long frames, held/spammed input, handoff cancellation and reset, no wind-up effect, >25m continuous dash trail, fixed instance budget and fade cleanup', {maxExtent});

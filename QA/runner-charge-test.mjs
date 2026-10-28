import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RunnerCharge} from '../dist/runner-charge.js';
import {RunnerElectric} from '../dist/runner-electric.js';
for(const dt of [1/30,1/60,1/120,.075]){
 const charge=new RunnerCharge();let time=0,damage=0;for(let i=0;i<Math.ceil(1.5/dt);i++){const s=charge.step(dt,true);time+=dt;damage+=s.damageSeconds;if(time<.5-1e-8){assert.equal(s.phase,'charging');assert.equal(s.damageSeconds,0);}assert(Math.abs(damage-Math.max(0,time-.5))<1e-8);}
 charge.step(dt,false);assert.equal(charge.phase,'idle');assert.equal(charge.elapsed,0);charge.step(.3,true);charge.step(.01,false);assert.equal(charge.step(.3,true).damageSeconds,0);assert.equal(charge.phase,'charging');charge.reset();assert.equal(charge.elapsed,0);
}
const fx=new RunnerElectric(new THREE.Scene()),normal=new THREE.Vector3(0,1,0);let maxExtent=0;
for(let i=0;i<180;i++){const position=new THREE.Vector3(0,0,i*46/60);fx.update(1/60,i/60,{position,normal,speed:46});maxExtent=Math.max(maxExtent,fx.trailExtent);assert(fx.core.count<=500);assert(fx.trails.length<=350);}
assert(maxExtent>25&&maxExtent<38,'dash streak retains more than 25m of real path at full sprint');assert.equal(fx.core.count,fx.glow.count);
const from=new THREE.Vector3(0,1.6,140),elbow=new THREE.Vector3(0,1.3,139.7);fx.update(1/60,3,{position:new THREE.Vector3(0,0,140),normal,speed:0,charge:{from,elbow,progress:.75}});assert(fx.chargeBall.visible);assert(fx.charging);assert(!fx.firing);assert(fx.chargeBall.position.distanceTo(from)<1e-9);assert(fx.chargeBall.scale.x>.25);assert(fx.light.intensity>20);assert(fx.core.count>0);
fx.update(1/60,3.1,{position:new THREE.Vector3(0,0,140),normal,speed:0,beam:{from,end:new THREE.Vector3(0,14,150)}});assert(!fx.chargeBall.visible);assert(fx.firing);for(let i=0;i<60;i++)fx.update(1/60,4+i/60,{position:new THREE.Vector3(0,0,140),normal,speed:0});assert.equal(fx.trails.length,0);fx.clear();assert.equal(fx.core.count,0);assert(!fx.chargeBall.visible);assert(!fx.charging);assert.equal(fx.trailExtent,0);
console.log('PASS exact half-second charge and partial-frame damage at 30/60/120Hz/long frames, release/reset, attached charge VFX, >25m continuous dash trail, fixed instance budget and fade cleanup', {maxExtent});

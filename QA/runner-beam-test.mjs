import assert from 'node:assert/strict';
import {RunnerBeam,RUNNER_BEAM} from '../dist/runner-beam.js';
import {RunnerEnergy} from '../dist/runner-energy.js';
for(const dt of[1/30,1/60,1/120,.075]){
 const e=new RunnerEnergy(),b=new RunnerBeam();e.amount=100;let damageTime=0;
 for(let i=0;i<Math.ceil(6/dt);i++){const tick=b.step(dt,true,e);if(i===0){assert.equal(tick.phase,'firing');assert.equal(tick.damageSeconds,dt);}damageTime+=tick.damageSeconds;assert(e.amount>=0);}
 assert(Math.abs(damageTime-4)<1e-7);assert.equal(e.amount,0);assert(Math.abs(e.beamSpent-100)<1e-7);assert.equal(b.activations,1);assert(b.needsRelease);
 e.earn(20,1);assert.equal(b.step(dt,true,e).damageSeconds,0,'exhaustion does not stutter-fire new movement income');b.step(dt,false,e);const reserve=e.amount;assert(b.step(dt,true,e).damageSeconds>0,'release rearms without a recovery timer');assert(e.amount<reserve);
 b.reset();e.reset();e.amount=.1;const tiny=b.step(dt,true,e);assert(tiny.damageSeconds>0&&tiny.damageSeconds<dt);assert(Math.abs(tiny.damageSeconds-.004)<1e-8,'any positive reserve fires, no old 25-charge gate');assert.equal(e.amount,0);assert(b.needsRelease);
 b.reset();e.reset();e.amount=50;const short=b.step(dt,true,e);assert(short.damageSeconds>0);const saved=e.amount;assert.equal(b.step(dt,false,e).damageSeconds,0);assert.equal(e.amount,saved,'release stops drain immediately');assert(b.step(dt,true,e).damageSeconds>0,'rapid re-press has no cooldown');b.cancel();assert(!b.needsRelease);
 b.reset();e.reset();e.amount=100;let sustained=0;for(let i=0;i<Math.ceil(15/dt);i++){e.earn(46*dt,dt);sustained+=b.step(dt,true,e).damageSeconds;}assert(sustained>11.5&&sustained<12.1,'real full-speed running recharge extends sustained fire');assert(b.needsRelease);
 b.reset();e.reset();e.amount=100;assert.equal(b.step(10,true,e).damageSeconds,4,'long frame cannot overdraw');assert.equal(e.amount,0);e.reset();assert.equal(e.beamSpent,0);assert.equal(RUNNER_BEAM.drainPerSecond,25);
 console.log('PASS',dt,'instant manual beam, exact drain/DPS time, full/partial reserve, depletion/rearm, release/re-press, moving recharge, long frame/reset');
}

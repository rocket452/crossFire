import assert from 'node:assert/strict';
import {RunnerBeam,RUNNER_BEAM} from '../dist/runner-beam.js';
import {RunnerEnergy} from '../dist/runner-energy.js';
for(const dt of[1/30,1/60,1/120,.075]){
 const e=new RunnerEnergy(),b=new RunnerBeam();e.amount=100;let damageTime=0;
 for(let i=0;i<Math.ceil(6/dt);i++){const tick=b.step(dt,true,e);if(i===0){assert.equal(tick.phase,'firing');assert.equal(tick.damageSeconds,dt);}damageTime+=tick.damageSeconds;assert(e.amount>=0);assert.equal(b.diagnostics().cooldown,0);}
 assert(Math.abs(damageTime-100/17.5)<1e-7);assert.equal(e.amount,0);assert(Math.abs(e.beamSpent-100)<1e-7);assert.equal(b.activations,1);
 e.earn(20,1);const reserve=e.amount;assert(b.step(dt,true,e).damageSeconds>0,'held trigger resumes immediately when charge returns, no release');assert(e.amount<reserve);
 b.reset();e.reset();e.amount=.1;const tiny=b.step(dt,true,e);assert(Math.abs(tiny.damageSeconds-.1/17.5)<1e-8);assert.equal(e.amount,0);assert.equal(b.step(dt,true,e).damageSeconds,0);const gained=e.earn(46*dt,dt);const restarted=b.step(dt,true,e);assert(Math.abs(restarted.damageSeconds-gained/RUNNER_BEAM.drainPerSecond)<1e-8,'first newly earned fraction powers a paid partial frame');assert.equal(e.amount,0);
 b.reset();e.reset();e.amount=50;assert(b.step(dt,true,e).damageSeconds>0);const saved=e.amount;assert.equal(b.step(dt,false,e).damageSeconds,0);assert.equal(e.amount,saved);assert(b.step(dt,true,e).damageSeconds>0,'re-press never waits');b.cancel();assert.equal(b.phase,'idle');
 b.reset();e.reset();e.amount=100;let sustained=0;for(let i=0;i<Math.ceil(15/dt);i++){e.earn(46*dt,dt);const tick=b.step(dt,true,e);assert(tick.damageSeconds>0&&tick.damageSeconds<=dt+1e-8);sustained+=tick.damageSeconds;}assert(Math.abs(sustained*17.5-e.beamSpent)<1e-7);assert(e.spent<=100+e.gained+1e-7);assert(Math.abs(sustained-15)<1e-7,'reduced drain and running income sustain fifteen seconds without free damage');
 b.reset();e.reset();e.amount=100;assert.equal(b.step(10,true,e).damageSeconds,100/17.5);assert.equal(e.amount,0);e.reset();assert.equal(e.beamSpent,0);assert.equal(RUNNER_BEAM.drainPerSecond,17.5);
 console.log('PASS',dt,'zero cooldown/rearm, held empty-to-recharged restart, proportional partial reserve/damage, release/re-press, movement conservation, long frame/reset');
}

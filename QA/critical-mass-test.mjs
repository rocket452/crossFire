import assert from 'node:assert/strict';
import * as T from '../dist/vendor/three.module.js';
import {CriticalMassFX} from '../dist/critical-mass-fx.js';
import {CriticalMass,CRITICAL_MASS as C,massContacts,massPower} from '../dist/critical-mass.js';
for(const hz of [30,60,120]){let bursts=[],overloads=0;const a=new CriticalMass({onBurst:p=>bursts.push(p),onOverload:()=>overloads++});assert(a.begin());for(let i=0;i<hz*.4;i++)a.step(1/hz);assert(a.release());assert(bursts[0].damage>=60&&bursts[0].damage<100);assert(!a.begin());a.step(3);a.begin();for(let i=0;i<Math.round(hz*2.4);i++)a.step(1/hz);assert(a.release());assert(bursts[1].damage>300&&bursts[1].critical);a.step(3);a.begin();for(let i=0;i<Math.round(hz*2.6);i++)a.step(1/hz);assert.equal(overloads,1);assert.equal(bursts.length,2);assert(a.stunned);assert(!a.release());assert(!a.begin());a.cancel();assert(a.stunned);for(let i=0;i<hz;i++)a.step(1/hz);assert(!a.stunned);assert(Math.abs(a.cooldown-3)<1e-8);a.step(3);assert(a.begin());a.step(.1);assert(!a.release());assert(a.cooldown===C.cancelCooldown);a.step(1);a.begin();a.step(.5);a.cancel();assert(!a.charging);a.reset();assert.deepEqual(a.diagnostics(),{charging:false,charge:0,level:0,critical:false,cooldown:0,stun:0,releases:0,overloads:0});}
const unit=(id,x,kind='robot')=>({id,kind,alive:true,shapes:[{part:'body',center:{x,y:0,z:0},half:{x:.5,y:1,z:.5}}]}),one=unit('one',2),boss=unit('boss',1);boss.shapes.push({part:'gun',center:{x:2,y:0,z:0},half:{x:.5,y:1,z:.5}});const contacts=massContacts(new T.Vector3(),[one,unit('outer',8.4),unit('outside',8.6),unit('ally',0,'infantry'),boss]);assert.deepEqual(contacts.map(h=>h.unit.id),['one','outer','boss']);assert.equal(contacts.filter(h=>h.unit===boss).length,1);assert.equal(contacts[0].distance,1.5);assert(massPower(2.59).damage>massPower(.3).damage*5);console.log('PASS 30/60/120Hz timing, early/critical damage, exact overload boundary, cooldowns, cancellation, one-second self-stun recovery/reset, radius/ally filters and one contact per boss');

const fx=new CriticalMassFX(new T.Scene()),state=new CriticalMass(),origin=new T.Vector3();
const updateFx=(dt,time)=>fx.update(dt,time,{state,origin,left:origin,right:origin});
state.begin();
updateFx(1/60,0);
assert(fx.ball.scale.x>=.2&&fx.chargeRings.every(r=>r.visible),'charge is prominent from the first frame');
assert(fx.arcs.count>=32);
state.step(2.25);
origin.set(10,2,-4);
updateFx(1/60,2.25);
assert(fx.chargeRings.every(r=>r.position.equals(origin)),'rings follow the current center as Volt moves');
assert.equal(fx.chargeRings[0].material.color.getHexString(),'dfb5ff');
state.cancel();
fx.discharge(origin,massPower(2.25));
updateFx(.25,2.5);
assert(fx.chargeRings.every(r=>!r.visible));
assert.equal(fx.shock.scale.x,8);
fx.clear();
assert(!fx.shock.visible&&fx.chargeRings.every(r=>!r.visible));
console.log('PASS visible first-frame charge, centered rings, violet critical cue, 8 m shockwave and cleanup');

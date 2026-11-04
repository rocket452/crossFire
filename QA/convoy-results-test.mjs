import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {convoyResult,convoyTime} from '../dist/convoy-results.js';
const config=JSON.parse(fs.readFileSync('dist/convoy-config.json'));
function setup(extra={}){let mission;const damage=new UnitDamage(u=>mission.disable(u));mission=new ConvoyMission(new THREE.Scene(),damage,{...structuredClone(config),...extra},{getBossDestroyed:()=>true});return{mission,damage};}
function until(m,pred){for(let i=0;i<180*60&&!pred();i++)m.update(1/60);assert(pred());}
for(const [saved,rank]of[[80,'S'],[72,'S'],[71,'A'],[60,'A'],[59,'B'],[40,'B'],[39,'C'],[0,'C']]){const r=convoyResult({saved,lost:80-saved,unsaved:0,waiting:0,total:80,time:134,phase:'success',buses:[{escaped:true}]},config);assert.equal(r.rank,rank);assert.equal(r.saved+r.killed+r.leftBehind,80);}
{
 const{mission:m}=setup();until(m,()=>m.terminal);const r=m.result;assert.equal(r.saved,80);assert.equal(r.killed,0);assert.equal(r.leftBehind,0);assert.equal(r.busesEscaped,4);assert(r.argusDestroyed);assert.equal(r.rank,'S');assert(r.completionSeconds>133&&r.completionSeconds<134);for(let i=0;i<600;i++)m.update(1/60);assert.equal(m.result,r);assert.equal(m.result.completionSeconds,r.completionSeconds);m.reset();assert.equal(m.result,null);console.log('PASS full success result, ARGUS status, fixed completion time and reset');
}
{
 const{mission:m,damage}=setup();until(m,()=>m.diagnostics().onboard===56);for(const b of m.buses)damage.hurt(b.unit,b.unit.maxHealth,b.root.position);assert.equal(m.result.outcome,'failed');assert.equal(m.result.killed,56);assert.equal(m.result.leftBehind,24);assert.equal(m.result.unreached,24);assert.equal(m.result.busesEscaped,0);assert.equal(m.result.total,80);console.log('PASS loaded-bus/all-buses loss records killed vs unreached pickup survivors');
}
{
 const{mission:m,damage}=setup();for(const b of m.buses.slice(1))damage.hurt(b.unit,b.unit.maxHealth,b.root.position);until(m,()=>m.terminal);assert.equal(m.result.outcome,'success');assert.equal(m.result.busesEscaped,1);assert.equal(m.result.saved,24);assert.equal(m.result.killed,24);assert.equal(m.result.leftBehind,32);assert.equal(m.result.rank,'C');console.log('PASS one-bus win still grades by total civilians, no aboard redistribution');
}
{
 const{mission:m,damage}=setup({civilianSpeed:.02});until(m,()=>m.terminal);assert.equal(m.result.leftBehind,48);assert.equal(m.result.killed,0);assert.equal(m.result.saved,32);const frozen=m.result;damage.hurt(m.civilians[0].unit,100,m.civilians[0].root.position);assert.equal(m.result,frozen);assert.equal(m.result.killed,0);console.log('PASS live left-behind civilians and immutable completion report');
}
assert.equal(convoyTime(133.58),'2:14');console.log('PASS S/A/B/C threshold boundaries and completion display');

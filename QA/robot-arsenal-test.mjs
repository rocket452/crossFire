import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RobotArsenal} from '../dist/robot-arsenal.js';
import {RobotMissiles} from '../dist/robot-missiles.js';
import {BeamCycle} from '../dist/beam-cycle.js';
import {ShieldShake,SHIELD_FORWARD_OFFSET} from '../dist/shield-shake.js';
for(const dt of [1/30,1/60,1/120,.075]){
 const robot={weapon:new BeamCycle(),dead:false},arsenal=new RobotArsenal(),target={alive:true,id:'tank',shapes:[{center:{x:0,y:5,z:50}}]};let launches=0,warnings=0,lastPulse=false,warningStart=null;
 const pod=new RobotMissiles(new THREE.Scene(),{scene:new THREE.Group()},{autoFire:false,canLaunch:()=>!['charging','firing'].includes(robot.weapon.phase),getMuzzles:()=>Array.from({length:6},()=>({position:new THREE.Vector3(0,18,0),direction:new THREE.Vector3(0,1,1).normalize()})),getTargets:()=>[target],isRobotAlive:()=>!robot.dead,traceWorld:()=>null,onImpact:()=>{},onLaunch:()=>{assert(!['charging','firing'].includes(robot.weapon.phase));assert(arsenal.clock-warningStart>=2-1e-6);launches++;}});
 for(let t=0;t<65;t+=dt){arsenal.beforeBeam(robot,pod);robot.weapon.step(dt,robot.beamAllowed);pod.update(dt,t);arsenal.update(dt,robot,pod);const warning=arsenal.warning();if(warning.active){warningStart??=arsenal.clock;if(warning.pulse!==lastPulse)warnings++;lastPulse=warning.pulse;}else if(arsenal.phase==='beam')warningStart=null;
  if(['charging','firing'].includes(robot.weapon.phase)){assert.equal(pod.pending,0);assert(!pod.missiles.some(m=>m.alive));assert(!warning.active);}
  for(const m of pod.missiles)if(m.age>2)pod.hurt(m,100,'volt');
 }
 assert(launches>=12);assert(warnings>5);const turns=arsenal.turns.map(t=>t.weapon);assert(turns.length>=4);for(let i=1;i<turns.length;i++)assert.notEqual(turns[i],turns[i-1]);
 robot.dead=true;pod.update(dt,66);arsenal.update(dt,robot,pod);assert.equal(arsenal.phase,'off');assert(!arsenal.warning().active);arsenal.reset();pod.reset();assert.equal(arsenal.phase,'beam');assert.equal(arsenal.turns.length,0);assert(!pod.missiles.length);console.log('PASS alternating beam / warning / salvo / clearance at dt',dt);
}
assert(Math.abs(SHIELD_FORWARD_OFFSET-2.21)<1e-10);assert(Math.abs(SHIELD_FORWARD_OFFSET/1.7-1.3)<1e-10);const shake=new ShieldShake();shake.kick(30);let max=0;for(let i=0;i<120;i++){const p=shake.step(1/60);max=Math.max(max,Math.abs(p.x)+Math.abs(p.y));assert(Object.values(p).every(Number.isFinite));}assert(max>.02);assert(shake.strength<.00001);shake.kick(100);shake.kick(100);assert.equal(shake.strength,1);shake.reset();assert.equal(shake.strength,0);assert.equal(shake.impacts,0);
console.log('PASS exact +30% shield offset, visible bounded hit shake, decay, repeated damage and reset');

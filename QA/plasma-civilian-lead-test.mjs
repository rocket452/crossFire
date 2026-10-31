import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {predictCivilianPosition} from '../dist/civilian-prediction.js';
import {EvacuationScene} from '../dist/evacuation.js';
import {PlasmaArtillery} from '../dist/plasma-artillery.js';
import {UnitDamage} from '../dist/combat-collision.js';
globalThis.document={createElement:()=>({getContext:()=>({fillRect(){},fillText(){},clearRect(){}})})};
function fixture(){let evacuation;const damage=new UnitDamage(u=>evacuation.disable(u));evacuation=new EvacuationScene(new THREE.Scene(),damage,{visible:()=>true});evacuation.update(0);const group=evacuation.cohorts[0];group.center.set(-10,.08,-48);group.route=[[0,-48],[0,-24],[0,0],[0,24]];group.stage=0;group.heading=Math.PI/2;evacuation.placeCohort(group);evacuation.sync();return{evacuation,damage,group};}
{
 const {evacuation:e,group}=fixture(),unit=group.members[0].unit,before=JSON.stringify({center:group.center,route:group.route,stage:group.stage});const p=e.predictCivilian(unit,6);assert(Math.abs(p.x)<1e-8&&Math.abs(p.z+35.2)<1e-8,'forecast turns the street corner instead of extrapolating through a building');assert.equal(JSON.stringify({center:group.center,route:group.route,stage:group.stage}),before,'prediction never advances the actual crowd');
 const blocked=predictCivilianPosition(group,6,{speed:3.8,landing:e.landing,isClear:(a,b)=>b.x<=-5});assert(blocked.x<=-5&&blocked.z===-48,'forecast stops at blocked streets');
 group.members[1].unit.dashCarried=true;assert.deepEqual(e.predictCivilian(unit,6),{x:-10,z:-48});group.members[1].unit.dashCarried=false;unit.dashPhased=true;assert.equal(e.predictCivilian(unit,6),null);unit.dashPhased=false;
 group.atLanding=true;group.center.set(0,.08,24);group.stage=3;const queued=e.predictCivilian(unit,20);assert.deepEqual(queued,{x:8,z:24},'waiting groups remain at their actual queue goal');group.atLanding=false;group.center.set(-2,.08,-48);group.escape={to:{x:0,z:-48},path:[[0,-24],[0,0],[0,24]]};const escape=e.predictCivilian(unit,2);assert(Math.abs(escape.x)<1e-8&&Math.abs(escape.z+42.4)<1e-8);
}
for(const dt of[1/30,1/60,1/120,.075]){
 const {evacuation:e,damage,group}=fixture(),scene=new THREE.Scene();let actual=null;
 const artillery=new PlasmaArtillery(scene,{getMuzzle:()=>({position:new THREE.Vector3(0,21,0)}),getTargets:()=>e.civilians.map(c=>c.unit),targetKinds:['civilian'],predictTarget:(u,t)=>e.predictCivilian(u,t),isRobotAlive:()=>true,onImpact:p=>{actual={point:p.clone(),center:group.center.clone()};damage.blast(p,{power:160,radius:7,filter:u=>u.kind==='civilian'});}});
 assert(artillery.beginVolley());assert.equal(artillery.shells.length,1,'twelve people in one cohort produce one group target');const shot=artillery.shells[0],locked={...shot.target};assert(shot.aim.leadSeconds>2.4);assert(Math.hypot(locked.x+10,locked.z+48)>15,'aim leads the moving group');assert(Math.abs(locked.x)<.01&&locked.z>-48&&locked.z<-24,'aim follows the turn onto the next street');
 for(let i=0;i<Math.ceil(12/dt)&&!actual;i++){e.update(dt);artillery.update(dt,i*dt);if(artillery.shells.length)assert.deepEqual(shot.target,locked,'warning target stays fixed throughout approach and flight');}
 assert(actual);assert(Math.hypot(actual.point.x-actual.center.x,actual.point.z-actual.center.z)<.7,'uninterrupted civilian group reaches the predicted strike zone');assert.equal(e.lost,12,'an unprotected forecast shot is a real threat to the group');assert.equal(artillery.impacts,1);assert.equal(artillery.shells.length,0);artillery.reset();assert.equal(scene.children.length,2);
 console.log('PASS',dt,'route/corner lead through warning+flight, one shot per group, fixed warning, real moving-group impact/loss and cleanup');
}
{
 const {evacuation:e,group}=fixture();const artillery=new PlasmaArtillery(new THREE.Scene(),{getMuzzle:()=>({position:new THREE.Vector3(0,21,0),alignmentSeconds:5}),getTargets:()=>e.civilians.map(c=>c.unit),targetKinds:['civilian'],predictTarget:(u,t)=>e.predictCivilian(u,t),isRobotAlive:()=>true});assert(artillery.beginVolley());const shot=artillery.shells[0];assert(shot.launchAt===5&&Math.abs(shot.aim.leadSeconds-5-shot.trajectory.duration)<.05,'slow body rotation is included in the nominal lead and ETA');const locked={...shot.target};group.center.set(30,.08,48);e.placeCohort(group);artillery.update(.1,.1);assert.deepEqual(shot.target,locked,'hero relocation does not drag the warning onto rescued civilians');artillery.reset();
}
console.log('PASS read-only prediction, blocked/paused/queued/escaping groups, gun alignment time and counterplay');

{const {evacuation:e}=fixture();e.spawn();e.sync();const artillery=new PlasmaArtillery(new THREE.Scene(),{getMuzzle:()=>({position:new THREE.Vector3(0,21,0)}),getTargets:()=>e.civilians.map(c=>c.unit),targetKinds:['civilian'],predictTarget:(u,t)=>e.predictCivilian(u,t),isRobotAlive:()=>true});assert(artillery.beginVolley());assert.equal(artillery.shells.length,2);assert.equal(new Set(artillery.shells.map(s=>s.aim.unitId.split('-')[1])).size,2,'two distinct civilian groups can be threatened in one volley');artillery.reset();}

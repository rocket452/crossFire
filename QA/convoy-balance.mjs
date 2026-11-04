import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import * as THREE from '../dist/vendor/three.module.js';
import {gltfModel,spec} from './walker-fixture.mjs';
import {Argus} from '../dist/argus.js';
import {ConvoyMission} from '../dist/convoy-mission.js';
import {DestructionWorld} from '../dist/destruction.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {routePoint} from '../dist/convoy-map-config.js';
const baseline=process.argv.includes('--baseline'),hz=60,dt=1/hz,reference='ce52b5b';
const read=name=>JSON.parse(baseline?execFileSync('git',['show',reference+':dist/'+name],{encoding:'utf8'}):fs.readFileSync('dist/'+name,'utf8'));
const rawBoss=read('argus-config.json'),rawConvoy=read('convoy-config.json'),buildings=JSON.parse(fs.readFileSync('dist/city-assets/city-layout.json')).buildings;
function city(physics){for(const b of buildings)for(let f=0;f<b.floors;f++){
 for(let side=0;side<4;side++)for(let j=0;j<4;j++){const a=side*Math.PI/2,u=(j-1.5)*2.5;physics.addChunk({type:'wall',building:b.id,floor:f,x:b.x+5*Math.sin(a)+u*Math.cos(a),y:f*3+1.5,z:b.z+5*Math.cos(a)-u*Math.sin(a),yaw:a,size:[2.5,2.72,.32]});}
 for(let x=0;x<3;x++)for(let z=0;z<3;z++)physics.addChunk({type:'slab',building:b.id,floor:f,x:b.x+(x-1)*10/3,y:(f+1)*3,z:b.z+(z-1)*10/3,size:[10/3,.28,10/3]});
 for(const x of[-4.78,4.78])for(const z of[-4.78,4.78])physics.addChunk({type:'column',building:b.id,floor:f,x:b.x+x,y:f*3+1.5,z:b.z+z,size:[.48,2.72,.48]});
 }
 for(const s of physics.chunks){s.bounds=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(s.x,s.y,s.z),new THREE.Vector3(...s.size));if(s.yaw)s.bounds=new THREE.Box3(new THREE.Vector3(-s.size[0]/2,-s.size[1]/2,-s.size[2]/2),new THREE.Vector3(...s.size.map(v=>v/2))).applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(s.x,s.y,s.z),new THREE.Quaternion().setFromEuler(new THREE.Euler(0,s.yaw,0)),new THREE.Vector3(1,1,1)));}
}
function fixture(fullCity=true){let boss,mission;const scene=new THREE.Scene(),physics=new DestructionWorld({maxDynamic:160,playerReserve:28}),busHits=[];let time=0;
 const damage=new UnitDamage(u=>{if(!boss?.disable(u))mission?.disable(u);},(u,power)=>{if(u.kind==='bus')busHits.push({time:+time.toFixed(4),id:u.id,power});});if(fullCity)city(physics);
 const c=structuredClone(rawBoss),v=structuredClone(rawConvoy);
 mission=new ConvoyMission(scene,damage,v,{isBusPathClear:(a,b,r)=>[1,2.7].every(y=>!traceImpact({x:a.x,y,z:a.z},{x:b.x,y,z:b.z},{sections:physics.chunks.filter(c=>!c.hasDetached),ground:false,radius:r})),isCivilianPathClear:(a,b,r)=>!traceImpact({x:a.x,y:1,z:a.z},{x:b.x,y:1,z:b.z},{sections:physics.chunks.filter(c=>!c.hasDetached),ground:false,radius:r}),clearDebris:()=>{for(const c of physics.chunks)if(c.hasDetached&&!c.hidden&&!c.collisionDisabled&&c.body.position.y<=Math.max(...c.size)/2+.12&&Math.abs(c.body.position.z)<=v.map.roadHalfWidth+Math.max(...c.size)/2)physics.disableGroundedCollision(c);}});
 boss=new Argus(scene,damage,gltfModel,spec,c,{getConvoy:()=>mission,physics,getHeroes:()=>[],getBuildings:()=>fullCity?buildings:[],onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>physics.removeWreck(b)});
 return{boss,mission,physics,damage,busHits,step(move=true){time+=dt;if(move)mission.update(dt);boss.update(dt,time);boss.attacks.beforeHeroes(dt);boss.attacks.afterHeroes(dt);physics.step(dt);boss.syncWrecks();},get time(){return time;}};
}
const round=x=>x==null?null:+x.toFixed(3);
function distanceToSegment(p,a,b){const dx=b.x-a.x,dz=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/(dx*dx+dz*dz)));return Math.hypot(p.x-a.x-dx*t,p.z-a.z-dz*t);}
function approach(joints,startingPhase=1){const f=fixture(),{boss:b,mission:m,damage}=f;for(const j of [...b.joints.values()].slice(0,joints))damage.hurt(b.combatUnit,j.health,b.model.targetPosition(j.id),j.id);
 if(startingPhase===3)b.combatUnit.health=b.combatUnit.maxHealth*.2;
 const start=routePoint(m.config.map.route,m.config.map.pickups.at(-1).distance),end=routePoint(m.config.map.route,m.length);let firstContact=null,finalLegThreat=null,centerline=null,firstExit=null,minBusDistance=Infinity;
 while(!m.terminal&&f.time<240){f.step();const p=b.root.position,near=m.activeBuses.map(bus=>Math.hypot(p.x-bus.root.position.x,p.z-bus.root.position.z));minBusDistance=Math.min(minBusDistance,...near);if(firstContact===null&&near.some(d=>d<=b.config.melee.range))firstContact=f.time;
  const d=distanceToSegment(p,start,end);if(finalLegThreat===null&&d<=b.config.melee.range)finalLegThreat=f.time;if(centerline===null&&d<=b.config.movement.arrivalRadius)centerline=f.time;if(firstExit===null&&m.buses.some(bus=>bus.escaped))firstExit=f.time;
 }
 return{startingPhase,earlyDestroyedJoints:joints,strideSpeed:round(b.strideSpeed),firstBusContact:round(firstContact),firstBusDamage:f.busHits[0]?.time??null,finalLegWithinStompRange:round(finalLegThreat),finalLegWithinArrivalRadius:round(centerline),firstBusEscape:round(firstExit),missionEnd:round(f.time),outcome:m.phase,busesEscaped:m.buses.filter(bus=>bus.escaped).length,saved:m.diagnostics().saved,tensionBeforeLastExit:finalLegThreat===null?null:round(f.time-finalLegThreat),minimumBusDistance:round(minBusDistance),bossPosition:b.root.position.toArray().map(round),breachImpacts:b.breaches};}
function survival(phase){const f=fixture(false),{boss:b,mission:m}=f;for(const k of['flak','tether','lance'])b.config.attacks[k].enabled=false;b.config.repairDrones.enabled=false;
 for(const bus of m.buses.slice(1)){bus.destroy();for(const p of bus.passengers)p.status='lost';bus.passengers=[];}
 const bus=m.buses[0];bus.place({x:b.root.position.x,z:b.root.position.z+6,yaw:0},.08);if(phase===3)b.combatUnit.health=b.combatUnit.maxHealth*.2;
 while(bus.unit.alive&&f.time<150)f.step(false);
 return{phase,busHP:bus.unit.maxHealth,stompDamage:b.config.melee.busDamage,hitsToDestroy:f.busHits.length,firstHit:f.busHits[0]?.time,death:round(f.time),fromFirstHit:round(f.time-(f.busHits[0]?.time||0)),interval:round(f.busHits[1]?.time-f.busHits[0]?.time)};}
const report={configuration:baseline?'accepted step 3 '+reference:'step 4 final',hz,conditions:'Actual articulated model, full 16-building city and destruction/physics; no hero attacks; joints destroyed at t=0 (first two = left hip/knee); actual bus damage enabled; main hull stays phase 1 in approach trials. Final-leg threat means within configured 7.5m stomp range of the segment from pickup 2 to exit. Survival trial parks one bus six metres away, suppresses ranged casts and measures uninterrupted stomping.',approach:[],survival:[]};
for(const n of[0,2,3,4]){const r=approach(n);report.approach.push(r);console.error(JSON.stringify(r));}
if(!baseline){report.phase3Stress=[approach(3,3),approach(4,3)];for(const r of report.phase3Stress)console.error(JSON.stringify(r));}
for(const n of[1,3]){const r=survival(n);report.survival.push(r);console.error(JSON.stringify(r));}
if(!baseline){const healthy=report.approach[0];if(!(healthy.tensionBeforeLastExit>=25&&healthy.tensionBeforeLastExit<=35))throw Error('Healthy final-leg tension outside 25–35s');if([...report.approach,...report.phase3Stress].some(r=>r.earlyDestroyedJoints>=3&&r.firstBusContact!==null))throw Error('3+ destroyed joints must prevent contact before exit');if(report.survival.find(r=>r.phase===3).fromFirstHit<45)throw Error('Phase-3 bus survival below 45s');}
console.log(JSON.stringify(report,null,2));

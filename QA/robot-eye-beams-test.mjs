import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {EYE_BEAMS,RobotEyeCycle,segmentSphereFraction,eyeAim} from '../dist/robot-eye-cycle.js';
import {RobotEyeBeams} from '../dist/robot-eye-beams.js';
const origin={x:0,y:18,z:0},target={x:0,y:1.3,z:35},velocity={x:40,y:0,z:0};
assert.equal(eyeAim(origin,target,velocity).x,10);
for(const hz of[30,60,120]){
 const c=new RobotEyeCycle();c.cooldown=0;let pairs=0;
 for(let i=0;i<hz;i++){pairs+=c.step(1/hz,{target,origin,velocity,allowed:true}).length;}assert.equal(pairs,0,'charge never damages early');
 const locked={...c.target};for(let i=0;i<hz;i++)pairs+=c.step(1/hz,{target:{x:70,y:1,z:30},origin,allowed:true}).length;
 assert.equal(pairs,3);assert.equal(c.shots,6);assert.equal(c.bursts,1);assert.equal(locked.x,10);assert(c.cooldown>6);assert.equal(c.diagnostics().cooldown,c.cooldown);
 c.step(8,{target,origin,allowed:false});assert.equal(c.phase,'idle');assert.equal(c.shots,6,'no shots during heavy weapons');
 c.step(.2,{target,origin,allowed:true});assert.equal(c.phase,'charging');c.step(.1,{target:null,origin,allowed:true});assert.equal(c.phase,'idle');
 c.cooldown=0;c.step(.1,{target,origin,allowed:true});c.step(.1,{target,origin,allowed:false});assert.equal(c.phase,'idle','phase change cancels eye charge');
 c.cooldown=0;c.step(.1,{target,origin,allowed:true});c.step(.1,{alive:false,target,origin,allowed:true});assert.equal(c.phase,'idle');c.reset();assert.equal(c.shots,0);
}
assert.equal(segmentSphereFraction({x:-10,y:0,z:0},{x:10,y:0,z:0},{x:0,y:0,z:0},1),.45);
assert.equal(segmentSphereFraction({x:0,y:0,z:0},{x:0,y:0,z:0},{x:10,y:0,z:0},1,{x:-10,y:0,z:0}),.45,'moving hero crosses bolt between frames');
assert.equal(segmentSphereFraction({x:0,y:0,z:0},{x:10,y:0,z:0},{x:5,y:3,z:0},1),null);
const scene=new THREE.Scene(),root=new THREE.Group(),head=new THREE.Group(),visor=new THREE.Group();root.add(head);head.add(visor);visor.position.set(0,18,1);scene.add(root);
const robot={root,nodes:{head,visor},boxes:{visor:{center:new THREE.Vector3(),size:new THREE.Vector3(2,1,.5)}},combatUnit:{alive:true},dead:false};
const runner={enabled:true,root:new THREE.Group(),bodyUp:new THREE.Vector3(0,1,0),motion:{velocity:{x:0,y:0,z:0}},receiveEyeHit(){this.hits=(this.hits||0)+1}};runner.root.position.set(0,0,35);scene.add(runner.root);
let blocked=false,impacts=[];const weapon=new RobotEyeBeams(scene,{getRobot:()=>robot,getRunner:()=>runner,canAttack:()=>true,traceWorld:(a,b)=>blocked?{kind:'building',t:.01,point:a.clone().lerp(b,.01)}:null,onImpact:(p,hit)=>impacts.push(hit.kind)});
weapon.cycle.cooldown=0;for(let i=0;i<240;i++)weapon.update(1/60,i/60);assert.equal(weapon.hits,6);assert.equal(runner.hits,6);assert.equal(weapon.bolts.length,0);assert(weapon.history.every(h=>Math.abs(h.from[0])>.5&&h.from[1]===18));
weapon.reset();blocked=true;weapon.cycle.cooldown=0;for(let i=0;i<240;i++)weapon.update(1/60,i/60);assert.equal(weapon.hits,0);assert.equal(weapon.coverHits,6,'cover absorbs every shot before hero');
weapon.reset();blocked=false;weapon.cycle.cooldown=0;for(let i=0;i<63;i++)weapon.update(1/60,i/60);runner.root.position.x=20;for(let i=63;i<250;i++)weapon.update(1/60,i/60);assert.equal(weapon.hits,0,'late direction change dodges locked aim');assert(weapon.expired>0);
weapon.reset();runner.enabled=false;for(let i=0;i<1000;i++)weapon.update(1/60,i/60);assert.equal(weapon.cycle.shots,0,'unselected speedster is never targeted');runner.enabled=true;weapon.cycle.cooldown=0;for(let i=0;i<75;i++)weapon.update(1/60,i/60);robot.dead=true;weapon.update(1/60,2);assert.equal(weapon.bolts.length,0);assert.equal(weapon.core.count,0);assert.equal(robot.eyeTarget,null);weapon.reset();assert.equal(weapon.history.length,0);
console.log('PASS 30/60/120 Hz timing; paired shots; cooldown/rotation gates; locked dodgeable lead; eye muzzle origins; continuous hero hits/cover; deselection/death/reset; bounded instancing');

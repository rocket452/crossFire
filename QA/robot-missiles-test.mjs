import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RobotMissiles,WALKER_SALVO_SIZE} from '../dist/robot-missiles.js';
import {DestructionWorld} from '../dist/destruction.js';
import {traceImpact,UnitDamage} from '../dist/combat-collision.js';
const cyberpunk=process.argv.includes('--cyberpunk');
assert.equal(WALKER_SALVO_SIZE,12);
function fixture(traceWorld=()=>null,onImpact=()=>{}){
 const scene=new THREE.Scene(),model={scene:new THREE.Group()},target={id:'tank',alive:true,shapes:[{center:{x:0,y:8,z:50}}]},state={alive:true};let bursts=0;
 const system=new RobotMissiles(scene,cyberpunk?null:model,{cyberpunk,getMuzzles:()=>Array.from({length:6},(_,i)=>({position:new THREE.Vector3(i*.1,8,0),direction:new THREE.Vector3(0,.3,1)})),getTargets:()=>[target],isRobotAlive:()=>state.alive,traceWorld,onImpact,onBurst:()=>bursts++});return{system,scene,target,state,bursts:()=>bursts};
}
for(const dt of [1/30,1/60,1/120]){
 const {system}=fixture();for(let i=0;i<Math.round(10.5/dt);i++)system.update(dt,i*dt);
 assert.equal(system.launched,WALKER_SALVO_SIZE);assert.equal(system.salvos,1);assert.equal(system.pending,0);assert.equal(system.missiles.length,WALKER_SALVO_SIZE);
 assert.deepEqual(system.missiles.map(m=>Math.round(m.origin.x*10)),[0,1,2,3,4,5,0,1,2,3,4,5]);
 for(const m of system.missiles){if(cyberpunk){assert.equal(m.mesh.children.length,4);assert(m.mesh.children[2].geometry.attributes.color.count>0);assert(m.mesh.children[2].material.stencilWrite);assert(m.flame.material.color.b>1);}assert.equal(m.speed,34);assert(Math.abs(m.velocity.length()-34)<1e-8);assert(m.position.distanceTo(m.origin)<=m.age*34+1e-5);if(m.age<1.1)assert(m.position.y>8);assert(m.position.toArray().every(Number.isFinite));}
 const a=system.missiles[0],b=system.missiles[1];system.claim(a,'violet');system.missiles.slice(2).forEach(m=>system.claim(m,'violet'));assert.equal(system.selectThreat(new THREE.Vector3(0,8,0),'volt'),b);assert.equal(system.selectThreat(new THREE.Vector3(),'volt',()=>false),null);
 const ray=system.trace(a.position.clone().add(new THREE.Vector3(0,0,-2)),a.position.clone().add(new THREE.Vector3(0,0,2)),.1);assert(ray?.missile);
 assert.equal(system.hurt(a,12,'volt'),12);assert(a.alive);assert.equal(system.hurt(a,12,'volt'),6);assert(!a.alive);assert.equal(system.hurt(a,100,'violet'),0);assert.equal(system.byHero.volt,1);
 for(const m of system.missiles)system.hurt(m,100,'violet');assert.equal(system.intercepted,WALKER_SALVO_SIZE);assert.equal(system.impacts,0);
 system.reset();assert.equal(system.scene.children.length,0);assert.equal(system.intercepted,0);assert.equal(system.cooldown,5.2);
}
// The faster missile needs to turn back toward close targets as well as strike at range.
for(const dt of [1/60,.075])for(const z of [10,90]){
 const {system,target}=fixture((a,b,r)=>traceImpact(a,b,{targets:[target],radius:r,ground:false}));
 target.shapes=[{center:{x:0,y:1.5,z},half:{x:1,y:1,z:1}}];
 system.autoFire=false;
 system.getMuzzles=()=>[{position:new THREE.Vector3(0,23,0),direction:new THREE.Vector3(0,1,1)}];
 assert(system.beginSalvo());
 for(let time=0;time<8&&!system.impacts;time+=dt)system.update(dt,time);
 assert(system.impacts>0,'missile reaches its target at '+z+' m');
}
const physics=new DestructionWorld(),wall=physics.addChunk({type:'wall',building:'B',floor:0,x:0,y:8,z:4,size:[20,20,.3]});
const units=new UnitDamage(),tank=units.add('tank','tank',{});tank.shapes=[{center:{x:0,y:8,z:4},half:{x:2,y:2,z:2}}];
let impacts=0;const {system}=fixture((a,b,r)=>traceImpact(a,b,{sections:physics.chunks,radius:r}), (p,hit)=>{impacts++;physics.impact(p,18,3.8,hit.section,{source:'siege-walker'});units.blast(p,{direct:tank,power:68});});
system.pending=1;system.launch();system.pending=0;system.cooldown=100;for(let i=0;i<90;i++)system.update(1/60,i/60);physics.step(1/60);assert.equal(impacts,1);assert.equal(wall.hp,0);assert(wall.hasDetached,'impact detaches the wall even when the building settles immediately');assert.equal(tank.health,32);assert.equal(system.impacts,1);
const safe=fixture(()=>{throw Error('intercepted missiles must never run collision or blast');});safe.system.pending=1;const missile=safe.system.launch();safe.system.pending=0;safe.system.cooldown=100;safe.system.hurt(missile,100,'violet');safe.system.update(.1,0);assert.equal(safe.system.impacts,0);assert.equal(safe.bursts(),1);
const stopped=fixture();stopped.system.beginSalvo();stopped.state.alive=false;stopped.system.update(.1,0);assert.equal(stopped.system.pending,0);assert.equal(stopped.system.launched,0);
console.log('PASS twelve staggered 34 m/s guided missiles at 30/60/120Hz, threat reservations/LOS, swept shootdown, exact kill credit, safe interceptions, real building/unit impact damage, reset and robot-defeat launch cancellation');

const {terrainHeight,traceTerrain}=await import('../dist/runner-motion.js');
for(const dt of [1/30,1/60,1/120,.075])for(const [x,z] of [[0,0],[50,39]]){
 const impacts=[];
 const {system,target}=fixture((a,b,r)=>traceTerrain(a,b,r)||traceImpact(a,b,{radius:r}),(p,hit)=>impacts.push(hit));
 system.autoFire=false;
 const m=system.launch();
 m.age=3;m.position.set(x,terrainHeight(x,z)+2,z);m.direction.set(0,-.03,1).normalize();
 for(let t=0;t<2&&m.alive;t+=dt){
  target.shapes[0].center={x,y:2,z:z+35+34*t};
  system.update(dt,t);
 }
 assert.equal(impacts.length,1,JSON.stringify({dt,x,z,position:m.position.toArray(),dive:m.finalDive,alive:m.alive}));
 assert.equal(impacts[0].kind,'ground');assert.equal(system.expired,0);
}
console.log('PASS descending misses strike flat and sloped ground at 30/60/120 Hz and 75 ms frames');

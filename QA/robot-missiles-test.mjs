import assert from 'node:assert/strict';
import * as THREE from '../dist/vendor/three.module.js';
import {RobotMissiles} from '../dist/robot-missiles.js';
import {DestructionWorld} from '../dist/destruction.js';
import {traceImpact,UnitDamage} from '../dist/combat-collision.js';
function fixture(traceWorld=()=>null,onImpact=()=>{}){
 const scene=new THREE.Scene(),model={scene:new THREE.Group()},target={id:'tank',alive:true,shapes:[{center:{x:0,y:8,z:50}}]},state={alive:true};let bursts=0;
 const system=new RobotMissiles(scene,model,{getMuzzles:()=>Array.from({length:6},()=>({position:new THREE.Vector3(0,8,0),direction:new THREE.Vector3(0,.3,1)})),getTargets:()=>[target],isRobotAlive:()=>state.alive,traceWorld,onImpact,onBurst:()=>bursts++});return{system,scene,target,state,bursts:()=>bursts};
}
for(const dt of [1/30,1/60,1/120]){
 const {system}=fixture();for(let i=0;i<Math.round(8/dt);i++)system.update(dt,i*dt);
 assert.equal(system.launched,6);assert.equal(system.salvos,1);assert.equal(system.pending,0);assert.equal(system.missiles.length,6);
 for(const m of system.missiles){assert(m.position.distanceTo(m.origin)<=m.age*8.5+1e-5);assert(m.position.y>8);assert(m.position.toArray().every(Number.isFinite));}
 const a=system.missiles[0],b=system.missiles[1];system.claim(a,'violet');system.missiles.slice(2).forEach(m=>system.claim(m,'violet'));assert.equal(system.selectThreat(new THREE.Vector3(0,8,0),'volt'),b);assert.equal(system.selectThreat(new THREE.Vector3(),'volt',()=>false),null);
 const ray=system.trace(a.position.clone().add(new THREE.Vector3(0,0,-2)),a.position.clone().add(new THREE.Vector3(0,0,2)),.1);assert(ray?.missile);
 assert.equal(system.hurt(a,12,'volt'),12);assert(a.alive);assert.equal(system.hurt(a,12,'volt'),6);assert(!a.alive);assert.equal(system.hurt(a,100,'violet'),0);assert.equal(system.byHero.volt,1);
 for(const m of system.missiles)system.hurt(m,100,'violet');assert.equal(system.intercepted,6);assert.equal(system.impacts,0);
 system.reset();assert.equal(system.scene.children.length,0);assert.equal(system.intercepted,0);assert.equal(system.cooldown,5.2);
}
const physics=new DestructionWorld(),wall=physics.addChunk({type:'wall',building:'B',floor:0,x:0,y:8,z:4,size:[20,20,.3]});
const units=new UnitDamage(),tank=units.add('tank','tank',{});tank.shapes=[{center:{x:0,y:8,z:4},half:{x:2,y:2,z:2}}];
let impacts=0;const {system}=fixture((a,b,r)=>traceImpact(a,b,{sections:physics.chunks,radius:r}), (p,hit)=>{impacts++;physics.impact(p,18,3.8,hit.section,{beam:true});units.blast(p,{direct:tank,power:68});});
system.pending=1;system.launch();system.pending=0;system.cooldown=100;for(let i=0;i<90;i++)system.update(1/60,i/60);assert.equal(impacts,1);assert.equal(wall.hp,0);assert.equal(wall.state,'dynamic');assert.equal(tank.health,32);assert.equal(system.impacts,1);
const safe=fixture(()=>{throw Error('intercepted missiles must never run collision or blast');});safe.system.pending=1;const missile=safe.system.launch();safe.system.pending=0;safe.system.cooldown=100;safe.system.hurt(missile,100,'violet');safe.system.update(.1,0);assert.equal(safe.system.impacts,0);assert.equal(safe.bursts(),1);
const stopped=fixture();stopped.system.beginSalvo();stopped.state.alive=false;stopped.system.update(.1,0);assert.equal(stopped.system.pending,0);assert.equal(stopped.system.launched,0);
console.log('PASS six staggered slow guided missiles at 30/60/120Hz, threat reservations/LOS, swept shootdown, exact kill credit, safe interceptions, real building/unit impact damage, reset and robot-defeat launch cancellation');

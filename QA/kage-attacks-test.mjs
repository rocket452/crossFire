import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from '../dist/vendor/three.module.js';
import {KageAttacks} from '../dist/kage-attacks.js';
import {ShurikenWorld} from '../dist/shuriken-world.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
const config=JSON.parse(fs.readFileSync('dist/ninja-shuriken-config.json'));
function setup(){const units=[],sections=[],damage=new UnitDamage(),root=new THREE.Group(),events=[],h={root,yaw:0,shots:0,character:{hand:()=>new THREE.Vector3(0,1.2,0)},aim:()=>new THREE.Vector3(0,1.2,100),redirect:()=>null,shurikenEffects:{tone(){}},burst(){},getDashEnemies:()=>units,getAttackThreats:()=>[],getSections:()=>sections,hit:(hit,power)=>{events.push(hit);return hit.unit?damage.hurt(hit.unit,power,hit.point,hit.part):0;},traceWorld:(a,b,opts)=>traceImpact(a,b,{targets:units,sections,ground:false,radius:opts.radius})};h.shurikenWorld=new ShurikenWorld(config,{getSections:()=>sections,getEnemies:()=>units,getBounds:()=>({minX:-200,maxX:200,minZ:-200,maxZ:200})});const a=Object.create(KageAttacks.prototype);Object.assign(a,{hero:h,config,kunai:{},trails:{},arcRoot:{},render(){}});a.reset();const step=(seconds,held=false)=>{for(let i=0;i<Math.round(seconds*120);i++)a.update(1/120,{held,enabled:true});};const enemy=(x,z,health=1000)=>{const entity={root:new THREE.Group()},u=damage.add('enemy-'+units.length,'robot',entity,health);u.shapes=[{center:{x,y:1.2,z},half:{x:.4,y:1,z:.4},rotation:new THREE.Quaternion()}];units.push(u);return u;};return{a,h,units,sections,events,step,enemy};}
let t=setup();t.enemy(0,10);t.step(1/120,true);t.step(.2);assert.equal(t.a.throws,1);assert.equal(t.units[0].health,945);t.step(1/120,true);t.step(.2);assert.equal(t.a.throws,1,'cooldown rejects another tap');t.step(1);t.step(1/120,true);t.step(.2);assert.equal(t.a.throws,2);
t=setup();
const distant=t.enemy(0,329);
t.step(1/120,true);
t.step(1.6);
assert.equal(distant.health,945,'a kunai hits near the new 330 m limit');
t=setup();
const beyond=t.enemy(0,331);
t.step(1,true);
t.step(2);
assert.equal(t.a.throws,5);
assert.equal(beyond.health,1000,'stored kunai cannot reach past 330 m');
assert.equal(t.a.bolts.length,0,'all kunai expire at the range limit');
t=setup();t.enemy(0,10);t.enemy(0,20);t.step(2,true);assert.equal(t.a.stored,5);assert.equal(t.a.throws,0,'held kunai do not auto-fire');t.step(.45);assert.equal(t.a.throws,5);assert.equal(t.a.lastVolley,5);assert.equal(t.units[0].health,725);assert.equal(t.units[1].health,1000,'kunai stop at first enemy');assert.equal(t.a.bolts.length,0);
t=setup();t.step(.25,true);assert.equal(t.a.stored,2);t.step(.25,true);assert.equal(t.a.stored,3);t.step(.5,true);assert.equal(t.a.stored,5);t.step(8,true);assert.equal(t.a.stored,5);t.h.aim=()=>new THREE.Vector3(100,1.2,0);t.step(1/120);assert.equal(t.a.queue.length,4);t.h.aim=()=>new THREE.Vector3(0,1.2,100);t.step(.35);assert.equal(t.a.throws,5);assert(t.a.bolts.every(b=>b.dir.x>.999&&Math.abs(b.position.z)<1e-8),'released volley stays in one straight line');
t=setup();t.step(2,true);t.a.cancelInput();t.step(.2);assert.equal(t.a.throws,0,'pause/input loss discards stored kunai');
t=setup();for(const [x,z]of[[0,7.5],[-2,2],[2,2],[0,-3],[0,12]])t.enemy(x,z);assert(t.a.slash());assert.deepEqual(t.units.map(u=>u.health),[560,560,560,1000,1000]);assert.equal(t.a.lastSlashHits,3);assert(!t.a.slash(),'melee cooldown');t.step(1.1);assert(t.a.slash());assert.deepEqual(t.units.map(u=>u.health),[120,120,120,1000,1000]);
t=setup();t.enemy(0,3);t.sections.push({id:'wall',size:[2,4,.3],state:'intact',body:{position:new THREE.Vector3(0,2,1.5),quaternion:new THREE.Quaternion()}});assert(t.a.slash());assert.equal(t.units[0].health,1000,'slash cannot hit through an intact wall');
const {COMBAT_DRONE}=await import('../dist/combat-drone-config.js');
t=setup();const droneHull=t.enemy(0,5,COMBAT_DRONE.hullHealth);assert(t.a.slash());assert(!droneHull.alive,'one slash drops a full-health drone hull');
console.log('PASS kunai tap/cooldown, five-stack hold/release, no auto-fire, fixed straight burst, first-hit damage, input cancellation; slash hits all forward enemies once, excludes rear/far targets, respects walls and cooldown.');
// Aim tilts the complete melee fan, including its vertical thickness and cover tests.
for(const sign of[-1,1]){t=setup();t.h.root.position.y=8;const y=8+sign*6;t.h.aim=()=>new THREE.Vector3(0,y,1.5);const aimed=t.enemy(0,1.5);aimed.shapes[0].center.y=y;const level=t.enemy(0,7);level.shapes[0].center.y=9.2;assert(t.a.slash());assert.equal(aimed.health,560,'aimed '+(sign<0?'down':'up')+' strike hits');assert.equal(level.health,1000,'level target outside tilted fan');assert(sign*t.a.slashDirection.y>.8);const direction=t.a.slashDirection.clone();t.h.aim=()=>new THREE.Vector3(100,8,0);assert(t.a.slashDirection.equals(direction),'active swing aim remains locked');}
t=setup();t.h.root.position.y=8;t.h.aim=()=>new THREE.Vector3(0,1.2,0);const below=t.enemy(0,0);assert(t.a.slash());assert.equal(below.health,560,'straight-down slash uses a finite attack frame');assert(t.a.slashRotation.toArray().every(Number.isFinite));
t=setup();t.h.root.position.y=8;t.h.aim=()=>new THREE.Vector3(0,1.2,1.5);const covered=t.enemy(0,1.5);t.sections.push({id:'ceiling',size:[8,.3,8],body:{position:new THREE.Vector3(0,6,1),quaternion:new THREE.Quaternion()}});assert(t.a.slash());assert.equal(covered.health,1000,'downward slash cannot penetrate intact floor');t.a.reset();assert(t.a.slashDirection.equals(new THREE.Vector3(0,0,1)));
console.log('PASS upward/downward/vertical mouse aim, oriented hit thickness, frozen swing direction, intact floor cover and reset');
// A circular 3D cone has the same angular reach in every direction around the cursor.
for(let i=0;i<8;i++){t=setup();t.h.root.position.y=8;t.h.aim=()=>new THREE.Vector3(0,9.2,100);const a=i*Math.PI/4,inside=t.enemy(Math.cos(a)*3.5,6),outside=t.enemy(Math.cos(a)*8,6);inside.shapes[0].center.y=9.2+Math.sin(a)*3.5;outside.shapes[0].center.y=9.2+Math.sin(a)*8;inside.shapes[0].half=outside.shapes[0].half={x:.1,y:.1,z:.1};assert(t.a.slash());assert.equal(inside.health,560,'inside cone at angle '+i);assert.equal(outside.health,1000,'outside cone at angle '+i);}
t=setup();const edge=t.enemy(8,6);edge.shapes[0].half={x:3,y:1,z:3};assert(t.a.slash());assert.equal(edge.health,560,'large hitbox crossing cone is hit even when apex-nearest point is outside');
t=setup();const far=t.enemy(0,9.5);far.shapes[0].half={x:.1,y:.1,z:.1};assert(t.a.slash());assert.equal(far.health,1000,'cone end cap remains at nine metres');
t=setup();const multi=t.enemy(0,6);multi.shapes.push({...multi.shapes[0],part:'head',center:{x:0,y:2,z:6}});assert(t.a.slash());assert.equal(multi.health,560,'one hit per enemy even across multiple shapes');
console.log('PASS 90-degree circular cone: eight radial directions, outside-angle rejection, large collider edge intersection, finite depth and no duplicate shape hits');

const {NinjaMotion}=await import('../dist/ninja-motion.js');
for(const target of [true,false]){
 t=setup();const m=t.h.motion=new NinjaMotion();m.body.position={x:0,y:11,z:0};m.body.mode='air';m.jumps=1;
 t.h.root.position.set(0,11,0);t.h.aim=()=>new THREE.Vector3(0,0,0);
 if(target)t.enemy(0,0).shapes[0].center.y=6;
 assert(t.a.slash()&&m.fallingCut);let impactY,peak;
 for(let i=0;i<80;i++){
  const cutting=!!m.fallingCut;m.step({},1/120,[]);
  if(cutting&&!m.fallingCut){impactY=peak=m.position.y;if(!target)assert(Math.abs(impactY-3)<1e-5);}
  if(impactY!==undefined)peak=Math.max(peak,m.position.y);
 }
 if(target){assert.equal(t.units[0].health,560);assert(Math.abs(peak-impactY-2)<.1);}
 else assert.equal(m.mode,'ground');
 assert.equal(m.resets,0);
}
console.log('PASS falling cut contacts once, rebounds two metres, misses end after eight metres and fall to ground.');

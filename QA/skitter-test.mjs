// Skitter: chase, claw strike, pounce, climbing to a rooftop hero, mantling, leaping down after them, climbing
// over a building in the way, stun on a wall, falling when a roof disappears, death and reset, at 30/60/120Hz.
// Needs the private runtime model dist/city-assets/licensed-robots/niko-quadbot.glb (skipped when absent).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(name,ctx,next){return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,ctx);}});
const asset=new URL('../dist/city-assets/licensed-robots/niko-quadbot.glb',import.meta.url);
if(!fs.existsSync(asset)){console.log('SKIP Skitter (private quadruped runtime asset missing)');process.exit(0);}
const THREE=await import('../dist/vendor/three.module.js');const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const {Skitter}=await import('../dist/skitter.js');const {SKITTER:C}=await import('../dist/skitter-config.js');const {UnitDamage}=await import('../dist/combat-collision.js');
const bytes=fs.readFileSync(asset),gltf=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const BUILDING={id:'B1',minX:10,maxX:22,minZ:-6,maxZ:6,top:20,bottom:0};
function make({hero=V(-4,0,6),boxes=[BUILDING],spawn={x:-14,y:0,z:-10},count=1}={}){
 const damage=new UnitDamage(),hits=[],heroes=[],units=[];const scene=new THREE.Scene();let list=[...boxes];
 const h={root:new THREE.Group(),motion:{velocity:V()}};h.root.position.copy(hero);const unit={id:'hero',kind:'hero',alive:true,entity:h,shapes:[{center:hero.clone().add(V(0,1.4,0)),half:{x:.5,y:1,z:.5}}]};
 const skitters=[];for(let i=0;i<count;i++)skitters.push(new Skitter(scene,damage,{skitterModel:gltf,id:'skitter-'+i,getTargets:()=>[unit].filter(u=>u.alive),visible:()=>true,isPathClear:()=>true,getBuildingBoxes:()=>list,groundHeight:()=>0,
  bounds:{minX:-100,maxX:100,minZ:-100,maxZ:100},onHeroHit:(u,p,d)=>hits.push(d),peers:()=>skitters,spawnPosition:{x:spawn.x+i*6,y:0,z:spawn.z}}));
 for(const s of skitters){s.reset();s.spawn();}
 const world={skitters,s:skitters[0],hits,unit,hero:h,damage,setBoxes:b=>{list=b;for(const s of skitters)s.boxCache=null;},moveHero(p){h.root.position.copy(p);unit.shapes[0].center.copy(p).add(V(0,1.4,0));},
  tick(dt,seconds,each){for(let t=0;t<seconds;t+=dt){for(const s of skitters)s.update(dt,s.age+dt);each?.();}}};
 return world;
}
const m=make().s.model;
assert.equal(m.legs.length,4);assert(m.legs.every(l=>l.fingers.length===4&&l.l1>.5&&l.l2>.5),'four three-segment legs with four-finger claws');
const stats=m.stats();assert(stats.triangles<9000&&stats.bones>=54,'decimated skinned model '+JSON.stringify(stats));
assert(m.materials.lens.emissiveIntensity>1.6&&m.materials.core.emissiveIntensity>1.6,'neon eye and core reach the city bloom');assert(m.materials.limbs.userData.flare,'claw edges glow');

for(const dt of[1/30,1/60,1/120]){
 // Chase and claw strike on the street.
 let w=make();w.tick(dt,4);assert(w.s.stats.strikes>=1&&w.hits.length>=1,'strikes a stationary hero on the street');assert(w.hits.every(d=>d===C.strike.damage||d===C.pounce.damage));
 const flat=Math.hypot(w.s.root.position.x+4,w.s.root.position.z-6);assert(flat<C.strike.range+.5,'closed to claw range '+flat.toFixed(2));
 // Hero on a roof: climb the wall, mantle onto the roof and strike there.
 w=make({hero:V(16,20,0)});const seen=new Set();w.tick(dt,9,()=>seen.add(w.s.surface.kind));
 assert(seen.has('wall')&&w.s.stats.climbs>=1&&w.s.stats.mantles>=1,'climbed and mantled: '+[...seen]);assert.equal(w.s.surface.kind,'roof');assert(Math.abs(w.s.root.position.y-20)<.01,'stands on the roof');
 assert(w.hits.length>=1,'attacks the hero on the roof');
 // Hero drops back to the street: walk to the edge and leap after them.
 w.moveHero(V(-8,0,-4));const before=w.hits.length;w.tick(dt,5);assert(w.s.stats.leaps>=1,'leapt off the roof');assert.equal(w.s.surface.kind,'ground');assert(w.hits.length>before,'resumes attacking on the street');
}
// A building between the Skitter and a hero on the street is climbed over, not walked around.
{const w=make({hero:V(34,0,0),spawn:{x:-6,y:0,z:0}});const kinds=new Set();w.tick(1/60,10,()=>kinds.add(w.s.surface.kind));
 assert(kinds.has('wall')&&kinds.has('roof')&&w.s.stats.leaps>=1,'over the building: '+[...kinds]);assert(w.s.root.position.x>22,'reached the far side');}
// Mid-range pounce with a telegraph ring, landing on a stationary hero.
{const w=make({hero:V(0,0,0),spawn:{x:-11,y:0,z:0}});w.s.pounceCooldown=0;let ring=false;w.tick(1/60,2.2,()=>{ring||=w.s.ring.visible&&w.s.ringFill.visible;});
 assert(w.s.stats.pounces>=1&&ring,'pounce telegraphed');assert(w.hits.includes(C.pounce.damage),'pounce lands on the hero');}
// Stun on a wall holds it there; it then resumes climbing.
{const w=make({hero:V(16,20,0)});w.tick(1/60,3.2);assert.equal(w.s.surface.kind,'wall');const y=w.s.root.position.y;w.s.stun(1);w.tick(1/60,.8);assert.equal(w.s.surface.kind,'wall');assert(Math.abs(w.s.root.position.y-y)<.01,'held on the wall');w.tick(1/60,2);assert(w.s.root.position.y>y+1||w.s.surface.kind==='roof','resumes');}
// The roof is destroyed under it: it falls to the street.
{const w=make({hero:V(16,20,0)});w.tick(1/60,7);assert.equal(w.s.surface.kind,'roof');w.setBoxes([]);w.tick(1/60,2.5);assert.equal(w.s.surface.kind,'ground');assert(w.s.root.position.y<.01&&w.s.stats.falls>=1,'fell');}
// Death on a wall: drops, curls, fades out; reset restores a fresh hunter.
{const w=make({hero:V(16,20,0)});w.tick(1/60,3.2);assert.equal(w.s.surface.kind,'wall');w.damage.hurt(w.s.combatUnit,1e6,w.s.aimPoint(),'hull');w.s.destroy();assert(w.s.dead&&!w.s.combatUnit.alive);
 w.tick(1/60,C.dying+C.fade+.5);assert(w.s.root.position.y<.01,'dropped to the street');assert(!w.s.root.visible,'faded out');
 w.s.reset();assert(!w.s.dead&&!w.s.spawned&&w.s.surface.kind==='ground'&&w.s.root.quaternion.equals(new THREE.Quaternion()));w.s.spawn();assert.equal(w.s.combatUnit.health,C.health);}
// Pack: three Skitters keep apart while surrounding a hero; head shots hurt more.
{const w=make({count:3,hero:V(0,0,0),spawn:{x:-12,y:0,z:-12}});w.tick(1/60,4);const p=w.skitters.map(s=>s.root.position);
 for(let i=0;i<3;i++)for(let j=i+1;j<3;j++)assert(Math.hypot(p[i].x-p[j].x,p[i].z-p[j].z)>C.separation*.7,'pack spacing');
 const s=w.s;assert.equal(s.modifyDamage(10,s.aimPoint(),'head'),10*C.headMultiplier);assert.equal(s.modifyDamage(10,s.aimPoint(),'hull'),10);s.sync();assert.deepEqual(s.combatUnit.shapes.map(x=>x.part),['hull','head']);}
console.log('PASS Skitter: rig/budget',JSON.stringify(stats),'| street strike, roof climb+mantle+strike, leap after the hero at 30/60/120Hz | climbs over buildings | telegraphed pounce | wall stun hold | falls when the roof goes | wall death drop, fade, reset | pack spacing, head shots');

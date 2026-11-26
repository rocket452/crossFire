import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {LiberationBuild} from '../dist/liberation-build.js';
import {EVOLUTIONS,RELICS} from '../dist/liberation-catalog.js';
import {escortMovementBounds} from '../dist/evac-approach.js';
import {CityLiberation,DISTRICTS} from '../dist/city-liberation.js';
import {SiegeWalker} from '../dist/siege-walker.js';
import {spec,gltfModel} from './walker-fixture.mjs';
import {NinjaMotion} from '../dist/ninja-motion.js';
import {mission1CityBuildings} from '../dist/evac-city-map.js';

let seed=0x5badcafe;
Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};
for(const heroId of ['volt','ninja','lux']){
 const build=new LiberationBuild(heroId);
 const wanted=EVOLUTIONS.filter(e=>e.hero===heroId);
 while(build.ranks.size<wanted.length){
  build.rewards.push('level');const draft=build.draft();
  assert(draft.length&&draft.length<=3);
  for(const card of draft){assert.equal(card.hero,heroId);assert(!build.value(card.id));if(card.requires)assert(build.value('Flashpoint')||build.value('Second Sun'));}
  assert(build.choose(draft[0].id));
 }
 const xp=build.xp;build.credits=300;const card=build.stock[0].card;
 assert(build.buy(card.id));assert(!build.buy(card.id));assert.equal(build.xp,xp);
 assert(build.refresh());assert.equal(build.refreshPrice,15);assert.equal(build.stock.length,5);
 build.bossReward();assert.equal(build.refreshPrice,10);assert(build.draft().every(c=>RELICS.includes(c)));
}
registerHooks({resolve(name,ctx,next){return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,ctx);}});
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync(new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url));
const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene(),physics=new DestructionWorld(),hero={root:new THREE.Group(),motion:new NinjaMotion()};
hero.root.position.set(0,.08,96);
const heroUnit={id:'kage',kind:'hero',alive:true,entity:hero,shapes:[{center:hero.root.position.clone().add(new THREE.Vector3(0,1,0)),half:{x:.6,y:1,z:.6}}]};
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
const buildings=mission1CityBuildings(layout.buildings);
for(const wall of buildings)physics.addChunk({type:'wall',building:wall.id,floor:0,x:wall.x,z:wall.z,y:wall.floors*1.5,size:[10,wall.floors*3,10]});
const clear=(a,b,radius=0)=>!traceImpact(a,b,{sections:physics.chunks,ground:false,radius});
const walker=new SiegeWalker(scene,gltfModel,spec,{weaponHealthMultiplier:10,onEffect(){},onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>physics.removeWreck(b)});
let run,finalDead=false,arcs=0,arsenal=0,firstAttackAt=null;
const damage=new UnitDamage((u,p)=>{if(u===walker.combatUnit)walker.destroy();else run.disable(u,p);});
damage.add('siege-walker','robot',walker,walker.weapons.maxHealth);
const ui={reset(){},sync(r){if(r.upgradePending)r.build.draft();}};
run=new CityLiberation(scene,damage,{
 walker,ui,buildings,visible:clear,openStreet:p=>clear({...p,y:.3},{...p,y:24},3),getTargets:()=>[heroUnit],
 onEvent(){},ring(){},arc(){arcs++;},startArsenal(){arsenal++;},finalBossDefeated:()=>finalDead,
 bruiser:{spiderModel,visible:clear,isPathClear:(a,b)=>clear({...a,y:a.y+1.3},{...b,y:b.y+1.3},1.9),trace:()=>null},
 drone:{physics,visible:clear,trace:()=>null,roof:()=>null,redirect:()=>null,audio:()=>null,
  particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit(){}}
});
run.start('ninja',hero);
const edges=escortMovementBounds(8);
const onEdge=p=>[edges.minX,edges.maxX].includes(p.x)||[edges.minZ,edges.maxZ].includes(p.z);
const initialSpots=run.streetSpawns();
assert(initialSpots.length>4&&initialSpots.every(onEdge));
assert(initialSpots.some(p=>p.x===edges.minX)&&initialSpots.some(p=>p.x===edges.maxX));
assert(initialSpots.some(p=>p.z===edges.minZ)&&initialSpots.some(p=>p.z===edges.maxZ));
let t=0;
function tick(seconds){for(let i=0;i<Math.round(seconds*30);i++){run.update(1/30,t+=1/30);physics.step(1/30);run.syncWrecks();}}
tick(10);
const first=run.members.filter(a=>a.spawned);
assert.equal(first.length,2);assert(!walker.root.visible);
assert(first.every(actor=>onEdge(actor.spawnPosition)&&actor.root.position.distanceTo(hero.root.position)<actor.spawnPosition.distanceTo(hero.root.position)));
for(const actor of first)if(actor.shots)firstAttackAt=t;
assert(firstAttackAt,'first pack has opened fire by ten seconds');
const kill=a=>damage.hurt(a.combatUnit,1e6,a.root.position,'hull');
first.forEach(kill);tick(.1);assert.equal(run.build.kills,2);assert(!run.upgradePending);
tick(8);const active=run.actors.filter(a=>a.combatUnit?.alive);
assert(active.some(a=>run.flightDrones.includes(a)));
const drone=active.find(a=>run.flightDrones.includes(a));
assert(onEdge(drone.anchor)&&drone.options.ingress,'the drone starts on a perimeter and has a route into the district');
const hp=drone.combatUnit.health;const engine=drone.combatUnit.shapes.find(s=>s.part==='front-left');
damage.hurt(drone.combatUnit,200,engine.center,engine.part);assert.equal(drone.combatUnit.health,hp);
tick(.1);assert.equal(run.build.kills,3);tick(1);assert.equal(run.build.kills,3);
while(run.upgradePending){run.build.draft();run.build.choose(run.build.cards[0].id);}
const ground=run.members.find(a=>a.combatUnit?.alive);
ground.root.position.copy(hero.root.position).x+=4;ground.sync();
while(!run.upgradePending)run.build.reward(false);
const frozen=run.elapsed;tick(1);assert.equal(run.elapsed,frozen);
function pick(){while(run.upgradePending){run.build.draft();run.build.choose(run.build.cards[0].id);}}
pick();run.stageTime=DISTRICTS[0].seconds;tick(.1);assert.equal(arsenal,1);assert(walker.root.visible);assert.equal(walker.root.position.z,edges.maxZ);assert(walker.spawnOrigin.z<edges.maxZ);
assert.equal(damage.hurt(walker.combatUnit,1e6,walker.root.position,'head'),0);
for(const m of walker.weapons.modules)damage.hurt(walker.combatUnit,1e6,walker.meshes[m.part].getWorldPosition(new THREE.Vector3()),m.part);
tick(.1);assert(walker.dead);assert.equal(run.stage,1);assert.equal(run.build.rewards[0],'boss');pick();
run.stageTime=DISTRICTS[1].seconds;tick(.1);assert.equal(run.phase,'boss');finalDead=true;tick(.1);assert.equal(run.phase,'cleared');tick(5.1);assert.equal(run.phase,'won');
run.reset();assert.equal(run.hero,null);assert(!run.actors.some(a=>a.spawned));
run.start('volt',{...hero,dash:{dashes:0,cooldown:0},energy:{}});
assert.equal(run.build.ranks.size,0);assert.equal(run.build.credits,0);assert.equal(run.build.hp,120);
for(let i=0;i<4;i++){run.hitHero(45);run.build.tick(.4);}
assert.equal(run.phase,'lost');
run.reset();run.start('ninja',hero);assert.equal(run.build.credits,0,'victory bonus is consumed once');
// Scripted pacing probe: one ordinary kill every eight seconds and 50 seconds on Walker mounts.
let firstDraftAt=null;
finalDead=false;
for(let seconds=1;seconds<=300;seconds++){
 tick(1);
 if(run.upgradePending&&firstDraftAt===null)firstDraftAt=seconds;
 pick();
 if(seconds%8===0){
  const target=run.actors.find(a=>a.combatUnit?.alive&&!a.dead);
  if(target)kill(target);
 }
 if(seconds===465){
  for(const m of walker.weapons.modules)damage.hurt(walker.combatUnit,1e6,walker.root.position,m.part);
 }
}
assert(firstDraftAt<=120);assert(run.build.level>=6);assert.equal(run.stage,0);
console.log('Five-minute script:',{firstDraftAt,level:run.build.level,kills:run.build.kills,upgrades:[...run.build.ranks.values()].reduce((n,u)=>n+u.rank,0)});
console.log('City Liberation passed: edge spawns, weak points, district and relic progression, pause, win, loss, replay and five-minute pacing.');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {LiberationBuild,UPGRADES} from '../dist/liberation-build.js';
import {escortMovementBounds} from '../dist/evac-approach.js';
import {CityLiberation,DISTRICTS} from '../dist/city-liberation.js';
import {SiegeWalker} from '../dist/siege-walker.js';
import {spec,gltfModel} from './walker-fixture.mjs';
import {RunnerEnergy} from '../dist/runner-energy.js';
import {NinjaMotion} from '../dist/ninja-motion.js';
import {mission1CityBuildings} from '../dist/evac-city-map.js';

let seed=0x5badcafe;
Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};
function equip(build,id){
 const upgrade=UPGRADES.find(u=>u.id===id);
 build.rewards.push('level');build.cards=[upgrade];
 assert(build.choose(id));assert(!build.choose(id));
}
const profile={distance:30,speed:0,healthFraction:1,part:'hull',kind:'electric'};
const checks=[
 ['amplifier',{},.15],['execution',{healthFraction:.4},.4],['precision',{part:'front-right'},.25],
 ['pointBlank',{distance:8},.3],['momentum',{speed:20},.3],['weld',{kind:'welding'},.55],
 ['storm',{kind:'sky-strike'},.4],['blade',{kind:'arrival-strike'},.4]
];
for(const [id,condition,bonus] of checks){
 const b=new LiberationBuild('volt');equip(b,id);equip(b,id);
 assert.equal(b.multiplier({...profile,...condition}),1+2*bonus);
 if(id!=='amplifier')assert.equal(b.multiplier(profile),1);
}
const b=new LiberationBuild('ninja',()=>.4);
for(const id of ['armor','regen','vengeance','ward','capacitor','learning','salvage','bounty'])equip(b,id);
assert.equal(b.hp,145);assert.equal(b.hurt(50),'ward');b.tick(.4);b.hurt(50);assert.equal(b.hp,101);
assert.equal(b.multiplier(profile),1.35);assert.equal(b.hurt(10),false);b.tick(5);assert.equal(b.multiplier(profile),1);
const lastHP=b.hp;b.reward(false);assert.equal(b.hp,lastHP+5);assert.equal(b.credits,7);assert.equal(b.xp,8.75);
b.reward(true);assert.equal(b.level,2);assert.equal(b.credits,16);b.draft();assert(b.spend('repair'));assert.equal(b.credits,4);
assert(!b.spend('reroll'));b.bossReward();const bossCards=b.draft();
assert.equal(bossCards[0].rarity,'epic');assert(b.spend('reroll'));assert.equal(b.credits,31);
assert(b.choose(b.cards[0].id));
for(const hero of ['ninja','volt']){
 const build=new LiberationBuild(hero);const seen=new Set();
 for(let i=0;i<150;i++){
  build.rewards.push('level');const cards=build.draft();
  assert(cards.every(u=>!u.hero||u.hero===hero));assert.equal(new Set(cards.map(c=>c.id)).size,cards.length);
  if(cards.length){seen.add(cards[0].id);build.choose(cards[0].id);}
 }
 assert.equal(seen.size,UPGRADES.filter(u=>!u.hero||u.hero===hero).length);
 for(const {upgrade,rank} of build.ranks.values())assert.equal(rank,upgrade.max);
}
const energy=new RunnerEnergy();equip(b,'dynamo');
assert(energy.earn(5,1,{dashing:true,dashMultiplier:b.value('dynamo')})>0);
equip(b,'airJump');equip(b,'backstab');
assert.equal(new NinjaMotion({hasExtraAirJump:()=>b.value('airJump')}).maxAirJumps,2);

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
first.forEach(kill);tick(.1);assert.equal(run.build.kills,2);assert(run.upgradePending);
const frozen=run.elapsed;tick(1);assert.equal(run.elapsed,frozen);run.build.choose(run.build.cards[0].id);
tick(7);const active=run.actors.filter(a=>a.combatUnit?.alive);
assert(active.some(a=>run.flightDrones.includes(a)));
const drone=active.find(a=>run.flightDrones.includes(a));
assert(onEdge(drone.anchor)&&drone.options.ingress,'the drone starts on a perimeter and has a route into the district');
const hp=drone.combatUnit.health;const engine=drone.combatUnit.shapes.find(s=>s.part==='front-left');
damage.hurt(drone.combatUnit,200,engine.center,engine.part);assert.equal(drone.combatUnit.health,hp);
tick(.1);assert.equal(run.build.kills,3);tick(1);assert.equal(run.build.kills,3);
while(run.upgradePending){run.build.draft();run.build.choose(run.build.cards[0].id);}
const ground=run.members.find(a=>a.combatUnit?.alive);
ground.root.position.copy(hero.root.position).x+=4;ground.sync();
equip(run.build,'echo');equip(run.build,'reach');
run.onHit({unit:drone.combatUnit,point:ground.root.position},20);assert.equal(arcs,1);
run.onHit({unit:drone.combatUnit,point:ground.root.position},20);assert.equal(arcs,1);
equip(run.build,'pulse');equip(run.build,'recovery');equip(run.build,'afterimage');
const before=ground.combatUnit.health;hero.motion.dashes++;hero.motion.cooldown=2;hero.motion.dash={};
tick(.1);assert(ground.combatUnit.health<before);assert(hero.motion.cooldown<2);
hero.motion.dash=null;tick(.1);assert.equal(run.build.hurt(20),false);
equip(run.build,'burst');const extra=run.members.find(a=>!a.spawned);
extra.spawnPosition=ground.root.position.clone().add(new THREE.Vector3(0,0,3));extra.reset();extra.spawn();
const extraHP=extra.combatUnit.health;kill(ground);tick(.1);assert(extra.combatUnit.health<extraHP);
function pick(){while(run.upgradePending){run.build.draft();run.build.choose(run.build.cards[0].id);}}
pick();run.stageTime=DISTRICTS[0].seconds;tick(.1);assert.equal(arsenal,1);assert(walker.root.visible);assert.equal(walker.root.position.z,edges.maxZ);assert(walker.spawnOrigin.z<edges.maxZ);
assert.equal(damage.hurt(walker.combatUnit,1e6,walker.root.position,'head'),0);
for(const m of walker.weapons.modules)damage.hurt(walker.combatUnit,1e6,walker.meshes[m.part].getWorldPosition(new THREE.Vector3()),m.part);
tick(.1);assert(walker.dead);assert.equal(run.stage,1);assert.equal(run.build.rewards[0],'boss');pick();
run.stageTime=DISTRICTS[1].seconds;tick(.1);assert.equal(run.phase,'boss');finalDead=true;tick(.1);assert.equal(run.phase,'cleared');tick(5.1);assert.equal(run.phase,'won');
run.reset();assert.equal(run.hero,null);assert(!run.actors.some(a=>a.spawned));
run.start('volt',{...hero,dash:{dashes:0,cooldown:0},energy:{}});
assert.equal(run.build.ranks.size,0);assert.equal(run.build.credits,12);assert.equal(run.build.hp,120);
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
 if(seconds===165){
  for(const m of walker.weapons.modules)damage.hurt(walker.combatUnit,1e6,walker.root.position,m.part);
 }
}
assert(firstDraftAt<=120);assert(run.build.level>=6);assert.equal(run.stage,1);
console.log('Five-minute script:',{firstDraftAt,level:run.build.level,kills:run.build.kills,upgrades:[...run.build.ranks.values()].reduce((n,u)=>n+u.rank,0)});
console.log('City Liberation passed: '+UPGRADES.length+' upgrades, first pack fires by '+Math.round(firstAttackAt)+'s, first draft after two kills, two stages, weak points, win/loss and replay.');

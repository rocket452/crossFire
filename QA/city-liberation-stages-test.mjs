// City Liberation stage director, District 1 (0-10 min).
// Stage 1, Build your foundation: small introduction packs, the first elite, the first power-up (held until the
// elite falls), then an enemy surge. Stage 2, Build your identity: the Astra Ronin mini-boss (scaled for 120 HP
// heroes, flies in from across the district), a second guaranteed power-up, then the Siege Walker, which never
// enters while the Ronin lives. Needs the private Bruiser SpiderBot runtime asset.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as THREE from '../dist/vendor/three.module.js';
import {UnitDamage,traceImpact} from '../dist/combat-collision.js';
import {DestructionWorld} from '../dist/destruction.js';
import {CityLiberation,DISTRICTS,LIBERATION_STAGES as S} from '../dist/city-liberation.js';
import {SiegeWalker} from '../dist/siege-walker.js';
import {spec,gltfModel} from './walker-fixture.mjs';
import {NinjaMotion} from '../dist/ninja-motion.js';
import {mission1CityBuildings} from '../dist/evac-city-map.js';

let seed=0x1badf00d;
Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};
registerHooks({resolve(name,ctx,next){return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,ctx);}});
const asset=new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url);
if(!fs.existsSync(asset)){console.log('SKIP City Liberation stages (private Bruiser runtime asset missing)');process.exit(0);}
const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
const bytes=fs.readFileSync(asset);
const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
const scene=new THREE.Scene(),physics=new DestructionWorld(),hero={root:new THREE.Group(),motion:new NinjaMotion()};
hero.root.position.set(0,.08,96);
const heroUnit={id:'kage',kind:'hero',alive:true,entity:hero,shapes:[{center:hero.root.position.clone().add(new THREE.Vector3(0,1,0)),half:{x:.6,y:1,z:.6}}]};
const layout=JSON.parse(fs.readFileSync(new URL('../dist/city-assets/city-layout.json',import.meta.url)));
const buildings=mission1CityBuildings(layout.buildings);
for(const wall of buildings)physics.addChunk({type:'wall',building:wall.id,floor:0,x:wall.x,z:wall.z,y:wall.floors*1.5,size:[10,wall.floors*3,10]});
const clear=(a,b,radius=0)=>!traceImpact(a,b,{sections:physics.chunks,ground:false,radius});
const walker=new SiegeWalker(scene,gltfModel,spec,{weaponHealthMultiplier:10,onEffect(){},onDebris:s=>physics.addWreck(s),onRemoveDebris:b=>physics.removeWreck(b)});
let run;const banners=[],heroHits=[],strikes=[];
const damage=new UnitDamage((u,p)=>{if(u===walker.combatUnit)walker.destroy();else run.disable(u,p);});
damage.add('siege-walker','robot',walker,walker.weapons.maxHealth);
const ui={reset(){},sync(r){if(r.upgradePending)r.build.draft();},announce(title,subtitle){banners.push(title);}};
run=new CityLiberation(scene,damage,{
 walker,ui,buildings,visible:clear,openStreet:p=>clear({...p,y:.3},{...p,y:24},3),getTargets:()=>[heroUnit],
 onEvent(){},ring(){},arc(){},startArsenal(){},finalBossDefeated:()=>false,onRoninBuildingStrike:spec=>strikes.push(spec),
 bruiser:{spiderModel,visible:clear,isPathClear:(a,b)=>clear({...a,y:a.y+1.3},{...b,y:b.y+1.3},1.9),trace:()=>null,onHeroHit:(u,p,power)=>heroHits.push({power,from:run.ronin.spawned&&!run.roninDown?'ronin':'basic'})},
 drone:{physics,visible:clear,trace:()=>null,roof:()=>null,redirect:()=>null,audio:()=>null,
  particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit(){}}
});
run.start('ninja',hero);
let t=0,maxAlive=0,entered=0;
const spawn=run.spawnPack.bind(run);run.spawnPack=plan=>{const n=spawn(plan);entered+=n;return n;};
const alive=()=>run.actors.filter(a=>a.combatUnit?.alive&&!a.dead);
function tick(seconds,each){for(let i=0;i<Math.round(seconds*30);i++){run.update(1/30,t+=1/30);physics.step(1/30);run.syncWrecks();each?.();}}
const kill=a=>damage.hurt(a.combatUnit,1e6,a.root.position,'hull');
const pick=()=>{let n=0;while(run.upgradePending){run.build.draft();assert(run.build.cards.length>=1&&run.build.cards.length<=3);run.build.choose(run.build.cards[0].id);n++;}return n;};

// ---- Stage 1 · introduction: small packs, XP and credits accrue, the first level-up is held.
assert.equal(run.beat,'intro');assert(run.build.levelHold);
let killed=0;
while(run.stageTime<S.elite.at-1){tick(1,()=>maxAlive=Math.max(maxAlive,alive().length));if(Math.round(run.stageTime)%10===0){const a=alive()[0];if(a){kill(a);killed++;}}}
assert(maxAlive<=S.intro.cap,'introduction packs stay small: '+maxAlive);assert(killed>=3&&run.build.kills>=3);
assert(run.build.credits>0&&run.build.xp>0,'XP and credits accrue');assert.equal(run.build.level,1);assert(!run.upgradePending,'first level-up held for the elite');
for(let i=0;i<20;i++)run.build.reward(false);assert(!run.upgradePending&&run.build.xp<run.build.threshold,'XP bar fills and waits');
for(const a of alive())kill(a);tick(.2);

// ---- First elite: a larger, gold-lit Bruiser with five times the health; basic spawns pause.
tick(1.5);assert.equal(run.beat,'elite');assert.equal(banners.at(-1),'ELITE INBOUND');
const elite=run.elite;assert(elite?.spawned&&elite.elite);
const base=Math.ceil(350*.7);assert.equal(elite.combatUnit.maxHealth,Math.ceil(base*S.elite.health));
assert.equal(elite.root.scale.x,S.elite.scale);assert.equal(elite.combatUnit.kageDashFraction,S.elite.kageDashFraction);
assert(elite.restMaterials.some(s=>s.m.emissive?.getHexString()===S.elite.tint.slice(1)&&s.m.emissiveIntensity>=1.2),'gold-lit');
assert(elite.combatUnit.shapes.length>0,'elite is hittable');
const enteredBefore=entered;tick(20);assert.equal(entered,enteredBefore,'basic spawns pause during the elite');
damage.hurt(elite.combatUnit,base*2,elite.root.position,'hull');tick(.1);assert(elite.combatUnit.alive,'survives what would kill two Bruisers');
assert(!run.recycleStragglers()&&elite.spawned,'never recycled');
const credits=run.build.credits;kill(elite);tick(.1);

// ---- First power-up: a guaranteed pick-one-of-three when the elite falls.
assert.equal(run.beat,'power-up');assert(run.upgradePending);assert.equal(run.build.level,2);assert(!run.build.levelHold);
assert.equal(run.build.headline.title,'First power-up');assert(run.build.credits>=credits+20,'elite bounty');
run.build.draft();assert.equal(run.build.cards.length,3,'pick one of three');
const frozen=run.elapsed;tick(1);assert.equal(run.elapsed,frozen,'combat pauses for the pick');
assert.equal(pick(),1);assert.equal(run.build.ranks.size,1);assert(!run.build.headline);

// ---- Enemy surge: a larger wave straight after the pick, regular Bruisers again.
tick(.1);assert.equal(run.beat,'surge');assert.equal(banners.at(-1),'ENEMY SURGE');
const surgeStart=entered;let surgePeak=0;
tick(25,()=>surgePeak=Math.max(surgePeak,alive().length));
const surgeCount=entered-surgeStart;assert(surgeCount>=10,'surge spawned '+surgeCount);assert(surgePeak>=9,'crowd of '+surgePeak);
assert(run.members.filter(a=>a.spawned).every(a=>!a.elite&&a.root.scale.x===1),'surge Bruisers are regular');
for(let i=0;i<40&&run.beat==='surge';i++){for(const a of alive().slice(0,2))kill(a);tick(1);pick();}
assert.equal(run.beat,'hold');

// ---- Steady packs until 5:00, then Stage 2 and the Astra Ronin mini-boss at 5:15.
while(run.stageTime<S.stage2-.5){tick(1);pick();if(Math.round(run.stageTime)%6===0){const a=alive()[0];if(a)kill(a);}}
tick(1);assert.equal(run.beat,'stage2');assert.equal(banners.at(-1),'STAGE 2');assert(!run.ronin.spawned);
assert(run.objective().startsWith('Stage 2'));
while(run.stageTime<S.miniboss.at-.5){tick(1);pick();}
for(const a of alive())kill(a);tick(1);pick();
assert.equal(run.beat,'miniboss');assert(run.miniBossActive);assert.equal(banners.at(-1),'MINI-BOSS');
const ronin=run.ronin,r=ronin.combatUnit;
assert.equal(r.maxHealth,S.ronin.health);assert.equal(ronin.config.swordDamage,S.ronin.swordDamage);assert.equal(ronin.config.waveDamage,S.ronin.waveDamage);
const start=ronin.root.position.distanceTo(hero.root.position);assert(start>90,'enters from across the district: '+start.toFixed(1));
assert(r.shapes.length&&run.nearby(ronin.root.position.clone().add(new THREE.Vector3(0,3,0)),12).some(h=>h.unit===r),'targetable by hero abilities');
let trickle=0,flew=false;heroHits.length=0;
tick(60,()=>{trickle=Math.max(trickle,alive().length);flew||=!!ronin.flight;});pick();
assert(trickle<=S.miniboss.trickle.cap,'light trickle during the duel: '+trickle);
assert(flew,'flies in');const near=ronin.root.position.distanceTo(hero.root.position);assert(near<30,'closed on the hero: '+near.toFixed(1));
const roninHits=heroHits.filter(h=>h.from==='ronin');
assert(roninHits.length>=2,'Ronin attacks the hero: '+roninHits.length);
assert(roninHits.every(h=>h.power<=S.ronin.overheadDamage),'mini-boss damage scaled for 120 HP heroes: '+roninHits.map(h=>h.power));
const b=ronin.root.position;for(const v of[b.x,b.z])assert(Number.isFinite(v));
assert(b.x>=-158&&b.x<=62&&b.z>=-62&&b.z<=158,'stays in the district');

// ---- The Siege Walker never enters while the Ronin lives.
run.stageTime=DISTRICTS[0].seconds+1;tick(1);pick();assert.equal(run.phase,'streets');assert(!walker.root.visible);assert(run.objective().includes('Astra Ronin'));

// ---- Mini-boss defeated: credits and a second pick-one-of-three, then the Walker.
const before=run.build.credits,ranks=run.build.ranks.size;
for(let i=0;i<20&&r.alive;i++){damage.hurt(r,1e6,ronin.aimPoint(),'torso');ronin.guard=null;tick(.1);}
assert(!r.alive);tick(.1);assert(run.roninDown&&!run.miniBossActive);assert.equal(run.beat,'identity');
assert(run.upgradePending);assert.equal(run.build.headline.title,'Mini-boss defeated');assert(run.build.credits>=before+40);
assert.equal(banners.at(-1),'MINI-BOSS DEFEATED');assert(pick()>=1);assert(run.build.ranks.size>ranks);
tick(.2);assert.equal(run.phase,'boss');assert(walker.root.visible);
tick(ronin.config.collapseDuration+1);assert(!ronin.root.visible,'Ronin collapses and breaks apart');

// ---- Replay: everything resets.
run.reset();assert(!run.ronin.spawned&&!run.ronin.root.visible&&!run.miniBossActive);
assert(run.members.every(a=>!a.elite&&a.root.scale.x===1));
run.start('volt',{...hero,dash:{dashes:0,cooldown:0},energy:{}});assert.equal(run.beat,'intro');assert(run.build.levelHold);assert(!run.ronin.spawned);
console.log('PASS City Liberation stages:',JSON.stringify({introPeak:maxAlive,surge:surgeCount,surgePeak,roninStart:+start.toFixed(1),roninNear:+near.toFixed(1),roninHits:roninHits.map(h=>h.power),trickle,banners}));

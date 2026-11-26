import assert from 'node:assert/strict';
import {Group,Vector3} from '../dist/vendor/three.module.js';
import {LiberationBuild} from '../dist/liberation-build.js';
import {ITEMS,EVOLUTIONS,RELICS} from '../dist/liberation-catalog.js';
import {HeroEvolutionCombat} from '../dist/liberation-evolutions.js';
import {CityLiberation} from '../dist/city-liberation.js';
import {RunnerStorm} from '../dist/runner-storm.js';
import {UnitDamage} from '../dist/combat-collision.js';
const v=(x=0,y=1,z=0)=>new Vector3(x,y,z);
const catalog=[...ITEMS,...EVOLUTIONS,...RELICS];
function fixture(id){
 const hero={root:new Group(),motion:{mode:'ground',cooldown:0},keys:new Set(),energy:id==='volt'?{amount:40,spent:0}:80};
 hero.root.position.set(0,1,0);
 const damage=new UnitDamage(()=>{}),run={hero,damage,build:new LiberationBuild(id,()=>.99),actors:[],
  options:{visible:()=>true,arc(){},ring(){}},nearby:CityLiberation.prototype.nearby};
 const c=new HeroEvolutionCombat(run);
 const hit=(u,power,kind,cast)=>{
  const h={unit:u,point:u.shapes[0].center.clone(),part:'hull',cast};
  const scaled=c.before(h,power,kind);const n=damage.hurt(u,scaled,h.point,h.part);c.after(h,n);return n;
 };
 const enemy=(x,hp=4000,z=0)=>{
  const actor={root:new Group()};actor.root.position.set(x,1,z);
  const u=actor.combatUnit=damage.add('enemy-'+run.actors.length,'robot',actor,hp);
  u.shapes=[{center:actor.root.position,part:'hull',half:v(1,1,1)}];run.actors.push(actor);return u;
 };
 const grant=(...ids)=>ids.forEach(id=>{const card=catalog.find(e=>e.id===id);assert(card,id);run.build.grant(card);});
 const step=(time)=>{for(let i=0;i<Math.round(time*60);i++){run.build.tick(1/60);c.step(1/60);}};
 return {run,c,hero,enemy,grant,hit,step};
}
{
 const {hero,c,run,enemy,grant,hit,step}=fixture('volt');
 const storm=hero.storm=new RunnerStorm({getUnits:()=>run.actors.map(a=>a.combatUnit),getSections:()=>[],onHit:(h,p,k)=>hit(h.unit,p,k)});
 hero.welder={active:false};storm.liberation=c;
 grant('Mitosis','Power Grid','Orbital Current','Storm Network','Arc Relay','Feedback Circuit','Storm Seed','Supernova','Arc Furnace','Thunder Debt','Critical Temperature','Live Wire');
 c.strike(v());assert.equal(c.orbs().length,1);
 const first=c.orbs()[0];first.energy=96;
 const a=enemy(2,50000),b=enemy(5,50000);run.build.random=()=>0;
 hit(a,20,'electric');assert.equal(c.orbs().length,2);
 assert.equal(c.orbs().reduce((sum,o)=>sum+o.energy,0),100);
 assert(b.health<b.maxHealth&&hero.energy.amount>40);
 c.weldOrb(first);assert(first.furnaceUntil>0);
 hit(a,65,'electric');hit(b,65,'electric');assert.equal(c.wires.size,2);
 const hp=b.health;step(.4);assert(b.health<hp);
 hit(a,400,'welding');const prior=b.health;step(.02);assert(b.health<prior);
 storm.strike={point:v(),remaining:2};hit(enemy(3,2),10,'electric');assert(c.debt>=1);
 c.strike(v());assert.equal(c.debt,0);assert(c.delays.length);
 const o=c.orbs()[0];o.age=20;const n=c.events.counts.get('explosion');step(.02);assert(c.events.counts.get('explosion')>n);
 grant('Terminal Velocity','Closed Circuit');hero.boost=true;
 const center=enemy(7,1000,7);
 for(const [x,z] of [[0,0],[3,0],[7,0],[11,0],[14,0],[14,5],[14,10],[14,14],[8,14],[3,14],[0,11],[0,6],[0,1]]){
  hero.root.position.set(x,1,z);c.stepHero(.12,4);c.previous.copy(hero.root.position);
 }
 assert(center.health<1000);hero.boost=false;c.stepHero(.01,0);assert.equal(c.momentum,0);
 console.log('Living Power Grid, boost loop, furnace, supernova, delayed bolts and beam statuses passed.');
}
{
 const {hero,c,run,enemy,grant,hit,step}=fixture('ninja');
 hero.attacks={stored:3,queue:[]};hero.shuriken={stars:[],emit(){},config:{full:{markSeconds:8}}};
 const star=hero.laserStar={state:'grinding',radius:3,mesh:{visible:true,position:v(5)}};
 grant(...EVOLUTIONS.filter(e=>e.hero==='ninja').map(e=>e.id),'Quantum Prism','Phase Ammunition','Shatter Crystal');
 const a=enemy(5),b=enemy(7),d=enemy(12);
 c.foundry({},v(),v(8),60);assert.equal(c.shots.length,2);
 hero.motion.mode='air';hero.motion.jumps=2;hero.root.position.copy(star.mesh.position);step(.02);assert.equal(hero.motion.jumps,1);
 assert(b.entity.root.position.x<7);
 c.dashStart(v());hit(a,15,'ninja-dash');hit(b,15,'ninja-dash');c.dashEnd(v(10));
 assert.equal(c.fields.filter(f=>f.type==='crosscut').length,2);assert.equal(c.shots.filter(s=>s.context.ancestry.includes('Shadow Barrage')).length,3);
 const before=b.health;hit(a,9000,'ninja-dash');assert(c.spree&&b.health<before);step(1.05);
 const anchor={host:b,position:v(6),localPoint:v(),stationaryAge:0};
 const hp=d.health;c.teleport(v(),v(14),anchor);assert.notEqual(anchor.host,b);assert.equal(hero.shuriken.anchor,anchor);assert(d.health<hp);
 star.host=d;hit(d,15,'kunai');assert.equal(c.stats(d).embed,1);hit(d,20,'ninja-slash');assert.equal(c.stats(d).embed,0);assert(c.delays.length);
 c.rebound();assert.equal(hero.attacks.queue.length,8);
 run.build.random=()=>0;hit(b,30,'kunai');assert(c.shots.some(s=>s.context.ancestry.includes('Quantum Prism')));assert(c.shots.some(s=>s.context.ancestry.includes('Shatter Crystal')));
 console.log('Blade Factory, dash links, shadows, relay, embedded blades and aerial resets passed.');
}
{
 const {hero,c,run,enemy,grant,hit,step}=fixture('lux');
 grant(...EVOLUTIONS.filter(e=>e.hero==='lux').map(e=>e.id),'Overflow Reactor','Volatile Core','Secondary Amplifier');
 const a=enemy(5,35),b=enemy(8,380),d=enemy(12,8000);
 c.communion(1);const cast=c.cast('lance',350);assert.equal(cast.factor,1.5);
 const shot={kind:'lance',power:350,cast,mesh:{scale:v(1,1,1)}};
 c.solarImpact(shot,{unit:a,point:v(5)});assert.equal(c.fields.filter(f=>f.type==='sun').length,1);
 c.sunTransit(shot,v(),v(8));assert(shot.power>500);
 hit(a,shot.power,'lance',cast);assert(!a.alive&&!b.alive);assert(d.health<8000);
 c.blink(v(),v(5),true);assert(c.doubleAt);const sun=c.fields.at(-1);c.communion(1);assert(sun.life>9&&sun.power>48);
 const copies=[];hero.shots=copies;hero.shoot=(...args)=>copies.push(args);
 c.cast('spray',19);assert.equal(copies.length,1);assert(copies[0][4].free);
 c.sunTransit({kind:'spray',power:20,cast},v(),v(8));assert(c.shots.some(s=>s.context.ancestry.includes('Refraction')));
 c.nursery(d,cast);assert(copies.some(s=>s[0]==='comet'));
 hit(d,19,'spray');assert(c.stats(d).heat);hit(d,60,'comet');assert.equal(c.stats(d).heat,0);
 hit(enemy(6,5),110,'comet',c.cast('comet',115));assert(copies.some(s=>s[4]?.scale>0));
 step(.5);assert(c.shots.length<=64);
 console.log('Solar Apocalypse, sun consumption, overkill cascades, refraction, blink echoes and comet transfer passed.');
}
{
 const {hero,c,run,enemy,grant,hit,step}=fixture('ninja');
 const near=enemy(3,20000),far=enemy(6,10000);hero.attacks={queue:[],cooldown:5,slashCooldown:2,stored:0};
 grant('Resonance Chamber','Feedback Circuit','Time Fragment','Stolen Seconds','Siege Platform','Targeting Chip','Field Medic','Phase Buffer','Phase Buffer');
 for(let i=0;i<10;i++)hit(near,10,'kunai');assert(far.health<10000);
 assert.equal(run.build.hurt(50),'ward');run.build.tick(.4);assert.equal(run.build.hurt(50),'ward');
 assert.equal(run.build.hp,120);run.build.reward(false);assert.equal(run.build.shield,3);
 run.build.tick(.4);run.build.hurt(10);assert.equal(run.build.hp,113);
 hero.attacks.cooldown=0;hero.attacks.slashCooldown=0;c.reduce(2);assert.equal(c.savedSeconds,2);
 hero.attacks.cooldown=4;step(.02);assert.equal(hero.attacks.cooldown,2);assert.equal(c.savedSeconds,0);
 grant('Echo Chamber','Perpetual Engine','Quantum Doppelganger','Combination Lock','Unstable Capacitor','Companion Shot','Phantom Engine');
 run.build.random=()=>0;const a=c.cast('kunai',55);c.cast('charged-shuriken',40);const third=c.cast('ninja-slash',440);assert.equal(third.factor,1.6);
 for(let i=0;i<3;i++)hit(enemy(12+i,1),55,'kunai',a);
 assert(hero.attacks.queue.length);step(.25);assert(c.events.counts.get('generatedCast')>=2);
 c.nextDouble=c.now;step(.02);c.phantom(v());const hp=near.health;step(.7);assert(near.health<hp);
 for(let i=0;i<5;i++)c.projectile('kunai',v(),55,a);assert(c.shots.some(s=>s.context.ancestry.includes('Companion Shot')));
 grant('Overclock Chip','Execution Engine','Kinetic Capacitor');hero.attacks.cooldown=2;step(1);assert(hero.attacks.cooldown<2);
 c.travel=41;step(.02);hit(near,1,'kunai');assert.equal(c.kinetic,false);
 near.health=10;hit(near,1,'kunai');assert(!near.alive);
 grant('Phase Buffer');run.build.tick(18);assert(run.build.blocks>0);
 for(let i=0;i<500;i++)c.bolt(v(),{unit:far,point:far.shapes[0].center},30,a,'stress');
 assert.equal(c.shots.length,64);let parent=a;
 for(let i=0;i<5;i++)parent=c.branch(parent,'test '+i);
 assert.equal(c.branch(parent,'too deep'),null);assert.equal(c.branch(c.branch(a,'loop'),'loop'),null);
}
{
 const {hero,c,enemy,grant,hit}=fixture('lux');
 grant('Excess Charge','Closed Loop','Gravity Well','Singularity','Critical Mass');
 hero.energy=99;c.recover(10);assert.equal(hero.energy,100);assert.equal(c.bank,9);
 const cast=c.cast('lance',350);assert.equal(cast.bonus,9);assert.equal(c.bank,0);
 const a=enemy(4),b=enemy(6);hit(a,20,'lance',cast);assert(b.entity.root.position.x<6);
 assert(c.areaScale(10,2)>1.4);
 hero.shoot=(...args)=>{hero.last=args;};const t=enemy(3,1);
 c.damage({unit:t,point:t.shapes[0].center,part:'hull'},50,{kind:'core',passive:true,ancestry:['Volatile Core']});
 assert.equal(hero.last[0],'lance');assert(hero.last[4].free);
}
console.log('Shop effects, relic triggers, stacked blocks, excess resources, timed repeats and proc budgets passed.');
// Use real boss damage routers to check two loadouts per hero, including each hull immunity.
const {SiegeWalker}=await import('../dist/siege-walker.js');
const {Bastion}=await import('../dist/bastion.js');
const {spec,gltfModel}=await import('./walker-fixture.mjs');
const {Scene}=await import('../dist/vendor/three.module.js');
const {readFileSync}=await import('node:fs');
const config=JSON.parse(readFileSync(new URL('../dist/bastion-config.json',import.meta.url)));
for(const [heroId,kind,power,builds] of [
 ['volt','electric',35,[['Live Wire','Arc Relay'],['Power Grid','Targeting Chip']]],
 ['ninja','kunai',55,[['Hidden Arsenal','Phase Ammunition'],['Shatter Crystal','Targeting Chip']]],
 ['lux','lance',350,[['Judgment','Overflow Reactor'],['Second Sun','Critical Mass']]]
]){
 for(const loadout of builds){
  const {hero,c,run,grant}=fixture(heroId);
  if(heroId==='volt')hero.storm={};grant(...loadout,'Execution Engine');
  const scene=new Scene(),walker=new SiegeWalker(scene,gltfModel,spec,{onDebris:({position,quaternion})=>({position,quaternion,velocity:v(),angularVelocity:v()}),onRemoveDebris(){},onEffect(){}});
  const damage=new UnitDamage();run.damage=damage;
  walker.combatUnit=damage.add('siege-walker','robot',walker,walker.weapons.maxHealth);walker.combatUnit.shapes=walker.shapes();
  const strike=(unit,shape,boss)=>{
   const h={unit,point:new Vector3().copy(shape.center),part:shape.part},n=c.before(h,power,kind);
   const dealt=boss?boss.applyHit(h,n,'test'):damage.hurt(unit,n,h.point,h.part);c.after(h,dealt);return dealt;
  };
  assert.equal(strike(walker.combatUnit,{center:v(),part:'head'}),0);
  for(const weapon of walker.weapons.modules){
   const shape=walker.combatUnit.shapes.find(s=>s.part===weapon.part);
   for(let i=0;i<1500&&!weapon.destroyed;i++)strike(walker.combatUnit,shape);
   assert(weapon.destroyed);
  }
  const boss=new Bastion(scene,damage,config),u=boss.combatUnit;
  const armor={center:boss.root.position,part:'body'};assert.equal(strike(u,armor,boss),0);
  const chest=u.shapes.find(s=>s.part==='chest');assert(chest);
  for(let i=0;i<1500&&u.alive;i++)strike(u,chest,boss);
  assert(!u.alive);
 }
}
console.log('Two loadouts for each hero defeated both bosses through their existing weapon and chest damage routes.');

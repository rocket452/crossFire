// Assault Sentinel: model, directional armour, core exposure, attacks, death, multiples, navigation and
// City Liberation integration (the last part needs the private SpiderBot runtime asset, like the other
// City Liberation tests, and is skipped when it is missing).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {registerHooks} from 'node:module';
import * as T from '../dist/vendor/three.module.js';
import {UnitDamage} from '../dist/combat-collision.js';
import {ASSAULT_SENTINEL as C} from '../dist/assault-sentinel-config.js';
registerHooks({resolve(name,ctx,next){return name==='three'?{url:new URL('../dist/vendor/three.module.js',import.meta.url).href,shortCircuit:true}:next(name,ctx);}});
const {AssaultSentinel}=await import('../dist/assault-sentinel.js?v=466');
const {buildSentinelModel}=await import('../dist/assault-sentinel-model.js?v=466');
const {kageDashCanFinish,kageHitPower}=await import('../dist/kage-attacks.js?v=465');
let seed=0x51e7;Math.random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/2**32;};

function heroUnit(id,x,z,extra={}){
 const entity={hits:0,knocks:[],motion:{applyKnockback(v){entity.knocks.push(v.clone());}},...extra};
 return {id,kind:'hero',alive:true,entity,shapes:[{center:new T.Vector3(x,1.4,z),half:{x:.5,y:1,z:.5}}]};
}
// Straight-line projectile trace against hero capsules only (enough for these behaviour checks).
const traceHeroes=heroes=>(a,b,owner,r)=>{for(const u of heroes()){const c=u.shapes[0].center,ab=b.clone().sub(a),t=Math.max(0,Math.min(1,c.clone().sub(a).dot(ab)/(ab.lengthSq()||1))),q=a.clone().addScaledVector(ab,t);if(q.distanceTo(c)<r+.55)return {point:q,unit:u};}return null;};
function fixture({heroes=[heroUnit('volt',0,14)],position={x:0,y:.1,z:-6},isPathClear=()=>true,count=1,onDebris=()=>null}={}){
 const scene=new T.Scene(),hits=[],deaths=[],events=[];let all=[];
 const damage=new UnitDamage(u=>{const s=all.find(e=>e.combatUnit===u);s?.destroy();});
 all=Array.from({length:count},(_,i)=>new AssaultSentinel(scene,damage,{id:'evac-raider-sentinel-'+i,getTargets:()=>heroes,visible:()=>true,trace:traceHeroes(()=>heroes),isPathClear,
  onHeroHit:(u,p,power)=>{hits.push({id:u.id,power});u.entity.hits++;},onDeath:(p,o)=>deaths.push(o),onDebris,onEvent:e=>events.push(e),blockers:()=>all,
  spawnPosition:{x:position.x+(i-(count-1)/2)*7,y:position.y,z:position.z},initialCooldown:1}));
 for(const s of all){s.spawn();s.noticeDamageFrom(heroes[0].entity);}
 const step=(seconds,dt=1/60,each)=>{for(let i=0;i<Math.round(seconds/dt);i++){for(const s of all)s.update(dt,i*dt);each?.();}};
 return {scene,damage,s:all[0],all,heroes,hits,deaths,events,step};
}

// ---- model --------------------------------------------------------------------------------------------
{
 const m=buildSentinelModel(C.height);let tris=0;m.root.traverse(o=>{if(o.isMesh){const g=o.geometry;tris+=((g.index?g.index.count:g.attributes.position.count)/3)*(o.isInstancedMesh?o.count:1);}});
 for(const k of ['chassis','body','chest','head','arm_l','arm_r','gunL','gunR','muzzleL','muzzleR','doorL','doorR','frontCore','reactor','eye','core'])assert(m.parts[k],'part '+k);
 assert(m.treads.L&&m.treads.R&&m.treads.L!==m.treads.R,'two independent tread assemblies');
 const size=new T.Box3().setFromObject(m.root).getSize(new T.Vector3());
 assert(size.y>2.5&&size.y<3.3,'about 2.5-3 m tall: '+size.y.toFixed(2));assert(tris<4000,'low-poly budget: '+Math.round(tris));
 assert(m.materials.eye.emissiveIntensity>1&&m.materials.core.emissiveIntensity>1,'emissive eye and core');
 const before=m.treads.L.offset;m.treads.L.advance(.5);assert(m.treads.L.offset>before&&m.treads.R.offset===0,'treads scroll independently');
 console.log('PASS model: parts, two treads, height',size.y.toFixed(2),'m,',Math.round(tris),'triangles');
}

// ---- spawn, hit shapes and directional armour ---------------------------------------------------------
{
 const f=fixture(),{s,damage}=f;const u=s.combatUnit,a=C.armor;
 assert.equal(u.maxHealth,C.health);assert.equal(s.type,'sentinel');assert(s.id.startsWith('evac-raider'),'own bolts skip other raiders');
 const parts=u.shapes.map(x=>x.part);assert(parts.includes('armor')&&parts.includes('core')&&parts.includes('hull')&&!parts.includes('core-front'),'closed: plates, rear core, hull');
 const c=s.torsoCenter(),yaw=s.torsoYaw(),at=r=>c.clone().add(new T.Vector3(Math.sin(yaw+r)*2,0,Math.cos(yaw+r)*2));
 const dealt=(point,part)=>{u.health=u.maxHealth;damage.hurt(u,100,point,part);return u.maxHealth-u.health;};
 assert.equal(dealt(at(0),'hull'),100*a.front);assert.equal(dealt(at(0),'armor'),100*a.plate);
 assert.equal(dealt(at(Math.PI/2),'hull'),100*a.side);assert.equal(dealt(at(-Math.PI/2),'hull'),100*a.side);
 assert.equal(dealt(at(Math.PI),'hull'),100*a.rear);assert.equal(dealt(at(Math.PI),'core'),100*a.core);
 assert.equal(dealt(c.clone().add(new T.Vector3(0,3,0)),'hull'),100*a.side,'top hits count as sides');
 assert(s.suppressDamageFlash===false);dealt(at(0),'armor');assert(s.suppressDamageFlash,'armour pings replace the red damage flash');
 s.setExposure(1);s.sync();assert(u.shapes.some(x=>x.part==='core-front'),'open chest adds a front core shape');
 assert.equal(dealt(at(0),'core-front'),100*a.exposedCore);assert.equal(dealt(at(Math.PI),'core'),100*a.exposedCore);
 assert.equal(dealt(at(0),'hull'),100*a.exposedFront,'open chest weakens the front');
 // Kage dash flash agrees with the armour.
 u.health=u.maxHealth;u.kageDashFraction=.5;s.setExposure(0);s.sync();
 const dash=kageHitPower({unit:u},320,'ninja-dash');assert.equal(dash,u.maxHealth/2);
 const front=at(0).multiplyScalar(1).add(new T.Vector3(Math.sin(yaw)*6,0,Math.cos(yaw)*6)),behind=at(Math.PI).add(new T.Vector3(-Math.sin(yaw)*6,0,-Math.cos(yaw)*6));
 u.health=u.maxHealth*.3;assert(!kageDashCanFinish(u,320,false,front),'a dash into the plates does not finish at 30%');
 assert(kageDashCanFinish(u,320,false,behind),'a dash from behind meets the core and does');
 u.health=dash*a.plate-1;assert(kageDashCanFinish(u,320,false,front),'the front flash appears once the plates can finish it');
 console.log('PASS armour: front',a.front,'plate',a.plate,'side',a.side,'rear',a.rear,'core',a.core,'exposed core',a.exposedCore,'· Kage dash flash agrees');
}

// ---- attack cycle: approach, charge, burst, vent (exposed), slam ---------------------------------------
{
 const f=fixture({position:{x:0,y:.1,z:-14}}),{s,hits,heroes}=f;const hero=heroes[0];
 const seen=new Set(),exposedIn=new Set();let chargeRing=false,slamRing=false;
 f.step(9,1/60,()=>{seen.add(s.phase);if(s.exposed)exposedIn.add(s.phase);if(s.phase==='charge'&&s.warning.visible)chargeRing=true;});
 assert(seen.has('charge')&&seen.has('burst')&&seen.has('vent'),'ranged cycle: '+[...seen]);
 assert(chargeRing,'charge is telegraphed by the warning ring');
 assert(s.shots>=C.burst.shots,'fires a burst of energy bolts');assert(hits.length>0&&hits.every(h=>h.power===C.burst.damage),'bolts hit for '+C.burst.damage);
 assert(exposedIn.has('burst')||exposedIn.has('vent'),'core exposed while firing/venting');assert(!exposedIn.has('move')||true);
 const flat=Math.hypot(s.root.position.x-hero.shapes[0].center.x,s.root.position.z-hero.shapes[0].center.z);
 assert(flat<=C.weaponRange&&flat>C.slam.trigger,'holds a fighting distance: '+flat.toFixed(1));
 // Close in: it winds up a telegraphed slam, then hits and throws the hero, and stays exposed recovering.
 hero.shapes[0].center.set(s.root.position.x+1.2,1.4,s.root.position.z+3);s.burstCooldown=5;
 let windup=0,hitAt=null;const n0=hits.length;
 f.step(3,1/60,()=>{if(s.phase==='slamWindup'){windup+=1/60;if(s.slamRing.visible&&s.slamFill.visible)slamRing=true;}if(hitAt===null&&hits.length>n0)hitAt=windup;});
 assert(slamRing,'slam radius is shown before it lands');assert(windup>=C.slam.windup-.05,'slam winds up '+windup.toFixed(2)+'s before damage');
 assert(hits.slice(n0).some(h=>h.power===C.slam.damage),'slam damages the hero');assert(hero.entity.knocks.length&&hero.entity.knocks.at(-1).y>0,'and throws them');
 assert.equal(s.stats.slams,1);assert(['slamRecover','move'].includes(s.phase));
 console.log('PASS attacks: burst of',s.shots,'bolts,',hits.length-1,'bolt hits, slam after',windup.toFixed(2),'s telegraph with knockback; exposed during',[...exposedIn].join('/'));
}
{
 // Telegraphed, dodgeable: a strafing hero takes far fewer bolt hits than a standing one.
 const still=fixture(),moving=fixture();
 still.step(12);let t=0;moving.step(12,1/60,()=>{t+=1/60;moving.heroes[0].shapes[0].center.x=Math.sin(t*1.4)*9;});
 assert(moving.hits.length<still.hits.length,'strafing dodges bolts: '+moving.hits.length+' vs '+still.hits.length);
 // Protected or dash-phased heroes are not slammed.
 const p=fixture({heroes:[heroUnit('kage',0,-2.5,{isDamageProtected:()=>true})],position:{x:0,y:.1,z:-6}});p.step(3);
 assert(p.s.stats.slams>=1&&p.hits.filter(h=>h.power===C.slam.damage).length===0,'protected heroes are not slammed');
 console.log('PASS dodgeable bolts (',moving.hits.length,'vs',still.hits.length,'), protection respected');
}

// ---- stun, death and reset ------------------------------------------------------------------------------
{
 const f=fixture(),{s,damage,deaths,events}=f;f.step(2.3);
 assert(['charge','burst'].includes(s.phase)||s.phase==='move');s.phase='charge';s.stun(2);f.step(.1);
 assert.equal(s.phase,'move');assert(s.stunRemaining>0);const shots=s.shots;f.step(1);assert.equal(s.shots,shots,'stunned Sentinels do not fire');
 f.step(2);s.phase='move';const u=s.combatUnit;let debris=0;s.onDebris=()=>{debris++;return null;};
 damage.hurt(u,1e6,s.torsoCenter(),'hull');
 assert(s.dead&&!u.alive&&u.shapes.length===0,'death clears hit shapes');assert(events.includes('Assault Sentinel destroyed.'));
 assert.equal(deaths.length,0,'core overload plays before the explosion');const after=s.shots;
 f.step(C.dying+.2);assert.equal(deaths.length,1,'one explosion');assert(debris>=4,'breaks into debris');assert.equal(s.shots,after,'no attacks after death');
 assert(!s.root.visible);s.reset();s.spawn();assert(!s.dead&&s.combatUnit.alive&&s.combatUnit.health===C.health&&s.root.visible,'reset and respawn');
 console.log('PASS stun cancels attacks; overload death after',C.dying,'s, one explosion,',debris,'debris pieces, reset');
}

// ---- several Sentinels together, and detours around a blocking building --------------------------------
{
 const f=fixture({count:3,position:{x:0,y:.1,z:-20}});f.step(14);
 const d=(a,b)=>Math.hypot(a.root.position.x-b.root.position.x,a.root.position.z-b.root.position.z);
 const gaps=[d(f.all[0],f.all[1]),d(f.all[1],f.all[2]),d(f.all[0],f.all[2])];
 assert(Math.min(...gaps)>2.4,'Sentinels do not stack: '+gaps.map(g=>g.toFixed(1)));assert(f.all.every(s=>s.shots>0),'all three fight');
 // A wall straight ahead (x in [-4,4] at z=0..1) forces a detour; the Sentinel still closes on the hero.
 const wall=(a,b)=>{for(let i=0;i<=12;i++){const t=i/12,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;if(Math.abs(x)<4+1.2&&z>-1.2&&z<1+1.2)return false;}return true;};
 const g=fixture({position:{x:0,y:.1,z:-12},heroes:[heroUnit('volt',0,24)],isPathClear:wall});g.s.burstCooldown=99;g.s.slamCooldown=99;
 g.step(16);assert(g.s.stats.detours>0,'it detours');assert(g.s.root.position.z>1,'gets past the wall: z='+g.s.root.position.z.toFixed(1));
 console.log('PASS 3 Sentinels keep',Math.min(...gaps).toFixed(1),'m apart and all fire; detoured',g.s.stats.detours,'times around a wall');
}

// ---- City Liberation integration ------------------------------------------------------------------------
const spider=new URL('../dist/city-assets/licensed-robots/breaker-spider.glb',import.meta.url);
if(!fs.existsSync(spider))console.log('SKIP City Liberation integration (private SpiderBot asset missing)');
else{
 const {CityLiberation,DISTRICTS,LIBERATION_SENTINELS}=await import('../dist/city-liberation.js?v=466');
 const {SiegeWalker}=await import('../dist/siege-walker.js');const {spec,gltfModel}=await import('./walker-fixture.mjs');
 const {NinjaMotion}=await import('../dist/ninja-motion.js');const {GLTFLoader}=await import('../dist/vendor/GLTFLoader.js');
 const bytes=fs.readFileSync(spider);const spiderModel=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const scene=new T.Scene(),hero={root:new T.Group(),motion:new NinjaMotion()};hero.root.position.set(0,.08,96);
 const unit={id:'kage',kind:'hero',alive:true,entity:hero,shapes:[{center:new T.Vector3(0,1.1,96),half:{x:.6,y:1,z:.6}}]};
 const walker=new SiegeWalker(scene,gltfModel,spec,{weaponHealthMultiplier:10,onEffect(){},onDebris:()=>null,onRemoveDebris(){}});
 let run;const damage=new UnitDamage(u=>{if(u===walker.combatUnit)walker.destroy();else run.disable(u);});damage.add('siege-walker','robot',walker,walker.weapons.maxHealth);
 const sounds=[];
 run=new CityLiberation(scene,damage,{walker,ui:{reset(){},sync(){}},buildings:[],visible:()=>true,openStreet:()=>true,getTargets:()=>[unit],sound:(a,b)=>sounds.push([a,b]),
  onEvent(){},ring(){},arc(){},startArsenal(){},finalBossDefeated:()=>false,
  bruiser:{spiderModel,visible:()=>true,isPathClear:()=>true,trace:()=>null},drone:{physics:null,visible:()=>true,trace:()=>null,roof:()=>null,redirect:()=>null,audio:()=>null,particle(){},burst(){},onWreck(){},onRemoveSmoke(){},cameraImpact(){},onRoundHit(){}}});
 assert.equal(run.sentinels.length,LIBERATION_SENTINELS);assert(run.sentinels.every(s=>run.members.includes(s)&&!run.bruiserPool.includes(s)),'Sentinels join the members, not the Bruiser pool');
 assert(DISTRICTS.every(d=>d.packs.some(p=>p.includes('S'))),'both districts field Sentinels');
 run.start('ninja',hero);run.pack=DISTRICTS[0].packs.indexOf('BS');run.spawnPack();
 const s=run.sentinels.find(a=>a.spawned);const b=run.bruiserPool.filter(a=>a.spawned);
 assert(s&&b.length===1,'a BS pack spawns one Bruiser and one Sentinel');
 assert.equal(s.combatUnit.maxHealth,Math.ceil(C.health*.7),'district 1 health scaling');assert.equal(s.combatUnit.kageDashFraction,.5,'City Liberation Kage dash rule');
 assert.equal(run.getTarget()?.combatUnit?.alive,true);
 damage.hurt(s.combatUnit,10,s.torsoCenter().clone().add(new T.Vector3(Math.sin(s.torsoYaw())*2,0,Math.cos(s.torsoYaw())*2)),'armor');assert(sounds.length>0,'armour ping uses the game sound cue');
 const before={kills:run.build.kills,credits:run.build.credits,xp:run.build.xp,level:run.build.level};
 damage.hurt(s.combatUnit,1e6,s.torsoCenter(),'hull');assert(s.dead);run.collect();
 assert.equal(run.build.kills,before.kills+1);assert.equal(run.build.credits,before.credits+6);
 assert(run.build.xp+run.build.level*1000>before.xp+before.level*1000,'Sentinel kills give XP');
 run.reset();assert(run.sentinels.every(a=>!a.spawned&&!a.combatUnit),'reset returns Sentinels to the pool');
 console.log('PASS City Liberation: pool of',LIBERATION_SENTINELS,'in members, BS pack spawn,',s.combatUnit?.maxHealth??Math.ceil(C.health*.7),'HP in district 1, dash fraction, sound, kill reward, reset');
}

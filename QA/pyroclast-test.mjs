import assert from 'node:assert/strict';
// Deterministic randomness (orbit angle, meteor scatter) so runs are repeatable.
let seed=12345;Math.random=()=>((seed=Math.imul(seed^seed>>>15,2246822507)+1013904223>>>0)/4294967296);
const root=new URL('../dist/',import.meta.url).href;
const T=await import(root+'vendor/three.module.js');
const {UnitDamage}=await import(root+'combat-collision.js');
const {PYROCLAST}=await import(root+'pyroclast-config.js?v=461');
const {Pyroclast}=await import(root+'pyroclast.js?v=476');

function fixture({protectedHero=false,dt=1/60}={}){
 const scene=new T.Scene(),events=[],impacts=[],deaths=[];let pyro;
 const damage=new UnitDamage(u=>{if(u.entity===pyro)pyro.destroy();});
 const hero={hits:0,knock:[],motion:{velocity:{x:0,z:0},applyKnockback(v){hero.knock.push(v.clone());}},
  isDamageProtected:()=>protectedHero,receiveEyeHit(){hero.hits++;return true;},active:true};
 const heroUnit={id:'volt',kind:'hero',alive:true,entity:hero,shapes:[{center:new T.Vector3(0,1.48,10),half:{x:.55,y:1,z:.55}}]};
 pyro=new Pyroclast(scene,damage,{getTargets:()=>[heroUnit],trace:()=>null,visible:()=>true,rainLanding:(x,z)=>new T.Vector3(x,0,z),
  onImpact:(p,r)=>impacts.push(r),onDeath:(p,o)=>deaths.push(o),onEvent:e=>events.push(e)});
 const step=s=>{for(let i=0;i<Math.round(s/dt);i++)pyro.update(dt);};
 return {scene,damage,pyro,hero,heroUnit,events,impacts,deaths,step};
}

// Spawn registers one boss unit with head/torso/leg hit shapes and lights the fire FX.
{
 const f=fixture(),{pyro,damage}=f;
 assert.equal(pyro.spawned,false);assert.equal(pyro.root.visible,false);assert.equal(damage.units.length,0);
 pyro.spawn();
 assert.equal(damage.units.length,1);assert.equal(pyro.combatUnit.health,PYROCLAST.health);
 assert.deepEqual(pyro.combatUnit.shapes.map(s=>s.part),['head','torso','legs']);
 assert(pyro.id.startsWith('evac-raider'),'own projectiles skip the boss');
 assert(pyro.root.visible&&pyro.fx.enabled!==false&&pyro.aura.visible&&pyro.headGlow.visible);
 assert(pyro.model.flames.length>=8,'persistent head/body flames');assert(pyro.model.capes.length>=3,'burning cape panels');
 assert.equal(PYROCLAST.fireballs.speed,60);assert.equal(pyro.modifyDamage(100,null,'head'),150);assert.equal(pyro.modifyDamage(100,null,'torso'),100);
 const head=pyro.combatUnit.shapes[0].center,legs=pyro.combatUnit.shapes[2].center;assert(head.y>legs.y+1.5,'upright hit boxes');
 console.log('PASS spawn: one boss unit, 3 hit shapes, head ×1.5, persistent flames');
}

// A full cycle flies above ground and runs fireballs → tornadoes → meteors at any frame rate.
for(const dt of [1/30,1/60,1/120]){
 const f=fixture({dt}),{pyro,hero,step}=f;pyro.spawn();
 let minClear=Infinity,sawWarn=0,warnBeforeImpact=true,maxTornadoes=0,lifted=false;
 const seen=new Set();
 for(let i=0;i<Math.round(26/dt);i++){
  pyro.update(dt);seen.add(pyro.attack);
  const p=pyro.root.position;minClear=Math.min(minClear,p.y-pyro.ground(p.x,p.z));
  maxTornadoes=Math.max(maxTornadoes,pyro.tornadoes.length);
  const warns=pyro.fx.decals.filter(d=>d.kind==='warn').length;sawWarn=Math.max(sawWarn,warns);
  for(const m of pyro.meteors){if(m.art&&!pyro.fx.decals.includes(m.warn))warnBeforeImpact=false;
   if(m.age<m.telegraph&&m.art)warnBeforeImpact=false;}
  if(hero.knock.some(v=>v.y>=PYROCLAST.tornadoes.lift-.01))lifted=true;
 }
 const s=pyro.stats;
 assert(['fireballs','tornadoes','meteors'].every(a=>seen.has(a)),'all three attacks used: '+[...seen]);
 assert(s.fireballs>=PYROCLAST.fireballs.count&&s.fireballs%PYROCLAST.fireballs.count===0);assert.equal(s.tornadoes,PYROCLAST.tornadoes.count);assert.equal(s.meteors,PYROCLAST.meteors.count+1,'16 meteors plus the finale');
 assert.equal(maxTornadoes,PYROCLAST.tornadoes.count,'moving tornado hazards');
 assert(sawWarn>=3,'several meteor landing rings telegraphed at once');assert(warnBeforeImpact,'each meteor waits for its warning ring');
 assert(minClear>=3,'stays airborne: clearance '+minClear.toFixed(2));
 assert(s.heroHits>0&&hero.hits>0,'attacks hurt the hero');assert(lifted,'tornado throws the hero upward');
 assert(f.impacts.length>=s.fireballs,'fireballs and meteors break the world');
 assert.equal(pyro.meteors.length,0);assert.equal(pyro.fx.decals.filter(d=>d.kind==='warn').length,0,'warning rings removed after impact');
 console.log('PASS cycle @'+Math.round(1/dt)+'fps:',JSON.stringify(s),'min clearance',minClear.toFixed(1));
}

// Tornadoes are telegraphed by warning rings, then rise in a ring around the hero (not at the boss) and close in.
{
 const f=fixture(),{pyro,heroUnit}=f;pyro.spawn();const c=PYROCLAST.tornadoes,hero=heroUnit.shapes[0].center;
 let warned=0;while(pyro.stats.tornadoes===0&&pyro.time<20){pyro.update(1/60);if(pyro.attack==='tornadoes'&&pyro.state.name==='windup')warned=Math.max(warned,pyro.fx.decals.filter(d=>d.kind==='warn').length);}
 assert.equal(warned,c.count,'one warning ring per tornado during the wind-up');
 assert.equal(pyro.fx.decals.filter(d=>d.kind==='warn').length,0,'tornado warnings cleared on spawn');
 const starts=pyro.tornadoes.map(t=>t.position.clone()),dist=starts.map(p=>Math.hypot(p.x-hero.x,p.z-hero.z));
 assert(dist.every(d=>Math.abs(d-c.spawnRadius)<1),'spawn ring radius '+dist.map(d=>d.toFixed(1)));
 const angles=starts.map(p=>Math.atan2(p.z-hero.z,p.x-hero.x)).sort((a,b)=>a-b),gaps=angles.map((a,i)=>((angles[(i+1)%angles.length]-a)+Math.PI*2)%(Math.PI*2));
 assert(gaps.every(g=>Math.abs(g-Math.PI*2/c.count)<.05),'evenly surround the hero');
 assert(pyro.tornadoes.every(t=>t.target===heroUnit));
 assert.equal(pyro.tornadoPool[0].outer.geometry.parameters.height,c.height);assert.equal(c.radius,4.6);assert.equal(c.height,24);
 for(let i=0;i<120;i++)pyro.update(1/60);
 const after=pyro.tornadoes.map(t=>Math.hypot(t.position.x-hero.x,t.position.z-hero.z));
 assert(after.every((d,i)=>d<dist[i]-5),'tornadoes close in on the hero: '+after.map(d=>d.toFixed(1)));
 console.log('PASS tornado warnings, ring spawn around hero at',dist.map(d=>d.toFixed(1)).join(','),'→',after.map(d=>d.toFixed(1)).join(','));
}

// Fireballs home gently and fuse on a near miss, so a hero leaping 20m+ through the air still gets a burst beside them.
{
 const f=fixture(),{pyro,heroUnit}=f;pyro.spawn();const c=PYROCLAST.fireballs,bursts=[];
 const orig=pyro.explodeFireball.bind(pyro);pyro.explodeFireball=(fb,point,hit)=>{bursts.push({life:fb.life,miss:point.distanceTo(heroUnit.shapes[0].center)});return orig(fb,point,hit);};
 const center=heroUnit.shapes[0].center;let t=0;
 for(let i=0;i<Math.round(9/(1/60));i++){t+=1/60;center.set(Math.sin(t*.9)*24,6+Math.abs(Math.sin(t*1.3))*20,20+Math.cos(t*.9)*12);f.hero.motion.velocity={x:Math.cos(t*.9)*21.6,z:-Math.sin(t*.9)*10.8};pyro.update(1/60);}
 assert.equal(bursts.length,c.count,'every fireball burst');
 assert(bursts.every(b=>b.life>0),'no fireball expired in mid-air: '+JSON.stringify(bursts));
 const miss=JSON.stringify(bursts.map(b=>+b.miss.toFixed(1)));assert(bursts.every(b=>b.miss<c.blastRadius*c.fuse),'every burst is a hit or a near miss: '+miss);assert(bursts.some(b=>b.miss<c.blastRadius),'a burst catches the hero in the blast: '+miss);
 console.log('PASS homing/proximity fuse vs leaping hero, miss distances',bursts.map(b=>+b.miss.toFixed(1)).join(','));
}

// Animation rig: alternating-hand volley, readable attack poses, stun slump, flinch and streaming cloth.
{
 const f=fixture(),{pyro}=f;pyro.spawn();const P=pyro.model.parts,hands=[];
 const orig=pyro.launchFireball.bind(pyro);pyro.launchFireball=()=>{hands.push(pyro.nextHand);return orig();};
 const seen={};const watch=()=>{const s=pyro.state.name,a=pyro.attack;
  if(a==='meteors'&&s==='windup'&&pyro.state.t>pyro.state.duration*.95)seen.meteorArms=Math.max(P.shoulderL.rotation.x,P.shoulderR.rotation.x);
  if(a==='tornadoes'&&s==='windup'&&pyro.state.t>pyro.state.duration*.95)seen.tornadoRaise=Math.min(P.shoulderL.rotation.z,-P.shoulderR.rotation.z);
  if(a==='tornadoes'&&s==='attack'&&pyro.state.t>.2)seen.slam=Math.max(seen.slam??-9,P.torso.rotation.x);
  if(a==='fireballs'&&s==='windup')seen.cock=Math.min(seen.cock??0,P.elbowR.rotation.x);};
 for(let i=0;i<20*60;i++){pyro.update(1/60);watch();}
 assert.deepEqual(hands.slice(0,3),['R','L','R'],'fireballs alternate hands');
 assert(seen.cock<-1.5,'throwing elbow cocked back: '+seen.cock);
 assert(seen.tornadoRaise>1.6,'arms sweep up to summon tornadoes: '+seen.tornadoRaise);
 assert(seen.slam>.25,'aerial slam hunches the torso: '+seen.slam);
 assert(seen.meteorArms<-2.2,'both arms raised to call meteors: '+seen.meteorArms);
 const g=fixture(),q=g.pyro;q.spawn();for(let i=0;i<60;i++)q.update(1/60);q.stun(3);for(let i=0;i<60;i++)q.update(1/60);
 assert(q.model.parts.head.rotation.x>.4&&q.model.parts.torso.rotation.x>.3,'stunned boss slumps');
 const h=fixture(),r=h.pyro;r.spawn();for(let i=0;i<90;i++)r.update(1/60);const before=r.model.parts.torso.rotation.x;
 h.damage.hurt(r.combatUnit,600,null,'torso');for(let i=0;i<5;i++)r.update(1/60);
 assert(r.model.parts.torso.rotation.x<before-.08,'damage flinch snaps the torso back');
 const k=fixture(),c=k.pyro;c.spawn();c.velocity.set(0,0,0);c.rig.update(1/60,{t:0,mode:'flying',state:{name:'pause',t:0,duration:1},attack:null,stunned:false,localVel:new T.Vector3(0,0,0),look:{pitch:0,yaw:0},throw:{}});
 for(let i=0;i<120;i++)c.rig.update(1/60,{t:i/60,mode:'flying',state:{name:'pause',t:0,duration:1},attack:null,stunned:false,localVel:new T.Vector3(0,0,13),look:{pitch:0,yaw:0},throw:{}});
 assert(c.rig.flow>.7&&c.model.parts.cape.rotation.x>.4,'cape streams back at speed');
 assert(pyro.model.root.children.length&&pyro.model.trims.length>10&&pyro.model.capes.length===3);
 console.log('PASS rig: hands',hands.slice(0,3).join(''),'poses',JSON.stringify(Object.fromEntries(Object.entries(seen).map(([a,b])=>[a,+b.toFixed(2)]))));
}

// Meteor spectacle: sky rift, target beams, meteors falling out of the rift, a giant finale, debris and crater fires.
{
 const f=fixture(),{pyro,heroUnit}=f;pyro.spawn();const c=PYROCLAST.meteors,FX=pyro.meteorFX,hero=heroUnit.shapes[0].center;
 let riftOpen=0,maxBeams=0,fromRift=true,finale=null,debris=0,fires=0,smoke=0;
 for(let i=0;i<24*60;i++){pyro.update(1/60);
  riftOpen=Math.max(riftOpen,FX.riftState.open);maxBeams=Math.max(maxBeams,FX.beams.filter(b=>b.active).length);
  for(const m of pyro.meteors){if(m.start.y<c.riftHeight-5)fromRift=false;if(m.finale)finale=m;}
  debris=Math.max(debris,FX.debris.filter(d=>d.mesh.visible).length);fires=Math.max(fires,FX.fires.filter(d=>d.mesh.visible).length);smoke=Math.max(smoke,FX.smoke.filter(d=>d.mesh.visible).length);}
 assert(riftOpen>.9,'rift opens over the target area');assert(fromRift,'meteors fall out of the rift');
 assert(maxBeams>=3,'each telegraphed meteor raises a target beam');
 assert(finale&&finale.radius===c.finale.radius&&Math.hypot(finale.landing.x-hero.x,finale.landing.z-hero.z)<.01,'giant finale meteor lands on the hero');
 assert(debris>5&&fires>=3&&smoke>10,'impacts throw debris, leave crater fires and smoke: '+[debris,fires,smoke]);
 assert(FX.riftState.target===0&&FX.beams.every(b=>!b.active),'rift closes and beams clear after the shower');
 // Dying mid-shower closes the rift.
 const g=fixture(),q=g.pyro;q.spawn();while(!(q.attack==='meteors'&&q.state.name==='attack'))q.update(1/60);
 g.damage.hurt(q.combatUnit,1e6,null,'torso');for(let i=0;i<8*60;i++)q.update(1/60);
 assert.equal(q.meteorFX.riftState.target,0,'rift closes when Pyroclast falls');
 console.log('PASS meteor spectacle: rift',riftOpen.toFixed(2),'beams',maxBeams,'debris',debris,'fires',fires,'smoke',smoke);
}

// Damage-protected heroes are not hurt; stun pauses attacks.
{
 const f=fixture({protectedHero:true}),{pyro,hero,step}=f;pyro.spawn();step(24);
 assert.equal(hero.hits,0);assert.equal(pyro.stats.heroHits,0);
 const g=fixture(),q=g.pyro;q.spawn();q.stun(20);g.step(6);assert.equal(q.stats.attacks,0,'stunned boss does not attack');
 console.log('PASS protection and stun');
}

// Killing him through the shared damage system: falls, explodes, reports defeat, and reset clears him.
{
 const f=fixture(),{pyro,damage,step}=f;pyro.spawn();step(3);
 damage.hurt(pyro.combatUnit,PYROCLAST.health*.25,null,'torso');assert.equal(pyro.mode,'flying');assert.equal(pyro.combatUnit.health,PYROCLAST.health*.75);
 damage.hurt(pyro.combatUnit,1e6,null,'head');
 assert.equal(pyro.mode,'dying');assert.equal(pyro.combatUnit.alive,false);assert.equal(pyro.combatUnit.shapes.length,0);
 step(PYROCLAST.deathSeconds+.2);
 assert.equal(pyro.mode,'dead');assert.equal(pyro.root.visible,false);assert.equal(f.deaths.length,1);assert.equal(f.deaths[0].large,true);
 assert(f.events.includes('Pyroclast is falling!')&&f.events.includes('Pyroclast defeated.'));
 pyro.reset();assert.equal(damage.units.length,0);assert.equal(pyro.spawned,false);assert.equal(pyro.fx.decals.length,0);
 pyro.spawn();assert.equal(damage.units.length,1);assert.equal(pyro.combatUnit.health,PYROCLAST.health);
 console.log('PASS death, defeat event and respawn');
}

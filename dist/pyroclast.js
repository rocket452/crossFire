import * as THREE from './vendor/three.module.js';
import {PYROCLAST} from './pyroclast-config.js?v=461';
import {buildPyroclast} from './pyroclast-model.js?v=461';
import {PyroclastFX,FlameTornado,flame,meteorTail,FIRE} from './pyroclast-fx.js?v=461';
import {MeteorShowerFX} from './pyroclast-meteor-fx.js?v=461';
import {glowBillboard} from './lightning-kit.js?v=451';
import {PyroclastRig} from './pyroclast-rig.js?v=459';

const UP=new THREE.Vector3(0,1,0);
const ease=t=>t*t*(3-2*t);

// Flying flame supervillain for Combat Testing. Registers one damage unit with head/torso/leg
// shapes, cycles three attacks and hurts heroes through their existing receiveEyeHit reaction.
const ARENA_BOUNDS=Object.freeze({minX:-105,maxX:105,minZ:-105,maxZ:105});
export class Pyroclast {
 constructor(scene,damage,options={},config=PYROCLAST){
  Object.assign(this,{scene,damage,options,config,id:'evac-raider-pyroclast',type:'pyroclast',evac:true});
  this.model=buildPyroclast(config.height);this.rig=new PyroclastRig(this.model);this.root=this.model.root;this.root.visible=false;scene.add(this.root);
  this.fx=new PyroclastFX(scene);this.fx.setEnabled(false);this.meteorFX=new MeteorShowerFX(this.fx);
  this.tornadoPool=Array.from({length:config.tornadoes.count},()=>new FlameTornado(this.fx.group,config.tornadoes));
  // Fireball art pool: hot core, halo and a burning trail.
  this.fireballArt=Array.from({length:config.fireballs.count+1},()=>{
   const g=new THREE.Group();g.visible=false;this.fx.group.add(g);
   const halo=glowBillboard(FIRE.orange,6),core=glowBillboard(FIRE.hot,8);halo.scale.setScalar(config.fireballs.radius*4.2);core.scale.setScalar(config.fireballs.radius*1.9);
   const flames=[0,1,2,3].map(i=>{const f=flame(config.fireballs.radius*2.2,config.fireballs.radius*2.6,{speed:6});f.position.set((i%2-.5)*.6,-config.fireballs.radius*.9,(i>>1)-.5);g.add(f);return f;});
   g.add(halo,core);return {group:g,halo,core,flames};
  });
  // Charge-up fireball in the hand and a body aura.
  this.charge=this.fireballArt.pop();
  this.aura=glowBillboard('#ff5a14',3);this.aura.material.uniforms.opacity.value=.5;this.fx.group.add(this.aura);
  this.headGlow=glowBillboard('#ffb12c',4);this.fx.group.add(this.headGlow);
  this.meteorArt=Array.from({length:10},()=>{
   const g=new THREE.Group();g.visible=false;this.fx.group.add(g);
   const rock=this.meteorFX.rock(1.9);
   const glow=glowBillboard(FIRE.orange,6);glow.scale.setScalar(9);glow.material.uniforms.opacity.value=.8;const hot=glowBillboard(FIRE.yellow,7);hot.scale.setScalar(4.2);
   const trail=meteorTail(22,2.1);
   g.add(rock,glow,hot,trail);return {group:g,rock,trail};
  });
  this.tmp=new THREE.Vector3();this.reset();
 }
 // ---- lifecycle --------------------------------------------------------
 reset(){
  this.damage.units=this.damage.units.filter(u=>u.entity!==this);this.combatUnit=null;
  this.spawned=false;this.mode='inactive';this.root.visible=false;this.fx.clear();this.fx.setEnabled(false);
  for(const t of this.tornadoPool)t.root.visible=false;for(const a of [...this.fireballArt,this.charge,...this.meteorArt])a.group.visible=false;
  this.aura.visible=this.headGlow.visible=false;this.meteorFX?.clear();
  this.fireballs=[];this.tornadoes=[];this.meteors=[];this.pendingMeteors=[];this.hitClock=new Map();this.tornadoWarns=[];this.tornadoSpots=null;this.tornadoFocus=null;
  this.velocity=new THREE.Vector3();this.goal=new THREE.Vector3();this.time=0;this.retarget=0;this.orbitAngle=Math.random()*Math.PI*2;
  this.state={name:'idle',t:0,duration:0};this.cycleIndex=0;this.goalSpot=null;this.goalClock=0;this.stunRemaining=0;this.deathTime=0;
  this.stats={fireballs:0,tornadoes:0,meteors:0,heroHits:0,explosions:0,attacks:0};this.target=null;
  this.nextHand='R';this.lastThrow=null;this.prevHealth=null;this.flinchClock=0;this.rig?.reset();
 }
 spawn(position=this.config.spawn){
  this.reset();
  this.root.position.set(position.x,position.y,position.z);this.goal.copy(this.root.position);
  this.combatUnit=this.damage.add(this.id,'robot',this,this.config.health);
  this.spawned=true;this.mode='flying';this.root.visible=true;this.fx.setEnabled(true);this.aura.visible=this.headGlow.visible=true;
  this.state={name:'pause',t:0,duration:this.config.openingDelay};this.sync();
 }
 get dead(){return this.mode!=='flying';}
 recordHit(){}
 noticeDamageFrom(){}
 stun(seconds){this.stunRemaining=Math.max(this.stunRemaining,seconds*this.config.stunScale);}
 modifyDamage(power,point,part){return part==='head'?power*1.5:power;}
 aimPoint(){return this.model.parts.torso.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,.4*this.model.scale,0));}
 destroy(){
  if(this.mode!=='flying')return;
  this.mode='dying';this.deathTime=0;this.state={name:'dying',t:0,duration:this.config.deathSeconds};
  if(this.combatUnit){this.combatUnit.alive=false;this.combatUnit.shapes=[];}
  this.charge.group.visible=false;this.clearTornadoWarnings();
  this.options.onEvent?.('Pyroclast is falling!');
 }
 // ---- hit shapes -------------------------------------------------------
 sync(){
  if(!this.combatUnit)return;
  this.root.updateMatrixWorld(true);
  if(!this.combatUnit.alive){this.combatUnit.shapes=[];return;}
  const S=this.model.scale,P=this.model.parts,q=this.root.quaternion.clone(),old=this.combatUnit.shapes;
  const shape=(part,node,offset,half)=>{const center=node.localToWorld(new THREE.Vector3(...offset));return {part,center,half:new THREE.Vector3(...half).multiplyScalar(S),rotation:q.clone(),previousCenter:old.find(s=>s.part===part)?.center||center};};
  this.combatUnit.shapes=[shape('head',P.head,[0,.08,0],[.17,.2,.17]),shape('torso',P.torso,[0,.22,0],[.3,.34,.2]),shape('legs',P.pelvis,[0,-.45,0],[.2,.5,.15])];
 }
 // ---- helpers ----------------------------------------------------------
 targets(){return (this.options.getTargets?.()||[]).filter(u=>u.alive&&u.shapes?.length);}
 heroPosition(u){return u.shapes[0].center;}
 pickTarget(){
  const list=this.targets();if(!list.length)return null;
  const active=list.find(u=>u.entity?.active);if(active)return active;
  return list.reduce((a,b)=>a.shapes[0].center.distanceToSquared(this.root.position)<b.shapes[0].center.distanceToSquared(this.root.position)?a:b);
 }
 ground(x,z){const p=this.options.rainLanding?.(x,z);return p?p.y:0;}
 hurtHeroes(point,radius,power,{knock=10,lift=6,key=null,interval=0}={}){
  let hits=0;
  for(const u of this.targets()){
   const c=this.heroPosition(u);if(c.distanceTo(point)>radius+.6)continue;
   const h=u.entity;if(!h||h.isDamageProtected?.())continue;
   if(key){const id=key+':'+u.id,next=this.hitClock.get(id)||0;if(this.time<next)continue;this.hitClock.set(id,this.time+interval);}
   // options.heroPowerScale turns attack power into hero damage where heroes have hit points (City Liberation).
   if(h.receiveEyeHit?.(point,power*(this.options.heroPowerScale??1))===false)continue;hits++;this.stats.heroHits++;
   const away=c.clone().sub(point).setY(0);if(away.lengthSq()<1e-4)away.set(Math.random()-.5,0,Math.random()-.5);
   away.normalize().multiplyScalar(knock);away.y=lift;(h.motion?.body||h.motion)?.applyKnockback?.(away,{duration:.5,drag:1.6});
  }
  return hits;
 }
 impactWorld(point,radius,hit){this.options.onImpact?.(point,radius,hit||null);}
 // ---- attacks ----------------------------------------------------------
 beginAttack(name){
  const c=this.config[name];this.stats.attacks++;this.attack=name;this.state={name:'windup',t:0,duration:c.windup};
  if(name==='meteors'){this.meteorQueue=[];for(let i=0;i<c.count;i++)this.meteorQueue.push(i*c.spawnSeconds/c.count);this.finaleSpawned=false;
   // A burning rift tears open high above the target area; every meteor falls out of it.
   const focus=this.target||this.pickTarget(),hero=focus?this.heroPosition(focus):this.root.position;
   const center=hero.clone().lerp(this.root.position,.35);center.y=this.ground(hero.x,hero.z)+c.riftHeight;this.meteorFX.openRift(center,c.riftRadius);}
  if(name==='tornadoes'){this.clearTornadoWarnings();this.tornadoSpots=this.planTornadoSpots();this.tornadoWarns=this.tornadoSpots.map(p=>this.fx.decal('warn',p,c.radius,c.windup+.5));}
  this.fired=0;if(name==='fireballs'){this.nextHand='R';this.lastThrow=null;}
 }
 handPosition(key='R'){return this.model.parts['hand'+key].localToWorld(new THREE.Vector3(0,-.11,-.05));}
 launchFireball(){
  const c=this.config.fireballs,t=this.target||this.pickTarget();if(!t)return;
  const hand=this.nextHand||'R',from=this.handPosition(hand),to=this.heroPosition(t).clone();
  const v=t.entity?.motion?.velocity;if(v)to.add(new THREE.Vector3(v.x||0,0,v.z||0).multiplyScalar(c.lead*from.distanceTo(to)/c.speed));
  const art=this.fireballArt.find(a=>!a.group.visible);if(!art)return;
  art.group.visible=true;art.group.position.copy(from);
  this.fireballs.push({art,target:t,position:from.clone(),velocity:to.sub(from).normalize().multiplyScalar(c.speed),life:c.life,closest:Infinity});
  this.stats.fireballs++;this.fx.kit.glow(from,{size:4,life:.25,grow:1,color:FIRE.hot});this.fx.flash(from,.6);
  this.lastThrow={hand,time:this.time};this.nextHand=hand==='R'?'L':'R';this.rig.kick('torso',-2.2,0,0);this.rig.kick('pelvis',-1.2,0,0);
 }
 explodeFireball(f,point,hit){
  const c=this.config.fireballs;this.fx.explosion(point,c.blastRadius*.75,{ground:true,groundY:this.ground(point.x,point.z)});this.stats.explosions++;
  this.hurtHeroes(point,c.blastRadius,c.power,{knock:14,lift:7});this.impactWorld(point,c.blastRadius*.6,hit);
  f.art.group.visible=false;
 }
 // Ring of spots around the hero, nudged off rooftops onto the same street level.
 planTornadoSpots(){
  const c=this.config.tornadoes,focus=this.target||this.pickTarget();
  const center=focus?this.heroPosition(focus).clone():this.root.position.clone(),floor=this.ground(center.x,center.z),base=Math.random()*Math.PI*2,spots=[];
  for(let i=0;i<c.count;i++){
   let pick=null;
   for(const r of [c.spawnRadius,c.spawnRadius*.75,c.spawnRadius*1.3])for(const off of [0,.3,-.3,.6,-.6,.9,-.9]){
    if(pick)break;const a=base+i*Math.PI*2/c.count+off;
    const x=THREE.MathUtils.clamp(center.x+Math.cos(a)*r,-110,110),z=THREE.MathUtils.clamp(center.z+Math.sin(a)*r,-110,110),g=this.ground(x,z);
    if(g<1.5||Math.abs(g-floor)<1.5)pick=new THREE.Vector3(x,g,z);
   }
   if(!pick){const a=base+i*Math.PI*2/c.count,x=center.x+Math.cos(a)*c.spawnRadius,z=center.z+Math.sin(a)*c.spawnRadius;pick=new THREE.Vector3(x,this.ground(x,z),z);}
   spots.push(pick);
  }
  this.tornadoFocus=focus;return spots;
 }
 clearTornadoWarnings(){for(const w of this.tornadoWarns||[])if(this.fx.decals.includes(w))this.fx.removeDecal(w);this.tornadoWarns=[];}
 spawnTornadoes(){
  const c=this.config.tornadoes,spots=this.tornadoSpots?.length?this.tornadoSpots:this.planTornadoSpots(),focus=this.tornadoFocus?.alive?this.tornadoFocus:this.pickTarget();
  this.clearTornadoWarnings();this.tornadoSpots=null;this.rig.kick('torso',4,0,0);this.fx.flash(this.root.position.clone().setY(this.root.position.y+2),.7);
  spots.forEach((start,i)=>{
   const art=this.tornadoPool[i];if(!art)return;
   const goal=focus?this.heroPosition(focus):this.root.position,heading=Math.atan2(goal.x-start.x,goal.z-start.z);
   art.root.visible=true;art.root.position.copy(start);art.root.scale.setScalar(.2);
   this.tornadoes.push({art,position:start.clone(),heading,target:focus,age:0,wander:Math.random()*6});this.stats.tornadoes++;
   this.fx.explosion(start.clone().add(new THREE.Vector3(0,1,0)),c.radius*1.2,{scorch:false,groundY:start.y});
  });
 }
 spawnMeteor(index,finale=false){
  const c=this.config.meteors,F=c.finale,list=this.targets();
  const focus=list.find(u=>u===this.target)||list[index%Math.max(1,list.length)];
  const base=focus?this.heroPosition(focus).clone():this.root.position.clone();
  // The first few land right on heroes, the rest spread around them; the finale lands on the target.
  const spread=finale?0:index<3?2.5:c.spread,a=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*spread;
  const x=THREE.MathUtils.clamp(base.x+Math.cos(a)*r,-110,110),z=THREE.MathUtils.clamp(base.z+Math.sin(a)*r,-110,110);
  const landing=new THREE.Vector3(x,this.ground(x,z),z);
  const radius=finale?F.radius:c.radius,telegraph=finale?F.telegraph:c.telegraph,fall=finale?F.fall:c.fall;
  const scale=finale?F.scale:index<3?1.25:.8+Math.random()*.35;
  const warn=this.fx.decal('warn',landing,radius,telegraph+fall+.1);
  const beam=this.meteorFX.beam(landing,radius);
  const start=this.meteorFX.rift.visible?this.meteorFX.riftPoint(finale?.1:.6):landing.clone().add(new THREE.Vector3(0,c.startHeight,0));
  this.meteors.push({landing,warn,beam,start,age:0,art:null,radius,telegraph,fall,scale,finale,power:finale?F.power:1});this.stats.meteors++;
 }
 // ---- update -----------------------------------------------------------
 update(dt,time=0){
  if(!this.spawned)return;
  this.time+=dt;const c=this.config;
  if(this.mode==='dying')this.updateDeath(dt);
  else if(this.mode==='flying'){
   const stunned=this.stunRemaining>0;this.stunRemaining=Math.max(0,this.stunRemaining-dt);
   this.retarget-=dt;if(this.retarget<=0||!this.target?.alive){this.target=this.pickTarget();this.retarget=c.flight.retargetSeconds;}
   if(!stunned)this.updateBrain(dt);
   this.updateFlight(dt,stunned);
  }
  this.updateFireballs(dt);this.updateTornadoes(dt);this.updateMeteors(dt);
  this.animate(dt);this.sync();
  if(this.fx.flashLevel<.05){this.fx.flashPos.copy(this.root.position);this.fx.flashPos.y+=c.height*.6;}
  this.fx.baseLight=this.mode==='flying'?90:0;
  this.fx.update(dt);
 }
 updateBrain(dt){
  const c=this.config,s=this.state;s.t+=dt;
  if(s.name==='pause'&&s.t>=s.duration){this.beginAttack(c.cycle[this.cycleIndex++%c.cycle.length]);return;}
  if(s.name==='windup'&&this.attack==='tornadoes')for(const w of this.tornadoWarns||[])w.mesh.material.uniforms.progress.value=Math.min(1,s.t/s.duration);
  if(s.name==='windup'&&s.t>=s.duration){this.state={name:'attack',t:0,duration:this.attackDuration()};if(this.attack==='tornadoes')this.spawnTornadoes();return;}
  if(s.name==='attack'){
   if(this.attack==='fireballs'){const f=c.fireballs;while(this.fired<f.count&&s.t>=this.fired*f.interval){this.launchFireball();this.fired++;}}
   if(this.attack==='meteors'){while(this.meteorQueue.length&&s.t>=this.meteorQueue[0]){this.meteorQueue.shift();this.spawnMeteor(this.fired++);}
    if(!this.meteorQueue.length&&!this.finaleSpawned&&s.t>=c.meteors.spawnSeconds){this.finaleSpawned=true;this.spawnMeteor(this.fired++,true);}}
   if(s.t>=s.duration){this.state={name:'recover',t:0,duration:c[this.attack].recover};}
   return;
  }
  if(s.name==='recover'&&s.t>=s.duration){this.attack=null;this.state={name:'pause',t:0,duration:c.pauseSeconds};}
 }
 // Hover over open street with a clear view of the target, near the drifting orbit angle.
 chooseSpot(center){
  const f=this.config.flight,chest=center.clone().add(new THREE.Vector3(0,1.2,0));let best=null,bestScore=-Infinity;
  for(let k=0;k<20;k++)for(const r of [f.orbitMin,(f.orbitMin+f.orbitMax)/2,f.orbitMax]){
   const a=this.orbitAngle+k*Math.PI*2/20,x=THREE.MathUtils.clamp(center.x+Math.cos(a)*r,-105,105),z=THREE.MathUtils.clamp(center.z+Math.sin(a)*r,-105,105);
   const g=this.ground(x,z);if(g>1.5)continue;
   const spot=new THREE.Vector3(x,g+f.minAltitude+2,z);if(this.options.visible&&!this.options.visible(spot,chest))continue;
   const turn=Math.abs(Math.atan2(Math.sin(a-this.orbitAngle),Math.cos(a-this.orbitAngle)));
   const score=-turn*3-spot.distanceTo(this.root.position)*.03;
   if(score>bestScore){bestScore=score;best={x,z,ground:g,angle:a};}
  }
  if(best)this.orbitAngle=best.angle;
  return best;
 }
 attackDuration(){const c=this.config;return this.attack==='fireballs'?c.fireballs.count*c.fireballs.interval+.2:this.attack==='meteors'?c.meteors.spawnSeconds+.2:.5;}
 updateFlight(dt,stunned){
  const f=this.config.flight,p=this.root.position,t=this.target;
  const center=t?this.heroPosition(t):new THREE.Vector3(0,0,60);
  const meteor=this.attack==='meteors'&&this.state.name!=='recover';
  const holding=this.state.name==='windup'||(this.state.name==='attack'&&this.attack==='fireballs');
  if(!holding)this.orbitAngle+=dt*.22;
  const altitude=meteor?f.meteorAltitude:THREE.MathUtils.lerp(f.minAltitude,f.maxAltitude,.5+.5*Math.sin(this.time*.37+1));
  this.goalClock-=dt;if(!holding&&(this.goalClock<=0||!this.goalSpot)){this.goalSpot=this.chooseSpot(center);this.goalClock=1.4;}
  const spot=this.goalSpot||center;this.goal.set(spot.x,(spot.ground??this.ground(center.x,center.z))+altitude,spot.z);
  const b=this.config.bounds||ARENA_BOUNDS;this.goal.x=THREE.MathUtils.clamp(this.goal.x,b.minX,b.maxX);this.goal.z=THREE.MathUtils.clamp(this.goal.z,b.minZ,b.maxZ);
  const want=this.goal.clone().sub(p);const dist=want.length();
  want.setLength(Math.min(f.maxSpeed*(holding?.35:1),dist*1.2));if(stunned)want.set(0,-1.5,0);
  const dv=want.sub(this.velocity),step=f.acceleration*dt;if(dv.length()>step)dv.setLength(step);this.velocity.add(dv);
  p.addScaledVector(this.velocity,dt);
  p.y=Math.max(p.y,this.ground(p.x,p.z)+3);
  // Face the target; lean into motion.
  const look=t?center.clone().sub(p):this.velocity.clone();
  const yaw=Math.atan2(look.x,look.z);let d=yaw-this.root.rotation.y;d=Math.atan2(Math.sin(d),Math.cos(d));this.root.rotation.y+=d*Math.min(1,dt*3);
  const local=this.velocity.clone().applyAxisAngle(UP,-this.root.rotation.y);
  this.root.rotation.x=THREE.MathUtils.lerp(this.root.rotation.x,THREE.MathUtils.clamp(local.z*.035,-.35,.35),Math.min(1,dt*3));
  this.root.rotation.z=THREE.MathUtils.lerp(this.root.rotation.z,THREE.MathUtils.clamp(-local.x*.03,-.3,.3),Math.min(1,dt*3));
 }
 updateFireballs(dt){
  const c=this.config.fireballs;
  for(const f of [...this.fireballs]){
   f.life-=dt;const from=f.position.clone();
   // Gentle homing while still closing on the target, so leaping heroes are not trivially dodged.
   const tc=f.target?.alive&&f.target.shapes?.length?this.heroPosition(f.target):null;
   if(tc){const want=tc.clone().sub(f.position),dist=want.length(),dir=f.velocity.clone().normalize();want.normalize();
    if(dir.dot(want)>0){const angle=Math.min(dir.angleTo(want),c.homing*dt);if(angle>1e-5){const axis=dir.clone().cross(want).normalize();if(axis.lengthSq()>.5)f.velocity.applyAxisAngle(axis,angle);}}
    if(dir.dot(want)<=0)f.passed=true;f.closest=Math.min(f.closest,dist);}
   // A fireball that has overshot its target drops into the street rather than climbing away.
   if(f.passed||!tc)f.velocity.y-=c.dropGravity*dt;
   f.position.addScaledVector(f.velocity,dt);
   let hit=this.options.trace?.(from,f.position,this.id,c.radius*.7)||null,point=hit?.point?new THREE.Vector3().copy(hit.point):null;
   const g=this.ground(f.position.x,f.position.z);if(!point&&f.position.y<=g+.2){point=f.position.clone();point.y=g;}
   if(!point){for(const u of this.targets())if(this.heroPosition(u).distanceTo(f.position)<c.radius+1.2){point=f.position.clone();break;}}
   // Proximity fuse: a near miss bursts as it starts to pull away instead of sailing off.
   if(!point&&tc&&f.closest<c.blastRadius*c.fuse&&tc.distanceTo(f.position)>f.closest+.05)point=f.position.clone();
   if(point||f.life<=0){this.explodeFireball(f,point||f.position,hit);this.fireballs.splice(this.fireballs.indexOf(f),1);continue;}
   f.art.group.position.copy(f.position);
   for(const fl of f.art.flames)fl.material.uniforms.time.value=this.time;
   this.fx.kit.spark(f.position,3,3,.5,{life:.5,size:.14,sizeSpread:.16,gravity:2});
   if(Math.random()<.5)this.fx.puff(f.position.clone().addScaledVector(f.velocity,-.03),c.radius*1.3,.4,1.5);
  }
 }
 updateTornadoes(dt){
  const c=this.config.tornadoes;
  for(const t of [...this.tornadoes]){
   t.age+=dt;const life=t.age/c.life;if(t.age>=c.life){t.art.root.visible=false;this.tornadoes.splice(this.tornadoes.indexOf(t),1);continue;}
   // Steer toward the assigned hero with a lazy wander so they sweep the street.
   const goal=t.target?.alive&&t.target.shapes?.length?this.heroPosition(t.target):this.root.position;
   const want=Math.atan2(goal.x-t.position.x,goal.z-t.position.z)+Math.sin(this.time*.9+t.wander)*.7;
   let d=want-t.heading;d=Math.atan2(Math.sin(d),Math.cos(d));t.heading+=THREE.MathUtils.clamp(d,-c.turn*dt,c.turn*dt);
   t.position.x=THREE.MathUtils.clamp(t.position.x+Math.sin(t.heading)*c.speed*dt,-112,112);
   t.position.z=THREE.MathUtils.clamp(t.position.z+Math.cos(t.heading)*c.speed*dt,-112,112);
   t.position.y=this.ground(t.position.x,t.position.z);
   const intensity=Math.min(1,t.age/.6)*Math.min(1,(c.life-t.age)/.8);
   t.art.root.position.copy(t.position);t.art.root.scale.setScalar(.25+.75*Math.min(1,t.age/.6));t.art.update(dt,this.time,intensity);
   this.fx.kit.spark(t.position.clone().add(new THREE.Vector3((Math.random()-.5)*c.radius*2,.3,(Math.random()-.5)*c.radius*2)),2,2.5,9,{life:.9,size:.12,sizeSpread:.14,gravity:-2});
   // Heroes inside the funnel (and below its top) are caught: hurt and thrown upward.
   for(const u of this.targets()){
    const p=this.heroPosition(u),dx=p.x-t.position.x,dz=p.z-t.position.z;
    if(Math.hypot(dx,dz)<c.radius*1.15&&p.y-t.position.y<c.height)this.hurtHeroes(p,.1,1,{knock:4,lift:c.lift,key:'tornado'+this.tornadoPool.indexOf(t.art),interval:c.hitInterval});
   }
  }
 }
 updateMeteors(dt){
  const c=this.config.meteors;
  for(const m of [...this.meteors]){
   m.age+=dt;const warnT=Math.min(1,m.age/m.telegraph);m.warn.mesh.material.uniforms.progress.value=warnT;this.meteorFX.setBeam(m.beam,warnT);
   if(m.age>=m.telegraph&&!m.art){m.art=this.meteorArt.find(a=>!a.group.visible)||null;
    if(m.art){m.art.group.visible=true;m.art.group.scale.setScalar(m.scale);this.fx.kit.glow(m.start,{size:8*m.scale,life:.35,grow:1,color:FIRE.hot,peak:.8});}}
   if(m.art){
    const f=Math.min(1,(m.age-m.telegraph)/m.fall),pos=m.start.clone().lerp(m.landing,f*f);
    m.art.group.position.copy(pos);m.art.rock.rotation.x+=dt*5;m.art.rock.rotation.y+=dt*3;
    const dir=m.start.clone().sub(m.landing).normalize();
    m.art.trail.quaternion.setFromUnitVectors(UP,dir);m.art.trail.material.uniforms.time.value=this.time;
    // Burning trail: sparks, flame puffs and a dark smoke wake behind the rock.
    this.fx.kit.spark(pos,Math.round(5*m.scale),4,.5*m.scale,{life:.7,size:.25,sizeSpread:.25,gravity:-1});
    if(Math.random()<.24)this.meteorFX.puffSmoke(pos.clone().addScaledVector(dir,2.5*m.scale),2*m.scale,1.4,dir.clone().multiplyScalar(2).add(new THREE.Vector3((Math.random()-.5)*2,1,(Math.random()-.5)*2)),{peak:.6,grow:2.4});
    if(Math.random()<.3)this.fx.puff(pos.clone().addScaledVector(dir,1.4*m.scale),1.5*m.scale,.35,1);
   }
   if(m.age>=m.telegraph+m.fall){
    const g=m.landing.y;
    this.fx.explosion(m.landing,m.radius*1.25,{groundY:g});this.stats.explosions++;
    this.meteorFX.impact(m.landing,m.radius,g);
    if(m.finale){this.fx.explosion(m.landing.clone().add(new THREE.Vector3(0,3,0)),m.radius*1.6,{ground:false});this.fx.decal('shock',m.landing,m.radius*.9,.7);}
    this.hurtHeroes(m.landing.clone().add(new THREE.Vector3(0,1,0)),m.radius,m.power,{knock:m.finale?20:12,lift:m.finale?13:9});
    this.impactWorld(m.landing,m.radius*.8,null);
    if(m.art)m.art.group.visible=false;this.fx.removeDecal(m.warn);this.meteorFX.releaseBeam(m.beam);this.meteors.splice(this.meteors.indexOf(m),1);
   }
  }
  if(this.meteorFX.riftState.target>0&&((!this.meteors.length&&(this.attack!=='meteors'||this.finaleSpawned))||this.mode!=='flying'))this.meteorFX.closeRift();
  this.meteorFX.update(dt);
 }
 updateDeath(dt){
  this.deathTime+=dt;const p=this.root.position;
  this.velocity.y-=14*dt;this.velocity.x*=.98;this.velocity.z*=.98;p.addScaledVector(this.velocity,dt);
  this.root.rotation.z+=dt*2.2;this.root.rotation.x+=dt*1.2;
  if(Math.random()<.6)this.fx.explosion(p.clone().add(new THREE.Vector3((Math.random()-.5)*3,Math.random()*3+1,(Math.random()-.5)*3)),2.2,{ground:false});
  const g=this.ground(p.x,p.z);
  if(this.deathTime>=this.config.deathSeconds||p.y<=g+.3){
   this.fx.explosion(p.clone().setY(g),9);this.options.onDeath?.(p.clone().setY(g+1.5),{large:true});
   this.root.visible=false;this.aura.visible=this.headGlow.visible=false;this.mode='dead';this.fx.baseLight=0;
   for(const t of this.tornadoes)t.art.root.visible=false;this.tornadoes=[];
   this.options.onEvent?.('Pyroclast defeated.');
  }
 }
 // ---- procedural animation and persistent fire -------------------------
 animate(dt){
  const P=this.model.parts,s=this.state,t=this.time,a=this.attack,c=this.config;
  // Flinch when damage lands (throttled so sustained fire reads as a stagger, not a seizure).
  const hp=this.combatUnit?.health;this.flinchClock-=dt;
  if(this.prevHealth!==null&&hp<this.prevHealth&&this.mode==='flying'&&this.flinchClock<=0){this.rig.flinch(.3+Math.min(1.1,(this.prevHealth-hp)/350));this.flinchClock=.18;}
  this.prevHealth=hp??null;
  // Where the hero is, relative to the head, in body space (root already yaws to face them).
  let look={pitch:.25,yaw:0};const tgt=this.target?.alive&&this.target.shapes?.length?this.heroPosition(this.target):null;
  if(tgt){const l=this.root.worldToLocal(tgt.clone());const dy=l.y-c.height*.84,flat=Math.hypot(l.x,l.z)||1;look={pitch:THREE.MathUtils.clamp(Math.atan2(-dy,flat),-.6,.9),yaw:THREE.MathUtils.clamp(Math.atan2(l.x,l.z),-.7,.7)};}
  const localVel=this.velocity.clone().applyAxisAngle(UP,-this.root.rotation.y);
  const fb=c.fireballs,untilNext=s.name==='windup'?s.duration-s.t:s.name==='attack'&&this.fired<fb.count?this.fired*fb.interval-s.t:Infinity;
  const cloth=this.rig.update(dt,{t,mode:this.mode,state:s,attack:a,stunned:this.stunRemaining>0&&this.mode==='flying',localVel,look,
   throw:{last:this.lastThrow,next:this.nextHand,untilNext,remaining:a==='fireballs'?fb.count-this.fired:0}});
  this.model.body.position.y=Math.sin(t*1.7)*c.flight.bob;this.model.body.rotation.z=Math.sin(t*.9)*.025;
  // Fire: crown flares during attacks, veins and rims burn hotter; boot jets push harder when climbing.
  const fury=this.mode==='flying'?(s.name==='windup'||s.name==='attack'?1.25:1):Math.max(0,1-this.deathTime/c.deathSeconds);
  this.model.update(t,{heat:fury*(this.stunRemaining>0?.55:1),flow:cloth.flow,sway:cloth.sway,rim:.8+.4*fury});
  for(const f of this.model.flames){f.material.uniforms.time.value=t;f.material.uniforms.intensity.value=fury;}
  for(const k of ['L','R']){const j=P['jet'+k];j.scale.y=-(.75+.25*Math.sin(t*23+(k==='L'?0:1))+Math.max(0,this.velocity.y)*.05+(a==='tornadoes'&&s.name==='windup'?.4:0));}
  const pulse=.75+.25*Math.sin(t*4);
  // Aura glows and rising embers.
  const chest=this.aimPoint(),head=P.head.getWorldPosition(this.tmp);
  this.aura.position.copy(chest);this.aura.scale.setScalar(c.height*1.25*(.9+.1*pulse));this.aura.material.uniforms.opacity.value=.2*fury;
  this.headGlow.position.copy(head).y+=.8;this.headGlow.scale.setScalar(c.height*.7*(.9+.15*Math.sin(t*9)));this.headGlow.material.uniforms.opacity.value=.42*fury;
  if(this.mode==='flying'){this.fx.kit.spark(head.clone().add(new THREE.Vector3(0,.6,0)),2,1.2,3,{life:.9,size:.09,sizeSpread:.1,gravity:-3,spread:.7});
   this.fx.kit.spark(this.handPosition('L'),1,.6,1,{life:.6,size:.06,gravity:-2});this.fx.kit.spark(this.handPosition('R'),1,.6,1,{life:.6,size:.06,gravity:-2});
   const hem=P.cape.localToWorld(new THREE.Vector3((Math.random()-.5)*.8,-1.5,-.2-cloth.flow*.8));this.fx.kit.spark(hem,1,1.2,2,{life:.8,size:.07,sizeSpread:.08,gravity:-2.5});}
  // Charge fireball grows in the cocked hand between throws.
  const charging=a==='fireballs'&&(s.name==='windup'||(s.name==='attack'&&this.fired<fb.count));
  this.charge.group.visible=charging&&this.mode==='flying';
  if(this.charge.group.visible){
   const grow=s.name==='windup'?ease(Math.min(1,s.t/s.duration)):.35+.55*Math.min(1,(t-(this.lastThrow?.time??t))/fb.interval);
   this.charge.group.position.copy(this.handPosition(this.nextHand));this.charge.group.scale.setScalar(.18+.42*grow);for(const fl of this.charge.flames)fl.material.uniforms.time.value=t;}
  for(const art of this.fireballArt)if(art.group.visible)art.halo.material.uniforms.opacity.value=.9;
 }
 diagnostics(){
  return {spawned:this.spawned,mode:this.mode,state:this.state.name,attack:this.attack||null,health:this.combatUnit?.health??0,maxHealth:this.config.health,
   position:this.root.position.toArray().map(v=>+v.toFixed(2)),fireballs:this.fireballs.length,tornadoes:this.tornadoes.length,meteors:this.meteors.length,stats:{...this.stats}};
 }
}

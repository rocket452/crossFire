import * as THREE from './vendor/three.module.js';
import * as CANNON from './vendor/cannon-es.js';
import {segmentBoxFraction} from './combat-collision.js';
import {COMBAT_DRONE} from './combat-drone-config.js?v=drone-hud-331';
import {DroneFlight} from './combat-drone-flight.js?v=320';
import {DroneGun} from './combat-drone-gun.js?v=320';
import {buildCombatDrone} from './combat-drone-model.js?v=320';

const vector=values=>new CANNON.Vec3(...values);
const half=size=>vector(size.map(value=>value/2));
const exhaust=new THREE.Color('#46e6ff');
const damaged=new THREE.Color('#ff552c');

export class CombatDrone {
 constructor(scene,damage,options,config=COMBAT_DRONE){
  Object.assign(this,{scene,damage,options,config,physics:options.physics,id:options.id,evac:true});
  this.model=buildCombatDrone(config);
  this.root=this.model.root;
  this.parts={body:this.model.armor};
  this.scene.add(this.root);
  const com=vector(config.centerOfMass);
  this.hullOffset=com.negate();
  this.engines=config.engines.map((e,i)=>({...e,...this.model.engines[i],
   offset:vector(e.position).vsub(com), half:half(config.engineSize)}));
  this.gun=new DroneGun(scene,this.model,config.gun,{
   owner:this.id,visible:options.visible,trace:options.trace,redirect:options.redirect,
   blocked:(a,b)=>this.combatUnit?.shapes.some(s=>segmentBoxFraction(a,b,s.center,s.half,s.rotation)!==null),
   onHit:(hit,power)=>options.onRoundHit(hit,power),
   sound:(kind,seconds)=>this.sound(kind,seconds),
   heat:p=>options.particle('smoke',p,2,.45)
  });
  this.fragments=[];
  this.reset();
 }
 get dead(){return this.mode!=='flying';}
 reset(){
  if(this.body){
   this.stopSmoke(this.body);
   this.physics.world.removeEventListener('preStep',this.stepPhysics);
   this.physics.removeWreck(this.body);
   this.body=null;
  }
  for(const piece of this.fragments)this.removeFragment(piece);
  this.fragments.length=0;
  this.damage.units=this.damage.units.filter(u=>u.entity!==this);
  this.combatUnit=null;this.root.visible=false;this.spawned=false;this.mode='inactive';
  this.clock=0;this.wreckAt=Infinity;this.nextContact=0;this.stunRemaining=0;
  this.pendingContact=null;this.powerCut=false;this.contacted=false;this.severe=false;this.peakImpact=0;
  this.contacts=this.breaks=0;
  this.gun.reset();
  for(const e of this.engines){
   e.health=this.config.engineHealth;e.node.visible=true;e.stub.visible=false;e.exhaust.visible=true;e.plume.visible=true;
   e.smokeAt=0;e.flashUntil=0;e.fan.rotation.y=0;e.casing.emissiveIntensity=0;
   e.exhaust.material.emissive.copy(exhaust);
  }
 }
 spawn(position){
  this.reset();
  const c=this.config;
  const body=new CANNON.Body({
   mass:c.mass,linearDamping:c.flight.linearDamping,angularDamping:c.flight.angularDamping,
   allowSleep:false,sleepSpeedLimit:.6,sleepTimeLimit:1
  });
  body.addShape(new CANNON.Box(half(c.hullSize)),this.hullOffset);
  for(const e of this.engines){
   e.shape=new CANNON.Box(e.half);body.addShape(e.shape,e.offset);
  }
  body.position.copy(position);
  body.addEventListener('collide',event=>this.contact(event));
  this.body=this.physics.addDynamicBody(body);
  this.flight=new DroneFlight(body,this.engines,c.flight);
  this.anchor=new THREE.Vector3().copy(position);
  this.goal=this.anchor.clone();this.heading=0;
  this.ingress=this.options.ingress?new THREE.Vector3().copy(this.options.ingress):null;
  this.stepPhysics=()=>this.flight.apply(this.goal,this.heading,this.powerCut?'wreck':this.mode,-this.physics.world.gravity.y);
  this.physics.world.addEventListener('preStep',this.stepPhysics);
  this.spawned=true;this.mode='flying';this.root.visible=true;
  this.damage.add(this.id,'robot',this,c.hullHealth);
  this.sync();
 }
 contact({contact}){
  const speed=Math.abs(contact.getImpactVelocityAlongNormal());
  const offset=contact.bi===this.body?contact.ri:contact.rj;
  if(!this.pendingContact||this.pendingContact.speed<speed){
   this.pendingContact={speed,point:new THREE.Vector3().copy(this.body.position).add(offset)};
  }
 }
 sync(){
  if(!this.body)return;
  this.root.position.copy(this.body.position);
  this.root.quaternion.copy(this.body.quaternion);
  this.root.updateMatrixWorld(true);
  const old=this.combatUnit.shapes;
  this.combatUnit.shapes=this.combatUnit.alive?[
   {part:'hull',offset:this.hullOffset,half:half(this.config.hullSize)},
   ...this.engines.filter(e=>e.health>0).map(e=>({part:e.id,offset:e.offset,half:e.half}))
  ].map(({part,offset,half:extent})=>{
   const center=this.root.localToWorld(new THREE.Vector3().copy(offset));
   return {part,center,half:extent,rotation:this.root.quaternion.clone(),previousCenter:old.find(s=>s.part===part)?.center||center};
  }):[];
 }
 aimPoint(from){
  const engines=this.combatUnit?.shapes.filter(s=>s.part!=='hull')||[];
  const closest=engines.reduce((a,b)=>!a||b.center.distanceToSquared(from)<a.center.distanceToSquared(from)?b:a,null);
  return closest?.center.clone()||this.root.position.clone();
 }
 recordHit(){}
 stun(seconds){this.stunRemaining=Math.max(this.stunRemaining,seconds);this.gun.stop();}
 modifyDamage(power,point,part){
  const engine=this.engines.find(e=>e.id===part);
  if(!engine)return power;
  if(engine.health<=0)return 0;
  engine.health=Math.max(0,engine.health-power);
  engine.flashUntil=this.clock+.12;
  this.options.particle('spark',new THREE.Vector3().copy(point||this.root.position),3,.7);
  if(engine.health===0)this.breakEngine(engine);
  // Engine health is separate from hull health.
  return 0;
 }
 destroy(){
  if(this.mode==='flying'||this.mode==='failing'){
   this.mode='failing';
   this.powerCut=true;
   this.flight.forces.fill(0);
   for(const e of this.engines)e.exhaust.visible=false;
   this.gun.stop();
   if(this.combatUnit){this.combatUnit.alive=false;this.combatUnit.shapes=[];}
  }
 }
 breakEngine(engine){
  this.breaks++;
  this.mode='failing';
  this.gun.stop();
  this.body.removeShape(engine.shape);
  engine.node.updateWorldMatrix(true,false);
  const point=engine.node.getWorldPosition(new THREE.Vector3());
  const rotation=engine.node.getWorldQuaternion(new THREE.Quaternion());
  const chunk=engine.node.clone(true);
  engine.node.visible=false;engine.exhaust.visible=false;engine.stub.visible=true;
  chunk.children[engine.node.children.indexOf(engine.exhaust)].visible=false;
  chunk.children[engine.node.children.indexOf(engine.plume)].visible=false;
  this.fragment(chunk,point,rotation,this.config.engineSize,95);
  this.options.burst(point,.62,true);
  this.options.particle('spark',point,22,1);
  this.options.particle('smoke',point,6,1.1);
  this.sound('engine',.31);
  if(this.breaks===1)this.options.onEvent('Engine offline · combat drone losing lift.');
  this.sync();
 }
 fragment(mesh,position,quaternion,size,mass){
  mesh.visible=true;this.scene.add(mesh);
  const body=this.physics.addWreck({position,quaternion,size,mass});
  // Inherit the velocity of the broken attachment, including fuselage rotation.
  const arm=vector(position.toArray()).vsub(this.body.position);
  this.body.angularVelocity.cross(arm,body.velocity);
  body.velocity.vadd(this.body.velocity,body.velocity);
  if(arm.lengthSquared()>.01){arm.normalize();arm.scale(2.6,arm);body.velocity.vadd(arm,body.velocity);}
  body.angularVelocity.copy(this.body.angularVelocity);
  this.options.onWreck({body,size});
  this.fragments.push({body,mesh,expires:this.clock+this.config.crash.debrisLifetime});
 }
 stopSmoke(body){this.options.onRemoveSmoke(body);}
 removeFragment(piece){
  this.stopSmoke(piece.body);this.physics.removeWreck(piece.body);this.scene.remove(piece.mesh);if(piece.mesh.userData.droneFragment)piece.mesh.geometry.dispose();
 }
 processContact(contact){
  const c=this.config.crash;
  this.contacted=true;
  const {point,speed}=contact;
  this.peakImpact=Math.max(this.peakImpact,speed);
  if(speed>=c.crashSpeed&&(this.mode!=='flying'||speed>=c.explosionSpeed))this.landWreck();
  if(speed<c.scrapeSpeed||this.clock<this.nextContact)return;
  this.contacts++;this.nextContact=this.clock+c.contactCooldown;
  this.options.particle('spark',point,Math.min(28,Math.round(speed*1.8)),Math.min(2,speed*.17));
  this.options.particle('smoke',point,Math.min(12,Math.ceil(speed*.75)),Math.min(2,speed*.16));
  this.sound('crash',Math.min(.55,.13+speed*.024));
  if(speed>=c.explosionSpeed&&!this.severe){
   this.severe=true;this.options.burst(point,Math.min(2.6,speed*.12),false);
   this.options.cameraImpact(point,speed);
   for(let i=0;i<c.fragmentCount;i++){
    const mesh=new THREE.Mesh(new THREE.BoxGeometry(.62,.32,.75),this.model.armor.material);
    const origin=this.root.localToWorld(new THREE.Vector3(i%2?1.6:-1.6,.7,i-1));
    mesh.userData.droneFragment=true;
    this.fragment(mesh,origin,this.root.quaternion,[.62,.32,.75],45);
   }
  }
 }
 landWreck(){
  if(this.mode==='wreck')return;
  this.mode='wreck';this.wreckAt=this.clock;this.gun.stop();this.flight.forces.fill(0);
  this.body.allowSleep=true;
  this.body.linearDamping=.37;this.body.angularDamping=.5;
  this.combatUnit.alive=false;this.combatUnit.shapes=[];
  this.options.onWreck({body:this.body,size:this.config.hullSize});
  this.options.onEvent('Combat drone down.');
 }
 sound(kind,seconds){
  const audio=this.options.audio();
  if(!audio||audio.state!=='running')return;
  const now=audio.currentTime,osc=audio.createOscillator(),gain=audio.createGain();
  osc.type=kind==='spin'?'triangle':'sawtooth';
  osc.frequency.setValueAtTime(kind==='spin'?78:kind==='engine'?360:kind==='shot'?150:98,now);
  osc.frequency.exponentialRampToValueAtTime(kind==='spin'?410:kind==='engine'?74:kind==='shot'?42:31,now+seconds);
  gain.gain.setValueAtTime(.001,now);
  gain.gain.linearRampToValueAtTime(kind==='spin'?.08:kind==='shot'?.041:.14,now+seconds*.18);
  gain.gain.exponentialRampToValueAtTime(.001,now+seconds);
  osc.connect(gain);gain.connect(audio.destination);osc.start(now);osc.stop(now+seconds);
 }
 plan(targets){
  const c=this.config.flight;
  if(this.ingress){
   const offset=this.ingress.clone().sub(this.root.position);
   if(offset.lengthSq()>25){
    this.goal.copy(this.ingress);
    this.heading=Math.atan2(offset.x,offset.z);
    return;
   }
   this.anchor.copy(this.ingress);
   this.ingress=null;
  }
  const near=targets.reduce((best,u)=>{
   const center=u.shapes[0]?.center;
   if(!center)return best;
   return !best||this.root.position.distanceToSquared(center)<this.root.position.distanceToSquared(best)?center:best;
  },null);
  const orbit=this.clock*2*Math.PI/c.patrolPeriod;
  this.goal.copy(this.anchor).add(new THREE.Vector3(Math.sin(orbit)*c.patrolRadius,0,Math.cos(orbit)*c.patrolRadius));
  if(near){
   const offset=new THREE.Vector3(near.x-this.root.position.x,0,near.z-this.root.position.z);
   if(this.gun.phase==='idle'||this.gun.phase==='cooldown')this.heading=Math.atan2(offset.x,offset.z);
   const distance=offset.length();
   this.goal.copy(this.root.position).addScaledVector(offset.normalize(),distance-c.engagementSpacing);
  }
  const bounds=this.options.bounds;
  const clamp=THREE.MathUtils.clamp;
  this.goal.x=clamp(this.goal.x,bounds.minX+5,bounds.maxX-5);
  this.goal.z=clamp(this.goal.z,bounds.minZ+5,bounds.maxZ-5);
  this.goal.y=this.anchor.y;
  const ahead=this.goal.clone().sub(this.root.position).setY(0).clampLength(0,7).add(this.root.position);
  const base=ahead.setY(.1),above=base.clone().setY(c.obstacleScanHeight);
  const roof=this.options.roof(above,base);
  if(roof)this.goal.y=Math.max(this.goal.y,roof.y+4);
 }
 update(dt,targets){
  if(!this.spawned)return;
  this.clock+=dt;this.stunRemaining=Math.max(0,this.stunRemaining-dt);
  if(this.mode==='flying')this.plan(targets);
  this.gun.update(dt,targets,this.mode==='flying'&&this.stunRemaining<=0);
  for(const [index,e]of this.engines.entries()){
   const fraction=e.health/this.config.engineHealth,thrust=this.flight.forces[index];
   e.exhaust.visible=e.plume.visible=thrust>0;
   e.plume.scale.y=(.35+thrust/1900)*(1+(1-fraction)*Math.sin(this.clock*41+index)*.36);
   e.exhaust.material.emissive.copy(exhaust).lerp(damaged,(1-fraction)*.75);
   e.exhaust.material.emissiveIntensity=.8+thrust/1100+
    (1-fraction)*Math.sin(this.clock*37+index)*1.4;
   if(thrust>0)e.fan.rotation.y+=dt*e.spin*(thrust/50+(1-fraction)*Math.sin(this.clock*29+index)*6);
   e.casing.emissive.copy(damaged);
   e.casing.emissiveIntensity=e.flashUntil>this.clock?1.65:0;
   if(fraction>=this.config.crash.smokeAt||this.mode==='wreck'||!this.body||this.clock<e.smokeAt)continue;
   e.smokeAt=this.clock+.18+fraction*.24;
   const point=(e.node.visible?e.node:e.stub).getWorldPosition(new THREE.Vector3());
   this.options.particle('smoke',point,1,.72);
   if(fraction===0||Math.sin(this.clock*10+index)>.45)this.options.particle('spark',point,2,.57);
  }
  for(let i=this.fragments.length-1;i>=0;i--){
   const piece=this.fragments[i];
   if(this.clock>=piece.expires){
    this.removeFragment(piece);this.fragments.splice(i,1);
   }
  }
 }
 syncWrecks(){
  if(this.body){
   const pending=this.pendingContact;this.pendingContact=null;
   if(pending)this.processContact(pending);
   if(this.mode==='failing'&&this.contacted&&this.body.velocity.length()<.72&&this.body.angularVelocity.length()<.7)this.landWreck();
   if(this.clock-this.wreckAt>=this.config.crash.wreckLifetime){
    this.stopSmoke(this.body);this.physics.world.removeEventListener('preStep',this.stepPhysics);
    this.physics.removeWreck(this.body);this.body=null;this.root.visible=false;
   }else this.sync();
  }
  for(const {body,mesh}of this.fragments){mesh.position.copy(body.position);mesh.quaternion.copy(body.quaternion);}
 }
 diagnostics(){
  return {mode:this.mode,bodyHealth:this.combatUnit?.health,position:this.root.position.toArray(),
   velocity:this.body?.velocity.toArray(),angularVelocity:this.body?.angularVelocity.toArray(),
   engines:this.engines.map((e,i)=>({id:e.id,hp:e.health,thrust:this.flight?.forces[i]||0})),
   gun:{phase:this.gun.phase,shots:this.gun.shots,hits:this.gun.hits,redirects:this.gun.redirects,active:this.gun.rounds.length},
   contacts:this.contacts,peakImpact:this.peakImpact,severe:this.severe,fragments:this.fragments.length};
 }
}

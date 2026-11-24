import {Vector3,MathUtils,RingGeometry,MeshBasicMaterial,Mesh,DoubleSide} from './vendor/three.module.js';
import {ManualHeroControls} from './manual-hero-controls.js?v=395';
import {segmentBoxFraction} from './combat-collision.js?v=robot-experiments-108';

const UP=new Vector3(0,1,0);
const ROOF_AIM_MARGIN=1.15,ROOF_EDGE_MARGIN=1.25,ROOF_AIM_HEIGHT=4;
const ROOF_BLINK_RANGE=112,ROOF_BLINK_HEIGHT=90;
const facadeDepth=top=>MathUtils.clamp(top*.18,ROOF_AIM_HEIGHT,12);
export function riftRoofTarget(feet,from,to,{trace,roofBelow,getBuilding,buildings=[],standingBuilding,isClear,onOutOfRange=()=>{}}){
 const hit=trace(from,to,0);
 const direct=hit?.section?.state==='intact'&&getBuilding(hit.section.building);
 if(direct&&direct.id!==standingBuilding){
  const top=direct.floors*3;
  if(hit.point.y>=top-facadeDepth(top)&&hit.point.y<=top+ROOF_AIM_HEIGHT){
   return roofLanding(direct,hit.point,feet,roofBelow,isClear,onOutOfRange);
  }
 }
 // The visible tower face has seams between its individual physics sections.
 // Look for the upper silhouette in front of any solid crossed by the exact ray.
 let nearest=hit?.t??1,building=null,aim=null;
 for(const candidate of buildings){
  if(candidate.id===standingBuilding||candidate===direct)continue;
  const top=candidate.floors*3,depth=facadeDepth(top),width=candidate.footprint??10;
  const center={x:candidate.x,y:top+(ROOF_AIM_HEIGHT-depth)/2,z:candidate.z};
  const half={x:width/2+ROOF_AIM_MARGIN,y:(depth+ROOF_AIM_HEIGHT)/2,z:width/2+ROOF_AIM_MARGIN};
  const t=segmentBoxFraction(from,to,center,half);
  if(t===null||t<=.005||t>=nearest)continue;
  nearest=t;building=candidate;
  aim=from.clone().lerp(to,t);
 }
 return building?roofLanding(building,aim,feet,roofBelow,isClear,onOutOfRange):null;
}
function roofLanding(building,aim,feet,roofBelow,isClear,onOutOfRange){
 const {x,z,floors}=building,top=floors*3,width=building.footprint??10;
 const edge=width/2-ROOF_EDGE_MARGIN;
 const nearX=MathUtils.clamp(aim.x,x-edge,x+edge),nearZ=MathUtils.clamp(aim.z,z-edge,z+edge);
 let outOfRange=false;
 for(const [rx,rz] of [[nearX,nearZ],[x,z],[x-edge,z-edge],[x-edge,z+edge],[x+edge,z-edge],[x+edge,z+edge]]){
  const surface=roofBelow(rx,rz,top+2,top-2.5);
  if(surface?.section?.building!==building.id)continue;
  const landing=new Vector3().copy(surface.point).addScaledVector(UP,.08);
  if(landing.distanceToSquared(feet)<1.8**2||!isClear(landing))continue;
  const horizontal=Math.hypot(landing.x-feet.x,landing.z-feet.z);
  if(horizontal<=ROOF_BLINK_RANGE&&Math.abs(landing.y-feet.y)<=ROOF_BLINK_HEIGHT)return {landing,x,z,width};
  outOfRange=true;
 }
 if(outOfRange)onOutOfRange();
 return null;
}
function roofHighlight(scene,color){
 const rim=new RingGeometry(Math.SQRT1_2-.026,Math.SQRT1_2,4,1,Math.PI/4).rotateX(-Math.PI/2);
 const marker=new Mesh(rim,new MeshBasicMaterial({
  color,opacity:.9,transparent:true,side:DoubleSide,depthTest:false,depthWrite:false,toneMapped:false
 }));
 marker.renderOrder=91;
 marker.name='Blinkable roof';marker.visible=false;scene.add(marker);return marker;
}
const RIFT={moveSpeed:14,jumpSpeed:10,blinkRange:28,returnWindow:4,blinkCooldown:2.5,portalDuration:5,portalCooldown:9,boltCooldown:.4,boltDamage:90};
const ATTACK_PORTAL_CHARGES=3,ATTACK_PORTAL_RECHARGE=5;

export class RiftPlayer extends ManualHeroControls {
 constructor(hero,options,bindings){
  super(hero,options,bindings??{
   hint:'WASD move · Space jump · LMB bolt · RMB blink / return · E place exit / entrance · R attack portal',
   actions:[['Jump','Space'],['Bolt','Fire'],['Blink','Shield'],['Redirect','KeyE'],['Attack Portal','KeyR']],
   codes:['KeyW','KeyS','KeyA','KeyD','Space','KeyF','KeyG','KeyE','KeyR']
  });
  this.taps=new Set();
  this.boomTuning={lift:1.34,overheadClearance:.075};
  this.roofMarker=roofHighlight(hero.scene,bindings?.roofColor??'#beff66');
 }
 press(key){super.press(key);this.taps.add(key);}
 clear(){super.clear();this.taps.clear();this.roofMarker.visible=false;this.hud.removeAttribute('data-roof-target');}
 enter(intro,respawn=true){
  this.clear();
  const hero=this.hero;
  hero.active=true;
  this.hud.hidden=false;this.controls.enabled=false;this.viewport.classList.add('piloting-violet');
  const position=hero.root.position.clone();
  hero.reset();
  if(respawn)hero.root.position.set(this.spawn.x,this.terrain(this.spawn.x,this.spawn.z)+.1,this.spawn.z);
  else hero.root.position.copy(position);
  this.anchor=null;this.redirectExit=null;this.platform=null;this.vertical=0;this.walking=false;this.grounded=true;
  this.attackPortalCharges=ATTACK_PORTAL_CHARGES;this.attackPortalRecharge=0;
  this.blinkCooldown=this.portalCooldown=0;hero.attackCooldown=0;
  this.hurt.reset();hero.root.rotation.y=this.yaw=intro.yaw;this.pitch=.12;this.frame();this.lock();
 }
 exit(){
  if(!this.hero.active)return;
  this.hero.active=false;this.clear();this.hurt.clear();this.hud.hidden=true;
  this.controls.enabled=true;this.viewport.classList.remove('piloting-violet');
  if(document.pointerLockElement===this.canvas)document.exitPointerLock();
  const position=this.hero.root.position.clone();
  this.hero.reset();this.hero.root.position.copy(position);
 }
 clamp(point){
  const b=this.bounds;
  point.x=MathUtils.clamp(point.x,b.minX,b.maxX);
  point.z=MathUtils.clamp(point.z,b.minZ,b.maxZ);
  point.y=MathUtils.clamp(point.y,this.terrain(point.x,point.z)+.1,126);
  return point;
 }
 sweep(from,to){
  const lift=new Vector3(0,1.35,0);
  return this.blocked(from.clone().add(lift),to.clone().add(lift),.95);
 }
 move(dt,allowInput=true){
  const keys=this.keys,position=this.hero.root.position;
  this.carryDeck(position);
  const startX=position.x,startZ=position.z;
  const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+this.stick.value.y;
  const r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+this.stick.value.x;
  const motion=new Vector3();
  if(allowInput)motion.set(Math.sin(this.yaw)*f-Math.cos(this.yaw)*r,0,Math.cos(this.yaw)*f+Math.sin(this.yaw)*r).clampLength(0,1);
  this.walking=false;
  for(const axis of ['x','z']){
   const next=position.clone();next[axis]+=motion[axis]*RIFT.moveSpeed*dt;this.clamp(next);
   if(position.distanceToSquared(next)<1e-9||this.sweep(position,next))continue;
   position.copy(next);this.walking=true;
  }
  if(this.walking)this.moveYaw=Math.atan2(position.x-startX,position.z-startZ);
  if(allowInput&&this.grounded&&this.taps.has('Space')){this.vertical=RIFT.jumpSpeed;this.platform=null;}
  this.vertical-=24*dt;
  const next=this.clamp(position.clone().addScaledVector(UP,this.vertical*dt));
  if(this.vertical<=0&&this.landOnDeck(position,next)){
   this.grounded=true;this.vertical=0;return this.platform.deck.building;
  }
  if(this.vertical<=0){
   const roof=this.roofBelow(next.x,next.z,position.y+.04,next.y-.14);
   if(roof){position.copy(roof.point).addScaledVector(UP,.08);this.vertical=0;this.grounded=true;return roof.section?.building;}
  }
  const hit=this.sweep(position,next);
  this.grounded=this.vertical<=0&&(!!hit||next.y<=this.terrain(next.x,next.z)+.11);
  if(hit||this.grounded)this.vertical=0;
  if(hit){
   const fraction=Math.max(0,hit.t-.02);
   position.lerp(next,fraction);
  }else position.copy(next);
 }
 face(dt,aiming=this.hero.castRemaining>0){
  const hero=this.hero,rotation=hero.root.rotation;
  const target=this.walking&&!aiming?this.moveYaw:this.yaw;
  const delta=target-rotation.y;
  rotation.y+=Math.atan2(Math.sin(delta),Math.cos(delta))*(1-Math.exp(-18*dt));
 }
 blinkTime(){return this.hero.time;}
 canStartBlink(){return this.hero.portals.length<=9;}
 createBlinkAnchor(feet,direction){
  return this.hero.openPortal('travel-entry',feet.clone().addScaledVector(UP,1.35),direction,1.5);
 }
 showBlink(from,to,direction,returning){
  const hero=this.hero;
  if(!returning)hero.openPortal('travel-exit',to.clone().addScaledVector(UP,1.35),direction,1.35);
  hero.addTrace('hero',from,to);
  hero.emit(to.clone().addScaledVector(UP,1.2),18,3);
  hero.teleports++;
 }
 tickBlink(dt){
  this.blinkCooldown=Math.max(0,this.blinkCooldown-dt);
  if(this.anchor&&this.anchor.gate.expiresAt<=this.blinkTime()){
   this.anchor=null;this.blinkCooldown=RIFT.blinkCooldown;
  }
 }
 aimBlink(direction,standingBuilding){
  this.roofOutOfRange=false;
  const eye=this.camera.position.clone().addScaledVector(direction,this.camera.near);
  const roof=!this.anchor&&this.blinkCooldown===0&&this.canStartBlink()?riftRoofTarget(this.hero.root.position,eye,
   eye.clone().addScaledVector(direction,Math.hypot(ROOF_BLINK_RANGE,ROOF_BLINK_HEIGHT)+(this.cameraDistance??7)+12),{
    trace:this.blocked,roofBelow:this.roofBelow,getBuilding:this.getBuilding,buildings:this.buildings,standingBuilding,
    onOutOfRange:()=>{this.roofOutOfRange=true;},
    isClear:p=>!this.blocked(p.clone().addScaledVector(UP,.49),p.clone().addScaledVector(UP,2),.48)
   }):null;
  this.roofMarker.visible=!!roof;
  if(roof){
   this.roofMarker.position.set(roof.x,roof.landing.y+.025,roof.z);
   this.roofMarker.scale.setScalar(roof.width);
  }
  return roof;
 }
 blinkStatus(name='Blink'){
  return this.roofMarker.visible?name+' to rooftop':this.anchor?'Return '+(this.anchor.gate.expiresAt-this.blinkTime()).toFixed(1)+'s':
   this.blinkCooldown?name+' '+this.blinkCooldown.toFixed(1)+'s':this.roofOutOfRange?'Rooftop out of range':name+' ready';
 }
 blink(direction,roof=null){
  const hero=this.hero,from=hero.root.position.clone();
  let to;
  const returning=!!this.anchor;
  if(returning){
   to=this.anchor.feet;
   if(this.sweep(to,to))return;
   this.anchor.gate.expiresAt=this.blinkTime();
   this.anchor=null;this.blinkCooldown=RIFT.blinkCooldown;
  }else{
   if(this.blinkCooldown>0||!this.canStartBlink())return;
   to=roof?.landing||this.clamp(from.clone().addScaledVector(direction,RIFT.blinkRange));
   if(!roof){
    const collision=this.sweep(from,to);
    if(collision)to.lerp(from,1-Math.max(0,collision.t-.03));
   }
   if(from.distanceTo(to)<1.8)return;
   const gate=this.createBlinkAnchor(from,direction);
   gate.expiresAt=this.blinkTime()+RIFT.returnWindow;
   this.anchor={feet:from,gate};
  }
  this.roofMarker.visible=false;this.platform=null;this.vertical=0;this.grounded=!!roof;
  hero.root.position.copy(to);this.showBlink(from,to,direction,returning);
 }
 redirect(direction){
  const hero=this.hero;
  if(this.portalCooldown>0)return;
  const exit=this.redirectExit;
  if(hero.portals.length>=(exit?12:11))return;
  const center=hero.root.position.clone().addScaledVector(UP,1.65);
  const position=center.clone().addScaledVector(direction,4.2);
  position.y=Math.max(position.y,this.terrain(position.x,position.z)+.65);
  if(this.blocked(center,position,1))return;
  if(!exit){
   const clear=position.clone().addScaledVector(direction,1.9);
   if(this.blocked(position,clear,.5))return;
   const placeholder=hero.openPortal('transport-preview',position,direction,2.65);
   if(!placeholder)return;
   placeholder.expiresAt=Infinity;
   this.redirectExit=placeholder;
  }else{
   if(position.distanceTo(exit.position)<exit.radius*2)return;
   const entry=hero.openPortal('transport-entry',position,direction,exit.radius);
   if(!entry)return;
   exit.kind='transport-exit';
   exit.disc.visible=true;
   entry.expiresAt=exit.expiresAt=hero.time+RIFT.portalDuration;
   hero.pair={entry,exit,playerPlaced:true,activeAt:hero.time};
   this.redirectExit=null;
   this.portalCooldown=RIFT.portalCooldown;
  }
  hero.castRemaining=.45;hero.castKind='rescue';
 }

 boltAim(){
  const eye=this.camera.position,ray=this.camera.getWorldDirection(new Vector3());
  const far=eye.clone().addScaledVector(ray,125),hit=this.hero.traceBolt(eye,far);
  return hit?new Vector3().copy(hit.point):far;
 }

 attackPortal(direction){
  const hero=this.hero;
  if(this.attackPortalCharges<=0)return;
  const center=hero.root.position.clone().addScaledVector(UP,1.65);
  // Aim down freely while placing the portal in front of Rift at chest height.
  const placement=direction.y<0?new Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw)):direction;
  const position=center.clone().addScaledVector(placement,3.2);
  position.y=Math.max(position.y,this.terrain(position.x,position.z)+.65);
  if(this.blocked(center,position,.65))return;
  const aim=this.boltAim().sub(position);
  const normal=aim.dot(direction)>.2?aim.normalize():direction;
  if(!hero.openPlayerAttack(position,normal))return;
  if(this.attackPortalCharges===ATTACK_PORTAL_CHARGES)this.attackPortalRecharge=ATTACK_PORTAL_RECHARGE;
  this.attackPortalCharges--;
 }

 update(dt){
  if(!this.available()){this.clear();return;}
  const hero=this.hero;
  this.hurt.step(dt);
  if(this.attackPortalCharges<ATTACK_PORTAL_CHARGES){
   this.attackPortalRecharge-=dt;
   while(this.attackPortalRecharge<=1e-8&&this.attackPortalCharges<ATTACK_PORTAL_CHARGES){
    this.attackPortalCharges++;
    this.attackPortalRecharge+=ATTACK_PORTAL_RECHARGE;
   }
  }
  if(this.redirectExit&&!hero.portals.includes(this.redirectExit))this.redirectExit=null;
  this.tickBlink(dt);this.portalCooldown=Math.max(0,this.portalCooldown-dt);
  const standingBuilding=this.move(dt);
  this.frame();
  const direction=this.camera.getWorldDirection(new Vector3());
  const roof=this.aimBlink(direction,standingBuilding);
  if(this.taps.has('Shield')||this.taps.has('KeyG'))this.blink(direction,roof);
  if(this.taps.has('KeyE'))this.redirect(direction);
  const bolt=(this.keys.has('Fire')||this.keys.has('KeyF')||this.taps.has('Fire')||this.taps.has('KeyF'))&&hero.attackCooldown<=0;
  if(bolt||this.taps.has('KeyR')){
   this.frame();
   if(bolt){
    const from=hero.root.position.clone().addScaledVector(UP,1.55);
    hero.spawnBolt(from,this.boltAim(),RIFT.boltDamage);
    hero.attackCooldown=RIFT.boltCooldown;hero.castRemaining=.22;hero.castKind='attack';
   }
   if(this.taps.has('KeyR'))this.attackPortal(this.direction());
  }
  this.face(dt);
  this.taps.clear();
  this.hud.toggleAttribute('data-roof-target',this.roofMarker.visible);
  const blink=this.blinkStatus();
  const redirect=this.redirectExit?'Place entrance':hero.pair?'Redirect active '+Math.max(0,hero.pair.entry.expiresAt-hero.time).toFixed(1)+'s':
   this.portalCooldown?'Redirect '+this.portalCooldown.toFixed(1)+'s':'Place exit';
  const refill=this.attackPortalCharges<ATTACK_PORTAL_CHARGES?' · +1 in '+this.attackPortalRecharge.toFixed(1)+'s':'';
  const attack='Attack portals '+this.attackPortalCharges+'/'+ATTACK_PORTAL_CHARGES+refill;
  this.output.textContent=blink+' · '+redirect+' · '+attack;
 }
}

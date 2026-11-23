import {HERO_CAMERA} from './hero-camera-config.js?v=centered-camera-274';
import {Vector3,MathUtils} from './vendor/three.module.js';
import {ManualHeroControls} from './manual-hero-controls.js?v=drone-decks-385';
import {SHIELD_FORWARD_OFFSET} from './shield-shake.js?v=arsenal-12';
import {VIOLET_BEAM,VIOLET_OVERLOAD,VIOLET_PULSE} from './hero-powers.js?v=388';
import {VIOLET_TUNING} from './violet-flight.js?v=387';

export class VioletPlayer extends ManualHeroControls {
 constructor(hero,options){
  super(hero,{...options,cameraDistance:6.5,cameraHeight:2.94*HERO_CAMERA.heightMultiplier*1.35},{
   hint:'WASD fly · Space rise · Shift descend · Hold LMB orb · RMB barrier · E pulse · R beam',
   actions:[['Rise','Space'],['Down','ShiftLeft'],['Orb','Fire'],['Barrier','Shield'],['Pulse','KeyE'],['Beam','KeyR']],
   codes:['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight','KeyF','KeyG','KeyE','KeyR']
  });
 }
 clear(){super.clear();this.fireTap=this.beamTap=this.pulseTap=false;if(this.hero.active)this.cancelOrb();}
 cancelOrb(){this.hero.charging=false;this.hero.chargeTime=0;this.hero.chargeOrb.visible=false;}
 press(key){this.keys.add(key);if(key==='Fire'||key==='KeyF')this.fireTap=true;if(key==='KeyR')this.beamTap=true;if(key==='KeyE')this.pulseTap=true;}
 enter(intro,respawn=true){
  this.clear();this.platform=null;
  if(!this.hero.active)this.savedLens={fov:this.camera.fov,near:this.camera.near};
  this.camera.fov=65;this.camera.near=.08;this.camera.updateProjectionMatrix();
  this.hero.active=true;this.hud.hidden=false;this.controls.enabled=false;
  this.viewport.classList.add('piloting-violet');this.hero.threat=this.hero.defenseTarget=null;
  if(respawn){
   this.hero.root.position.set(this.spawn.x,this.spawn.y+4,this.spawn.z);this.hurt.reset();
  }
  this.hero.attackCooldown=0;
  this.hero.velocity.set(0,0,0);this.yaw=intro.yaw;this.pitch=intro.pitch??HERO_CAMERA.defaultPitch;this.frame();this.lock();
 }
 exit(){
  if(!this.hero.active)return;
  this.hero.active=false;
  Object.assign(this.camera,this.savedLens);this.camera.updateProjectionMatrix();
  this.controls.enabled=true;this.hud.hidden=true;this.viewport.classList.remove('piloting-violet');
  if(document.pointerLockElement===this.canvas)document.exitPointerLock();
  this.clear();this.hurt.clear();this.cancelOrb();this.hero.mode='patrol';this.hero.shield.visible=false;this.hero.shieldDeploy=0;
 }
 aim(range=200){
  this.frame();const eye=this.camera.position,dir=this.camera.getWorldDirection(new Vector3()),end=eye.clone().addScaledVector(dir,range);
  const hit=this.hero.traceOrb(eye,end);return hit?new Vector3().copy(hit.point):end;
 }
 move(dt,limited=false){
  const h=this.hero,p=h.root.position,k=this.keys;
  this.carryDeck(p);
  const f=Number(k.has('KeyW'))-Number(k.has('KeyS'))+this.stick.value.y,r=Number(k.has('KeyD'))-Number(k.has('KeyA'))+this.stick.value.x;
  const speed=VIOLET_TUNING.defenseSpeed*(limited?.5:1);
  const desired=new Vector3(Math.sin(this.yaw)*f-Math.cos(this.yaw)*r,Number(k.has('Space'))-Number(k.has('ShiftLeft')||k.has('ShiftRight')),Math.cos(this.yaw)*f+Math.sin(this.yaw)*r).clampLength(0,1).multiplyScalar(speed);
  h.velocity.lerp(desired,1-Math.exp(-5*dt)).clampLength(0,speed);
  for(const axis of ['x','z','y']){
   const next=p.clone();next[axis]+=h.velocity[axis]*dt;
   next.x=MathUtils.clamp(next.x,this.bounds.minX,this.bounds.maxX);next.z=MathUtils.clamp(next.z,this.bounds.minZ,this.bounds.maxZ);
   next.y=MathUtils.clamp(next.y,this.terrain(next.x,next.z)+.2,140);
   if(axis==='y'){
    if(next.y<p.y&&this.landOnDeck(p,next)){h.velocity.y=0;continue;}
    if(next.y>p.y)this.platform=null;
   }
   if(p.distanceToSquared(next)<1e-9)continue;
   const lift=new Vector3(0,1.25,0);
   if(this.blocked(p.clone().add(lift),next.clone().add(lift),1.15))h.velocity[axis]=0;else p.copy(next);
  }
  if(this.platform){
   const beneath=p.clone().add(new Vector3(0,-.05,0));
   this.landOnDeck(p,beneath);
  }
 }
 update(dt,time){
  const h=this.hero,c=h.capacitor;
  if(!this.available()){this.clear();return;}
  h.updateOverloadEffect(dt);this.hurt.step(dt);h.hitGlow=Math.max(0,h.hitGlow-2.3*dt);
  if(c.overloadRemaining>0)c.step(dt);
  if(this.beamTap&&c.start())this.cancelOrb();
  this.beamTap=false;
  const pulse=this.pulseTap;this.pulseTap=false;
  if(c.remaining>0){h.updatePowerBeam(dt,time,null,this.aim(VIOLET_BEAM.range+this.cameraDistance));this.status();return;}
  const shielding=(this.keys.has('Shield')||this.keys.has('KeyG'))&&c.overloadRemaining<=0&&h.shieldEnergy>0;
  h.mode=shielding?'blocking':'patrol';h.root.rotation.set(0,this.yaw,0);
  h.shieldDeploy=MathUtils.damp(h.shieldDeploy,shielding?1:0,12,dt);h.shield.visible=h.shieldDeploy>.015;
  if(h.isShielding()||c.overloadRemaining>0)this.cancelOrb();
  else if(this.fireTap)h.charging=true;
  this.fireTap=false;
  const holdingOrb=this.keys.has('Fire')||this.keys.has('KeyF');
  this.move(dt,shielding||(h.charging&&holdingOrb));
  const center=h.root.position.clone();center.y+=1.5;
  this.frame();
  const direction=this.direction();h.shieldNormal.copy(direction);
  h.shield.position.copy(center).addScaledVector(direction,SHIELD_FORWARD_OFFSET);h.shield.quaternion.setFromUnitVectors(h.zAxis,direction);h.shield.scale.setScalar(h.shieldDeploy);h.shield.updateMatrixWorld(true);
  h.shieldMaterial.uniforms.time.value=time;h.shieldMaterial.uniforms.hit.value=h.hitGlow;h.shieldMaterial.uniforms.risk.value=c.overloadProgress;
  h.contact.visible=h.hitGlow>0&&shielding;
  if(!shielding)h.shieldEnergy=Math.min(3000,h.shieldEnergy+250*dt);
  if(pulse&&c.spend(VIOLET_PULSE.cost)){
   this.onPulse(center);
   h.orbEffects.impact(center,h.zAxis,VIOLET_PULSE.radius);
   h.emit(center,28,5);
  }
  h.flightPose.step(dt,h.velocity,this.yaw,{raised:h.charging||shielding,blocking:shielding});h.flightPose.applyVisual(h.root,h.visual,time);h.pose(time);h.flightPose.applyCharacter(h.character,h.nodes,dt,-this.pitch);this.hurt.applyPose();h.root.updateMatrixWorld(true);
  h.chargeOrb.visible=h.charging;
  if(h.charging){
   if(holdingOrb)h.chargeTime=Math.min(VIOLET_TUNING.normalCharge,h.chargeTime+dt);
   const charge=h.chargeTime/VIOLET_TUNING.normalCharge;
   const origin=h.poseOrbCharge(time,charge);
   if(!holdingOrb){
    h.attackCooldown=0;
    h.launch(origin,this.aim(),null,charge);
    this.cancelOrb();
   }
  }
  h.advanceOrbs(dt,time,true);h.renderParticles(dt);h.aura.position.copy(center);h.light.position.copy(center);this.status();
 }
 status(){
  const h=this.hero,c=h.capacitor;
  const orb=h.charging?'Orb '+Math.round(h.chargeTime/VIOLET_TUNING.normalCharge*100)+'%':'Orb ready';
  const stored=c.amount+c.overloadDamage;
  const charge=Math.floor(stored/(VIOLET_BEAM.required+VIOLET_OVERLOAD.extraDamage)*100);
  const barrier=c.overloadRemaining>0?'SHIELD OVERLOAD':c.remaining>0?'Force beam '+c.phase:'Shield '+charge+'%'+(c.ready?' · Beam ready':'');
  this.output.textContent=orb+' · '+barrier+(stored>=VIOLET_PULSE.cost?' · Pulse ready':'');
 }
}

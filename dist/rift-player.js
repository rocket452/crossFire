import {Vector3,MathUtils} from './vendor/three.module.js';
import {ManualHeroControls} from './manual-hero-controls.js?v=380';

const UP=new Vector3(0,1,0);
const RIFT={moveSpeed:14,jumpSpeed:10,blinkRange:28,returnWindow:4,blinkCooldown:2.5,portalDuration:5,portalCooldown:9,boltCooldown:.4,boltDamage:90};

export class RiftPlayer extends ManualHeroControls {
 constructor(hero,options){
  super(hero,options,{
   name:'rift',hint:'WASD move · Space jump · LMB bolt · RMB blink / return · E redirect',
   actions:[['Jump','Space'],['Bolt','Fire'],['Blink','Shield'],['Redirect','KeyE']],
   codes:['KeyW','KeyS','KeyA','KeyD','Space','KeyF','KeyG','KeyE']
  });
  this.taps=new Set();
 }
 press(key){super.press(key);this.taps.add(key);}
 clear(){super.clear();this.taps.clear();}
 enter(intro,respawn=true){
  this.clear();
  const hero=this.hero;
  hero.active=true;
  this.hud.hidden=false;this.controls.enabled=false;this.viewport.classList.add('piloting-violet');
  const position=hero.root.position.clone();
  hero.reset();
  if(respawn)hero.root.position.set(this.spawn.x,this.terrain(this.spawn.x,this.spawn.z)+.1,this.spawn.z);
  else hero.root.position.copy(position);
  this.anchor=null;this.vertical=0;this.walking=false;this.grounded=true;
  this.blinkCooldown=this.portalCooldown=0;hero.attackCooldown=0;
  this.hurt.reset();this.yaw=intro.yaw;this.pitch=.12;this.frame();this.lock();
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
 move(dt){
  const keys=this.keys,position=this.hero.root.position;
  const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+this.stick.value.y;
  const r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+this.stick.value.x;
  const motion=new Vector3(Math.sin(this.yaw)*f-Math.cos(this.yaw)*r,0,Math.cos(this.yaw)*f+Math.sin(this.yaw)*r).clampLength(0,1);
  this.walking=false;
  for(const axis of ['x','z']){
   const next=position.clone();next[axis]+=motion[axis]*RIFT.moveSpeed*dt;this.clamp(next);
   if(position.distanceToSquared(next)<1e-9||this.sweep(position,next))continue;
   position.copy(next);this.walking=true;
  }
  if(this.grounded&&this.taps.has('Space'))this.vertical=RIFT.jumpSpeed;
  this.vertical-=24*dt;
  const next=this.clamp(position.clone().addScaledVector(UP,this.vertical*dt));
  const hit=this.sweep(position,next);
  this.grounded=this.vertical<=0&&(!!hit||next.y<=this.terrain(next.x,next.z)+.11);
  if(hit||this.grounded)this.vertical=0;
  if(hit){
   const fraction=Math.max(0,hit.t-.02);
   position.lerp(next,fraction);
  }else position.copy(next);
 }
 blink(direction){
  const hero=this.hero,from=hero.root.position.clone();
  let to;
  if(this.anchor){
   to=this.anchor.feet;
   if(this.sweep(to,to))return;
   this.anchor.gate.expiresAt=hero.time;
   this.anchor=null;this.blinkCooldown=RIFT.blinkCooldown;
  }else{
   if(this.blinkCooldown>0||hero.portals.length>9)return;
   to=this.clamp(from.clone().addScaledVector(direction,RIFT.blinkRange));
   const collision=this.sweep(from,to);
   if(collision)to.lerp(from,1-Math.max(0,collision.t-.03));
   if(from.distanceTo(to)<1.8)return;
   const gate=hero.openPortal('travel-entry',from.clone().addScaledVector(UP,1.35),direction,1.5);
   gate.expiresAt=hero.time+RIFT.returnWindow;
   this.anchor={feet:from,gate};
   hero.openPortal('travel-exit',to.clone().addScaledVector(UP,1.35),direction,1.35);
  }
  this.vertical=0;this.grounded=false;
  hero.root.position.copy(to);hero.addTrace('hero',from,to);hero.emit(to.clone().addScaledVector(UP,1.2),18,3);hero.teleports++;
 }
 redirect(direction){
  const hero=this.hero;
  if(this.portalCooldown>0||hero.portals.length>9)return;
  const center=hero.root.position.clone().addScaledVector(UP,1.65);
  const entry=center.clone().addScaledVector(direction,4.2);
  if(this.blocked(center,entry,1))return;
  const side=new Vector3(direction.z,0,-direction.x).normalize();
  const exit=this.anchor?this.anchor.gate.position.clone():center.clone().addScaledVector(side,7);
  const exitNormal=this.anchor?direction:side;
  if(this.blocked(exit,exit.clone().addScaledVector(UP,1.7).addScaledVector(exitNormal,1.2),.5))return;
  const a=hero.openPortal('transport-entry',entry,direction,2.65);
  const b=hero.openPortal('transport-exit',exit,exitNormal,2.65);
  a.expiresAt=b.expiresAt=hero.time+RIFT.portalDuration;
  hero.pair={entry:a,exit:b};this.portalCooldown=RIFT.portalCooldown;
  hero.castRemaining=.45;hero.castKind='rescue';
 }
 update(dt){
  if(!this.available()){this.clear();return;}
  const hero=this.hero;
  this.hurt.step(dt);
  this.blinkCooldown=Math.max(0,this.blinkCooldown-dt);this.portalCooldown=Math.max(0,this.portalCooldown-dt);
  if(this.anchor&&this.anchor.gate.expiresAt<=hero.time){this.anchor=null;this.blinkCooldown=RIFT.blinkCooldown;}
  this.move(dt);
  const direction=this.direction();
  if(this.taps.has('Shield')||this.taps.has('KeyG'))this.blink(direction);
  if(this.taps.has('KeyE'))this.redirect(direction);
  if((this.keys.has('Fire')||this.keys.has('KeyF')||this.taps.has('Fire')||this.taps.has('KeyF'))&&hero.attackCooldown<=0){
   this.frame();
   const eye=this.camera.position,ray=this.camera.getWorldDirection(new Vector3()),far=eye.clone().addScaledVector(ray,125);
   const hit=hero.traceBolt(eye,far),target=hit?new Vector3().copy(hit.point):far;
   const from=hero.root.position.clone().addScaledVector(UP,1.55);
   hero.spawnBolt(from,target,RIFT.boltDamage);
   hero.attackCooldown=RIFT.boltCooldown;hero.castRemaining=.22;hero.castKind='attack';
  }
  this.taps.clear();
  const blink=this.anchor?'Return '+(this.anchor.gate.expiresAt-hero.time).toFixed(1)+'s':this.blinkCooldown?'Blink '+this.blinkCooldown.toFixed(1)+'s':'Blink ready';
  this.output.textContent=blink+' · '+(this.portalCooldown?'Redirect '+this.portalCooldown.toFixed(1)+'s':'Redirect ready');
 }
}

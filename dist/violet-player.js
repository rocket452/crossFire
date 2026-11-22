import {Vector3,MathUtils} from './vendor/three.module.js';
import {TouchStick} from './touch-stick.js';
import {HeroHurt} from './hero-hurt.js';
import {SHIELD_FORWARD_OFFSET} from './shield-shake.js?v=arsenal-12';
import {VIOLET_BEAM} from './hero-powers.js?v=violet-overload-141';
import {VIOLET_TUNING} from './violet-flight.js?v=violet-inertia-11';

export class VioletPlayer {
 constructor(hero,{camera,canvas,controls,viewport,inputMode,spawn,bounds,blocked,terrain,paused}){
  Object.assign(this,{hero,camera,canvas,controls,viewport,inputMode,spawn,bounds,blocked,terrain,paused});
  this.keys=new Set();
  this.hud=document.createElement('div');
  this.hud.className='violet-player';this.hud.hidden=true;
  this.hud.innerHTML='<i aria-hidden="true"></i><output></output><div class="violet-keys">WASD fly · Space rise · Shift descend · LMB orb · RMB barrier · R beam</div><div class="violet-stick"><b></b></div><div class="violet-buttons"></div>';
  this.hud.addEventListener('contextmenu',event=>event.preventDefault());
  viewport.append(this.hud);
  const stick=this.hud.querySelector('.violet-stick');
  this.stick=new TouchStick(stick,stick.firstChild,{enabled:()=>this.available()});
  const buttons=this.hud.querySelector('.violet-buttons');
  for(const [label,key] of [['Rise','Space'],['Down','ShiftLeft'],['Orb','Fire'],['Barrier','Shield'],['Beam','KeyR']]){
   const button=document.createElement('button');button.textContent=label;buttons.append(button);
   button.onpointerdown=e=>{if(!this.available())return;e.preventDefault();button.setPointerCapture(e.pointerId);this.press(key);};
   button.onlostpointercapture=()=>this.keys.delete(key);
  }
  const fullscreen=document.createElement('button');
  fullscreen.className='violet-fullscreen';
  fullscreen.type='button';fullscreen.textContent='⛶';
  fullscreen.setAttribute('aria-label','Toggle fullscreen');
  fullscreen.onclick=()=>document.getElementById('fullscreen').click();
  this.hud.append(fullscreen);
  this.output=this.hud.querySelector('output');
  this.hurt=new HeroHurt(hero.character,hero.visual);
  this.bind();
 }
 available(){return this.hero.active&&!this.paused()&&!document.querySelector('dialog[open]');}
 clear(){this.keys.clear();this.fireTap=this.beamTap=false;this.drag=null;this.stick.reset();}
 press(key){this.keys.add(key);if(key==='Fire'||key==='KeyF')this.fireTap=true;if(key==='KeyR')this.beamTap=true;}
 lock(){if(this.inputMode.desktop&&!document.pointerLockElement)this.canvas.requestPointerLock?.()?.catch?.(()=>{});}
 bind(){
  const codes=['KeyW','KeyS','KeyA','KeyD','Space','ShiftLeft','ShiftRight','KeyF','KeyG','KeyR'];
  window.addEventListener('keydown',e=>{if(!this.available()||!codes.includes(e.code))return;e.preventDefault();if(!e.repeat)this.press(e.code);});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  this.canvas.addEventListener('contextmenu',e=>{if(this.hero.active)e.preventDefault();});
  this.canvas.addEventListener('pointerdown',e=>{
   if(!this.available())return;
   if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;
   e.preventDefault();this.drag=e.pointerId;this.lastX=e.clientX;this.lastY=e.clientY;this.canvas.setPointerCapture(e.pointerId);
   if(e.pointerType==='mouse'){this.lock();this.press(e.button===2?'Shield':'Fire');}
  });
  window.addEventListener('pointerup',e=>{if(e.pointerType==='mouse')this.keys.delete(e.button===2?'Shield':'Fire');if(this.drag===e.pointerId)this.drag=null;});
  this.canvas.addEventListener('pointercancel',()=>this.clear());
  document.addEventListener('pointerlockchange',()=>{if(this.hero.active&&!document.pointerLockElement)this.clear();});
  document.addEventListener('pointermove',e=>{
   if(!this.available()||(document.pointerLockElement!==this.canvas&&this.drag!==e.pointerId))return;
   const dx=e.pointerType==='touch'?e.clientX-this.lastX:e.movementX,dy=e.pointerType==='touch'?e.clientY-this.lastY:e.movementY;
   this.lastX=e.clientX;this.lastY=e.clientY;this.yaw-=dx*.003;this.pitch=MathUtils.clamp(this.pitch-dy*.003,-1.35,1.35);
  });
  window.addEventListener('blur',()=>this.clear());
 }
 enter(intro,respawn=true){
  this.clear();this.hero.active=true;this.hud.hidden=false;this.controls.enabled=false;
  this.viewport.classList.add('piloting-violet');this.hero.threat=this.hero.defenseTarget=null;
  if(respawn){
   this.hero.root.position.set(this.spawn.x,this.spawn.y+4,this.spawn.z);this.hero.attackCooldown=0;this.hurt.reset();
  }
  this.hero.velocity.set(0,0,0);this.yaw=intro.yaw;this.pitch=.12;this.frame();this.lock();
 }
 exit(){
  if(!this.hero.active)return;
  this.hero.active=false;this.controls.enabled=true;this.hud.hidden=true;this.viewport.classList.remove('piloting-violet');
  if(document.pointerLockElement===this.canvas)document.exitPointerLock();
  this.clear();this.hurt.clear();this.hero.charging=false;this.hero.chargeTime=0;this.hero.mode='patrol';this.hero.shield.visible=false;this.hero.shieldDeploy=0;
 }
 direction(){return new Vector3(Math.sin(this.yaw)*Math.cos(this.pitch),Math.sin(this.pitch),Math.cos(this.yaw)*Math.cos(this.pitch));}
 frame(){
  const focus=this.hero.root.position.clone();focus.y+=2;
  const dir=this.direction(),eye=focus.clone().addScaledVector(dir,-7);
  eye.y+=1.5;
  const hit=this.blocked(focus,eye,.18);
  if(hit)eye.lerpVectors(focus,hit.point,.88);
  eye.y=Math.max(eye.y,this.terrain(eye.x,eye.z)+.4);
  this.camera.position.copy(eye);this.camera.lookAt(focus.addScaledVector(dir,28));
 }
 aim(){
  this.frame();const eye=this.camera.position,dir=this.camera.getWorldDirection(new Vector3()),end=eye.clone().addScaledVector(dir,200);
  const hit=this.hero.traceOrb(eye,end);return hit?new Vector3().copy(hit.point):end;
 }
 move(dt){
  const h=this.hero,p=h.root.position,k=this.keys;
  const f=Number(k.has('KeyW'))-Number(k.has('KeyS'))+this.stick.value.y,r=Number(k.has('KeyD'))-Number(k.has('KeyA'))+this.stick.value.x;
  const desired=new Vector3(Math.sin(this.yaw)*f-Math.cos(this.yaw)*r,Number(k.has('Space'))-Number(k.has('ShiftLeft')||k.has('ShiftRight')),Math.cos(this.yaw)*f+Math.sin(this.yaw)*r).clampLength(0,1).multiplyScalar(VIOLET_TUNING.defenseSpeed);
  h.velocity.lerp(desired,1-Math.exp(-5*dt));
  for(const axis of ['x','z','y']){
   const next=p.clone();next[axis]+=h.velocity[axis]*dt;
   next.x=MathUtils.clamp(next.x,this.bounds.minX,this.bounds.maxX);next.z=MathUtils.clamp(next.z,this.bounds.minZ,this.bounds.maxZ);
   next.y=MathUtils.clamp(next.y,this.terrain(next.x,next.z)+.2,140);
   if(p.distanceToSquared(next)<1e-9)continue;
   const lift=new Vector3(0,1.25,0);
   if(this.blocked(p.clone().add(lift),next.clone().add(lift),1.15))h.velocity[axis]=0;else p.copy(next);
  }
 }
 update(dt,time){
  const h=this.hero,c=h.capacitor;
  if(!this.available()){this.clear();return;}
  h.updateOverloadEffect(dt);this.hurt.step(dt);h.hitGlow=Math.max(0,h.hitGlow-2.3*dt);
  if(c.overloadRemaining>0)c.step(dt);
  if(this.beamTap&&c.start()){h.charging=false;h.chargeTime=0;}
  this.beamTap=false;
  if(c.remaining>0){h.updatePowerBeam(dt,time,null,this.aim());this.status();return;}
  this.move(dt);
  const shielding=(this.keys.has('Shield')||this.keys.has('KeyG'))&&c.overloadRemaining<=0&&h.shieldEnergy>0;
  h.mode=shielding?'blocking':'patrol';h.root.rotation.set(0,this.yaw,0);
  h.shieldDeploy=MathUtils.damp(h.shieldDeploy,shielding?1:0,12,dt);h.shield.visible=h.shieldDeploy>.015;
  const center=h.root.position.clone();center.y+=1.5;
  const direction=this.direction();h.shieldNormal.copy(direction);
  h.shield.position.copy(center).addScaledVector(direction,SHIELD_FORWARD_OFFSET);h.shield.quaternion.setFromUnitVectors(h.zAxis,direction);h.shield.scale.setScalar(h.shieldDeploy);h.shield.updateMatrixWorld(true);
  h.shieldMaterial.uniforms.time.value=time;h.shieldMaterial.uniforms.hit.value=h.hitGlow;h.shieldMaterial.uniforms.risk.value=c.overloadProgress;
  h.contact.visible=h.hitGlow>0&&shielding;
  if(!shielding)h.shieldEnergy=Math.min(3000,h.shieldEnergy+250*dt);
  h.attackCooldown=Math.max(0,h.attackCooldown-dt);
  if(h.isShielding()||c.overloadRemaining>0){h.charging=false;h.chargeTime=0;}
  else if(h.attackCooldown===0&&(this.fireTap||this.keys.has('Fire')||this.keys.has('KeyF')))h.charging=true;
  this.fireTap=false;
  h.flightPose.step(dt,h.velocity,this.yaw,{raised:h.charging||shielding,blocking:shielding});h.flightPose.applyVisual(h.root,h.visual);h.pose(time);h.flightPose.applyCharacter(h.character,h.nodes,dt,-this.pitch);this.hurt.applyPose();h.root.updateMatrixWorld(true);
  h.chargeOrb.visible=h.charging;
  if(h.charging){
   h.chargeTime+=dt;
   const origin=h.poseOrbCharge(time,h.chargeTime/VIOLET_TUNING.normalCharge);
   if(h.chargeTime>=VIOLET_TUNING.normalCharge){h.launch(origin,this.aim());h.chargeOrb.visible=false;h.charging=false;h.chargeTime=0;h.attackCooldown=VIOLET_TUNING.normalCooldown;}
  }
  h.advanceOrbs(dt,time,true);h.renderParticles(dt);h.aura.position.copy(center);h.light.position.copy(center);this.status();
 }
 status(){
  const h=this.hero,c=h.capacitor;
  const orb=h.charging?'Charging orb':h.attackCooldown>0?'Orb '+h.attackCooldown.toFixed(1)+'s':'Orb ready';
  this.output.textContent=orb+' · '+(c.overloadRemaining>0?'Overloaded':c.remaining>0?'Force beam '+c.phase:c.ready?'Force beam ready':'Beam '+Math.round(c.amount/VIOLET_BEAM.required*100)+'%');
 }
}

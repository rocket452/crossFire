import {carryPlatform,landOnPlatform,platformAttachment} from './moving-platform.js?v=385';
import {pitchHeroBoom,heroViewDirection} from './hero-camera.js?v=392';
import {Vector3,MathUtils} from './vendor/three.module.js';
import {TouchStick} from './touch-stick.js';
import {HeroHurt} from './hero-hurt.js';

export class ManualHeroControls {
 constructor(hero,options,{hint,actions,codes}){
  this.hero=hero;
  Object.assign(this,options);
  this.keys=new Set();
  this.hud=document.createElement('div');
  this.hud.className='violet-player';this.hud.hidden=true;
  this.hud.innerHTML='<i aria-hidden="true"></i><output></output><div class="violet-keys"></div><div class="violet-stick"><b></b></div><div class="violet-buttons"></div>';
  this.hud.querySelector('.violet-keys').textContent=hint;
  this.hud.addEventListener('contextmenu',event=>event.preventDefault());
  this.viewport.append(this.hud);
  const stick=this.hud.querySelector('.violet-stick');
  this.stick=new TouchStick(stick,stick.firstChild,{enabled:()=>this.available()});
  const buttons=this.hud.querySelector('.violet-buttons');
  for(const [label,key] of actions){
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
  this.hurt=new HeroHurt(hero.character,hero.visual||hero.root);
  this.bind(codes);
 }
 available(){return this.hero.active&&!this.paused()&&!document.querySelector('dialog[open]');}
 clear(){this.keys.clear();this.drag=null;this.stick.reset();}
 press(key){this.keys.add(key);}
 lock(){if(this.inputMode.desktop&&!document.pointerLockElement)this.canvas.requestPointerLock?.()?.catch?.(()=>{});}
 bind(codes){
  window.addEventListener('keydown',e=>{if(!this.available()||!codes.includes(e.code))return;e.preventDefault();if(!e.repeat)this.press(e.code);});
  window.addEventListener('keyup',e=>this.keys.delete(e.code));
  this.canvas.addEventListener('contextmenu',e=>{if(this.hero.active)e.preventDefault();});
  this.canvas.addEventListener('pointerdown',e=>{
   if(!this.available())return;
   if(e.pointerType==='mouse'&&e.button!==0&&e.button!==2)return;
   this.drag=e.pointerId;this.lastX=e.clientX;this.lastY=e.clientY;
   if(e.pointerType==='mouse')this.lock();
   else{e.preventDefault();this.canvas.setPointerCapture(e.pointerId);}
  });
  this.canvas.addEventListener('mousedown',e=>{
   if(this.available()&&(e.button===0||e.button===2))this.press(e.button===2?'Shield':'Fire');
  });
  window.addEventListener('mouseup',e=>{
   if(e.button===0||e.button===2)this.keys.delete(e.button===2?'Shield':'Fire');
  });
  window.addEventListener('pointerup',e=>{if(this.drag===e.pointerId)this.drag=null;});
  this.canvas.addEventListener('pointercancel',()=>this.clear());
  document.addEventListener('pointerlockchange',()=>{if(this.hero.active&&!document.pointerLockElement)this.clear();});
  document.addEventListener('pointermove',e=>{
   if(!this.available()||(document.pointerLockElement!==this.canvas&&this.drag!==e.pointerId))return;
   const dx=e.pointerType==='touch'?e.clientX-this.lastX:e.movementX,dy=e.pointerType==='touch'?e.clientY-this.lastY:e.movementY;
   this.lastX=e.clientX;this.lastY=e.clientY;this.yaw-=dx*.003;this.pitch=MathUtils.clamp(this.pitch-dy*.003,-1.35,1.35);
  });
  window.addEventListener('blur',()=>this.clear());
 }
 carryDeck(position){
  if(!carryPlatform(this.platform,position))this.platform=null;
 }
 landOnDeck(position,next){
  const hit=landOnPlatform(position,next,this.getPlatforms());
  this.platform=hit?platformAttachment(hit.section,hit.point):null;
  if(!hit)return false;
  position.copy(hit.point);
  return true;
 }
 cameraFocus(){return this.hero.root.position.clone().add(new Vector3(0,1.65,0));}
 direction(){return heroViewDirection(this.camera,this.cameraFocus(),this.yaw,this.pitch);}
 frame(){
  const focus=this.cameraFocus();
  const forward=new Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw));
  const eye=focus.clone().addScaledVector(forward,-(this.cameraDistance??7));
  eye.y+=(this.cameraHeight??3.15)-1.65;
  pitchHeroBoom(eye,focus,forward,this.pitch,this.boomTuning);
  const hit=this.blocked(focus,eye,.18);
  if(hit)eye.lerpVectors(focus,hit.point,.88);
  eye.y=Math.max(eye.y,this.terrain(eye.x,eye.z)+.4);
  this.camera.position.copy(eye);this.camera.lookAt(eye.clone().addScaledVector(this.direction(),28));
 }
}

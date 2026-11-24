import {MathUtils,Spherical,Vector3} from './vendor/three.module.js';

// Cut on shot boundaries. Within each shot the camera eases behind its subject.
export class DefenseTitle {
 constructor({startRound,rebuild,enter,leave,actors,obstruction,openingDelay=0}){
  Object.assign(this,{startRound,rebuild,enter,leave,actors,obstruction,openingDelay});
  this.dialog=document.createElement('dialog');
  this.dialog.className='defense-title';
  this.dialog.setAttribute('aria-labelledby','defense-title-heading');
  this.dialog.innerHTML=`<header><h1 id="defense-title-heading">Zero Hour Heroes</h1><p>Wave Defense</p></header>
   <div class="defense-title-actions">
    <p class="defense-title-orbit-hint">Drag to rotate</p>
    <button type="button" data-title-start>Press Enter to Start</button>
    <button type="button" data-title-resume hidden>Resume cinematic</button>
   </div>`;
  document.body.append(this.dialog);
  this.dialog.oncancel=e=>{e.preventDefault();this.leave();};
  const startButton=this.dialog.querySelector('[data-title-start]');
  startButton.onclick=()=>this.start();
  this.resumeButton=this.dialog.querySelector('[data-title-resume]');
  this.resumeButton.onclick=()=>{
   this.orbit=null;this.shot=-1;this.resumeButton.hidden=true;
   startButton.focus();
  };
  this.dialog.onpointerdown=e=>{
   if(!this.active||!this.camera||!e.isPrimary||e.button!==0||e.target.closest('button'))return;
   this.drag={id:e.pointerId,x:e.clientX,y:e.clientY};
   this.dialog.setPointerCapture(e.pointerId);
  };
  this.dialog.onpointermove=e=>this.dragCamera(e);
  this.dialog.onlostpointercapture=e=>{
   if(this.drag?.id===e.pointerId)this.drag=null;
  };
  this.dialog.onkeydown=e=>{
   if(e.key==='Escape'){e.preventDefault();if(!e.repeat)this.leave();}
   if(e.key==='Enter'&&e.target!==this.resumeButton){e.preventDefault();if(!e.repeat)this.start();}
  };
  this.look=new Vector3();
 }
 dragCamera(e){
  if(this.drag?.id!==e.pointerId)return;
  const dx=e.clientX-this.drag.x,dy=e.clientY-this.drag.y;
  this.drag.x=e.clientX;this.drag.y=e.clientY;
  if(!dx&&!dy)return;
  if(!this.orbit){
   const offset=this.camera.position.clone().sub(this.look);
   const anchor=this.look.clone().sub(this.actors().walker.root.position);
   this.orbit={anchor,angle:new Spherical().setFromVector3(offset)};
   this.resumeButton.hidden=false;
  }
  const {angle}=this.orbit;
  angle.theta-=dx*.006;
  angle.phi=MathUtils.clamp(angle.phi-dy*.006,.14,Math.PI*.52);
 }

 open(){
  this.active=true;
  document.body.classList.add('show-defense-title');
  this.dialog.showModal();
  this.round();
 }
 round(){
  this.time=0;this.afterDeath=0;this.shot=-1;
  this.startRound();
 }
 update(dt){
  this.time+=dt;
  if(this.actors().walker.dead){
   this.afterDeath+=dt;
   if(this.afterDeath>=15){this.rebuild();this.round();}
  }
 }
 frame(camera,dt){
  this.camera=camera;
  const {walker,heroes}=this.actors(),boss=walker.root.position.clone();
  if(this.orbit){
   const {anchor,angle}=this.orbit;
   this.look.copy(boss).add(anchor);
   const eye=new Vector3().setFromSpherical(angle).add(this.look);
   eye.y=Math.max(eye.y,1);
   const hit=this.obstruction(this.look,eye);
   if(hit&&hit.t>.025)eye.lerpVectors(this.look,hit.point,.94);
   camera.position.copy(eye);camera.lookAt(this.look);
   return;
  }
  boss.y+=walker.dead?4:11;
  const shot=walker.dead?6:Math.floor(Math.max(0,this.time-this.openingDelay)/5.5)%6;
  const target=boss.clone(),eye=new Vector3();
  if(shot%2===0){
   const angle=.45+this.time*.055;
   const opening=shot===0;
   const radius=opening?47/Math.min(1,Math.max(.6,camera.aspect+.25)):47;
   eye.copy(boss).add(new Vector3(Math.sin(angle)*radius,opening?40:32,Math.cos(angle)*radius));
   if(opening){
    const violet=heroes[1].root.position.clone().add(new Vector3(0,1.4,0));
    target.lerp(violet,.32);
   }
  }else{
   const p=heroes[(shot-1)/2].root.position.clone();p.y+=1.65;
   const away=p.clone().sub(boss);away.y=0;away.normalize();
   const followsViolet=shot===3;
   eye.copy(p).addScaledVector(away,followsViolet?9:6)
    .add(new Vector3(away.z*2,followsViolet?4.6:2.2,-away.x*2));
   target.copy(p).lerp(boss,followsViolet?.12:.38);
   const hit=this.obstruction(p,eye);
   if(hit)eye.lerpVectors(p,hit.point,.85);
  }
  const blend=this.shot===shot?1-Math.exp(-5*dt):1;
  camera.position.lerp(eye,blend);this.look.lerp(target,blend);
  camera.lookAt(this.look);this.shot=shot;
 }
 start(){
  if(!this.active)return;
  this.active=false;this.drag=null;this.orbit=null;this.dialog.close();this.dialog.remove();
  document.body.classList.remove('show-defense-title');
  this.rebuild();this.enter();
 }
}

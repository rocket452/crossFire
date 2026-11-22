import {Vector3} from './vendor/three.module.js';

// Cut on shot boundaries. Within each shot the camera eases behind its subject.
export class DefenseTitle {
 constructor({startRound,rebuild,enter,actors,obstruction,openingDelay=0}){
  Object.assign(this,{startRound,rebuild,enter,actors,obstruction,openingDelay});
  this.dialog=document.createElement('dialog');
  this.dialog.className='defense-title';
  this.dialog.setAttribute('aria-labelledby','defense-title-heading');
  this.dialog.innerHTML='<header><span>Zero Hour Heroes</span><h1 id="defense-title-heading">Wave <em>Defense</em></h1></header><button type="button">Press Enter to Start</button>';
  document.body.append(this.dialog);
  this.dialog.oncancel=e=>e.preventDefault();
  this.dialog.querySelector('button').onclick=()=>this.start();
  this.dialog.onkeydown=e=>{
   if(e.key==='Enter'){e.preventDefault();if(!e.repeat)this.start();}
  };
  this.look=new Vector3();
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
  const {walker,heroes}=this.actors(),boss=walker.root.position.clone();
  boss.y+=walker.dead?4:11;
  const shot=walker.dead?6:Math.floor(Math.max(0,this.time-this.openingDelay)/5.5)%6;
  const target=boss.clone(),eye=new Vector3();
  if(shot%2===0){
   const angle=.45+this.time*.055;
   eye.copy(boss).add(new Vector3(Math.sin(angle)*47,32,Math.cos(angle)*47));
  }else{
   const p=heroes[(shot-1)/2].root.position.clone();p.y+=1.65;
   const away=p.clone().sub(boss);away.y=0;away.normalize();
   eye.copy(p).addScaledVector(away,6).add(new Vector3(away.z*2,2.2,-away.x*2));
   target.copy(p).lerp(boss,.38);
   const hit=this.obstruction(p,eye);
   if(hit)eye.lerpVectors(p,hit.point,.85);
  }
  const blend=this.shot===shot?1-Math.exp(-5*dt):1;
  camera.position.lerp(eye,blend);this.look.lerp(target,blend);
  camera.lookAt(this.look);this.shot=shot;
 }
 start(){
  if(!this.active)return;
  this.active=false;this.dialog.close();this.dialog.remove();
  document.body.classList.remove('show-defense-title');
  this.rebuild();this.enter();
 }
}

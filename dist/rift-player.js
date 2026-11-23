import {Vector3,MathUtils,RingGeometry,MeshBasicMaterial,Mesh,DoubleSide} from './vendor/three.module.js';
import {ManualHeroControls} from './manual-hero-controls.js?v=392';

const UP=new Vector3(0,1,0);
const ROOF_AIM_MARGIN=1.15,ROOF_EDGE_MARGIN=1.25,ROOF_AIM_HEIGHT=4,ROOF_BLINK_HEIGHT=90;
export function riftRoofTarget(feet,from,to,{trace,roofBelow,getBuilding,isClear},range){
 const hit=trace(from,to,0)||trace(from,to,ROOF_AIM_MARGIN);
 const building=hit?.section?.state==='intact'&&getBuilding(hit.section.building);
 if(!building)return null;
 const {x,z,floors}=building,top=floors*3,width=building.footprint??10;
 if(hit.point.y<top-ROOF_AIM_HEIGHT||hit.point.y>top+ROOF_AIM_HEIGHT)return null;
 const edge=width/2-ROOF_EDGE_MARGIN;
 const nearX=MathUtils.clamp(hit.point.x,x-edge,x+edge);
 const nearZ=MathUtils.clamp(hit.point.z,z-edge,z+edge);
 for(const [rx,rz] of [[nearX,nearZ],[x,z]]){
  const surface=roofBelow(rx,rz,top+2,top-2.5);
  if(surface?.section?.building!==building.id)continue;
  const landing=new Vector3().copy(surface.point).addScaledVector(UP,.08);
  const horizontal=Math.hypot(landing.x-feet.x,landing.z-feet.z);
  if(horizontal<=range&&Math.abs(landing.y-feet.y)<=ROOF_BLINK_HEIGHT&&isClear(landing))return {landing,x,z,width};
 }
 return null;
}
function roofHighlight(scene){
 const rim=new RingGeometry(Math.SQRT1_2-.026,Math.SQRT1_2,4,1,Math.PI/4).rotateX(-Math.PI/2);
 const marker=new Mesh(rim,new MeshBasicMaterial({
  color:'#beff66',opacity:.9,transparent:true,side:DoubleSide,depthTest:false,depthWrite:false,toneMapped:false
 }));
 marker.renderOrder=91;
 marker.name='Rift Warden blinkable roof';marker.visible=false;scene.add(marker);return marker;
}
const RIFT={moveSpeed:14,jumpSpeed:10,blinkRange:28,returnWindow:4,blinkCooldown:2.5,portalDuration:5,portalCooldown:9,boltCooldown:.4,boltDamage:90};

export class RiftPlayer extends ManualHeroControls {
 constructor(hero,options){
  super(hero,options,{
   hint:'WASD move · Space jump · LMB bolt · RMB blink / return · E place entrance / exit',
   actions:[['Jump','Space'],['Bolt','Fire'],['Blink','Shield'],['Redirect','KeyE']],
   codes:['KeyW','KeyS','KeyA','KeyD','Space','KeyF','KeyG','KeyE']
  });
  this.taps=new Set();
  this.boomTuning={lift:1.34,overheadClearance:.075};
  this.roofMarker=roofHighlight(hero.scene);
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
  this.anchor=null;this.redirectEntry=null;this.platform=null;this.vertical=0;this.walking=false;this.grounded=true;
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
  this.carryDeck(position);
  const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+this.stick.value.y;
  const r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+this.stick.value.x;
  const motion=new Vector3(Math.sin(this.yaw)*f-Math.cos(this.yaw)*r,0,Math.cos(this.yaw)*f+Math.sin(this.yaw)*r).clampLength(0,1);
  this.walking=false;
  for(const axis of ['x','z']){
   const next=position.clone();next[axis]+=motion[axis]*RIFT.moveSpeed*dt;this.clamp(next);
   if(position.distanceToSquared(next)<1e-9||this.sweep(position,next))continue;
   position.copy(next);this.walking=true;
  }
  if(this.grounded&&this.taps.has('Space')){this.vertical=RIFT.jumpSpeed;this.platform=null;}
  this.vertical-=24*dt;
  const next=this.clamp(position.clone().addScaledVector(UP,this.vertical*dt));
  if(this.vertical<=0&&this.landOnDeck(position,next)){
   this.grounded=true;this.vertical=0;return;
  }
  if(this.vertical<=0){
   const roof=this.roofBelow(next.x,next.z,position.y+.04,next.y-.14);
   if(roof){position.copy(roof.point).addScaledVector(UP,.08);this.vertical=0;this.grounded=true;return;}
  }
  const hit=this.sweep(position,next);
  this.grounded=this.vertical<=0&&(!!hit||next.y<=this.terrain(next.x,next.z)+.11);
  if(hit||this.grounded)this.vertical=0;
  if(hit){
   const fraction=Math.max(0,hit.t-.02);
   position.lerp(next,fraction);
  }else position.copy(next);
 }
 blink(direction,roof=null){
  const hero=this.hero,from=hero.root.position.clone();
  let to;
  if(this.anchor){
   to=this.anchor.feet;
   if(this.sweep(to,to))return;
   this.anchor.gate.expiresAt=hero.time;
   this.anchor=null;this.blinkCooldown=RIFT.blinkCooldown;
  }else{
   if(this.blinkCooldown>0||hero.portals.length>9)return;
   to=roof?.landing||this.clamp(from.clone().addScaledVector(direction,RIFT.blinkRange));
   if(!roof){
    const collision=this.sweep(from,to);
    if(collision)to.lerp(from,1-Math.max(0,collision.t-.03));
   }
   if(from.distanceTo(to)<1.8)return;
   const gate=hero.openPortal('travel-entry',from.clone().addScaledVector(UP,1.35),direction,1.5);
   gate.expiresAt=hero.time+RIFT.returnWindow;
   this.anchor={feet:from,gate};
   hero.openPortal('travel-exit',to.clone().addScaledVector(UP,1.35),direction,1.35);
  }
  this.roofMarker.visible=false;this.platform=null;this.vertical=0;this.grounded=!!roof;
  hero.root.position.copy(to);hero.addTrace('hero',from,to);hero.emit(to.clone().addScaledVector(UP,1.2),18,3);hero.teleports++;
 }
 redirect(direction){
  const hero=this.hero;
  if(this.portalCooldown>0)return;
  const entry=this.redirectEntry;
  if(hero.portals.length>=(entry?12:11))return;
  const center=hero.root.position.clone().addScaledVector(UP,1.65);
  const position=center.clone().addScaledVector(direction,4.2);
  position.y=Math.max(position.y,this.terrain(position.x,position.z)+.65);
  if(this.blocked(center,position,1))return;
  if(!entry){
   const placeholder=hero.openPortal('transport-preview',position,direction,2.65);
   if(!placeholder)return;
   placeholder.expiresAt=Infinity;
   this.redirectEntry=placeholder;
  }else{
   const clear=position.clone().addScaledVector(direction,1.9);
   if(position.distanceTo(entry.position)<entry.radius*2||this.blocked(position,clear,.5))return;
   const exit=hero.openPortal('transport-exit',position,direction,entry.radius);
   if(!exit)return;
   entry.kind='transport-entry';
   entry.disc.visible=true;
   entry.expiresAt=exit.expiresAt=hero.time+RIFT.portalDuration;
   hero.pair={entry,exit,playerPlaced:true,activeAt:hero.time};
   this.redirectEntry=null;
   this.portalCooldown=RIFT.portalCooldown;
  }
  hero.castRemaining=.45;hero.castKind='rescue';
 }

 update(dt){
  if(!this.available()){this.clear();return;}
  const hero=this.hero;
  this.hurt.step(dt);
  if(this.redirectEntry&&!hero.portals.includes(this.redirectEntry))this.redirectEntry=null;
  this.blinkCooldown=Math.max(0,this.blinkCooldown-dt);this.portalCooldown=Math.max(0,this.portalCooldown-dt);
  if(this.anchor&&this.anchor.gate.expiresAt<=hero.time){this.anchor=null;this.blinkCooldown=RIFT.blinkCooldown;}
  this.move(dt);
  this.frame();
  const direction=this.direction(),eye=this.camera.position;
  const roof=!this.anchor&&this.blinkCooldown===0&&hero.portals.length<=9?riftRoofTarget(hero.root.position,eye,
   eye.clone().addScaledVector(direction,Math.hypot(RIFT.blinkRange,ROOF_BLINK_HEIGHT)+(this.cameraDistance??7)+3),{
    trace:this.blocked,roofBelow:this.roofBelow,getBuilding:this.getBuilding,isClear:p=>{
     const feet=p.clone().addScaledVector(UP,.49),head=p.clone().addScaledVector(UP,2);
     return !this.blocked(feet,head,.48);
    }
   },RIFT.blinkRange):null;
  this.roofMarker.visible=!!roof;
  if(roof){
   this.roofMarker.position.set(roof.x,roof.landing.y+.025,roof.z);
   this.roofMarker.scale.setScalar(roof.width);
  }
  if(this.taps.has('Shield')||this.taps.has('KeyG'))this.blink(direction,roof);
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
  this.hud.toggleAttribute('data-roof-target',this.roofMarker.visible);
  const blink=this.roofMarker.visible?'Blink to rooftop':this.anchor?'Return '+(this.anchor.gate.expiresAt-hero.time).toFixed(1)+'s':this.blinkCooldown?'Blink '+this.blinkCooldown.toFixed(1)+'s':'Blink ready';
  const redirect=this.redirectEntry?'Place exit':hero.pair?'Redirect active '+Math.max(0,hero.pair.entry.expiresAt-hero.time).toFixed(1)+'s':
   this.portalCooldown?'Redirect '+this.portalCooldown.toFixed(1)+'s':'Redirect ready';
  this.output.textContent=blink+' · '+redirect;
 }
}

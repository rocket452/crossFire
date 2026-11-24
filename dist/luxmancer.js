import * as T from './vendor/three.module.js';
import {HumanoidCharacter} from './humanoid-character.js?v=overall-performance-238';
import {LuxEffects} from './luxmancer-effects.js?v=411';
import {SOLAR_CONFIG,LuxSolarEffects} from './lux-solar.js?v=416';
import {RiftPlayer} from './rift-player.js?v=416';

const spells={
 lance:{speed:205,life:1.8,damage:350,gap:.85,charge:1.5,length:3,width:.12,color:0xffdc53},
 spray:{speed:115,life:.85,damage:19,gap:.0425,spread:Math.tan(Math.atan(.10)*.7),length:.95,width:.09,color:0xffae31},
 comet:{speed:33,life:6,damage:115,length:1.65,width:.24,color:0xffef90}
};
const lockTime=.35;
const maxLocks=4;
const targetable=unit=>unit.alive&&unit.shapes.length>0;
const up=new T.Vector3(0,1,0),forward=new T.Vector3(0,0,1);
const gem=new T.OctahedronGeometry(1),ring=new T.TorusGeometry(1,.075,5,32);
const glow=color=>new T.MeshBasicMaterial({color,toneMapped:false,blending:T.AdditiveBlending,transparent:true,depthWrite:false});
const white=glow(0xfff8cf),gold=glow(0xffc145);
function halo(){
 const mark=new T.Mesh(ring,gold);
 const star=new T.Mesh(gem,white);
 star.scale.set(.12,.26,.08);star.position.y=1;
 mark.add(star);
 return mark;
}
export class Luxmancer {
 constructor(scene,model,options){
  Object.assign(this,options);
  this.scene=scene;this.root=new T.Group();this.root.name='Luxmancer';
  this.character=new HumanoidCharacter(model,{height:2.5});
  this.root.add(this.character.root);scene.add(this.root);
  this.shots=[];this.free={};this.effects=new LuxEffects(scene);
  this.solarEffects=new LuxSolarEffects(scene);
  for(const [kind,s] of Object.entries(spells)){
   this.free[kind]=[];s.material??=glow(s.color);
  }
  this.marks=Array.from({length:maxLocks},()=>{const m=halo();scene.add(m);m.visible=false;return m;});
  this.pendingMark=new T.Mesh(ring,glow(0xfff1af));
  scene.add(this.pendingMark);
  this.reset();this.setEnabled(false);
 }
 reset(refill=true){
  if(refill)this.energy=SOLAR_CONFIG.capacity;
  this.solarMode=null;this.windup=0;this.lowEnergyTime=0;this.solarEffects.reset();
  if(this.player){this.player.anchor=null;this.player.blinkCooldown=0;if(this.player.roofMarker)this.player.roofMarker.visible=false;}
  for(const shot of this.shots)this.recycle(shot);
  this.shots.length=0;
  this.effects.reset();this.clearLocks();this.clearLance();
  this.cool={lance:0,spray:0,comet:0};this.castRemaining=0;this.castKind=null;this.poseKind=null;this.poseWeight=0;this.character.reset();
 }
 setEnabled(value){this.enabled=value;this.root.visible=value;if(!value){this.player?.exit();this.reset(false);}}
 receiveEyeHit(){if(this.active)this.player.hurt.hit();}
 recycle(shot){shot.mesh.visible=false;this.free[shot.kind].push(shot.mesh);}
 spend(cost){
  if(this.energy+1e-8<cost){this.lowEnergyTime=.65;return false;}
  this.energy=Math.max(0,this.energy-cost);
  if(this.energy<1e-8){
   this.energy=0;
   if(this.solarMode==='flight')this.solarMode='landing';
  }
  return true;
 }
 shoot(kind,origin,direction,target=null){
  if(!this.spend(SOLAR_CONFIG.attackCosts[kind]))return false;
  const s=spells[kind];let mesh=this.free[kind].pop();
  if(!mesh){
   mesh=new T.Mesh(gem,s.material);
   const core=new T.Mesh(gem,white);core.scale.set(.52,.52,1.15);mesh.add(core);
   if(kind==='comet'){
    for(let i=0;i<2;i++){
     const orbit=new T.Mesh(ring,s.material);
     orbit.rotation.x=i?.72:-.72;orbit.scale.set(2.1,2.1,.3);mesh.add(orbit);
    }
   }
   this.scene.add(mesh);
  }
  mesh.visible=true;mesh.scale.set(s.width,s.width,s.length);
  mesh.position.copy(origin);mesh.quaternion.setFromUnitVectors(forward,direction);
  const velocity=direction.clone().multiplyScalar(s.speed);
  if(kind==='lance')velocity.y+=4;
  this.shots.push({mesh,kind,target,v:velocity,life:s.life,trail:[],sampleTime:0});
  this.castKind=kind;this.castRemaining=kind==='comet'?.36:.23;
  if(kind!=='comet')this.effects.burst(kind,origin,direction,false);
  return true;
 }
 clearLance(){
  this.lanceCharge=0;this.lanceFired=false;
  this.effects.lanceGather.visible=false;this.effects.lanceSeal.visible=false;
 }
 chargeLance(held,dt){
  if(!held){this.clearLance();return false;}
  if(this.lanceFired||this.cool.lance>0)return false;
  if(this.energy+1e-8<SOLAR_CONFIG.attackCosts.lance){
   this.lanceCharge=0;this.lowEnergyTime=.65;
   return false;
  }
  this.lanceCharge=Math.min(spells.lance.charge,this.lanceCharge+dt);
  return this.lanceCharge>=spells.lance.charge-1e-8;
 }
 clearLocks(){
  this.locks=[];this.charging=false;
  this.pendingTarget=null;this.pendingTime=0;
  this.pendingMark.visible=false;
  this.marks.forEach(mark=>mark.visible=false);
 }
 lock(origin,aim,dt){
  this.locks=this.locks.filter(targetable);
  if(this.locks.length>=maxLocks)return;
  let best=null,bestAlignment=.90;
  const delta=new T.Vector3();
  for(const unit of this.getUnits()){
   if(unit.kind!=='robot'||!targetable(unit)||this.locks.includes(unit))continue;
   const center=unit.shapes[0].center;
   const distance=delta.copy(center).sub(origin).length();
   if(distance>140||distance<.1)continue;
   const alignment=delta.dot(aim)/distance;
   if(alignment<.90||(unit!==this.pendingTarget&&alignment<bestAlignment)||!this.visible(origin,center))continue;
   best=unit;bestAlignment=alignment;
   if(unit===this.pendingTarget)break;
  }
  if(best!==this.pendingTarget){this.pendingTarget=best;this.pendingTime=0;}
  if(!best)return;
  this.pendingTime+=dt;
  if(this.pendingTime>=lockTime-1e-8){
   this.locks.push(best);this.pendingTarget=null;this.pendingTime=0;
  }
 }
 drawLocks(camera){
  for(const [i,mark] of this.marks.entries()){
   const unit=this.locks[i];
   mark.visible=!!unit;
   if(!unit)continue;
   mark.position.copy(unit.shapes[0].center);mark.scale.setScalar(1.5);
   mark.quaternion.copy(camera.quaternion);
  }
  const pending=this.pendingTarget;
  this.pendingMark.visible=!!pending;
  if(pending){
   this.pendingMark.position.copy(pending.shapes[0].center);
   this.pendingMark.quaternion.copy(camera.quaternion);
   this.pendingMark.scale.setScalar(2.8-1.3*this.pendingTime/lockTime);
  }
 }
 stepShots(dt){
  for(let i=this.shots.length-1;i>=0;i--){
   const shot=this.shots[i],s=spells[shot.kind],p=shot.mesh.position;
   const step=Math.min(dt,shot.life);
   if(shot.kind==='lance')shot.v.y-=9*step;
   if(shot.target?.alive&&shot.target.shapes.length){
    const toward=new T.Vector3().copy(shot.target.shapes[0].center).sub(p).normalize();
    shot.v.lerp(toward.multiplyScalar(s.speed),1-Math.exp(-8*step)).normalize().multiplyScalar(s.speed);
   }
   const end=p.clone().addScaledVector(shot.v,step),hit=this.traceBolt(p,end);
   shot.life-=step;
   if(hit){
    this.onHit(hit,new T.Vector3().copy(hit.point),s.damage);
    this.effects.burst(shot.kind,hit.point,shot.v,true);
   }
   if(hit||shot.life<=0){this.recycle(shot);this.shots.splice(i,1);continue;}
   shot.sampleTime+=step;
   if(shot.sampleTime>=.018||!shot.trail.length){
    const point=shot.trail.length>=8?shot.trail.pop():new T.Vector3();
    shot.trail.unshift(point.copy(p));shot.sampleTime%=.018;
   }
   p.copy(end);shot.mesh.quaternion.setFromUnitVectors(forward,shot.v.clone().normalize());
   if(shot.kind==='comet')shot.mesh.rotateZ(shot.life*10);
  }
  this.effects.update(dt,this.shots);
 }
 update(dt){
  if(!this.enabled||!this.active||!this.player.available())return;
  this.player.update(dt);this.player.hurt.applyPose();this.stepShots(dt);
 }
}
export class LuxPlayer extends RiftPlayer {
 constructor(hero,options){
  super(hero,options,{hint:'WASD move · Space jump · Hold LMB Sunlance · RMB Sunburst · E lock volley · Q Solar Disc · Space / Shift altitude · X Solar Blink / return · Hold R recharge',
   actions:[['Jump / Up','Space'],['Hold Sunlance','Fire'],['Sunburst','Shield'],['Lock volley','KeyE'],['Disc','KeyQ'],['Down','ShiftLeft'],['Recharge','KeyR'],['Solar Blink','KeyX']],
   roofColor:'#ffdb65',
   codes:['KeyW','KeyA','KeyS','KeyD','Space','KeyE','KeyF','KeyG','KeyQ','KeyR','KeyX','ShiftLeft','ShiftRight']});
  this.hud.classList.add('lux-player');
  const meter=document.createElement('div');
  meter.className='lux-energy';
  meter.innerHTML='<div><strong>Solar Energy</strong><span data-energy-value></span></div><progress aria-label="Solar Energy"></progress>';
  this.hud.append(meter);
  this.energyMeter=meter;
  this.energyBar=meter.querySelector('progress');
  this.energyLabel=meter.querySelector('[data-energy-value]');
 }
 enter(intro,respawn=true){
  const energy=this.hero.energy;
  super.enter(intro,respawn);
  this.hero.energy=energy;
  if(!respawn)this.grounded=false;
  this.updateEnergyHud();
 }
 exit(){
  const energy=this.hero.energy;
  super.exit();
  this.hero.energy=energy;
 }
 clear(){
  super.clear();this.hero.clearLocks();this.hero.clearLance();
  if(this.hero.solarMode==='communion'){
   this.hero.solarMode=null;this.hero.solarEffects.pillar.visible=false;
  }
 }
 blinkTime(){return this.hero.solarEffects.clock;}
 canStartBlink(){return true;}
 createBlinkAnchor(){return {};}
 showBlink(from,to){this.hero.solarEffects.blink(from,to);this.frame();}
 updateSolarBlink(dt,allowed,standingBuilding){
  this.tickBlink(dt);
  if(allowed){
   const direction=this.camera.getWorldDirection(new T.Vector3());
   const roof=this.aimBlink(direction,standingBuilding);
   if(this.taps.has('KeyX'))this.blink(direction,roof);
  }else{
   this.roofMarker.visible=false;this.roofOutOfRange=false;
  }
  this.hud.toggleAttribute('data-roof-target',this.roofMarker.visible);
  this.hero.solarEffects.updateBlink(this.anchor);
 }
 updateEnergyHud(){
  const h=this.hero;
  if(!this.energyMeter)return;
  const empty=h.energy===0;
  this.energyMeter.toggleAttribute('data-empty',empty);
  this.energyMeter.toggleAttribute('data-insufficient',h.lowEnergyTime>0&&!empty);
  this.energyBar.max=SOLAR_CONFIG.capacity;this.energyBar.value=h.energy;
  this.energyLabel.textContent=empty?'Depleted':h.lowEnergyTime>0?'Low energy · '+Math.ceil(h.energy):
   Math.ceil(h.energy)+' / '+SOLAR_CONFIG.capacity;
 }
 moveDisc(dt,landing,allowInput=true){
  const p=this.hero.root.position,keys=this.keys;
  const f=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))+this.stick.value.y;
  const r=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+this.stick.value.x;
  const vertical=Number(keys.has('Space'))-Number(keys.has('ShiftLeft')||keys.has('ShiftRight'));
  const speed=landing?SOLAR_CONFIG.glideSpeed:SOLAR_CONFIG.flightSpeed;
  const motion=new T.Vector3();
  if(allowInput)motion.set(Math.sin(this.yaw)*f-Math.cos(this.yaw)*r,0,
   Math.cos(this.yaw)*f+Math.sin(this.yaw)*r).clampLength(0,1);
  this.walking=false;
  for(const axis of ['x','z']){
   const next=p.clone();next[axis]+=motion[axis]*speed*dt;this.clamp(next);
   if(!this.sweep(p,next))p.copy(next);
  }
  this.vertical=landing?-SOLAR_CONFIG.landingSpeed:allowInput?vertical*SOLAR_CONFIG.climbSpeed:0;
  const next=this.clamp(p.clone().addScaledVector(up,this.vertical*dt));
  if(this.vertical<0&&this.landOnDeck(p,next)){
   this.finishLanding();return;
  }
  const roof=this.vertical<0&&this.roofBelow(next.x,next.z,p.y+.04,next.y-.14);
  if(roof){p.copy(roof.point).addScaledVector(up,.08);this.finishLanding();return;}
  const hit=this.sweep(p,next);
  if(hit)p.lerp(next,Math.max(0,hit.t-.02));
  else p.copy(next);
  this.grounded=p.y<=this.terrain(p.x,p.z)+.11;
  if(this.grounded&&this.vertical<0)this.finishLanding();
 }
 finishLanding(){
  this.grounded=true;
  this.vertical=0;
  if(this.hero.solarMode==='landing')this.hero.solarMode=null;
 }
 solarMovement(dt,allowInput){
  const h=this.hero,c=SOLAR_CONFIG,held=this.keys;
  h.lowEnergyTime=Math.max(0,h.lowEnergyTime-dt);
  if(h.solarMode==='communion'&&!held.has('KeyR'))h.solarMode=null;
  if(!h.solarMode&&this.grounded&&held.has('KeyR')){
   h.solarMode='communion';h.windup=c.windup;h.clearLocks();h.clearLance();
   h.castRemaining=0;h.poseWeight=0;h.effects.cast(null);
  }
  if(h.solarMode==='communion'){
   super.move(dt,false);
   if(!this.grounded){h.solarMode=null;return true;}
   const waiting=Math.min(dt,h.windup);
   h.windup-=waiting;
   if(dt-waiting>1e-8)h.energy=Math.min(c.capacity,h.energy+(dt-waiting)*c.recharge);
   return true;
  }
  if(allowInput&&this.taps.has('KeyQ')){
   if(h.solarMode==='flight')h.solarMode=this.grounded?null:'landing';
   else if(h.energy>0){h.solarMode='flight';this.platform=null;}
   else h.lowEnergyTime=.65;
  }
  if(h.solarMode==='flight'){
   const powered=Math.min(dt,h.energy/c.flightDrain);
   this.moveDisc(powered,false,allowInput);
   h.spend(powered*c.flightDrain);
   if(h.solarMode==='landing'&&dt>powered)this.moveDisc(dt-powered,true,allowInput);
  }else if(h.solarMode==='landing')this.moveDisc(dt,true,allowInput);
  else this.move(dt,allowInput);
  return false;
 }
 poseCast(kind,ray){
  const h=this.hero,c=h.character;
  const aim=ray.clone();
  const weight=h.poseWeight;
  // The jump clip rolls the shoulders back. Keep both elbows in front of the cloak.
  if(!this.grounded&&this.vertical>0)aim.y=Math.min(0,aim.y);
  const side=new T.Vector3().crossVectors(up,aim).normalize();
  const recoil=h.castKind===kind?T.MathUtils.clamp(h.castRemaining/.23,0,1):0;
  const right=c.world('B_R_UpperArm');
  if(kind==='lance'){
   const gather=h.lanceCharge/spells.lance.charge;
   right.addScaledVector(aim,.70-.27*recoil-.24*Math.sin(gather*Math.PI))
    .addScaledVector(up,.13*recoil-.035);
   const support=c.world('B_L_UpperArm').lerp(right,.68).addScaledVector(up,-.08);
   c.arm('L',c.hand('L').lerp(support,weight));
  }else if(kind==='spray'){
   right.addScaledVector(aim,.61-.13*recoil).addScaledVector(side,.08)
    .addScaledVector(up,-.16+.08*recoil);
   const guard=c.world('B_L_UpperArm').addScaledVector(aim,.32).addScaledVector(up,-.23);
   c.arm('L',c.hand('L').lerp(guard,weight));
  }else{
   const release=!this.keys.has('KeyE');
   const extend=release?.71:.50+(.09*(h.locks.length/maxLocks));
   right.addScaledVector(aim,extend).addScaledVector(side,.11).addScaledVector(up,-.08);
   const focus=c.world('B_L_UpperArm').addScaledVector(aim,release?.40:.57)
    .addScaledVector(side,-.11).addScaledVector(up,release?-.16:0);
   c.arm('L',c.hand('L').lerp(focus,weight));
  }
  c.arm('R',c.hand('R').lerp(right,weight));
 }

 update(dt){
  const h=this.hero;
  this.hurt.step(dt);
  const lanceHeld=this.keys.has('Fire')||this.keys.has('KeyF');
  const channeling=this.solarMovement(dt,!lanceHeld);
  this.frame();
  if(this.roofMarker){
   const feet=h.root.position;
   const roof=this.roofBelow(feet.x,feet.z,feet.y+.06,feet.y-.22);
   this.updateSolarBlink(dt,!channeling&&!lanceHeld,roof?.section?.building);
  }
  h.solarEffects.update(dt,h.root.position,h.solarMode,h.windup);
  const sprayClock=h.cool.spray>0?h.cool.spray-dt:0;
  h.cool.spray=Math.max(0,sprayClock);
  h.cool.lance=Math.max(0,h.cool.lance-dt);
  h.cool.comet=Math.max(0,h.cool.comet-dt);
  h.castRemaining=Math.max(0,h.castRemaining-dt);
  if(channeling){
   this.updateEnergyHud();
   this.face(dt,true);
   h.character.update('Idle',dt);
   const gather=new T.Vector3(Math.sin(this.yaw),0,Math.cos(this.yaw)).multiplyScalar(.26);
   for(const side of ['L','R']){
    const hand=h.character.world('B_'+side+'_UpperArm').add(gather).addScaledVector(up,.05);
    h.character.arm(side,h.character.hand(side).lerp(hand,1-h.windup/SOLAR_CONFIG.windup));
   }
   this.output.textContent=h.windup>0?'Solar Communion · Gathering light':
    h.energy>=SOLAR_CONFIG.capacity?'Solar Communion · Full':'Solar Communion · Recharging';
   this.taps.clear();
   return;
  }
  const down=k=>this.keys.has(k)||this.taps.has(k);
  const lanceReady=h.chargeLance(lanceHeld,dt);
  const spray=down('Shield')||down('KeyG');
  const wantsVolley=this.keys.has('KeyE')&&!h.cool.comet;
  const pose=h.lanceCharge>0?'lance':wantsVolley||h.charging?'comet':spray?'spray':h.castRemaining?h.castKind:null;
  this.face(dt,!!pose||lanceHeld);
  const onDisc=h.solarMode==='flight'||h.solarMode==='landing';
  const clip=onDisc?'Idle':this.grounded?(this.walking?'Run':'Idle'):(this.vertical>0?'Jump':'Fall');
  h.character.update(clip,dt,{loop:this.grounded});
  const ray=this.camera.getWorldDirection(new T.Vector3()),eye=this.camera.position;
  const end=eye.clone().addScaledVector(ray,380),aim=h.traceBolt(eye,end)?.point||end;
  if(pose)h.poseKind=pose;
  h.poseWeight=T.MathUtils.damp(h.poseWeight,pose?1:0,pose?40:18,dt);
  if(h.poseWeight>.01)this.poseCast(h.poseKind,ray);
  const origin=h.character.hand('R'),dir=new T.Vector3().copy(aim).sub(origin).normalize();
  if(lanceReady&&h.shoot('lance',origin,dir)){
   h.lanceCharge=0;h.lanceFired=true;h.cool.lance=spells.lance.gap;
  }
  if(spray&&sprayClock<=0){
   const right=new T.Vector3().crossVectors(dir,up).normalize(),vertical=right.clone().cross(dir);
   // Carry the remainder across frames so 30 and 60 FPS do not quantize the fire rate differently.
   let nextShot=sprayClock;
   while(nextShot<=0){
    const angle=Math.random()*Math.PI*2,r=spells.spray.spread*Math.sqrt(Math.random());
    const velocity=dir.clone().addScaledVector(right,r*Math.cos(angle))
     .addScaledVector(vertical,r*Math.sin(angle)).normalize();
    if(!h.shoot('spray',origin,velocity)){nextShot=0;break;}
    nextShot+=spells.spray.gap;
   }
   h.cool.spray=nextShot;
  }
  if(wantsVolley){h.charging=true;h.lock(origin,ray,dt);}
  if(h.charging&&!this.keys.has('KeyE')){
   const locked=h.locks.filter(targetable);
   const size=Math.min(locked.length,Math.floor((h.energy+1e-8)/SOLAR_CONFIG.attackCosts.comet));
   if(size<locked.length)h.lowEnergyTime=.65;
   for(const [i,u] of locked.slice(0,size).entries()){
    const fan=dir.clone().applyAxisAngle(up,(i-(size-1)/2)*.28);
    h.shoot('comet',origin,fan.addScaledVector(up,.4).normalize(),u);
   }
   if(size){h.effects.burst('comet',origin,dir,false);h.cool.comet=4;}
   h.clearLocks();
  }
  const lanceProgress=h.lanceCharge/spells.lance.charge;
  h.effects.cast(pose,h.character.hand(pose==='comet'&&wantsVolley?'L':'R'),dir,
   pose==='comet'?(h.locks.length+h.pendingTime/lockTime)/maxLocks:Math.min(1,h.castRemaining/.23),lanceProgress,this.camera.aspect,h.root.position);
  h.drawLocks(this.camera);
  this.updateEnergyHud();
  const progress=h.pendingTarget?' · Acquiring '+Math.floor(100*h.pendingTime/lockTime)+'%':'';
  const spellStatus=lanceProgress?'Sunlance · Charging '+Math.floor(lanceProgress*100)+'%':
   h.charging?'Targets locked '+h.locks.length+' / '+maxLocks+progress:
   h.solarMode==='landing'?'Solar Disc · Landing':h.solarMode==='flight'?'Solar Disc · Flying':
   h.cool.comet?'Light volley '+h.cool.comet.toFixed(1)+'s':'Light volley ready';
  this.output.textContent=this.roofMarker?spellStatus+' · '+this.blinkStatus('Solar Blink'):spellStatus;
  this.taps.clear();
 }
}

import * as THREE from './vendor/three.module.js';
import {markVisibleProjectile} from './projectile-silhouette.js?v=charged-shuriken-130';

const forward=new THREE.Vector3(0,0,1);
const up=new THREE.Vector3(0,1,0);
const rad=THREE.MathUtils.degToRad;
const clamp=THREE.MathUtils.clamp;

export class DroneGun {
 constructor(scene,model,config,options){
  Object.assign(this,{model,config,options});
  const geometry=new THREE.BoxGeometry(.065,.065,1);
  const material=markVisibleProjectile(new THREE.MeshBasicMaterial({
   color:new THREE.Color('#ffce78').multiplyScalar(1.65)
  }));
  this.tracers=new THREE.InstancedMesh(geometry,material,config.projectileLimit);
  this.tracers.name='Drone minigun ammunition';this.tracers.frustumCulled=false;
  this.tracers.renderOrder=90;scene.add(this.tracers);
  this.dummy=new THREE.Object3D();
  this.reset();
 }
 reset(){
  this.stop();
  this.rounds=[];this.shots=this.hits=this.redirects=0;
  this.tracers.count=0;
  this.model.turret.rotation.y=0;this.model.pitch.rotation.x=rad(this.config.minDown);
  this.model.rotor.rotation.z=0;
 }
 stop(){
  this.phase='idle';this.elapsed=0;this.target=null;this.spin=0;
  this.roundAccumulator=0;
  this.model.flash.visible=false;
 }
 bearing(point){
  const local=this.model.turret.parent.worldToLocal(point.clone()).sub(this.model.turret.position);
  return {yaw:Math.atan2(local.x,local.z),pitch:Math.atan2(-local.y,Math.hypot(local.x,local.z))};
 }
 select(targets){
  const origin=this.model.turret.getWorldPosition(new THREE.Vector3()),c=this.config;
  let next=null,best=c.range**2;
  for(const unit of targets){
   const point=unit.shapes[0]?.center;
   if(!unit.alive||!point)continue;
   const p=new THREE.Vector3().copy(point),range=origin.distanceToSquared(p);
   if(range>best)continue;
   const a=this.bearing(p);
   if(Math.abs(a.yaw)>rad(c.yawLimit)||a.pitch<0||a.pitch>rad(c.maxDown+5)||!this.options.visible(origin,p))continue;
   next=unit;best=range;
  }
  return next;
 }
 aim(point,dt){
  const c=this.config,m=this.model,limit=rad(this.phase==='fire'?c.firingDegrees:c.acquisitionDegrees)*dt;
  const desired=this.bearing(point);
  const yaw=clamp(desired.yaw,-rad(c.yawLimit),rad(c.yawLimit));
  const pitch=clamp(desired.pitch,rad(c.minDown),rad(c.maxDown));
  const yawDelta=yaw-m.turret.rotation.y,pitchDelta=pitch-m.pitch.rotation.x;
  const scale=Math.min(1,limit/(Math.hypot(yawDelta,pitchDelta)||1));
  m.turret.rotation.y+=yawDelta*scale;m.pitch.rotation.x+=pitchDelta*scale;
 }
 fire(){
  const c=this.config,m=this.model,o=this.options;
  if(this.rounds.length>=c.projectileLimit)return;
  m.muzzle.updateWorldMatrix(true,false);
  const barrel=(this.shots%6)*Math.PI/3+m.rotor.rotation.z;
  const position=m.muzzle.localToWorld(new THREE.Vector3(.235*Math.cos(barrel),.235*Math.sin(barrel),0));
  const axis=forward.clone().transformDirection(m.muzzle.matrixWorld);
  const right=new THREE.Vector3().crossVectors(up,axis).normalize();
  const rise=new THREE.Vector3().crossVectors(axis,right);
  const angle=Math.random()*Math.PI*2,spread=Math.sqrt(Math.random())*Math.tan(rad(c.spreadDegrees));
  const direction=axis.addScaledVector(right,Math.cos(angle)*spread).addScaledVector(rise,Math.sin(angle)*spread).normalize();
  const pivot=m.pitch.getWorldPosition(new THREE.Vector3());
  if(o.blocked(pivot,position)||o.blocked(position,position.clone().addScaledVector(direction,8)))return;
  const number=++this.shots;
  this.rounds.push({position,direction,owner:o.owner,radius:c.bulletRadius,life:c.bulletLifetime,
   tracer:number%c.tracerEvery===1});
  m.flash.visible=true;m.flash.rotation.z=number*.73;
  if(number%c.tracerEvery===1)o.sound('shot',.09);
 }
 update(dt,targets,enabled){
  const c=this.config,m=this.model;
  m.flash.visible=false;
  if(!enabled)this.stop();
  if(enabled&&this.phase==='idle'){
   this.target=this.select(targets);
   if(this.target){this.phase='acquisition';this.elapsed=0;}
  }
  if(this.target?.alive&&this.target.shapes[0]){
   this.aim(new THREE.Vector3().copy(this.target.shapes[0].center),dt);
  }
  if(this.phase!=='idle'){
   this.elapsed+=dt;
   if(this.phase==='acquisition'&&this.elapsed>=c.acquisition){
    this.phase='spinUp';this.elapsed=0;
    this.options.sound('spin',c.spinUp);
   }else if(this.phase==='spinUp'&&this.elapsed>=c.spinUp){
    this.phase='fire';this.elapsed=0;this.roundAccumulator=0;
   }else if(this.phase==='fire'){
    this.roundAccumulator+=Math.min(dt,Math.max(0,c.fire-this.elapsed+dt))*c.roundsPerSecond;
    while(this.roundAccumulator>=1-1e-8){this.roundAccumulator-=1;this.fire();}
    if(this.elapsed>=c.fire){
     this.phase='cooldown';this.elapsed=0;
     this.options.heat(m.muzzle.getWorldPosition(new THREE.Vector3()));
    }
   }else if(this.phase==='cooldown'&&this.elapsed>=c.cooldown)this.stop();
  }
  this.spin=this.phase==='fire'?1:this.phase==='spinUp'?clamp(this.elapsed/c.spinUp,0,1):
   this.phase==='cooldown'?Math.max(0,1-this.elapsed/c.cooldown):0;
  m.rotor.rotation.z+=dt*42*this.spin;
  this.advance(dt);
 }
 advance(dt){
  if(!(dt>0))return;
  const c=this.config,o=this.options;
  let count=0;
  for(let i=this.rounds.length-1;i>=0;i--){
   const round=this.rounds[i],from=round.position,end=from.clone().addScaledVector(round.direction,c.speed*dt);
   const transit=o.redirect(round,from,end);
   round.life-=dt;
   if(transit){
    from.copy(transit.position);round.direction.copy(transit.direction);this.redirects++;
   }else{
    const hit=o.trace(from,end,o.owner,c.bulletRadius);
    if(hit){this.hits++;o.onHit(hit,c.damage);round.life=0;}
    else from.copy(end);
   }
   if(round.life<=0){this.rounds.splice(i,1);continue;}
   this.dummy.position.copy(from);
   this.dummy.quaternion.setFromUnitVectors(forward,round.direction);
   const size=c.bulletVisualScale;
   this.dummy.scale.set(size,size,(round.tracer?1.35:.17)*size);
   this.dummy.updateMatrix();this.tracers.setMatrixAt(count++,this.dummy.matrix);
  }
  this.tracers.count=count;
  if(count)this.tracers.instanceMatrix.needsUpdate=true;
 }
}

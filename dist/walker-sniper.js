import * as THREE from './vendor/three.module.js';

export const WALKER_SNIPER = Object.freeze({
 range: 300, speed: 240, damage: 160, radius: .16,
 trackingSeconds: 1.25, lockedSeconds: .55, alignmentTimeout: 3
});

const UP = new THREE.Vector3(0, 1, 0);

export class WalkerSniper {
 constructor(scene, {getMuzzle, getTargets, canFire, traceCover, traceShot, redirect, onImpact, onLaunch, onEvent}){
  Object.assign(this, {getMuzzle, getTargets, canFire, traceCover, traceShot, redirect, onImpact, onLaunch, onEvent});
  const material = color => new THREE.MeshBasicMaterial({color, toneMapped:false});
  this.laser = new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,6), material(0xff3434));
  this.round = new THREE.Mesh(new THREE.CylinderGeometry(.15,.32,1,8), material(0xff313d));
  this.muzzleGlow = new THREE.Mesh(new THREE.IcosahedronGeometry(.55), material(0xff6550));
  scene.add(this.laser,this.round,this.muzzleGlow);
  this.reset();
 }

 reset(){
  this.shells = [];
  this.clock = this.sequence = this.launched = this.impacts = this.blocked = this.cancelled = 0;
  this.history = [];
  this.removeShell();
 }

 get busy(){return this.shells.length > 0;}

 removeShell(){
  this.laser.visible = this.round.visible = this.muzzleGlow.visible = false;
 }

 beginVolley(){
  if(this.busy || !this.canFire())return false;
  const {position} = this.getMuzzle();
  const unit = this.getTargets().find(u => {
   const center = u.shapes?.[0]?.center;
   return u.alive && !u.hidden && !u.dashPhased && center &&
    position.distanceTo(center) <= WALKER_SNIPER.range && !this.traceCover(position,center);
  });
  if(!unit)return false;
  this.shells.push({
   id:'walker-sniper-'+(++this.sequence), owner:'siege-walker', state:'warning', unit,
   aim:{unitId:unit.id}, target:new THREE.Vector3().copy(unit.shapes[0].center),
   position:position.clone(), startedAt:this.clock, impactAt:this.clock+WALKER_SNIPER.trackingSeconds+WALKER_SNIPER.lockedSeconds
  });
  this.onEvent('Siege Walker sniper targeting · break line of sight or dodge after lock.');
  return true;
 }

 drawLine(mesh, from, to, width){
  const direction = new THREE.Vector3().subVectors(to,from);
  const length = direction.length();
  mesh.visible = length > .01;
  if(!mesh.visible)return;
  mesh.position.copy(from).lerp(to,.5);
  mesh.quaternion.setFromUnitVectors(UP,direction.divideScalar(length));
  mesh.scale.set(width,length,width);
 }

 finish(shot, hit, blocked = false){
  this.removeShell();
  this.shells.length = 0;
  if(shot.state==='warning'){this.cancelled++;return;}
  if(hit){if(blocked)this.blocked++;else this.impacts++;}
  this.history.push({id:shot.id, target:shot.aim.unitId, hit:hit?.kind??null, blocked, actual:shot.position.toArray()});
  if(this.history.length>12)this.history.shift();
 }

 aim(shot){
  const config = WALKER_SNIPER;
  if(!this.canFire() || !shot.unit.alive || shot.unit.hidden)return this.finish(shot);
  if(!shot.lockedAt){
   const center = shot.unit.shapes[0]?.center;
   if(!center || shot.unit.dashPhased)return this.finish(shot);
   shot.target.copy(center);
  }
  const muzzle = this.getMuzzle(shot.target);
  shot.position.copy(muzzle.position);
  const distance = shot.position.distanceTo(shot.target);
  const cover = this.traceCover(shot.position,shot.target);
  if(distance>config.range || distance<.1)return this.finish(shot);
  // A tracking target can break the lock. After commitment, cover intercepts the round instead.
  if(cover && !shot.lockedAt && muzzle.aligned)return this.finish(shot);
  if(!shot.lockedAt && muzzle.aligned && this.clock-shot.startedAt>=config.trackingSeconds){
   shot.lockedAt = this.clock;
   this.onEvent('Sniper locked · dodge now.');
  }
  if(this.clock-shot.startedAt > config.alignmentTimeout + config.lockedSeconds)return this.finish(shot);
  const lockEnd = (shot.lockedAt ?? Math.max(shot.startedAt+config.trackingSeconds,this.clock))+config.lockedSeconds;
  shot.impactAt = lockEnd+distance/config.speed;
  const warningEnd = cover ? new THREE.Vector3().copy(cover.point) : shot.target;
  this.drawLine(this.laser,shot.position,warningEnd,shot.lockedAt ? .115 : .04);
  this.laser.material.color.setHex(shot.lockedAt ? 0xff8674 : 0xff3434);
  this.muzzleGlow.position.copy(shot.position);
  this.muzzleGlow.scale.setScalar(shot.lockedAt ? 1+.24*Math.sin(this.clock*38) : .75);
  this.muzzleGlow.visible = true;
  if(this.clock < lockEnd-1e-9 || !muzzle.aligned)return;
  shot.state = 'flying';
  shot.direction = shot.target.clone().sub(shot.position).normalize();
  shot.remaining = config.range;
  this.removeShell();
  this.drawLine(this.round,shot.position,shot.position.clone().addScaledVector(shot.direction,-2),1);
  this.launched++;
  this.onLaunch(shot.position);
 }

 update(dt){
  this.clock += dt;
  const shot = this.shells[0];
  if(!shot)return;
  if(shot.state==='warning')return this.aim(shot);
  const distance = Math.min(shot.remaining,WALKER_SNIPER.speed*dt);
  const end = shot.position.clone().addScaledVector(shot.direction,distance);
  const hit = this.traceShot(shot.position,end,WALKER_SNIPER.radius);
  // Let a barrier in front of a portal win the collision.
  const transit = this.redirect(shot,shot.position,hit ? new THREE.Vector3().copy(hit.point) : end);
  shot.remaining -= distance;
  if(transit){
   shot.position.copy(transit.position);
   shot.direction.copy(transit.direction);
  }else if(hit){
   shot.position.copy(hit.point);
   const blocked = this.onImpact(shot.position,hit,shot.id)===true;
   return this.finish(shot,hit,blocked);
  }else shot.position.copy(end);
  if(shot.remaining<=0)return this.finish(shot);
  this.drawLine(this.round,shot.position,shot.position.clone().addScaledVector(shot.direction,-Math.min(distance,5)),1);
 }

 threats(){
  return this.shells.map(s=>({
   id:s.id, kind:'sniper', alive:true, owner:s.owner, radius:WALKER_SNIPER.radius,
   position:s.position, velocity:s.direction?.clone().multiplyScalar(WALKER_SNIPER.speed) ?? new THREE.Vector3(),
   speed:s.direction ? WALKER_SNIPER.speed : 0, blastRadius:0,
   target:s.state==='warning' ? s.unit : null,
   impactPoint:s.state==='warning' ? s.target : null, timeToImpact:Math.max(0,s.impactAt-this.clock)
  }));
 }

 diagnostics(){
  return {
   active:this.shells.length, busy:this.busy, launched:this.launched, impacts:this.impacts,
   blocked:this.blocked, cancelled:this.cancelled, history:this.history,
   shells:this.shells.map(s=>({id:s.id,state:s.state,locked:!!s.lockedAt,aim:s.aim,
    position:s.position.toArray(),target:s.target.toArray(),eta:Math.max(0,s.impactAt-this.clock)}))
  };
 }
}

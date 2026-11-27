import * as THREE from './vendor/three.module.js';
import {CircuitBreakerFX} from './circuit-breaker-fx.js?v=445';

export const CIRCUIT_BREAKER=Object.freeze({
 key:'e',cost:12,shots:3,duration:.3,range:52,damage:55,markSeconds:4,angleDegrees:90,bonusDamage:2
});
const UP=new THREE.Vector3(0,1,0);
const unitGround=(marks,mark)=>{for(const [unit,m] of marks)if(m===mark)return unit.entity.root.position.y;return mark.ring.position.y;};

export class CircuitBreaker {
 constructor(scene,{hit,detonate},config=CIRCUIT_BREAKER){
  Object.assign(this,{scene,hit,detonate,config});
  this.marks=new Map();
  this.fx=new CircuitBreakerFX(scene,config);
  this.reset();
 }
 reset(){
  for(const unit of this.marks.keys())this.remove(unit);
  this.cancel();this.fx.clear();this.time=0;this.bursts=this.shots=this.detonations=0;
 }
 cancel(){this.burst=null;}
 get active(){return !!this.burst;}
 start(energy,blocked){
  if(blocked||this.active||!energy.spend(this.config.cost))return false;
  this.burst={elapsed:0,fired:0};this.bursts++;return true;
 }
 remove(unit){const ring=this.marks.get(unit).ring;this.fx.removeMark(ring);this.scene.remove(ring);this.marks.delete(unit);}
 side(unit,position){
  const side=position.clone().sub(unit.entity.root.position).setY(0);
  return side.lengthSq()>1e-8?side.normalize():null;
 }
 marked(unit){
  return !!unit?.alive&&(this.marks.get(unit)?.until??0)>this.time;
 }
 strike(hit,power,applyDamage){
  if(!this.marked(hit.unit))return applyDamage(hit,power);
  const dealt=applyDamage(hit,power*(1+this.config.bonusDamage));
  if(dealt>0)this.consume(hit);
  return dealt;
 }
 primed(unit,position){
  if(!this.marked(unit))return false;
  const mark=this.marks.get(unit),side=this.side(unit,position);
  return !!side&&
   side.dot(mark.side)<=Math.cos(this.config.angleDegrees*Math.PI/180)+1e-8;
 }
 updateRing(unit,ring){
  const root=unit.entity.root.position;
  const shape=unit.shapes[0];
  ring.position.set(root.x,Math.max(root.y+.16,shape?.center.y??root.y),root.z);
  ring.scale.setScalar(Math.max(1.55,Math.min(9,Math.max(shape?.half.x??0,shape?.half.z??0)+.7)));
 }
 register(hit,position){
  if(hit?.unit?.kind!=='robot'||!hit.unit.alive)return;
  const {unit}=hit,side=this.side(unit,position),detonates=this.primed(unit,position);
  if(!this.hit(hit,this.config.damage*(detonates?1+this.config.bonusDamage:1)))return;
  if(detonates){this.consume(hit);return;}
  if(!side||!unit.alive||this.marks.has(unit))return;
  const ring=new THREE.Group();ring.name='CircuitMark';
  ring.quaternion.setFromAxisAngle(UP,Math.atan2(side.z,-side.x));
  this.scene.add(ring);this.updateRing(unit,ring);
  this.marks.set(unit,{side,ring,until:this.time+this.config.markSeconds});this.fx.addMark(ring);
 }
 consume(hit){
  if(!this.marks.has(hit.unit))return;
  this.remove(hit.unit);this.detonations++;
  this.fx.detonate(hit.point);
  this.detonate(hit.point);
 }
 step(dt,aim,position){
  this.time+=dt;
  for(const [unit,mark] of this.marks){
   if(!unit.alive||unit.hidden||!unit.shapes.length||mark.until<=this.time)this.remove(unit);
   else this.updateRing(unit,mark.ring);
  }
  this.fx.step(dt,ring=>{for(const mark of this.marks.values())if(mark.ring===ring)return{remaining:Math.max(0,(mark.until-this.time)/this.config.markSeconds),ground:unitGround(this.marks,mark)};return{remaining:0,ground:ring.position.y};});
  const burst=this.burst,c=this.config;
  if(!burst||!aim)return;
  if(burst.fired)burst.elapsed+=dt;
  while(burst.fired<c.shots&&burst.elapsed+1e-8>=c.duration*burst.fired/Math.max(1,c.shots-1)){
   const {from,end,hit}=aim();
   this.fx.bolt(from,end,burst.fired);this.register(hit,position);
   burst.fired++;this.shots++;
  }
  if(burst.elapsed+1e-8>=c.duration)this.burst=null;
 }
}

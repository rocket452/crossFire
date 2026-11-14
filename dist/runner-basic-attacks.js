import * as THREE from './vendor/three.module.js';
import {massContacts} from './critical-mass.js?v=critical-mass-257';
import {traceImpact} from './combat-collision.js?v=evac-performance-233';
export const BASIC_ATTACKS=Object.freeze({
 beam:Object.freeze({key:'0',name:'Original Lightning Beam'}),
 bolt:Object.freeze({key:'1',name:'Lightning Bolt',rate:4,speed:100,range:80,damage:37.5,spread:0,radius:.065,cost:4.375,color:'#a0f8ff'}),
 sparks:Object.freeze({key:'2',name:'Rapid Sparks',rate:15,speed:110,range:60,damage:10,spread:3,radius:.035,cost:17.5/15,color:'#55dfff'}),
 sweep:Object.freeze({key:'3',name:'Lightning Sweep',rate:2.5,range:6,arc:120,vertical:3,damage:60,cost:7,color:'#91eeff'}),
 needle:Object.freeze({key:'4',name:'Electric Needle',rate:3,speed:180,range:100,damage:35,weakMultiplier:2.5,spread:0,radius:.025,cost:17.5/3,color:'#e1ffff'})
});
export const BASIC_LIMITS=Object.freeze({projectiles:128,effects:48,catchUpShots:32});
export function recognizedElectricWeakPoint(hit){const e=hit?.unit?.entity,p=hit?.part;if(!e||!hit.unit.alive)return false;const mount=e.weapons?.forPart?.(p);if(mount)return !mount.destroyed;const joint=e.joints?.get?.(p);if(joint)return !joint.destroyed;if((p==='argus-core-open'||p==='argus-core-closed')&&e.coreOpen)return true;if(e.armsHealth){if(p==='arm-left')return e.armsHealth[0]>0;if(p==='arm-right')return e.armsHealth[1]>0;if(p==='back')return !e.dead;}if(e.type==='breaker')return p==='capacitor'&&e.phase==='charging';return p==='head'&&Number.isFinite(e.headshots);}
export class RunnerBasicAttacks {
 constructor({trace,getUnits,getSections,getOrbHit=()=>null,onHit=()=>({damage:0}),onShot=()=>{},random=Math.random}={}){Object.assign(this,{trace,getUnits,getSections,getOrbHit,onHit,onShot,random});this.selected='beam';this.reset();}
 get config(){return BASIC_ATTACKS[this.selected];}
 select(id){if(!BASIC_ATTACKS[id])return false;this.selected=id;this.firing=false;this.previousFrom=null;return true;}
 reset(){this.cooldown=0;this.firing=false;this.projectiles=[];this.effects=[];this.previousFrom=null;this.sequence=this.shots=this.hits=this.damage=this.weakHits=0;this.byWeapon={bolt:0,sparks:0,sweep:0,needle:0};this.lastHits=[];}
 stop(){this.firing=false;this.previousFrom=null;}
 effect(event){this.effects.push({...event,age:0});if(this.effects.length>BASIC_LIMITS.effects)this.effects.shift();}
 hit(hit,power,meta){const result=this.onHit(hit,power,meta)||{},damage=typeof result==='number'?result:result.damage||0;this.hits++;this.damage+=damage;this.weakHits+=result.weak?1:0;this.lastHits.push({id:hit.unit?.id||hit.missile?.id||hit.kind,part:hit.part,damage,weak:!!result.weak,weapon:meta.weapon});if(this.lastHits.length>24)this.lastHits.shift();this.effect({kind:'impact',point:new THREE.Vector3().copy(hit.point),weak:!!result.weak,color:BASIC_ATTACKS[meta.weapon].color});}
 shoot(from,direction,advance){const weapon=this.selected,c=this.config,id=++this.sequence;this.shots++;this.byWeapon[weapon]++;this.onShot(weapon);this.effect({kind:'muzzle',point:from.clone(),color:c.color});if(weapon==='sweep'){
   const orb=this.getOrbHit(from,direction,c);if(orb)this.hit(orb,c.damage,{weapon,id});const forward=direction.clone().setY(0).normalize();this.effect({kind:'sweep',point:from.clone(),direction:forward,color:c.color});for(const contact of massContacts(from,this.getUnits(),c.range)){const d=contact.point.clone().sub(from),flat=d.clone().setY(0);if(Math.abs(d.y)>c.vertical||flat.lengthSq()>1e-6&&flat.normalize().dot(forward)<Math.cos(c.arc*Math.PI/360))continue;const hit=traceImpact(from,contact.point,{sections:this.getSections(),targets:[contact.unit],ground:false,radius:.015});if(hit?.unit!==contact.unit)continue;this.hit(hit,c.damage,{weapon,id});}return;
  }
  const dir=direction.clone().normalize();if(c.spread){const side=new THREE.Vector3().crossVectors(dir,Math.abs(dir.y)>.95?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0)).normalize(),up=new THREE.Vector3().crossVectors(side,dir),angle=this.random()*Math.PI*2,r=Math.sqrt(this.random())*Math.tan(c.spread*Math.PI/180);dir.addScaledVector(side,Math.cos(angle)*r).addScaledVector(up,Math.sin(angle)*r).normalize();}
  this.projectiles.push({weapon,id,position:from.clone(),direction:dir,traveled:0,advance});
 }
 update(dt,{requested=false,from=new THREE.Vector3(),direction=new THREE.Vector3(0,0,1),energy}={}){
  dt=Math.max(0,dt);for(const e of this.effects)e.age+=dt;this.effects=this.effects.filter(e=>e.age<(e.kind==='sweep'?.16:e.kind==='muzzle'?.045:.16));this.firing=false;
  for(const p of this.projectiles)p.advance=dt;
  let due=this.cooldown,count=0;const c=this.config;
  if(requested&&this.selected!=='beam'&&dt>0){while(due<dt-1e-9&&count++<BASIC_LIMITS.catchUpShots){if(this.projectiles.length>=BASIC_LIMITS.projectiles||!energy?.spend(c.cost))break;const at=Math.max(0,due),spawn=this.previousFrom?this.previousFrom.clone().lerp(from,Math.min(1,at/dt)):from.clone();this.shoot(spawn,direction,dt-at);this.firing=true;due+=1/c.rate;}}
  this.cooldown=Math.max(0,due-dt);this.previousFrom=from.clone();
  for(let i=this.projectiles.length-1;i>=0;i--){const p=this.projectiles[i],cfg=BASIC_ATTACKS[p.weapon],distance=Math.min(cfg.range-p.traveled,cfg.speed*p.advance),to=p.position.clone().addScaledVector(p.direction,distance),hit=this.trace(p.position,to,cfg.radius);p.traveled+=distance;p.position.copy(hit?.point||to);if(hit){this.hit(hit,cfg.damage,{weapon:p.weapon,id:p.id});this.projectiles.splice(i,1);}else if(p.traveled>=cfg.range-1e-8)this.projectiles.splice(i,1);}
 }
 diagnostics(){return{selected:this.selected,name:this.config.name,shots:this.shots,byWeapon:{...this.byWeapon},hits:this.hits,weakHits:this.weakHits,damage:this.damage,projectiles:this.projectiles.length,projectileCap:BASIC_LIMITS.projectiles,effects:this.effects.length,cooldown:this.cooldown,lastHits:this.lastHits.map(h=>({...h}))};}
}

import * as THREE from './vendor/three.module.js';
import {RUNNER_ENERGY} from './runner-energy.js?v=weapon-drain-77';
import {massContacts} from './critical-mass.js?v=critical-mass-257';
import {traceImpact,segmentBoxFraction} from './combat-collision.js?v=evac-performance-233';
export const VOLT_STORM=Object.freeze({strikeCost:75,strikeDelay:3,strikeCooldown:8,strikeDamage:960,strikeRadius:10,strikeHeight:150,strikeEdge:.35,strikeBuildingScale:.11,strikeRange:100,ultimateCost:RUNNER_ENERGY.capacity*2/3,ultimateCooldown:16,orbCastSeconds:1,orbRadius:2.5,orbSpeed:8,orbEnergy:100,orbLife:20,orbDrain:1,zapRange:32,zapInterval:.45,zapCost:6,zapDamage:65,zapTargets:3,rechargeFactor:.5,buildingDamagePerSecond:20,buildingDrainPerSecond:2,buildingTickSeconds:.1,buildingMaxContacts:6,contactTolerance:.015,sweepIterations:24});
// Project the portion of each oriented hitbox inside the column's height band.
const identity=new THREE.Quaternion();
function columnContact(top,base,{center,half,rotation},radius){
 const reach=Math.hypot(half.x,half.y,half.z);
 if(center.y+reach<base.y||center.y-reach>top.y||Math.hypot(center.x-base.x,center.z-base.z)>radius+reach)return null;
 const fraction=segmentBoxFraction(top,base,center,half,rotation,0);
 if(fraction!==null)return {point:top.clone().lerp(base,fraction),distance:0};
 const q=rotation||identity,corners=[];
 for(let i=0;i<8;i++){
  const corner=new THREE.Vector3(i&1?half.x:-half.x,i&2?half.y:-half.y,i&4?half.z:-half.z);
  corners.push(corner.applyQuaternion(q).add(center));
 }
 const projected=corners.filter(p=>p.y>=base.y&&p.y<=top.y);
 for(let i=0;i<8;i++)for(const axis of [1,2,4]){
  if(i&axis)continue;
  const a=corners[i],b=corners[i|axis];
  for(const y of [base.y,top.y]){
   if(Math.min(a.y,b.y)<y&&Math.max(a.y,b.y)>y)projected.push(a.clone().lerp(b,(y-a.y)/(b.y-a.y)));
  }
 }
 let nearest=null,best=radius**2;
 // The closest point is on the projection boundary. Pairs include all of its edges.
 for(let i=0;i<projected.length;i++)for(let j=i;j<projected.length;j++){
  const a=projected[i],b=projected[j],dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz;
  const t=length>0?THREE.MathUtils.clamp(((base.x-a.x)*dx+(base.z-a.z)*dz)/length,0,1):0;
  const distance=(a.x+t*dx-base.x)**2+(a.z+t*dz-base.z)**2;
  if(distance<=best){best=distance;nearest=a.clone().lerp(b,t);}
 }
 return nearest&&{point:nearest,distance:Math.sqrt(best)};
}
export class RunnerStorm {
 constructor({getUnits,getSections,onHit=()=>0,onEvent=()=>{},onStrikeBuildings=()=>{},groundHeight=()=>.08,bounds={minX:-56,maxX:56,minZ:-56,maxZ:56}}){Object.assign(this,{getUnits,getSections,onHit,onEvent,onStrikeBuildings,groundHeight,bounds});this.reset();}
 reset(){this.cancelCast();this.orb=null;this.strike=null;this.events=[];this.strikeCooldown=this.ultimateCooldown=this.strikes=this.casts=this.zaps=this.damage=this.recharged=0;this.buildingDamage=this.buildingEnergySpent=this.buildingTicks=0;this.sequence=0;}
 event(e){this.events.push({...e,age:0});if(this.events.length>32)this.events.shift();}
 clear(a,b,radius=0){return !traceImpact(a,b,{sections:this.getSections(),ground:false,radius});}
 callStrike(point,energy){if(this.strike||this.strikeCooldown>1e-8||!point||!energy.spend(VOLT_STORM.strikeCost))return false;this.liberation?.cast('sky-strike',VOLT_STORM.strikeDamage,point);this.strike={point:point.clone(),remaining:VOLT_STORM.strikeDelay};this.strikeCooldown=VOLT_STORM.strikeCooldown;this.onEvent('warning');return true;}
 launch(from,direction,energy,paid=false){const c=VOLT_STORM;if(this.ultimateCooldown>1e-8||!paid&&energy.amount<c.ultimateCost-1e-8)return false;const dir=direction.clone().normalize(),position=from.clone().addScaledVector(dir,c.orbRadius+1);position.y=Math.max(position.y,this.groundHeight(position.x,position.z)+c.orbRadius+.2);if(!this.clear(from,position,.4)||!this.clear(position,position,c.orbRadius))return false;if(!paid&&!energy.spend(c.ultimateCost))return false;if(this.orb)this.event({kind:'fade',point:this.orb.position.clone()});this.orb={id:++this.sequence,position,direction:dir,energy:c.orbEnergy,age:0,zapClock:0,parked:false,flash:0,buildingClock:0,contacting:false};this.ultimateCooldown=c.ultimateCooldown;this.casts++;this.liberation?.cast('ball-lightning',c.zapDamage,position);this.onEvent('launch');return true;}
 beginCast(from,direction,energy){const c=VOLT_STORM;if(this.cast||this.ultimateCooldown>1e-8||!energy.spend(c.ultimateCost))return false;this.cast={from:from.clone(),direction:direction.clone().normalize(),remaining:c.orbCastSeconds,energy};this.onEvent('casting');return true;}
 cancelCast(){if(!this.cast)return;const e=this.cast.energy;e.amount=Math.min(RUNNER_ENERGY.capacity,e.amount+VOLT_STORM.ultimateCost);e.spent=Math.max(0,e.spent-VOLT_STORM.ultimateCost);e.discharges=Math.max(0,e.discharges-1);this.cast=null;}
 castPose(from,direction){if(this.cast){this.cast.from.copy(from);this.cast.direction.copy(direction).normalize();}}
 recharge(power,o=this.orb){if(!o||power<=0)return 0;const gain=Math.min(VOLT_STORM.orbEnergy-o.energy,power*VOLT_STORM.rechargeFactor);o.energy+=gain;o.flash=1;this.recharged+=gain;this.liberation?.orbCharged(o,gain);return gain;}
 rechargeBlast(origin,radius,power){if(this.orb&&origin.distanceTo(this.orb.position)<=radius+VOLT_STORM.orbRadius&&this.clear(origin,this.orb.position))return this.recharge(power);return 0;}
 trace(a,b,radius=0){
  if(!this.liberation)return this.traceOrb(a,b,radius,this.orb);
  return this.liberation.orbs().map(o=>this.traceOrb(a,b,radius,o)).filter(Boolean).sort((x,y)=>x.t-y.t)[0]||null;
 }
 traceOrb(a,b,radius,o){if(!o)return null;const delta=b.clone().sub(a),m=a.clone().sub(o.position),r=VOLT_STORM.orbRadius+radius,c=m.lengthSq()-r*r;let t=0;if(c>0){const aa=delta.lengthSq(),bb=m.dot(delta),d=bb*bb-aa*c;if(aa<1e-12||d<0)return null;t=(-bb-Math.sqrt(d))/aa;if(t<0||t>1)return null;}return{kind:'volt-orb',voltOrb:true,energyOrb:o,t,point:a.clone().addScaledVector(delta,t)};}
 strikeNow(point){
  const c=VOLT_STORM,base=point.clone(),top=base.clone().add(new THREE.Vector3(0,c.strikeHeight,0));
  const power=distance=>c.strikeDamage*(1-(1-c.strikeEdge)*distance/c.strikeRadius);
  this.liberation?.strike(point);this.strikes++;
  this.event({kind:'strike',point:base.clone()});
  this.onEvent('strike');
  if(this.orb){
   const axis=base.clone().setY(THREE.MathUtils.clamp(this.orb.position.y,base.y,top.y));
   const lateral=Math.max(0,Math.hypot(this.orb.position.x-axis.x,this.orb.position.z-axis.z)-c.strikeRadius);
   if(Math.hypot(lateral,this.orb.position.y-axis.y)<=c.orbRadius)this.recharge(c.strikeDamage);
  }
  // Route one hit per robot through its existing part and armor rules.
  for(const unit of this.getUnits()){
   if(!unit.alive||unit.kind!=='robot'||unit.hidden||unit.dashPhased)continue;
   let best=null;
   for(const shape of unit.shapes||[]){
    const contact=columnContact(top,base,shape,c.strikeRadius);
    if(contact&&(!best||contact.distance<best.distance||contact.distance===best.distance&&contact.point.y>best.point.y))best={...contact,part:shape.part};
   }
   if(best)this.damage+=this.onHit({kind:'unit',unit,part:best.part,point:best.point},power(best.distance),'sky-strike')||0;
  }
  const sections=this.getSections(),buildings=new Set();
  for(const section of sections.querySegment?.(top,base,c.strikeRadius)||sections){
   if(!this.buildingSolid(section)||!section.building)continue;
   const [x,y,z]=section.size;
   const contact=columnContact(top,base,{center:section.body?.position||section,
    half:{x:x/2,y:y/2,z:z/2},rotation:section.body?.quaternion},c.strikeRadius);
   if(!contact)continue;
   const dealt=this.onHit({kind:'building',section,point:contact.point},power(contact.distance)*c.strikeBuildingScale,'sky-strike')||0;
   if(dealt>0){this.damage+=dealt;buildings.add(section.building);}
  }
  if(buildings.size)this.onStrikeBuildings(buildings);
 }

 buildingSolid(section){return !section.hidden&&!section.collisionDisabled&&(!section.state||section.state==='intact')&&(section.hp===undefined||section.hp>0);}
 buildingPoint(position,section){const rotation=new THREE.Quaternion().copy(section.body?.quaternion||{x:0,y:0,z:0,w:1}),center=section.body?.position||section,point=position.clone().sub(center).applyQuaternion(rotation.clone().invert());for(let i=0;i<3;i++){const axis=['x','y','z'][i];point[axis]=THREE.MathUtils.clamp(point[axis],-section.size[i]/2,section.size[i]/2);}point.applyQuaternion(rotation).add(center);return{section,point,distance:point.distanceTo(position)};}
 buildingCandidates(a,b){const sections=this.getSections();return sections.querySegment?sections.querySegment(a,b,VOLT_STORM.orbRadius+VOLT_STORM.contactTolerance):sections;}
 buildingContacts(position){const c=VOLT_STORM,hits=[];for(const section of this.buildingCandidates(position,position)){if(!this.buildingSolid(section))continue;const hit=this.buildingPoint(position,section);if(hit.distance<=c.orbRadius+c.contactTolerance)hits.push(hit);}return hits.sort((a,b)=>a.distance-b.distance).slice(0,c.buildingMaxContacts);}
 buildingSweep(from,to){const c=VOLT_STORM,delta=to.clone().sub(from),length=delta.length();let best=null;for(const section of this.buildingCandidates(from,to)){if(!this.buildingSolid(section))continue;let t=0;for(let i=0;i<c.sweepIterations&&t<=1;i++){const position=from.clone().addScaledVector(delta,t),hit=this.buildingPoint(position,section),gap=hit.distance-c.orbRadius;if(gap<=c.contactTolerance){if(!best||t<best.t)best={...hit,t,position};break;}if(length<1e-9)break;t+=Math.max(gap-c.contactTolerance*.5,c.contactTolerance*.25)/length;}}return best;}
 damageBuildings(dt){const o=this.orb,c=VOLT_STORM;let contacts=this.buildingContacts(o.position);o.contacting=contacts.length>0;if(!contacts.length){o.buildingClock=0;return;}o.buildingClock+=dt;while(o.buildingClock>=c.buildingTickSeconds-1e-9&&o.energy>1e-8){o.buildingClock-=c.buildingTickSeconds;contacts=this.buildingContacts(o.position);if(!contacts.length)break;const spend=Math.min(o.energy,c.buildingDrainPerSecond*c.buildingTickSeconds),fraction=spend/(c.buildingDrainPerSecond*c.buildingTickSeconds),power=c.buildingDamagePerSecond*c.buildingTickSeconds*fraction/contacts.length;let dealt=0;for(const hit of contacts){const damage=this.onHit({kind:'building',section:hit.section,point:hit.point},power,'ball-lightning-contact')||0;dealt+=damage;if(damage>0)this.event({kind:'contact',from:o.position.clone(),point:hit.point.clone()});}if(dealt>0){o.energy=Math.max(0,o.energy-spend);o.flash=Math.max(o.flash,.25);this.buildingEnergySpent+=spend;this.buildingDamage+=dealt;this.damage+=dealt;this.buildingTicks++;}}}
 update(dt){if(!(dt>0))return;const c=VOLT_STORM;dt=Math.max(0,dt);let orbDt=dt;for(const e of this.events)e.age+=dt;this.events=this.events.filter(e=>e.age<(e.kind==='strike'?.65:.25));this.strikeCooldown=Math.max(0,this.strikeCooldown-dt);this.ultimateCooldown=Math.max(0,this.ultimateCooldown-dt);
  if(this.cast){this.cast.remaining-=dt*(1+(this.liberation?.v('Overclock Chip')||0)/100);if(this.cast.remaining<=1e-9){const c=this.cast;if(this.launch(c.from,c.direction,c.energy,true)){orbDt=Math.max(0,-c.remaining);this.cast=null;}else{this.cancelCast();this.onEvent('blocked');}}}
  if(this.strike){this.strike.remaining-=dt;if(this.strike.remaining<=1e-9){const point=this.strike.point;this.strike=null;this.strikeNow(point);}}
  this.stepOrb(orbDt);
 }
 stepOrb(orbDt){const c=VOLT_STORM,o=this.orb;if(!o)return;o.age+=orbDt;o.flash=Math.max(0,o.flash-orbDt*3);o.energy=Math.max(0,o.energy-c.orbDrain*orbDt);if(c.orbLife>0&&o.age>=c.orbLife-1e-8||o.energy<=1e-8){this.liberation?.expireOrb(o);this.event({kind:'fade',point:o.position.clone()});this.orb=null;return;}
  if(!o.parked||!this.buildingContacts(o.position).length){const next=o.position.clone().addScaledVector(o.direction,c.orbSpeed*orbDt);next.y=Math.max(next.y,this.groundHeight(next.x,next.z)+c.orbRadius+.2);if(next.x<=this.bounds.minX+c.orbRadius||next.x>=this.bounds.maxX-c.orbRadius||next.z<=this.bounds.minZ+c.orbRadius||next.z>=this.bounds.maxZ-c.orbRadius){next.x=THREE.MathUtils.clamp(next.x,this.bounds.minX+c.orbRadius,this.bounds.maxX-c.orbRadius);next.z=THREE.MathUtils.clamp(next.z,this.bounds.minZ+c.orbRadius,this.bounds.maxZ-c.orbRadius);this.event({kind:'fade',point:next});this.orb=null;return;}const contact=this.buildingSweep(o.position,next);o.parked=!!contact;o.position.copy(contact?contact.position:next);}
  this.damageBuildings(orbDt);
  o.zapClock-=orbDt;while(o.zapClock<=1e-9){o.zapClock+=c.zapInterval;const targets=massContacts(o.position,this.getUnits(),c.zapRange).sort((a,b)=>a.distance-b.distance),selected=[];for(const h of targets){const hit=traceImpact(o.position,h.point,{sections:this.getSections(),targets:[h.unit],ground:false,radius:.02});if(hit?.unit===h.unit)selected.push(hit);if(selected.length>=c.zapTargets)break;}for(const hit of selected){if(o.energy<c.zapCost)break;o.energy-=c.zapCost;this.zaps++;this.damage+=this.onHit(hit,c.zapDamage,'ball-lightning-'+o.id+'-'+this.zaps)||0;this.event({kind:'zap',from:o.position.clone(),point:new THREE.Vector3().copy(hit.point)});}if(selected.length)this.onEvent('zap');}
  if(o.energy<=1e-8){this.liberation?.expireOrb(o);this.event({kind:'fade',point:o.position.clone()});this.orb=null;}
 }
 diagnostics(){return{buildingDamage:this.buildingDamage,buildingEnergySpent:this.buildingEnergySpent,buildingTicks:this.buildingTicks,casting:this.cast?{remaining:this.cast.remaining,position:this.cast.from.toArray()}:null,strike:this.strike?{point:this.strike.point.toArray(),remaining:this.strike.remaining}:null,strikeCooldown:this.strikeCooldown,ultimateCooldown:this.ultimateCooldown,strikes:this.strikes,casts:this.casts,zaps:this.zaps,damage:this.damage,recharged:this.recharged,orb:this.orb?{position:this.orb.position.toArray(),energy:this.orb.energy,maxEnergy:VOLT_STORM.orbEnergy,age:this.orb.age,parked:this.orb.parked,contacting:this.orb.contacting}:null};}
}

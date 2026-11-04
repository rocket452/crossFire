import * as THREE from './vendor/three.module.js';
import {ArgusModel} from './argus-model.js';
import {ArgusGait} from './argus-gait.js';
import {interceptionPath,predictConvoyDistance,routePoint} from './convoy-map-config.js';
import {traceImpact} from './combat-collision.js';
export class Argus {
 constructor(scene,damage,gltf,spec,config,{getConvoy,physics,onEvent=()=>{},onSpark=()=>{},onStomp=()=>{},...callbacks}){
  Object.assign(this,{damage,config,getConvoy,physics,onEvent,onSpark,onStomp});this.evac=true;this.suppressDamageFlash=true;this.model=new ArgusModel(scene,gltf,spec,config,callbacks);this.root=this.model.root;this.nodes=this.model.nodes;this.meshes=this.model.meshes;this.gait=new ArgusGait({...config.gait,turnSpeed:config.movement.turnSpeed});this.reset();
 }
 reset(){
  this.damage.units=this.damage.units.filter(u=>u.entity!==this);this.combatUnit=this.damage.add('argus','robot',this,this.config.health);this.model.walker.combatUnit=this.combatUnit;this.model.reset();this.joints=new Map(this.config.joints.locations.map(p=>[p.id,{...p,health:this.config.joints.health,destroyed:false}]));this.dead=false;this.stunRemaining=0;this.stunKind=null;this.time=0;this.replanClock=0;this.replans=0;this.lastConvoyState='';this.plan=null;this.lanePath=[];this.waypoint=0;this.breachClock=0;this.breaches=0;this.blocked=false;this.slam=null;this.slamCooldown=0;this.slams=0;this.sparkClock=0;this.damageTaken=0;
  this.pose=this.gait.reset(this.config.spawn,this.config.spawn.yaw);this.model.pose(this.pose,0);this.model.paint(this.joints,0);this.sync();
 }
 get speedMultiplier(){const destroyed=[...this.joints.values()].filter(j=>j.destroyed).length;return 1-Math.min(this.config.joints.maximumSpeedPenalty,destroyed*this.config.joints.speedPenalty);}
 get strideSpeed(){return this.config.movement.speed*this.speedMultiplier;}
 get windup(){return this.slam?Math.max(0,this.config.melee.windup-this.slam.age):0;}
 sideDamage(){return{l:[...this.joints.values()].filter(j=>j.side==='l'&&j.destroyed).length,r:[...this.joints.values()].filter(j=>j.side==='r'&&j.destroyed).length};}
 modifyDamage(power,point,part){
  if(this.dead)return 0;if(part==='argus-core-closed')return power*this.config.armor.coreDamageScale;
  const joint=this.joints.get(part);if(joint){if(joint.destroyed&&this.config.joints.permanentDestruction)return 0;const damage=Math.min(joint.health,power);joint.health=Math.max(0,joint.health-damage);this.onSpark(this.model.targetPosition(part));if(joint.health===0&&!joint.destroyed){joint.destroyed=true;this.replanClock=0;this.onEvent('ARGUS '+part.replace('argus-','').toUpperCase()+' JOINT DESTROYED · stride '+Math.round(this.speedMultiplier*100)+'%.');}this.model.paint(this.joints,this.time);return damage*this.config.joints.hullDamageScale;}
  return power*this.config.armor.bodyDamageScale;
 }
 recordHit(kind,team,damage){this.damageTaken+=damage;}
 aimPoint(){return this.root.localToWorld(new THREE.Vector3(0,13,1));}
 stun(seconds=1,kind='electric'){if(this.dead)return false;this.stunKind=kind;this.stunRemaining=Math.max(this.stunRemaining,seconds);this.slam=null;this.model.telegraph.visible=false;this.replanClock=0;return true;}
 replan(reason='timer'){
  const convoy=this.getConvoy(),c=this.config.interception;if(!convoy||convoy.terminal||!convoy.activeBuses.length)return;
  let chosen=null;
  for(let t=c.minimumLead;t<=c.maximumPrediction&&!chosen;t+=c.predictionStep){
   for(const bus of convoy.activeBuses){const d=predictConvoyDistance(convoy,t)-bus.index*convoy.config.busSpacing;if(d>=convoy.length)continue;const current=convoy.distance-bus.index*convoy.config.busSpacing,progress=Math.max(current,Math.min(convoy.length,d)),point=routePoint(convoy.config.map.route,progress),path=interceptionPath(convoy.config.map,this.root.position,point),travel=path.distance/this.strideSpeed+c.breachAllowance;
    if(travel<=t){chosen={bus:bus.id,point:{x:point.x,z:point.z},busProgress:progress,leadSeconds:t,travelSeconds:travel,path,reason};break;}
   }
  }
  if(!chosen){const bus=convoy.activeBuses.at(-1),progress=Math.max(convoy.distance-bus.index*convoy.config.busSpacing,convoy.length-this.config.movement.arrivalRadius),point=routePoint(convoy.config.map.route,progress);chosen={bus:bus.id,point:{x:point.x,z:point.z},busProgress:progress,leadSeconds:null,path:interceptionPath(convoy.config.map,this.root.position,point),reason};}
  this.plan=chosen;this.lanePath=chosen.path.points;this.waypoint=0;this.replanClock=c.replanInterval;this.replans++;
 }
 sync(){this.combatUnit.shapes=this.dead?[]:this.model.shapes(this.joints);}
 damageObstacles(contacts,dt){
  this.blocked=contacts.length>0;this.breachClock=Math.max(0,this.breachClock-dt);if(!contacts.length||this.breachClock>0)return;
  for(const section of contacts.slice(0,this.config.breach.contactsPerTick)){const p=section.body.position;this.physics.impact(p,this.config.breach.power,this.config.breach.radius,section,{source:'argus'});this.onSpark(new THREE.Vector3(p.x,p.y,p.z));this.breaches++;}this.breachClock=this.config.breach.interval;
 }
 nearestBus(){return this.getConvoy().activeBuses.filter(b=>Math.hypot(b.root.position.x-this.root.position.x,b.root.position.z-this.root.position.z)<=this.config.melee.range).sort((a,b)=>a.root.position.distanceToSquared(this.root.position)-b.root.position.distanceToSquared(this.root.position))[0];}
 update(dt,time){
  this.time=time;this.model.effects(dt);if(this.dead){this.model.updateDeath(dt,time);this.model.paint(this.joints,time,true);this.sync();return;}
  const convoy=this.getConvoy();if(!convoy)return;
  this.stunRemaining=Math.max(0,this.stunRemaining-dt);this.slamCooldown=Math.max(0,this.slamCooldown-dt);
  const signature=convoy.phase+':'+convoy.completedPickups+':'+convoy.activeBuses.map(b=>b.id).join(',');this.replanClock-=dt;
  if(!convoy.terminal&&(this.replanClock<=0||signature!==this.lastConvoyState)){this.replan(signature!==this.lastConvoyState?'convoy-state':'timer');this.lastConvoyState=signature;}
  if(!convoy.terminal&&!this.stunRemaining){
   const nearby=this.nearestBus();if(nearby&&!this.slam&&this.slamCooldown===0&&this.gait.feet.every(f=>f.grounded)){this.slam={bus:nearby,point:nearby.root.position.clone(),age:0,impacted:false};this.onEvent('ARGUS STOMP · bus '+(nearby.index+1)+' in danger.');}
   if(this.slam){
    this.slam.age+=dt;const c=this.config.melee,progress=Math.min(1,this.slam.age/c.windup);this.model.pose(this.pose,time,{point:this.slam.point,progress});
    if(this.slam.age>=c.windup&&!this.slam.impacted){this.slam.impacted=true;this.slams++;this.model.impactAt(this.slam.point);this.onStomp(this.slam.point);const bus=this.slam.bus,from=this.root.position.clone().add(new THREE.Vector3(0,2,0)),to=bus.root.position.clone().add(new THREE.Vector3(0,1,0));if(!bus.destroyed&&!bus.escaped&&this.root.position.distanceTo(bus.root.position)<=c.range+1&&Math.hypot(bus.root.position.x-this.slam.point.x,bus.root.position.z-this.slam.point.z)<=c.impactRadius&&!traceImpact(from,to,{sections:this.physics.chunks,ground:false})){this.damage.hurt(bus.unit,c.busDamage,to);} }
    if(this.slam.age>=c.windup+c.recovery){this.slam=null;this.slamCooldown=c.cooldown;this.model.telegraph.visible=false;}
   }else{
    while(this.waypoint<this.lanePath.length&&Math.hypot(this.root.position.x-this.lanePath[this.waypoint].x,this.root.position.z-this.lanePath[this.waypoint].z)<this.config.movement.waypointRadius)this.waypoint++;
    const target=nearby?this.gait.position:this.lanePath[this.waypoint]||this.gait.position,snapshot=this.gait.snapshot(),previousBounds=this.model.hullBounds(),oldPose=structuredClone(this.pose);
    const pose=this.gait.update(dt,target,this.strideSpeed,this.sideDamage());this.model.pose(pose,time);const contacts=this.model.blockers(this.physics.chunks,previousBounds);
    if(contacts.length){this.gait.restore(snapshot);this.pose=oldPose;this.model.pose(oldPose,time);this.damageObstacles(contacts,dt);}else{this.pose=pose;this.blocked=false;this.breachClock=Math.max(0,this.breachClock-dt);for(const step of pose.landings)this.onSpark(new THREE.Vector3(step.x,.1,step.z));}
   }
  }else{this.slam=null;this.model.pose(this.pose,time);}
  this.sparkClock-=dt;if(this.sparkClock<=0){for(const j of this.joints.values())if(j.destroyed)this.onSpark(this.model.targetPosition(j.id));this.sparkClock=this.config.joints.sparkInterval;}
  this.model.paint(this.joints,time,false,this.slam&&!this.slam.impacted?Math.sin(time*Math.PI*this.config.melee.flashHz)**2:0);this.sync();
 }
 destroy(){if(this.dead)return;this.dead=true;this.slam=null;this.model.destroy();this.sync();this.onEvent('ARGUS destroyed · get the surviving buses out.');}
 disable(unit){if(unit!==this.combatUnit)return false;this.destroy();return true;}
 syncWrecks(){this.model.syncWrecks();}
 diagnostics(){return{health:this.combatUnit.health,maxHealth:this.combatUnit.maxHealth,dead:this.dead,position:this.root.position.toArray(),strideSpeed:this.strideSpeed,speedMultiplier:this.speedMultiplier,sideDamage:this.sideDamage(),joints:[...this.joints.values()].map(j=>({...j,position:this.model.targetPosition(j.id).toArray()})),coreOpen:false,plan:this.plan?{...this.plan,path:undefined}:null,lanePath:this.lanePath,waypoint:this.waypoint,replans:this.replans,blocked:this.blocked,breaches:this.breaches,slams:this.slams,windup:this.windup,stunned:this.stunRemaining,wrecks:this.model.walker.wrecks.length,gait:this.gait.diagnostics()};}
}

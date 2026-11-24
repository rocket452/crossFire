import * as THREE from './vendor/three.module.js';
import {COMBAT_ARENA} from './combat-arena-config.js?v=mireguard-pairs-260';
const V=()=>new THREE.Vector3(),flat=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const approach=(value,target,step)=>value+THREE.MathUtils.clamp(target-value,-step,step);
// Pursuit only: weapons remain inactive until the ground landing finishes.
export class RoninFlight {
 constructor(actor){this.actor=actor;this.reset();}
 reset(){this.state=null;this.count=0;}
 target(){const a=this.actor,units=a.getTargets(a.root.position).filter(u=>u.alive&&u.shapes.length&&(u.kind!=='hero'||a.sensesHero(u)&&a.visible(a.aimPoint(),u.shapes[0].center)));return units.find(u=>u.entity?.active)||units.find(u=>u===a.target)||units.sort((x,y)=>flat(a.root.position,x.shapes[0].center)-flat(a.root.position,y.shapes[0].center))[0]||null;}
 height(goal){const a=this.actor,c=a.config,p=a.root.position,dx=goal.x-p.x,dz=goal.z-p.z,length=dx*dx+dz*dz;let y=c.flightHeight;
  for(const b of a.getBuildings()){const t=length?THREE.MathUtils.clamp(((b.x-p.x)*dx+(b.z-p.z)*dz)/length,0,1):0;
   if(Math.hypot(b.x-p.x-t*dx,b.z-p.z-t*dz)<c.flightBuildingMargin)y=Math.max(y,b.floors*3+c.flightClearance);
  }return y;
 }
 landing(target){const a=this.actor,c=a.config,b=COMBAT_ARENA.movementBounds,base=Math.atan2(a.root.position.x-target.x,a.root.position.z-target.z),candidates=[];
  for(const radius of[c.flightLandingRadius,c.flightLandingRadius+12,c.flightLandingRadius-12])for(let i=0;i<16;i++){
   const angle=base+(i%2?-1:1)*Math.ceil(i/2)*Math.PI/8,p=new THREE.Vector3(THREE.MathUtils.clamp(target.x+Math.sin(angle)*radius,b.minX,b.maxX),.1,THREE.MathUtils.clamp(target.z+Math.cos(angle)*radius,b.minZ,b.maxZ));
   if(a.isPathClear(p,p)&&flat(p,target)<a.config.dashRange)candidates.push(p);
  }return candidates.sort((p,q)=>flat(p,a.root.position)-flat(q,a.root.position))[0]||null;
 }
 update(dt){const a=this.actor,c=a.config;if(!a.spawned||a.dead)return false;const unit=this.target();
  if(!this.state){if(a.swordState||a.stunRemaining>0||!unit||flat(a.root.position,unit.shapes[0].center)<=c.flightStartRange)return false;
   a.cancelBurst();this.state={phase:'takeoff',age:0,speed:0,landing:null,target:unit.id};this.count++;
  }
  const s=this.state;s.age+=dt;a.age+=dt;a.cooldown=Math.max(0,a.cooldown-dt);a.flinch=Math.max(0,a.flinch-dt);a.stunRemaining=Math.max(0,a.stunRemaining-dt);a.moving=false;
  let goal=unit?V().copy(unit.shapes[0].center):a.root.position.clone();if(unit){a.target=unit;a.lastSeen=goal.clone();s.target=unit.id;}
  if(a.stunRemaining>0){s.speed=0;a.mode='flight-stunned';a.model.animate(dt,a.age,a);a.sync();return true;}
  if(!unit&&s.phase!=='landing'){s.landing=this.landing(a.root.position);if(s.landing){s.phase='landing';s.age=0;}}
  if(s.phase==='landing'&&unit&&flat(a.root.position,goal)>c.flightStartRange){s.phase='cruise';s.landing=null;s.age=0;}
  if(s.phase==='cruise'&&flat(a.root.position,goal)<=c.flightStopRange){const landing=this.landing(goal);if(landing){s.phase='landing';s.landing=landing;s.age=0;}}
  const destination=s.landing||goal,height=s.phase==='landing'&&flat(a.root.position,destination)<1?.1:this.height(destination);
  // Gain building clearance before moving horizontally; land only over a clear footprint.
  a.root.position.y=approach(a.root.position.y,height,(height>a.root.position.y?c.flightRiseSpeed:c.flightDescendSpeed)*dt);
  if(s.phase==='takeoff'&&s.age>=c.flightTakeoffTime&&a.root.position.y>=height-.2){s.phase='cruise';s.age=0;}
  const delta=destination.clone().sub(a.root.position).setY(0),distance=delta.length(),facing=goal.clone().sub(a.root.position).setY(0),yaw=Math.atan2(facing.x,facing.z),turn=Math.atan2(Math.sin(yaw-a.root.rotation.y),Math.cos(yaw-a.root.rotation.y));a.root.rotation.y+=THREE.MathUtils.clamp(turn,-c.flightTurnRate*dt,c.flightTurnRate*dt);
  const moving=s.phase!=='takeoff'&&a.root.position.y>=height-.2&&distance>.1;
  s.speed=approach(s.speed,moving?Math.min(c.flightSpeed,distance*3):0,c.flightAcceleration*dt);
  if(moving){const b=COMBAT_ARENA.movementBounds;a.root.position.addScaledVector(delta.normalize(),Math.min(distance,s.speed*dt));a.root.position.x=THREE.MathUtils.clamp(a.root.position.x,b.minX,b.maxX);a.root.position.z=THREE.MathUtils.clamp(a.root.position.z,b.minZ,b.maxZ);}
  a.mode='flight-'+s.phase;
  if(s.phase==='landing'&&flat(a.root.position,destination)<1&&a.root.position.y<=.12){a.root.position.copy(destination);this.state=null;a.cooldown=Math.max(a.cooldown,c.flightLandingRecovery);a.model.animation.cancelDash();a.mode='flight-landed';}
  a.model.animate(dt,a.age,a);a.sync();return true;
 }
 diagnostics(){const s=this.state;return{active:!!s,phase:s?.phase||'ground',speed:s?.speed||0,target:s?.target||null,landing:s?.landing?.toArray()||null,count:this.count};}
}

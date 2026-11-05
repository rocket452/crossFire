import {RaiderEnergyEffects} from './raider-energy-effects.js?v=raider-energy-86';
import * as THREE from './vendor/three.module.js';
import {EvacRaider,RAIDER_COMBAT} from './evac-raider.js?v=bruiser-model-218';
import {ESCORT_APPROACH} from './evac-approach.js?v=evac-centered-215';
export class EvacRaiderSquad {
 constructor(scene,damage,{landing,idPrefix='evac-raider',route=null,label='outer boulevard',getHelicopter,getTargets,visible,trace,isPathClear,redirect,onHeroHit=()=>{},onDebris=()=>null,onRemoveDebris=()=>{},onDeath=()=>{},onWreck=()=>{},onEvent=()=>{}}){
  this.landing=landing;this.label=label;this.onEvent=onEvent;this.energyEffects=new RaiderEnergyEffects(scene);
  const count=ESCORT_APPROACH.squadSize,lanes=ESCORT_APPROACH.lanes,rows=Math.ceil(count/lanes.length);
  this.members=Array.from({length:count},(_,i)=>{const row=Math.floor(i/lanes.length),columns=Math.min(lanes.length,count-row*lanes.length),lane=columns===1?0:lanes[i%lanes.length],id=idPrefix+'-'+i;let member;const direction=route?new THREE.Vector3(route[1][0]-route[0][0],0,route[1][1]-route[0][1]).normalize():null,offset=direction?{x:direction.z*lane,z:-direction.x*lane}:{x:lane,z:0};const points=route?.slice(1).map(p=>new THREE.Vector3(p[0]+offset.x,.1,p[1]+offset.z));return member=new EvacRaider(scene,damage,{
   id,spawnPosition:route?{x:route[0][0]+offset.x,y:.1,z:route[0][1]+offset.z}:{x:landing.x+lane,y:.1,z:ESCORT_APPROACH.spawnZ-(rows-1-row)*ESCORT_APPROACH.rowSpacing},
   objective:()=>{if(!points)return new THREE.Vector3(landing.x+lane,.1,ESCORT_APPROACH.stopZ+row*ESCORT_APPROACH.rowSpacing);let index=member.routeIndex||0;while(index<points.length-1&&member.root.position.distanceTo(points[index])<1.15)index++;member.routeIndex=index;return points[index];},moveSpeed:ESCORT_APPROACH.speed,initialCooldown:4+i*.35,
   getTargets:origin=>{const heli=getHelicopter();return[...(heli?.alive&&heli.entity.root.position.y<12?[heli]:[]),...getTargets(origin)];},
   energyEffects:this.energyEffects,visible,trace,
   // Hold a row behind a blocked/stunned leader instead of stacking the tracks.
   isPathClear:(a,b)=>{if(!isPathClear(a,b))return false;const dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz)||1;return !(this.members||[]).some(r=>{if(r.id===id||!r.combatUnit?.alive)return false;const x=r.root.position.x-a.x,z=r.root.position.z-a.z,ahead=(x*dx+z*dz)/length,side=Math.abs(x*dz-z*dx)/length;return ahead>0&&ahead<3.6*RAIDER_COMBAT.modelScale&&side<2.9*RAIDER_COMBAT.modelScale+.1;});},redirect,onHeroHit,onDebris,onRemoveDebris,onDeath,onWreck,onEvent:message=>{if(!message.startsWith('Bruiser approaching'))onEvent(message);}
  });});this.spawned=false;
 }
 spawn(){if(this.spawned)return false;this.spawned=true;for(const r of this.members)r.spawn();this.onEvent('Bruiser squad inbound · '+this.members.length+' advancing from '+this.label+'.');return true;}
 reset(){this.spawned=false;for(const r of this.members){r.routeIndex=0;r.reset();}this.energyEffects.reset();}
 update(dt,time){for(const r of this.members)r.update(dt,time);this.energyEffects.update(dt,this.bolts);}
 syncWrecks(){for(const r of this.members)r.syncWrecks();}
 disable(unit){const r=this.members.find(r=>r.combatUnit===unit);if(!r)return false;r.destroy();return true;}
 getTarget(){return this.members.filter(r=>r.combatUnit?.alive).sort((a,b)=>a.root.position.distanceToSquared(new THREE.Vector3(this.landing.x,.1,this.landing.z))-b.root.position.distanceToSquared(new THREE.Vector3(this.landing.x,.1,this.landing.z)))[0]||null;}
 get bolts(){return this.members.flatMap(r=>r.bolts);}
 diagnostics(){const members=this.members.map(r=>r.diagnostics());return{spawned:this.spawned,count:members.length,energy:this.energyEffects.diagnostics(),alive:members.some(r=>r.alive),aliveCount:members.filter(r=>r.alive).length,health:members.reduce((n,r)=>n+r.health,0),maxHealth:members.reduce((n,r)=>n+r.maxHealth,0),shots:members.reduce((n,r)=>n+r.shots,0),received:members.reduce((n,r)=>n+r.received,0),members};}
}

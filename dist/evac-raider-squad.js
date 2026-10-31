import {RaiderEnergyEffects} from './raider-energy-effects.js?v=raider-energy-86';
import * as THREE from './vendor/three.module.js';
import {EvacRaider} from './evac-raider.js?v=raider-energy-86';
import {ESCORT_APPROACH} from './evac-approach.js?v=raider-energy-86';
export class EvacRaiderSquad {
 constructor(scene,damage,{landing,getHelicopter,getTargets,visible,trace,isPathClear,redirect,onHeroHit=()=>{},onDebris=()=>null,onRemoveDebris=()=>{},onDeath=()=>{},onWreck=()=>{},onEvent=()=>{}}){
  this.landing=landing;this.onEvent=onEvent;this.energyEffects=new RaiderEnergyEffects(scene);
  const count=ESCORT_APPROACH.squadSize,lanes=ESCORT_APPROACH.lanes,rows=Math.ceil(count/lanes.length);
  this.members=Array.from({length:count},(_,i)=>{const row=Math.floor(i/lanes.length),columns=Math.min(lanes.length,count-row*lanes.length),lane=columns===1?0:lanes[i%lanes.length],id='evac-raider-'+i;return new EvacRaider(scene,damage,{
   id,spawnPosition:{x:landing.x+lane,y:.1,z:ESCORT_APPROACH.spawnZ-(rows-1-row)*ESCORT_APPROACH.rowSpacing},
   objective:()=>new THREE.Vector3(landing.x+lane,.1,ESCORT_APPROACH.stopZ+row*ESCORT_APPROACH.rowSpacing),moveSpeed:ESCORT_APPROACH.speed,initialCooldown:4+i*.35,
   getTargets:origin=>{const heli=getHelicopter();return[...(heli?.alive&&heli.entity.root.position.y<12?[heli]:[]),...getTargets(origin)];},
   energyEffects:this.energyEffects,visible,trace,
   // Hold a row behind a blocked/stunned leader instead of stacking the tracks.
   isPathClear:(a,b)=>isPathClear(a,b)&&!(this.members||[]).some(r=>r.id!==id&&r.combatUnit?.alive&&Math.abs(r.root.position.x-b.x)<3.1&&r.root.position.z<a.z&&b.z-r.root.position.z<3.6),redirect,onHeroHit,onDebris,onRemoveDebris,onDeath,onWreck,onEvent:message=>{if(!message.startsWith('Raider robot approaching'))onEvent(message);}
  });});this.spawned=false;
 }
 spawn(){if(this.spawned)return false;this.spawned=true;for(const r of this.members)r.spawn();this.onEvent('Drone squad inbound · '+this.members.length+' tracked raiders advancing down the outer boulevard.');return true;}
 reset(){this.spawned=false;for(const r of this.members)r.reset();this.energyEffects.reset();}
 update(dt,time){for(const r of this.members)r.update(dt,time);this.energyEffects.update(dt,this.bolts);}
 syncWrecks(){for(const r of this.members)r.syncWrecks();}
 disable(unit){const r=this.members.find(r=>r.combatUnit===unit);if(!r)return false;r.destroy();return true;}
 getTarget(){return this.members.filter(r=>r.combatUnit?.alive).sort((a,b)=>a.root.position.distanceToSquared(new THREE.Vector3(this.landing.x,.1,this.landing.z))-b.root.position.distanceToSquared(new THREE.Vector3(this.landing.x,.1,this.landing.z)))[0]||null;}
 get bolts(){return this.members.flatMap(r=>r.bolts);}
 diagnostics(){const members=this.members.map(r=>r.diagnostics());return{spawned:this.spawned,count:members.length,energy:this.energyEffects.diagnostics(),alive:members.some(r=>r.alive),aliveCount:members.filter(r=>r.alive).length,health:members.reduce((n,r)=>n+r.health,0),maxHealth:members.reduce((n,r)=>n+r.maxHealth,0),shots:members.reduce((n,r)=>n+r.shots,0),received:members.reduce((n,r)=>n+r.received,0),members};}
}

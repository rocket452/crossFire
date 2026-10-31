import * as THREE from './vendor/three.module.js';
import {EvacRaider} from './evac-raider.js?v=raider-bolts-85';
import {ESCORT_APPROACH} from './evac-approach.js?v=drone-squad-65';
export class EvacRaiderSquad {
 constructor(scene,damage,{landing,getHelicopter,getTargets,visible,trace,isPathClear,redirect,onHeroHit=()=>{},onDebris=()=>null,onRemoveDebris=()=>{},onDeath=()=>{},onWreck=()=>{},onEvent=()=>{}}){
  this.landing=landing;this.onEvent=onEvent;
  this.members=ESCORT_APPROACH.lanes.map((lane,i)=>new EvacRaider(scene,damage,{
   id:'evac-raider-'+i,spawnPosition:{x:landing.x+lane,y:.1,z:ESCORT_APPROACH.spawnZ},
   objective:()=>new THREE.Vector3(landing.x+lane,.1,ESCORT_APPROACH.stopZ),moveSpeed:ESCORT_APPROACH.speed,initialCooldown:4+i*.35,
   getTargets:origin=>{const heli=getHelicopter();return[...(heli?.alive&&heli.entity.root.position.y<12?[heli]:[]),...getTargets(origin)];},
   visible,trace,isPathClear,redirect,onHeroHit,onDebris,onRemoveDebris,onDeath,onWreck,onEvent:message=>{if(!message.startsWith('Raider robot approaching'))onEvent(message);}
  }));this.spawned=false;
 }
 spawn(){if(this.spawned)return false;this.spawned=true;for(const r of this.members)r.spawn();this.onEvent('Drone squad inbound · 3 tracked raiders advancing down the outer boulevard.');return true;}
 reset(){this.spawned=false;for(const r of this.members)r.reset();}
 update(dt,time){for(const r of this.members)r.update(dt,time);}
 syncWrecks(){for(const r of this.members)r.syncWrecks();}
 disable(unit){const r=this.members.find(r=>r.combatUnit===unit);if(!r)return false;r.destroy();return true;}
 getTarget(){return this.members.filter(r=>r.combatUnit?.alive).sort((a,b)=>a.root.position.distanceToSquared(new THREE.Vector3(this.landing.x,.1,this.landing.z))-b.root.position.distanceToSquared(new THREE.Vector3(this.landing.x,.1,this.landing.z)))[0]||null;}
 get bolts(){return this.members.flatMap(r=>r.bolts);}
 diagnostics(){const members=this.members.map(r=>r.diagnostics());return{spawned:this.spawned,count:3,alive:members.some(r=>r.alive),aliveCount:members.filter(r=>r.alive).length,health:members.reduce((n,r)=>n+r.health,0),maxHealth:3000,shots:members.reduce((n,r)=>n+r.shots,0),received:members.reduce((n,r)=>n+r.received,0),members};}
}

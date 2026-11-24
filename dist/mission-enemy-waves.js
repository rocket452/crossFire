import {COMBAT_DRONE} from './combat-drone-config.js?v=397';
import {EvacRaiderSquad} from './evac-raider-squad.js?v=416';
import {CombatDrone} from './combat-drone.js?v=401';
import {escortMovementBounds,ESCORT_APPROACH} from './evac-approach.js?v=315';
import {EVACUATION_LANDING as center} from './evacuation-config.js?v=compact-evac-237';

export const MISSION_ENEMY_TIMES=Object.freeze({bruisers:30,drones:60});
const alertSeconds=8;

export class MissionEnemyWaves {
 constructor(scene,damage,{bruiser,drone,getTargets,onEvent,formationSize=4,droneCount=formationSize}){
  this.getTargets=getTargets;
  this.onEvent=onEvent;
  this.bruisers=new EvacRaiderSquad(scene,damage,{
   ...bruiser,landing:center,count:formationSize,lanes:[-4,4],stopZ:center.z,
   label:'the south boulevard',getHelicopter:()=>null,getTargets
  });
  this.members=this.bruisers.members;
  this.drones=Array.from({length:droneCount},(_,i)=>{
   const x=center.x+(i%2===0?-3:3);
   const row=Math.floor(i/2);
   const y=COMBAT_DRONE.flight.altitude+2+(i%2)*6;
   const z=ESCORT_APPROACH.minZ+8+row*10;
   const actor=new CombatDrone(scene,damage,{
    ...drone,id:'combat-drone-mission-'+i,bounds:escortMovementBounds(),onEvent,
    ingress:{x,y,z:center.z-16+row*10}
   });
   return {actor,start:{x,y,z}};
  });
  this.flightDrones=this.drones.map(d=>d.actor);
  this.alerts=[];
 }

 get bolts(){return this.bruisers.bolts;}

 update(dt,time){
  this.time=time;
  if(time>=MISSION_ENEMY_TIMES.bruisers&&this.bruisers.spawned===false){
   this.bruisers.spawn();
   this.alert('south',this.members);
  }
  if(time>=MISSION_ENEMY_TIMES.drones&&!this.flightDrones[0].spawned){
   for(const {actor,start} of this.drones)actor.spawn(start);
   this.alert('north',this.flightDrones);
   this.onEvent('Four combat drones inbound from the north.');
  }
  this.bruisers.update(dt,time);
  if(this.flightDrones[0].spawned){
   const targets=this.getTargets();
   for(const drone of this.flightDrones)drone.update(dt,targets);
  }
 }

 alert(edge,units){
  this.alerts.push({
   edge,units,at:this.time,
   x:units.reduce((sum,u)=>sum+u.root.position.x,0)/units.length,
   z:units.reduce((sum,u)=>sum+u.root.position.z,0)/units.length
  });
 }

 waveAlerts(){
  return this.alerts.filter(a=>this.time-a.at<alertSeconds).map(({edge,units,at,x,z})=>{
   const enemyIds=units.filter(u=>u.combatUnit?.alive).map(u=>u.id);
   return {id:'mission-wave-'+edge,edge,x,z,enemyIds,count:enemyIds.length,age:this.time-at,duration:alertSeconds};
  }).filter(a=>a.count>0);
 }

 reset(){
  this.bruisers.reset();
  for(const drone of this.flightDrones)drone.reset();
  this.alerts.length=0;
  this.time=0;
 }

 syncWrecks(){
  this.bruisers.syncWrecks();
  for(const drone of this.flightDrones)drone.syncWrecks();
 }

 disable(unit){
  const drone=this.flightDrones.find(d=>d.combatUnit===unit);
  if(!drone)return this.bruisers.disable(unit);
  drone.destroy();
  return true;
 }

 getTarget(){return this.bruisers.getTarget()||this.flightDrones.find(d=>d.combatUnit?.alive)||null;}

 diagnostics(){
  return {bruisers:this.bruisers.diagnostics(),drones:this.flightDrones.filter(d=>d.spawned).map(d=>d.diagnostics()),alerts:this.waveAlerts()};
 }
}

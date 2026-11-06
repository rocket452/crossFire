import {EvacRaiderSquad} from './evac-raider-squad.js?v=bruiser-model-218';
import {ESCORT_APPROACH as bounds} from './evac-approach.js?v=evac-centered-215';

// One three-Bruiser wave per edge. Civilian wave two arms the sequence.
export const EVAC_RAIDER_WAVES=Object.freeze({staggerSeconds:20,alertSeconds:8,waves:Object.freeze([
 Object.freeze({edge:'south',label:'the far boulevard',route:null}),
 Object.freeze({edge:'east',label:'the east streets',route:[[bounds.maxX-6,24],[72,24],[-30,24]]}),
 Object.freeze({edge:'north',label:'the north streets',route:[[-48,bounds.minZ+6],[-48,-24],[-48,12]]}),
 Object.freeze({edge:'west',label:'the west streets',route:[[bounds.minX+6,48],[-96,48],[-66,48]]})
])});

export class EvacRaiderWaves {
 constructor(scene,damage,options){
  this.landing=options.landing;this.squads=EVAC_RAIDER_WAVES.waves.map((wave,i)=>new EvacRaiderSquad(scene,damage,{...options,idPrefix:i?'evac-raider-'+wave.edge:'evac-raider',route:wave.route,label:wave.label,onEvent:message=>{if(!message.startsWith('Bruiser squad inbound'))options.onEvent?.(message);}}));
  this.reset();
 }
 get members(){return this.squads.flatMap(s=>s.members);}
 get bolts(){return this.squads.flatMap(s=>s.bolts);}
 spawn(){if(this.spawned)return false;this.spawned=true;this.elapsed=0;this.nextWave=1;this.spawnWave(0);return true;}
 reset(){this.spawned=false;this.elapsed=0;this.nextWave=0;this.spawnEvents=[];for(const s of this.squads)s.reset();}
 update(dt,time){
  if(this.spawned){this.elapsed+=dt;while(this.nextWave<this.squads.length&&this.elapsed+1e-8>=this.nextWave*EVAC_RAIDER_WAVES.staggerSeconds)this.spawnWave(this.nextWave++);}
  for(const s of this.squads)s.update(dt,time);
 }
 spawnWave(index){const squad=this.squads[index];if(!squad.spawn())return;const center=squad.members.reduce((p,r)=>({x:p.x+r.root.position.x,z:p.z+r.root.position.z}),{x:0,z:0});center.x/=squad.members.length;center.z/=squad.members.length;this.spawnEvents.push({id:'evac-wave-'+index,edge:EVAC_RAIDER_WAVES.waves[index].edge,...center,at:this.elapsed,index});}
 waveAlerts(){return this.spawnEvents.filter(e=>this.elapsed-e.at<EVAC_RAIDER_WAVES.alertSeconds).map(e=>{const alive=this.squads[e.index].members.filter(r=>r.combatUnit?.alive);return{...e,count:alive.length,enemyIds:alive.map(r=>r.id),age:Math.max(0,this.elapsed-e.at),duration:EVAC_RAIDER_WAVES.alertSeconds};}).filter(e=>e.count>0);}
 syncWrecks(){for(const s of this.squads)s.syncWrecks();}
 disable(unit){return this.squads.some(s=>s.disable(unit));}
 getTarget(){return this.squads.map(s=>s.getTarget()).filter(Boolean).sort((a,b)=>Math.hypot(a.root.position.x-this.landing.x,a.root.position.z-this.landing.z)-Math.hypot(b.root.position.x-this.landing.x,b.root.position.z-this.landing.z))[0]||null;}
 diagnostics(){const waves=this.squads.map((s,i)=>({edge:EVAC_RAIDER_WAVES.waves[i].edge,delay:i*EVAC_RAIDER_WAVES.staggerSeconds,...s.diagnostics()})),members=waves.flatMap(w=>w.members);return{alerts:this.waveAlerts(),spawned:this.spawned,count:members.length,alive:members.some(r=>r.alive),aliveCount:members.filter(r=>r.alive).length,health:members.reduce((n,r)=>n+r.health,0),maxHealth:members.length*1000,shots:members.reduce((n,r)=>n+r.shots,0),received:members.reduce((n,r)=>n+r.received,0),members,waves,nextWaveIn:this.spawned&&this.nextWave<waves.length?Math.max(0,this.nextWave*EVAC_RAIDER_WAVES.staggerSeconds-this.elapsed):null};}
}

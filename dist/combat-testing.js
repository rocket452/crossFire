import * as THREE from './vendor/three.module.js';
import {EvacRaider} from './evac-raider.js?v=raider-range-94';
import {RaiderEnergyEffects} from './raider-energy-effects.js?v=raider-energy-86';
// Reuses the live drone, projectile, damage and wreck systems; no mission spawning.
export class CombatTesting {
 constructor(scene,damage,{getHeroes,readConfig,...options}){
  this.getHeroes=getHeroes;this.readConfig=readConfig;this.targets=new Map();this.energyEffects=new RaiderEnergyEffects(scene);
  this.members=Array.from({length:7},(_,i)=>new EvacRaider(scene,damage,{...options,id:'evac-raider-test-'+i,spawnPosition:{x:(i-3)*7,y:.1,z:-30},getTargets:()=>this.heroUnits(),initialCooldown:3+i*.2,energyEffects:this.energyEffects,onEvent:()=>{}}));
 }
 heroUnits(){return this.getHeroes().map((h,i)=>{let u=this.targets.get(i);if(!u){u={id:'hero-target-'+i,kind:'hero',entity:h};this.targets.set(i,u);}u.alive=!!h?.enabled;u.dashPhased=!!h?.dash?.active;u.shapes=u.alive?[{center:h.root.position.clone().add(new THREE.Vector3(0,1.4,0)),half:{x:.5,y:1,z:.5},rotation:h.root.quaternion.clone()}]:[];return u;}).filter(u=>u.alive&&!u.dashPhased);}
 reset(){const config=this.readConfig();this.walkerEnabled=!!config.walker;this.count=Math.max(0,Math.min(7,Number(config.drones)||0));for(const r of this.members)r.reset();this.energyEffects.reset();for(const r of this.members.slice(0,this.count))r.spawn();}
 update(dt,time){for(const r of this.members)r.update(dt,time);this.energyEffects.update(dt,this.bolts);}
 syncWrecks(){for(const r of this.members)r.syncWrecks();}
 disable(unit){const r=this.members.find(r=>r.combatUnit===unit);if(!r)return false;r.destroy();return true;}
 getTarget(){return this.members.find(r=>r.combatUnit?.alive)||null;}
 get bolts(){return this.members.flatMap(r=>r.bolts);}
 diagnostics(){return{walker:this.walkerEnabled,drones:this.count,aliveDrones:this.members.filter(r=>r.combatUnit?.alive).length,members:this.members.slice(0,this.count).map(r=>r.diagnostics())};}
}

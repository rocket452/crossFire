import {COMBAT_ARENA} from './combat-arena-config.js?v=arena-center-159';
import {BastionTesting} from './bastion-testing.js?v=permanent-weakpoints-172';
import {ExperimentalRobot} from './experimental-robots.js?v=charged-shuriken-130';
import * as THREE from './vendor/three.module.js';
import {EvacRaider} from './evac-raider.js?v=charged-shuriken-130';
import {RaiderEnergyEffects} from './raider-energy-effects.js?v=raider-energy-86';
// Reuses the live drone, projectile, damage and wreck systems; no mission spawning.
export class CombatTesting {
 constructor(scene,damage,{getHeroes,readConfig,bastionConfig,...options}){
  this.bastion=new BastionTesting(scene,damage,bastionConfig,{getHeroes,onEvent:options.onEvent,traceProjectile:(a,b,r)=>options.trace(a,b,'bastion',r),onProjectileImpact:options.onBastionImpact,rainLanding:options.rainLanding,onRainImpact:options.onBastionRainImpact});this.getHeroes=getHeroes;this.readConfig=readConfig;this.targets=new Map();this.energyEffects=new RaiderEnergyEffects(scene);
  this.basic=Array.from({length:7},(_,i)=>new EvacRaider(scene,damage,{...options,id:'evac-raider-test-'+i,spawnPosition:{x:COMBAT_ARENA.enemyCorner.x+(i-3)*7*COMBAT_ARENA.formationScale,y:.1,z:COMBAT_ARENA.enemyCorner.z+14*COMBAT_ARENA.formationScale},getTargets:()=>this.heroUnits(),initialCooldown:3+i*.2,energyEffects:this.energyEffects,onEvent:()=>{}}));
  this.experimental=['aegis','scythe','breaker'].flatMap((type,row)=>Array.from({length:3},(_,i)=>new ExperimentalRobot(scene,damage,{...options,type,id:'evac-raider-'+type+'-'+i,spawnPosition:{x:COMBAT_ARENA.enemyCorner.x+(i-1)*7*COMBAT_ARENA.formationScale,y:.1,z:COMBAT_ARENA.enemyCorner.z+(14+row*8)*COMBAT_ARENA.formationScale},getTargets:()=>this.heroUnits(),initialCooldown:1+i*.7,energyEffects:this.energyEffects,onEvent:()=>{}})));this.members=[...this.basic,...this.experimental];
 }
 heroUnits(){return this.getHeroes().map((h,i)=>{let u=this.targets.get(i);if(!u){u={id:'hero-target-'+i,kind:'hero',entity:h};this.targets.set(i,u);}u.alive=!!h?.enabled;u.dashPhased=!!h?.dash?.active;u.shapes=u.alive?[{center:h.root.position.clone().add(new THREE.Vector3(0,1.4,0)),half:{x:.5,y:1,z:.5},rotation:h.root.quaternion.clone()}]:[];return u;}).filter(u=>u.alive&&!u.dashPhased);}
 reset(){const config=this.readConfig();this.walkerEnabled=!!config.walker&&config.preset!=='bastion';this.bastion.reset(config.preset==='bastion');this.preset=config.preset||'basic';this.count=Math.max(0,Math.min(7,Number(config.drones)||0));for(const r of this.members)r.reset();this.energyEffects.reset();if(this.preset==='bastion')this.activeMembers=[];else if(this.preset==='mixed')this.activeMembers=this.experimental.filter(r=>!r.id.endsWith('-2'));else if(this.preset==='basic')this.activeMembers=this.basic.slice(0,this.count);else{const[type,n]=this.preset.split('-');this.activeMembers=this.experimental.filter(r=>r.type===type).slice(0,Number(n)||1);}this.count=this.activeMembers.length;for(const [i,r]of this.activeMembers.entries()){const columns=Math.min(3,this.activeMembers.length),rows=Math.ceil(this.activeMembers.length/3),p={x:(i%3-(columns-1)/2)*8,y:.1,z:(Math.floor(i/3)-(rows-1)/2)*8};r.spawnPosition=p;r.root.position.set(p.x,p.y,p.z);r.spawn();r.sync();}}
 update(dt,time){this.bastion.update(dt);for(const r of this.members)r.update(dt,time);this.energyEffects.update(dt,this.bolts);}
 syncWrecks(){for(const r of this.members)r.syncWrecks();}
 disable(unit){if(unit===this.bastion.boss.combatUnit){this.bastion.boss.defeat();return true;}const r=this.members.find(r=>r.combatUnit===unit);if(!r)return false;r.destroy();return true;}
 getTarget(){if(this.bastion.enabled&&this.bastion.boss.combatUnit.alive)return this.bastion.boss;return this.members.find(r=>r.combatUnit?.alive)||null;}
 get bolts(){return this.members.flatMap(r=>r.bolts);}
 diagnostics(){return{bastion:this.bastion.diagnostics(),walker:this.walkerEnabled,drones:this.count,aliveDrones:this.members.filter(r=>r.combatUnit?.alive).length,preset:this.preset,members:(this.activeMembers||[]).map(r=>r.diagnostics())};}
}

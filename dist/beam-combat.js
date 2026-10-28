import {shieldBeamIntersection} from './hero-defense.js?v=hero-5';
import {traceImpact} from './combat-collision.js?v=robot-1';
// Loose debris and disabled wrecks no longer stop the energy lance; intact cover does.
export class BeamCombat {
 constructor({physics,units,onSection=()=>{},onImpact=()=>{},getBarriers=()=>[],getTerrainHit=()=>null}){Object.assign(this,{physics,units,onSection,onImpact,getBarriers,getTerrainHit});this.range=140;this.radius=1.05;this.reset();}
 reset(){this.shieldHits=0;this.blockedDamage=0;this.ticks=0;this.buildingHits=0;this.unitDamage=0;this.unitKills=0;this.lastHit=null;this.lastEnd=null;}
 update(from,direction,damageSeconds=0,protectedUnit=null){
  const far={x:from.x+direction.x*this.range,y:from.y+direction.y*this.range,z:from.z+direction.z*this.range};
  let collision=traceImpact(from,far,{sections:this.physics.chunks.filter(c=>c.state==='intact'),targets:this.units.units.filter(u=>u.alive&&u.kind!=='robot'&&u.id!==protectedUnit),radius:this.radius});
  const terrain=this.getTerrainHit(from,far,this.radius);if(terrain&&(!collision||terrain.t<collision.t))collision=terrain;
  for(const barrier of this.getBarriers()){const hit=shieldBeamIntersection(from,far,barrier,this.radius);if(hit&&(!collision||hit.t<collision.t))collision={kind:'shield',barrier,...hit};}
  const end=collision?.point||far;this.lastEnd={...end};this.lastHit=collision?.section?.building||collision?.unit?.id||collision?.kind||null;
  if(damageSeconds>0&&collision){
   this.ticks++;
   if(collision.kind==='shield'){const power=300*damageSeconds;this.shieldHits++;this.blockedDamage+=power;collision.barrier.onHit?.(end,power);this.onImpact(end,collision,[]);return{end,collision};}
   this.physics.impact(end,35,3.4,collision.section||null,{beam:true,source:'siege-walker'});
   if(collision.section){this.buildingHits++;this.onSection(collision.section);}
   const damage=this.units.blast(end,{direct:collision.unit||null,power:300*damageSeconds,radius:3.8,exclude:protectedUnit,filter:u=>u.kind!=='robot'});
   for(const d of damage){this.unitDamage+=d.damage;if(d.disabled)this.unitKills++;}
   this.onImpact(end,collision,damage);
  }
  return{end,collision};
 }
 diagnostics(){return{shieldHits:this.shieldHits,blockedDamage:Math.round(this.blockedDamage),ticks:this.ticks,buildingHits:this.buildingHits,unitDamage:Math.round(this.unitDamage),unitKills:this.unitKills,lastHit:this.lastHit,end:this.lastEnd,range:this.range,radius:this.radius};}
}

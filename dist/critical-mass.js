import * as THREE from './vendor/three.module.js';
export const CRITICAL_MASS=Object.freeze({maxCharge:2.6,minCharge:.3,powerful:1.8,critical:2.2,overload:2.6,radius:4,selfStun:1,cooldown:3,overloadCooldown:4,cancelCooldown:.35,minDamage:60,maxDamage:360,damageExponent:1.35,edgeMultiplier:.25,powerfulStagger:.8,criticalStagger:1.2,bossStagger:.5,criticalBossStagger:.75});
export function massPower(seconds,c=CRITICAL_MASS){const t=THREE.MathUtils.clamp((seconds-c.minCharge)/(c.maxCharge-c.minCharge),0,1);return{seconds,level:t,damage:c.minDamage+(c.maxDamage-c.minDamage)*t**c.damageExponent,radius:c.radius,powerful:seconds>=c.powerful,critical:seconds>=c.critical};}
export class CriticalMass {
 constructor({config=CRITICAL_MASS,onBurst=()=>{},onOverload=()=>{}}={}){this.c=config;this.onBurst=onBurst;this.onOverload=onOverload;this.reset();}
 reset(){this.charging=false;this.charge=this.cooldown=this.stun=0;this.releases=this.overloads=0;}
 get stunned(){return this.stun>1e-9;}
 begin(){if(this.charging||this.cooldown>1e-9||this.stunned)return false;this.charging=true;this.charge=0;return true;}
 cancel(){if(!this.charging)return false;this.charging=false;this.charge=0;this.cooldown=Math.max(this.cooldown,this.c.cancelCooldown);return true;}
 release(){if(!this.charging||this.stunned)return false;if(this.charge<this.c.minCharge){this.cancel();return false;}const power=massPower(this.charge,this.c);this.charging=false;this.charge=0;this.cooldown=this.c.cooldown;this.releases++;this.onBurst(power);return true;}
 step(dt){dt=Math.max(0,dt);this.cooldown=Math.max(0,this.cooldown-dt);this.stun=Math.max(0,this.stun-dt);if(!this.charging)return;if(this.charge+dt>=this.c.overload-1e-9){this.charging=false;this.charge=0;this.cooldown=this.c.overloadCooldown;this.stun=this.c.selfStun;this.overloads++;this.onOverload();}else this.charge+=dt;}
 diagnostics(){return{charging:this.charging,charge:this.charge,level:this.charge/this.c.maxCharge,critical:this.charging&&this.charge>=this.c.critical,cooldown:this.cooldown,stun:this.stun,releases:this.releases,overloads:this.overloads};}
}
// Closest existing part per enemy, including rotated boss colliders. Never fan out to every part.
export function massContacts(origin,units,radius=CRITICAL_MASS.radius){const hits=[];for(const unit of units){if(!unit.alive||unit.kind!=='robot'||unit.hidden||unit.dashPhased)continue;let best=null;for(const shape of unit.shapes||[]){const q=new THREE.Quaternion().copy(shape.rotation||new THREE.Quaternion()),local=origin.clone().sub(shape.center).applyQuaternion(q.clone().invert()),p=local.clone();for(const a of ['x','y','z'])p[a]=THREE.MathUtils.clamp(p[a],-shape.half[a],shape.half[a]);p.applyQuaternion(q).add(shape.center);const distance=p.distanceTo(origin);if(distance<radius&&(!best||distance<best.distance))best={unit,part:shape.part,point:p,distance};}if(best)hits.push(best);}return hits;}

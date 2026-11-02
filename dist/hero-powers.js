export const VOLT_STUN=Object.freeze({cost:50,cooldown:15,duration:1,damage:450,range:90});
export const VIOLET_BEAM=Object.freeze({required:1200,chargeDuration:2,duration:4,damagePerSecond:420,originOffset:.55});
export const VIOLET_OVERLOAD=Object.freeze({extraDamage:600,recoverySeconds:2,burstSeconds:.65});
// Only confirmed shield absorption fills this resource. No passive regeneration.
export class BarrierCapacitor {
 constructor(){this.reset();}
 reset(){this.amount=0;this.remaining=0;this.phase='idle';this.chargeElapsed=0;this.casts=0;this.absorbed=0;this.overloadDamage=0;this.overloadRemaining=0;this.overloads=0;}
 absorb(damage){if(this.remaining>0||this.overloadRemaining>0||!Number.isFinite(damage)||damage<=0)return false;this.absorbed+=damage;const needed=Math.max(0,VIOLET_BEAM.required-this.amount);this.amount=Math.min(VIOLET_BEAM.required,this.amount+damage);this.overloadDamage+=Math.max(0,damage-needed);if(this.overloadDamage+1e-8>=VIOLET_OVERLOAD.extraDamage){this.amount=0;this.remaining=0;this.chargeElapsed=0;this.phase='overloaded';this.overloadRemaining=VIOLET_OVERLOAD.recoverySeconds;this.overloads++;return true;}return false;}
 get overloadProgress(){return this.ready?Math.min(1,this.overloadDamage/VIOLET_OVERLOAD.extraDamage):0;}
 get ready(){return this.overloadRemaining<=0&&this.amount>=VIOLET_BEAM.required;}
 start(){if(!this.ready||this.remaining>0)return false;this.amount=0;this.overloadDamage=0;this.remaining=VIOLET_BEAM.duration;this.phase='charging';this.chargeElapsed=0;this.casts++;return true;}
 get chargeRemaining(){return this.phase==='charging'?Math.max(0,VIOLET_BEAM.chargeDuration-this.chargeElapsed):0;}
 get chargeProgress(){return this.phase==='charging'?Math.min(1,this.chargeElapsed/VIOLET_BEAM.chargeDuration):this.phase==='firing'?1:0;}
 step(dt){let left=Math.max(0,dt);if(this.overloadRemaining>0){this.overloadRemaining=Math.max(0,this.overloadRemaining-left);if(this.overloadRemaining<=1e-8){this.overloadRemaining=0;this.overloadDamage=0;this.phase='idle';}return 0;}if(this.phase==='charging'){const charge=Math.min(this.chargeRemaining,left);this.chargeElapsed+=charge;left-=charge;if(this.chargeRemaining<1e-8)this.phase='firing';}const slice=this.phase==='firing'?Math.min(this.remaining,left):0;this.remaining=Math.max(0,this.remaining-slice);if(this.remaining<1e-8){this.remaining=0;this.phase='idle';this.chargeElapsed=0;}return slice;}
 cancel(){this.remaining=0;this.phase=this.overloadRemaining>0?'overloaded':'idle';this.chargeElapsed=0;}
 diagnostics(){return{overloadDamage:this.overloadDamage,overloadProgress:this.overloadProgress,overloadThreshold:VIOLET_OVERLOAD.extraDamage,overloadRemaining:this.overloadRemaining,overloads:this.overloads,phase:this.phase,chargeDuration:VIOLET_BEAM.chargeDuration,chargeRemaining:this.chargeRemaining,chargeProgress:this.chargeProgress,stored:this.amount,required:VIOLET_BEAM.required,ready:this.ready,remaining:this.remaining,casts:this.casts,absorbed:this.absorbed};}
}

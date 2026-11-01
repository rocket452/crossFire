export const VOLT_STUN=Object.freeze({cost:50,cooldown:15,duration:1,damage:450,range:90});
export const VIOLET_BEAM=Object.freeze({required:1200,chargeDuration:2,duration:4,damagePerSecond:420,originOffset:.55});
// Only confirmed shield absorption fills this resource. No passive regeneration.
export class BarrierCapacitor {
 constructor(){this.reset();}
 reset(){this.amount=0;this.remaining=0;this.phase='idle';this.chargeElapsed=0;this.casts=0;this.absorbed=0;}
 absorb(damage){if(this.remaining>0||!Number.isFinite(damage)||damage<=0)return;this.absorbed+=damage;this.amount=Math.min(VIOLET_BEAM.required,this.amount+damage);}
 get ready(){return this.amount>=VIOLET_BEAM.required;}
 start(){if(!this.ready||this.remaining>0)return false;this.amount=0;this.remaining=VIOLET_BEAM.duration;this.phase='charging';this.chargeElapsed=0;this.casts++;return true;}
 get chargeRemaining(){return this.phase==='charging'?Math.max(0,VIOLET_BEAM.chargeDuration-this.chargeElapsed):0;}
 get chargeProgress(){return this.phase==='charging'?Math.min(1,this.chargeElapsed/VIOLET_BEAM.chargeDuration):this.phase==='firing'?1:0;}
 step(dt){let left=Math.max(0,dt);if(this.phase==='charging'){const charge=Math.min(this.chargeRemaining,left);this.chargeElapsed+=charge;left-=charge;if(this.chargeRemaining<1e-8)this.phase='firing';}const slice=this.phase==='firing'?Math.min(this.remaining,left):0;this.remaining=Math.max(0,this.remaining-slice);if(this.remaining<1e-8){this.remaining=0;this.phase='idle';this.chargeElapsed=0;}return slice;}
 cancel(){this.remaining=0;this.phase='idle';this.chargeElapsed=0;}
 diagnostics(){return{phase:this.phase,chargeDuration:VIOLET_BEAM.chargeDuration,chargeRemaining:this.chargeRemaining,chargeProgress:this.chargeProgress,stored:this.amount,required:VIOLET_BEAM.required,ready:this.ready,remaining:this.remaining,casts:this.casts,absorbed:this.absorbed};}
}

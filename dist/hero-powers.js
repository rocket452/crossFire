export const VOLT_STUN=Object.freeze({cost:50,cooldown:15,duration:1,damage:450,range:90});
export const VIOLET_BEAM=Object.freeze({required:1200,duration:4,damagePerSecond:420});
// Only confirmed shield absorption fills this resource. No passive regeneration.
export class BarrierCapacitor {
 constructor(){this.reset();}
 reset(){this.amount=0;this.remaining=0;this.casts=0;this.absorbed=0;}
 absorb(damage){if(this.remaining>0||!Number.isFinite(damage)||damage<=0)return;this.absorbed+=damage;this.amount=Math.min(VIOLET_BEAM.required,this.amount+damage);}
 get ready(){return this.amount>=VIOLET_BEAM.required;}
 start(){if(!this.ready||this.remaining>0)return false;this.amount=0;this.remaining=VIOLET_BEAM.duration;this.casts++;return true;}
 step(dt){const slice=Math.min(this.remaining,Math.max(0,dt));this.remaining=Math.max(0,this.remaining-slice);if(this.remaining<1e-8)this.remaining=0;return slice;}
 cancel(){this.remaining=0;}
 diagnostics(){return{stored:this.amount,required:VIOLET_BEAM.required,ready:this.ready,remaining:this.remaining,casts:this.casts,absorbed:this.absorbed};}
}

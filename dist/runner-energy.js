export const RUNNER_ENERGY=Object.freeze({capacity:100,attackCost:25,beamDrainPerSecond:25,perMetre:100/(46*6)});
export class RunnerEnergy {
 constructor(){this.reset();}
 reset(){this.amount=0;this.gained=0;this.spent=0;this.discharges=0;this.beamSpent=0;}
 get beamReady(){return this.amount>1e-8;}
 get ready(){return this.amount>=RUNNER_ENERGY.attackCost-1e-8;}
 earn(distance,dt,{surface=true,moving=true,dashing=false}={}){
  // Count real surface travel; reject teleports, passive falls and wall pushing.
  if(!surface||!moving||dashing||dt<=0||!Number.isFinite(distance)||distance<=0||distance>48*dt+.02)return 0;
  let next=Math.min(RUNNER_ENERGY.capacity,this.amount+distance*RUNNER_ENERGY.perMetre);if(RUNNER_ENERGY.capacity-next<1e-8)next=RUNNER_ENERGY.capacity;const gain=next-this.amount;this.amount=next;this.gained+=gain;return gain;
 }
 spend(cost=RUNNER_ENERGY.attackCost){if(!Number.isFinite(cost)||cost<=0||this.amount<cost-1e-8)return false;this.amount=Math.max(0,this.amount-cost);this.spent+=cost;this.discharges++;return true;}
 drainBeam(cost){if(!Number.isFinite(cost)||cost<=0)return 0;const spent=Math.min(this.amount,cost);this.amount=Math.max(0,this.amount-spent);if(this.amount<1e-8)this.amount=0;this.spent+=spent;this.beamSpent+=spent;return spent;}
 diagnostics(){return{amount:this.amount,capacity:RUNNER_ENERGY.capacity,attackCost:RUNNER_ENERGY.attackCost,ready:this.ready,beamReady:this.beamReady,beamDrainPerSecond:RUNNER_ENERGY.beamDrainPerSecond,beamSpent:this.beamSpent,gained:this.gained,spent:this.spent,discharges:this.discharges,perMetre:RUNNER_ENERGY.perMetre};}
}

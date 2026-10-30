// Shared player/CPU cadence: instant lightning burst, then enforced recovery.
// Retain the class/diagnostic names used by existing controller and tooling.
export class RunnerCharge {
 constructor(){this.seconds=0;this.burstSeconds=.4;this.cooldownSeconds=1.5;this.reset();}
 reset(){this.elapsed=0;this.phase='idle';this.cooldown=0;this.bursts=0;}
 cancel(){if(this.phase==='firing'){this.phase='cooldown';this.cooldown=this.cooldownSeconds;}else if(this.phase!=='cooldown')this.phase='idle';this.elapsed=0;}
 step(dt,requested,energy=null){
  if(!requested)this.cancel();let left=Math.max(0,dt),damageSeconds=0;
  while(left>1e-9){
   if(this.phase==='idle'){if(!requested||(energy&&!energy.spend()))break;this.phase='firing';this.elapsed=0;this.bursts++;}
   if(this.phase==='firing'){
    const slice=Math.min(left,this.burstSeconds-this.elapsed);this.elapsed+=slice;left-=slice;damageSeconds+=slice;
    if(this.elapsed>=this.burstSeconds-1e-9){this.phase='cooldown';this.cooldown=this.cooldownSeconds;this.elapsed=0;}else break;
   }else if(this.phase==='cooldown'){
    const slice=Math.min(left,this.cooldown);this.cooldown=Math.max(0,this.cooldown-slice);left-=slice;
    if(this.cooldown<=1e-9){this.cooldown=0;this.phase='idle';}else break;
   }
  }
  return{phase:damageSeconds>1e-9?'firing':this.phase,progress:damageSeconds>1e-9?1:0,damageSeconds,cooldown:this.cooldown};
 }
 diagnostics(){return{phase:this.phase,seconds:0,elapsed:this.elapsed,progress:this.phase==='firing'?1:0,burstSeconds:this.burstSeconds,cooldownSeconds:this.cooldownSeconds,cooldown:this.cooldown,bursts:this.bursts};}
}

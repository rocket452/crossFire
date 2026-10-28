// Shared player/CPU cadence: charge, finite beam burst, then enforced recovery.
export class RunnerCharge {
 constructor(){this.seconds=.5;this.burstSeconds=.4;this.cooldownSeconds=1.5;this.reset();}
 reset(){this.elapsed=0;this.phase='idle';this.cooldown=0;this.bursts=0;}
 cancel(){
  if(this.phase==='firing'){this.phase='cooldown';this.cooldown=this.cooldownSeconds;}
  else if(this.phase!=='cooldown')this.phase='idle';
  this.elapsed=0;
 }
 step(dt,requested){
  if(!requested)this.cancel();let left=Math.max(0,dt),damageSeconds=0;
  while(left>1e-9){
   if(this.phase==='idle'){if(!requested)break;this.phase='charging';this.elapsed=0;}
   if(this.phase==='charging'){
    const slice=Math.min(left,this.seconds-this.elapsed);this.elapsed+=slice;left-=slice;
    if(this.elapsed>=this.seconds-1e-9){this.phase='firing';this.elapsed=0;this.bursts++;}else break;
   }else if(this.phase==='firing'){
    const slice=Math.min(left,this.burstSeconds-this.elapsed);this.elapsed+=slice;left-=slice;damageSeconds+=slice;
    if(this.elapsed>=this.burstSeconds-1e-9){this.phase='cooldown';this.cooldown=this.cooldownSeconds;this.elapsed=0;}else break;
   }else if(this.phase==='cooldown'){
    const slice=Math.min(left,this.cooldown);this.cooldown=Math.max(0,this.cooldown-slice);left-=slice;
    if(this.cooldown<=1e-9){this.cooldown=0;this.phase='idle';}else break;
   }
  }
  const phase=damageSeconds>1e-9?'firing':this.phase;
  return{phase,progress:phase==='charging'?this.elapsed/this.seconds:phase==='firing'?1:0,damageSeconds,cooldown:this.cooldown};
 }
 diagnostics(){return{phase:this.phase,seconds:this.seconds,elapsed:this.elapsed,progress:this.phase==='charging'?this.elapsed/this.seconds:this.phase==='firing'?1:0,burstSeconds:this.burstSeconds,cooldownSeconds:this.cooldownSeconds,cooldown:this.cooldown,bursts:this.bursts};}
}

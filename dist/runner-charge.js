// One charge per continuous activation; only time after the wind-up can deal damage.
export class RunnerCharge {
 constructor(){this.seconds=.5;this.reset();}
 reset(){this.elapsed=0;this.phase='idle';}
 step(dt,requested){
  if(!requested){this.reset();return{phase:'idle',progress:0,damageSeconds:0};}
  const remaining=Math.max(0,this.seconds-this.elapsed);this.elapsed=Math.min(this.seconds,this.elapsed+Math.max(0,dt));
  this.phase=this.elapsed>=this.seconds-1e-9?'firing':'charging';
  return{phase:this.phase,progress:Math.min(1,this.elapsed/this.seconds),damageSeconds:Math.max(0,dt-remaining)};
 }
 diagnostics(){return{phase:this.phase,seconds:this.seconds,elapsed:this.elapsed,progress:this.elapsed/this.seconds};}
}

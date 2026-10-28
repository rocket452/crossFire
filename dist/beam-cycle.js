// Simulation-time weapon clock. Charging deals no damage; a burst lasts seven seconds.
export class BeamCycle {
 constructor(){this.chargeSeconds=3.2;this.fireSeconds=7;this.coolSeconds=7.5;this.reset();}
 reset(){this.phase='cooling';this.elapsed=0;this.remaining=3.8;this.damageClock=0;this.bursts=0;this.tickCount=0;}
 stop(){this.phase='off';this.elapsed=0;this.damageClock=0;}
 step(dt,canStart=false){
  if(this.phase==='off')return{phase:'off',elapsed:0,charge:0,progress:0,damageSeconds:0,events:[]};
  const events=[];let damageSeconds=0;
  if(this.phase==='ready'&&canStart){this.phase='charging';this.elapsed=0;events.push('charging');}
  let left=Math.max(0,dt);
  while(left>1e-9&&this.phase!=='ready'){
   const duration=this.phase==='charging'?this.chargeSeconds:this.phase==='firing'?this.fireSeconds:this.remaining;
   const slice=Math.min(left,Math.max(0,duration-this.elapsed));
   if(this.phase==='firing'){this.damageClock+=slice;while(this.damageClock>=.1-1e-9){this.damageClock-=.1;damageSeconds+=.1;this.tickCount++;}}
   this.elapsed+=slice;left-=slice;
   if(this.elapsed>=duration-1e-9){
    this.elapsed=0;
    if(this.phase==='charging'){this.phase='firing';this.bursts++;events.push('firing');}
    else if(this.phase==='firing'){this.phase='cooling';this.remaining=this.coolSeconds;this.damageClock=0;events.push('cooling');}
    else{this.phase='ready';events.push('ready');}
   }
   if(slice===0&&this.phase==='ready')break;
  }
  return{phase:this.phase,elapsed:this.elapsed,charge:this.phase==='charging'?this.elapsed/this.chargeSeconds:this.phase==='firing'?1:0,progress:this.phase==='firing'?this.elapsed/this.fireSeconds:0,damageSeconds,events};
 }
 diagnostics(){return{phase:this.phase,seconds:this.elapsed,chargeSeconds:this.chargeSeconds,fireSeconds:this.fireSeconds,coolSeconds:this.coolSeconds,bursts:this.bursts,damageTicks:this.tickCount};}
}

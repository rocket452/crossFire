// World-space foot plants and an analytic two-bone solve; independent of rendering.
const TAU=Math.PI*2;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
export const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export function patrolPosition(time){return{x:Math.sin(time*.15)*1.3,z:Math.sin(time*.2)*4.5};}

export class WalkerGait {
 constructor(){this.cycle=3.2;this.swingDuration=1.0;this.reset();}
 reset(){
  this.yaw=0;this.turnRate=0;this.footfalls=0;this.lastLanding=-100;
  this.feet=['l','r'].map((side,i)=>({side,offset:i*this.cycle/2,anchor:{x:i===0?-1.75:1.75,z:0},yaw:0,pitch:0,swinging:false,landedAt:-100,ankle:{x:i===0?-1.75:1.75,y:1.62,z:0}}));
  this.pose={x:0,y:-.65,z:0,yaw:0,sway:0,roll:0,twist:0,compression:0,feet:this.feet};
  return this.update(0,0,0);
 }
 update(dt,time,desiredYaw=this.yaw){
  const previousYaw=this.yaw;
  // The pelvis turns deliberately while the waist aims independently.
  this.yaw+=clamp(angleDelta(desiredYaw,this.yaw),-.34*dt,.34*dt);
  this.turnRate=dt>0?angleDelta(this.yaw,previousYaw)/dt:0;
  const landings=[];
  for(const foot of this.feet){
   const phase=((time-foot.offset)%this.cycle+this.cycle)%this.cycle;
   const inSwing=phase<this.swingDuration;
   if(inSwing&&!foot.swinging){
    foot.swinging=true;foot.from={...foot.anchor};foot.fromYaw=foot.yaw;
    const remaining=this.swingDuration-phase;
    // Place the foot ahead of the moving pelvis, rather than dragging it with it.
    const future=patrolPosition(time+remaining+(this.cycle-this.swingDuration)*.35);
    foot.toYaw=this.yaw+clamp(this.turnRate*remaining,-.3,.3);
    const lateral=foot.side==='l'?-1.75:1.75;
    foot.to={x:future.x+Math.cos(foot.toYaw)*lateral,z:future.z-Math.sin(foot.toYaw)*lateral};
   }else if(!inSwing&&foot.swinging){
    foot.swinging=false;foot.anchor={...foot.to};foot.yaw=foot.toYaw;
    foot.landedAt=time-(phase-this.swingDuration);this.lastLanding=foot.landedAt;
    this.footfalls++;landings.push({x:foot.anchor.x,z:foot.anchor.z,side:foot.side});
   }
   let x=foot.anchor.x,z=foot.anchor.z,lift=0,pitch=0;
   if(inSwing){
    const u=phase/this.swingDuration,k=smooth(u);
    x=foot.from.x+(foot.to.x-foot.from.x)*k;z=foot.from.z+(foot.to.z-foot.from.z)*k;
    foot.yaw=foot.fromYaw+angleDelta(foot.toYaw,foot.fromYaw)*k;
    lift=.8*Math.sin(Math.PI*u)**2;
    pitch=u<.3?.12*(1-smooth(u/.3)):-.08*smooth((u-.7)/.3);
   }else{
    const age=phase-this.swingDuration;
    pitch=age<.18?-.08*(1-smooth(age/.18)):.12*smooth((phase-(this.cycle-.18))/.18);
   }
   // Heel-to-toe roll about a fixed contact point, keeping the sole above asphalt.
   const pivotZ=pitch>=0?2.6:-1.25,c=Math.cos(pitch),s=Math.sin(pitch);
   const localZ=pivotZ-(-1.5*s+pivotZ*c);
   const localY=-1.5-(-1.5*c-pivotZ*s);
   foot.pitch=pitch;foot.grounded=!inSwing;foot.lift=lift;
   foot.ankle={x:x+Math.sin(foot.yaw)*localZ,y:1.62+lift+localY,z:z+Math.cos(foot.yaw)*localZ};
   foot.flat={x,z};
  }
  const p=patrolPosition(time),weight=Math.cos(TAU*(time-.5)/this.cycle);
  const compression=Math.exp(-Math.max(0,time-this.lastLanding)/.17);
  Object.assign(this.pose,{x:p.x,z:p.z,y:-.65-.10*Math.cos(TAU*2*(time-1)/this.cycle)-.10*compression,yaw:this.yaw,sway:.23*weight,roll:-.018*weight,twist:.025*Math.sin(TAU*time/this.cycle),compression,landings});
  return this.pose;
 }
 diagnostics(){return{cycleSeconds:this.cycle,footfalls:this.footfalls,yaw:this.yaw,feet:this.feet.map(f=>({side:f.side,grounded:f.grounded,lift:f.lift,pitch:f.pitch,yaw:f.yaw,ankle:{...f.ankle},anchor:{...f.anchor}}))};}
}

export function solveLegKnee(hip,ankle,heading,upper=3.7,lower=4.5){
 let dx=ankle.x-hip.x,dy=ankle.y-hip.y,dz=ankle.z-hip.z;
 const distance=Math.hypot(dx,dy,dz),d=clamp(distance,Math.abs(lower-upper)+.001,upper+lower-.001);
 dx/=distance||1;dy/=distance||1;dz/=distance||1;
 const forward={x:Math.sin(heading),y:0,z:Math.cos(heading)};
 const projection=forward.x*dx+forward.z*dz;
 let bx=forward.x-projection*dx,by=-projection*dy,bz=forward.z-projection*dz;
 const length=Math.hypot(bx,by,bz)||1;bx/=length;by/=length;bz/=length;
 const along=(upper*upper-lower*lower+d*d)/(2*d),bend=Math.sqrt(Math.max(0,upper*upper-along*along));
 return{x:hip.x+dx*along+bx*bend,y:hip.y+dy*along+by*bend,z:hip.z+dz*along+bz*bend};
}

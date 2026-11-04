import {angleDelta} from './walker-gait.js?v=plasma-lead-91';
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*t*(10+t*(-15+6*t));};
// World-space stance anchors are immutable until that foot lifts. The root may wait for a late foot.
export class ArgusGait {
 constructor(config){this.config=config;}
 reset(position,yaw=0){
  const c=this.config;this.position={x:position.x,z:position.z};this.yaw=yaw;this.clock=0;this.nextSide='l';this.footfalls=0;
  this.feet=['l','r'].map(side=>{const lateral=side==='l'?-c.lateral:c.lateral,p={x:position.x+Math.cos(yaw)*lateral,z:position.z-Math.sin(yaw)*lateral};return{side,anchor:{...p},flat:{...p},ankle:{...p,y:c.ankleHeight},yaw,pitch:0,swinging:false,grounded:true,lift:0,age:0};});
  return this.pose();
 }
 snapshot(){return structuredClone({position:this.position,yaw:this.yaw,clock:this.clock,nextSide:this.nextSide,footfalls:this.footfalls,feet:this.feet});}
 restore(s){Object.assign(this,s);return this.pose();}
 update(dt,destination,speed,damage={l:0,r:0}){
  const c=this.config,dx=destination.x-this.position.x,dz=destination.z-this.position.z,distance=Math.hypot(dx,dz),direction={x:distance?dx/distance:0,z:distance?dz/distance:0};
  const desired=distance>.001?Math.atan2(dx,dz):this.yaw;
  this.yaw+=Math.max(-c.turnSpeed*dt,Math.min(c.turnSpeed*dt,angleDelta(desired,this.yaw)));
  const step=Math.min(distance,speed*dt),candidate={x:this.position.x+direction.x*step,z:this.position.z+direction.z*step};
  // Keep each planted ankle within the leg's reachable IK span, even after sudden speed/route changes.
  const reachable=this.feet.filter(f=>!f.swinging).every(f=>{const side=f.side==='l'?-c.lateral:c.lateral;return Math.hypot(candidate.x+Math.cos(this.yaw)*side-f.anchor.x,candidate.z-Math.sin(this.yaw)*side-f.anchor.z)<=c.maxSupportReach;});
  if(reachable)this.position=candidate;
  const moving=distance>.02&&speed>0;this.clock+=dt;
  if(!this.feet.some(f=>f.swinging)&&moving){
   const candidates=this.feet.map(f=>{const side=f.side==='l'?-c.lateral:c.lateral,ideal={x:this.position.x+Math.cos(this.yaw)*side,z:this.position.z-Math.sin(this.yaw)*side};return{f,side,error:Math.hypot(ideal.x-f.anchor.x,ideal.z-f.anchor.z),stride:Math.max(.35,1-c.damagedStrideScale*(damage[f.side]||0))};}).filter(x=>x.error>c.stepTrigger*x.stride).sort((a,b)=>b.error-a.error||((a.f.side===this.nextSide)?-1:1));
   const pick=candidates[0];if(pick){const f=pick.f;f.swinging=true;f.age=0;f.duration=c.swingDuration*(1+c.damagedSwingExtra*(damage[f.side]||0));f.from={...f.anchor};f.fromYaw=f.yaw;f.toYaw=this.yaw;const reach=Math.min(c.maxSupportReach*.8,speed*f.duration+c.stepLead)*pick.stride;f.to={x:this.position.x+Math.cos(this.yaw)*pick.side+direction.x*reach,z:this.position.z-Math.sin(this.yaw)*pick.side+direction.z*reach};this.nextSide=f.side==='l'?'r':'l';}
  }
  const landings=[];
  for(const f of this.feet){
   if(f.swinging){f.age+=dt;const t=Math.min(1,f.age/f.duration),k=smooth(t);f.flat={x:f.from.x+(f.to.x-f.from.x)*k,z:f.from.z+(f.to.z-f.from.z)*k};f.lift=c.stepLift*Math.sin(Math.PI*t)**2;f.yaw=f.fromYaw+angleDelta(f.toYaw,f.fromYaw)*k;
    if(t===1){f.anchor={...f.to};f.flat={...f.anchor};f.swinging=false;f.lift=0;this.footfalls++;landings.push({...f.anchor,side:f.side});}
   }else{f.flat={...f.anchor};f.lift=0;}
   f.grounded=!f.swinging;f.ankle={...f.flat,y:c.ankleHeight+f.lift};f.pitch=0;
  }
  return this.pose(damage,landings);
 }
 pose(damage={l:0,r:0},landings=[]){const swing=this.feet.find(f=>f.swinging),limp=swing?(damage[swing.side]||0)*Math.sin(Math.PI*Math.min(1,swing.age/swing.duration)):0;return{x:this.position.x,z:this.position.z,y:this.config.pelvisHeight-this.config.limpDrop*limp,yaw:this.yaw,sway:swing?Math.sin(Math.PI*swing.age/swing.duration)*this.config.sway*(swing.side==='l'?1:-1):0,roll:(damage.l-damage.r)*.018,twist:0,compression:limp,feet:this.feet,landings};}
 diagnostics(){return{position:{...this.position},yaw:this.yaw,footfalls:this.footfalls,feet:this.feet.map(f=>({side:f.side,anchor:{...f.anchor},ankle:{...f.ankle},grounded:f.grounded,yaw:f.yaw,swingDuration:f.duration}))};}
}

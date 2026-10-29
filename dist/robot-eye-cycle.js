// Secondary precision weapon. The three heavy weapons retain their own rotation.
export const EYE_BEAMS=Object.freeze({charge:1.1,lockWindow:.22,cooldown:7,pairInterval:.22,pairs:3,speed:52,radius:.20,range:120,lead:.25,maxBolts:16});
const copy=p=>({x:p.x,y:p.y,z:p.z});
export function eyeAim(from,target,velocity={x:0,y:0,z:0}){
 const lead=Math.min(EYE_BEAMS.lead,Math.hypot(target.x-from.x,target.y-from.y,target.z-from.z)/EYE_BEAMS.speed);
 return{x:target.x+Math.max(-46,Math.min(46,velocity.x))*lead,y:target.y+Math.max(-24,Math.min(24,velocity.y))*lead,z:target.z+Math.max(-46,Math.min(46,velocity.z))*lead};
}
// Relative sweep also catches a fast-moving/dashing hero crossing a bolt in one frame.
export function segmentSphereFraction(a,b,center,radius,previous=center){
 const x=a.x-previous.x,y=a.y-previous.y,z=a.z-previous.z,dx=b.x-center.x-x,dy=b.y-center.y-y,dz=b.z-center.z-z,c=x*x+y*y+z*z-radius*radius;
 if(c<=0)return 0;const aa=dx*dx+dy*dy+dz*dz;if(aa<1e-12)return null;const bb=x*dx+y*dy+z*dz,disc=bb*bb-aa*c;if(disc<0)return null;const t=(-bb-Math.sqrt(disc))/aa;return t>=0&&t<=1?t:null;
}
export class RobotEyeCycle{
 constructor(){this.reset();}
 reset(){this.phase='idle';this.cooldown=4;this.elapsed=0;this.target=null;this.pair=0;this.bursts=0;this.shots=0;this.aborted=0;}
 cancel(){if(this.phase!=='idle')this.aborted++;this.phase='idle';this.target=null;this.elapsed=0;}
 step(dt,{alive=true,target=null,velocity,origin,allowed=false,aligned=true}={}){
  const shots=[];this.cooldown=Math.max(0,this.cooldown-dt);
  if(!alive||!target){this.cancel();return shots;}
  if(this.phase!=='idle'&&!allowed){this.cancel();this.cooldown=Math.max(this.cooldown,1);return shots;}
  if(this.phase==='idle'){
   if(this.cooldown>0||!allowed||!origin||Math.hypot(target.x-origin.x,target.y-origin.y,target.z-origin.z)>EYE_BEAMS.range)return shots;
   this.phase='charging';this.elapsed=0;this.pair=0;this.target=eyeAim(origin,target,velocity);
  }
  if(this.phase==='charging'){
   if(this.elapsed<EYE_BEAMS.charge-EYE_BEAMS.lockWindow)this.target=eyeAim(origin,target,velocity);
   this.elapsed+=dt;
   if(this.elapsed<EYE_BEAMS.charge-1e-9)return shots;
   if(!aligned){this.cancel();this.cooldown=1;return shots;}
   this.phase='burst';this.elapsed-=EYE_BEAMS.charge;this.bursts++;
  }else this.elapsed+=dt;
  while(this.phase==='burst'&&this.elapsed>=this.pair*EYE_BEAMS.pairInterval-1e-9){
   shots.push(copy(this.target));this.pair++;this.shots+=2;
   if(this.pair===EYE_BEAMS.pairs){this.phase='idle';this.target=null;this.cooldown=EYE_BEAMS.cooldown;this.elapsed=0;}
  }
  return shots;
 }
 diagnostics(){return{...EYE_BEAMS,phase:this.phase,chargeProgress:this.phase==='charging'?Math.min(1,this.elapsed/EYE_BEAMS.charge):0,cooldown:this.cooldown,target:this.target?copy(this.target):null,bursts:this.bursts,shots:this.shots,aborted:this.aborted,cooldownSeconds:EYE_BEAMS.cooldown};}
}

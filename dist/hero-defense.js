// A shield must physically intersect the beam before its first world collision.
export function shieldBeamIntersection(from,to,barrier,beamRadius=1.05){
 if(barrier.active===false||barrier.strength<=0||barrier.radius<=beamRadius)return null;
 const n=barrier.normal,c=barrier.center,dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const denominator=dx*n.x+dy*n.y+dz*n.z;if(Math.abs(denominator)<1e-8)return null;
 const t=((c.x-from.x)*n.x+(c.y-from.y)*n.y+(c.z-from.z)*n.z)/denominator;if(t<0||t>1)return null;
 const point={x:from.x+dx*t,y:from.y+dy*t,z:from.z+dz*t};
 if(Math.hypot(point.x-c.x,point.y-c.y,point.z-c.z)>barrier.radius-beamRadius)return null;
 return{t,point};
}
export function interceptPoint(from,direction,target){
 const length=Math.hypot(target.x-from.x,target.y-from.y,target.z-from.z),distance=Math.max(4,Math.min(length-4,length*.72));
 return{x:from.x+direction.x*distance,y:from.y+direction.y*distance-1.5,z:from.z+direction.z*distance};
}
export class RescuePolicy {
 constructor(){this.reset();}
 reset(){this.lastAttack=null;this.opportunities=0;this.responses=0;this.accepted=false;}
 decide(attackId,kind){
  if(kind!=='helicopter')return false;
  if(this.lastAttack!==attackId){this.lastAttack=attackId;this.opportunities++;this.accepted=this.opportunities%5!==0;if(this.accepted)this.responses++;}
  return this.accepted;
 }
}

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
// Front-face sweep against the finite shield disk. Large rounds contact it before their centers reach the plane.
export function frontBarrierHit(from,to,barrier,radius=0){
 if(barrier.active===false||barrier.strength<=0||barrier.radius<=0)return null;
 const n=barrier.normal,c=barrier.center;
 const x=from.x-c.x,y=from.y-c.y,z=from.z-c.z;
 const dx=to.x-from.x,dy=to.y-from.y,dz=to.z-from.z;
 const depth=x*n.x+y*n.y+z*n.z,approach=-(dx*n.x+dy*n.y+dz*n.z);
 if(depth<0||approach<=1e-8)return null;
 const start=Math.max(0,(depth-radius)/approach);
 if(start>1)return null;
 const end=Math.min(1,(depth+radius)/approach),reach=barrier.radius+radius;
 if(Math.min(x,x+dx)>reach||Math.max(x,x+dx)<-reach||Math.min(y,y+dy)>reach||Math.max(y,y+dy)<-reach||Math.min(z,z+dz)>reach||Math.max(z,z+dz)<-reach)return null;
 const radialAt=t=>{
  const distance=depth-approach*t;
  return Math.sqrt(Math.max(0,(x+dx*t)**2+(y+dy*t)**2+(z+dz*t)**2-distance**2));
 };
 let t=start;
 if(radialAt(start)>barrier.radius){
  if(radius===0)return null;
  const clearance=t=>Math.max(0,radialAt(t)-barrier.radius)**2+(depth-approach*t)**2;
  // The squared distance to a disk is convex along the sweep. Check the rounded rim only if needed.
  if(clearance(start)>radius**2){
   let low=start,high=end;
   for(let i=0;i<16;i++){
    const left=(low*2+high)/3,right=(low+high*2)/3;
    if(clearance(left)<clearance(right))high=right;else low=left;
   }
   const closest=(low+high)/2;
   if(clearance(closest)>radius**2)return null;
   low=start;high=closest;
   for(let i=0;i<14;i++){
    const middle=(low+high)/2;
    if(clearance(middle)<=radius**2)high=middle;else low=middle;
   }
   t=high;
  }
 }
 const distance=depth-approach*t,radial=radialAt(t),scale=radial>barrier.radius?barrier.radius/radial:1;
 return {t,barrier,point:{x:c.x+(x+dx*t-distance*n.x)*scale,y:c.y+(y+dy*t-distance*n.y)*scale,z:c.z+(z+dz*t-distance*n.z)*scale}};
}
export function absorbDirectionalBarrier(entity,from,to,power){
 if(entity?.isDamageProtected?.())return false;
 for(const barrier of entity?.barriers?.()||[]){
  const hit=frontBarrierHit(from,to,barrier);
  if(hit){barrier.onHit?.(hit.point,power);return true;}
 }
 return false;
}
export function interceptPoint(from,direction,target){
 const length=Math.hypot(target.x-from.x,target.y-from.y,target.z-from.z),distance=Math.max(4,Math.min(length-4,length*.72));
 return{x:from.x+direction.x*distance,y:from.y+direction.y*distance-1.5,z:from.z+direction.z*distance};
}
export class RescuePolicy {
 constructor(){this.reset();}
 reset(){this.lastAttack=null;this.opportunities=0;this.responses=0;this.accepted=false;}
 decide(attackId,kind){
  if(!['helicopter','civilian'].includes(kind))return false;
  if(this.lastAttack!==attackId){this.lastAttack=attackId;this.opportunities++;this.accepted=this.opportunities%5!==0;if(this.accepted)this.responses++;}
  return this.accepted;
 }
}

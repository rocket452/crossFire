// One aim model drives the fired sweep and its non-damaging warning corridor.
export const BEAM_SWEEP=.13;
export function sweptBeamTarget(target,origin,angle){
 const dx=target.x-origin.x,dz=target.z-origin.z,c=Math.cos(angle),s=Math.sin(angle);
 return{x:origin.x+dx*c+dz*s,y:target.y,z:origin.z+dz*c-dx*s};
}
export function cannonRay(shoulder,target,reach=7.3){
 const dx=target.x-shoulder.x,dy=target.y-shoulder.y,dz=target.z-shoulder.z,length=Math.hypot(dx,dy,dz)||1;
 const direction={x:dx/length,y:dy/length,z:dz/length};
 return{from:{x:shoulder.x+direction.x*reach,y:shoulder.y+direction.y*reach,z:shoulder.z+direction.z*reach},direction};
}
export function warningEndpoint(from,direction,range=140,radius=1.05){
 let distance=range;
 if(direction.y<0)distance=Math.max(0,Math.min(range,(from.y-(.10+radius))/-direction.y));
 return{x:from.x+direction.x*distance,y:from.y+direction.y*distance,z:from.z+direction.z*distance};
}
export function beamWarningPlan(target,origin,shoulder){
 return{target:{...target},sweep:BEAM_SWEEP,radius:1.05,rays:[-BEAM_SWEEP,0,BEAM_SWEEP].map(angle=>{
  const ray=cannonRay(shoulder,sweptBeamTarget(target,origin,angle));
  return{angle,...ray,end:warningEndpoint(ray.from,ray.direction)};
 })};
}

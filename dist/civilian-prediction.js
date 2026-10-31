// Read-only forecast of a cohort along its current street route, including corners.
export function predictCivilianPosition(group,seconds,{speed,landing,boardingGroup=null,isClear=()=>true}={}){
 const p={x:group.center.x,z:group.center.z};let left=Math.max(0,seconds)*speed;
 if(!Number.isFinite(left)||group.members.some(c=>c.unit.alive&&c.unit.dashCarried))return p;
 const queue=(group.slot%2?-1:1)*(8+(Math.floor(group.slot/2)%4)*4);
 const route=group.escape?[[group.escape.to.x,group.escape.to.z],...group.escape.path]:group.atLanding&&boardingGroup!==group?[[landing.x+queue,landing.z]]:group.route.slice(group.stage);
 for(const[x,z]of route){
  let distance=Math.hypot(x-p.x,z-p.z);while(distance>.001&&left>.001){const step=Math.min(1,left,distance),next={x:p.x+(x-p.x)/distance*step,z:p.z+(z-p.z)/distance*step};if(!isClear(p,next))return p;p.x=next.x;p.z=next.z;left-=step;distance=Math.hypot(x-p.x,z-p.z);}if(left<=.001)break;
 }
 return p;
}

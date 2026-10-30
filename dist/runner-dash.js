import {segmentBoxFraction,traceImpact} from './combat-collision.js?v=robot-1';
import {terrainHeight,terrainNormal} from './runner-motion.js?v=runner-6';
import {findPortalRescue} from './portal-policy.js?v=evacuation-57';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),copy=p=>({x:p.x,y:p.y,z:p.z});
export const DASH={range:10,radius:5,speed:60,cooldown:5};
const foot=u=>u.entity.root?copy(u.entity.root.position):{x:u.entity.x,y:u.entity.y,z:u.entity.z};
function worldHalf(size,q={x:0,y:0,z:0,w:1}){const {x,y,z,w}=q,a=size.x,b=size.y,c=size.z;return{x:Math.abs(1-2*y*y-2*z*z)*a+Math.abs(2*x*y-2*z*w)*b+Math.abs(2*x*z+2*y*w)*c,y:Math.abs(2*x*y+2*z*w)*a+Math.abs(1-2*x*x-2*z*z)*b+Math.abs(2*y*z-2*x*w)*c,z:Math.abs(2*x*z-2*y*w)*a+Math.abs(2*y*z+2*x*w)*b+Math.abs(1-2*x*x-2*y*y)*c};}
import {RunnerRescues} from './runner-rescues.js?v=evacuation-57';
export class RunnerDash {
 constructor({getUnits=()=>[],getSections=()=>[],getThreats=()=>[],traceThreat=()=>null,onMoveUnit=()=>{},onEvent=()=>{},onRescue=()=>{}}={}){Object.assign(this,{getUnits,getSections,getThreats,traceThreat,onMoveUnit,onEvent});this.rescues=new RunnerRescues({getThreats,traceThreat,onRescue});this.reset();}
 reset(){this.cancel();this.rescues.reset();this.cooldown=0;this.dashes=0;this.carried=0;this.cpuRescues=0;this.last=null;this.scan=0;this.trails=[];}
 cancel(){if(this.active)for(const a of this.active.actors)if(a.unit)a.unit.dashCarried=false;this.active=null;this.trails=[];}
 allies(motion){return this.getUnits().filter(u=>u.alive&&['tank','infantry','civilian'].includes(u.kind)&&!u.dashCarried&&dist(foot(u),motion.position)<=DASH.radius);}
 actors(motion){return[{position:copy(motion.position),half:{x:.38,y:1.3,z:.38}},...this.allies(motion).map(u=>({unit:u,position:foot(u),half:u.kind==='tank'?worldHalf({x:1.85,y:1.4,z:2.4},u.entity.root.quaternion):{x:.42,y:1,z:.52}}))];}
 nearby(actors){return this.getSections().filter(c=>!c.hidden&&['intact','settled','dynamic'].includes(c.state)&&actors.some(a=>{const p=c.body?.position||c;return Math.abs(p.x-a.position.x)<DASH.range+Math.hypot(...c.size)/2+4&&Math.abs(p.z-a.position.z)<DASH.range+Math.hypot(...c.size)/2+4&&Math.abs(p.y-a.position.y)<Math.hypot(...c.size)/2+5;}));}
 next(actors,direction,length,sections){
  const result=[],group=new Set(actors.map(v=>v.unit));for(const a of actors){const p=a.position,q={x:p.x+direction.x*length,y:p.y,z:p.z+direction.z*length};if(Math.abs(q.x)>55||Math.abs(q.z)>55)return null;
   const ground=terrainHeight(q.x,q.z);let floor=ground;
   if(Math.abs(p.y-ground)>.6){const support=traceImpact({x:q.x,y:p.y+.35,z:q.z},{x:q.x,y:p.y-.5,z:q.z},{sections,ground:false,radius:0});if(!support)return null;floor=support.point.y;
    for(const x of [-a.half.x,a.half.x])for(const z of [-a.half.z,a.half.z])if(!traceImpact({x:q.x+x,y:floor+.2,z:q.z+z},{x:q.x+x,y:floor-.25,z:q.z+z},{sections,ground:false,radius:0}))return null;
   }
   if(Math.abs(floor-p.y)>.5)return null;q.y=floor;const from={x:p.x,y:p.y+a.half.y+.04,z:p.z},to={x:q.x,y:q.y+a.half.y+.04,z:q.z};
   for(const c of sections){const center=c.body?.position||c,h=worldHalf({x:c.size[0]/2,y:c.size[1]/2,z:c.size[2]/2},c.body?.quaternion);if(center.y+h.y<=Math.min(p.y,q.y)+.09)continue;const half={x:h.x+a.half.x,y:h.y+a.half.y,z:h.z+a.half.z};if(segmentBoxFraction(from,to,center,half)!==null)return null;}
   for(const u of this.getUnits()){if(!u.alive||group.has(u))continue;for(const s of u.shapes){const h=worldHalf(s.half,s.rotation);if(segmentBoxFraction(from,to,s.center,{x:h.x+a.half.x,y:h.y+a.half.y,z:h.z+a.half.z})!==null)return null;}}
   result.push({...a,position:q});
  }return result;
 }
 plan(motion,direction){let actors=this.actors(motion),sections=this.nearby(actors),distance=0;const initial=actors;for(let i=0;i<DASH.range/.25;i++){const next=this.next(actors,direction,.25,sections);if(!next)break;actors=next;distance+=.25;}return{actors:initial,distance,end:actors[0].position};}
 start(motion,yaw,{cpu=false,plan=null}={}){
  if(this.cooldown>0||this.active||motion.mode!=='ground'||motion.normal.y<.65)return false;const direction={x:Math.sin(yaw),z:Math.cos(yaw)},p=plan||this.plan(motion,direction);if(p.distance<.75)return false;
  this.active={actors:p.actors,direction,distance:p.distance,traveled:0,cpu};for(const a of p.actors)if(a.unit)a.unit.dashCarried=true;this.cooldown=DASH.cooldown;this.dashes++;this.carried+=p.actors.length-1;if(cpu)this.cpuRescues++;this.last={allies:p.actors.filter(a=>a.unit).map(a=>a.unit.id),from:copy(motion.position),to:copy(motion.position),distance:0,blocked:p.distance<DASH.range,cpu};this.rescues.track(p.actors,{cpu});this.onEvent(p.actors.length>1?'Volt Rush rescue dash · '+(p.actors.length-1)+' allies carried.':'Volt Rush · lightning dash.');return true;
 }
 rescueApproach(motion){
  if(this.cooldown>0||this.active||motion.mode!=='ground')return null;const threats=this.getThreats().filter(t=>t.impactPoint);if(!threats.length)return null;
  const rescue=findPortalRescue(threats,this.getUnits(),{impactHorizon:6.5,canRescue:u=>dist(foot(u),motion.position)<=24});if(!rescue)return null;const p=foot(rescue.unit),distance=dist(p,motion.position);if(distance<=DASH.radius)return{input:{},fire:false,yaw:motion.yaw,rescueWaiting:true};if(distance/35+.35>rescue.eta)return null;
  const yaw=Math.atan2(p.x-motion.position.x,p.z-motion.position.z),plan=this.plan(motion,{x:Math.sin(yaw),z:Math.cos(yaw)});if(plan.distance<Math.min(3,distance-DASH.radius))return null;return{input:{forward:1,boost:distance>6},fire:false,yaw};
 }
 tryCPU(motion,dt){
  this.scan-=dt;if(this.scan>0||this.cooldown>0||this.active||motion.mode!=='ground')return false;this.scan=.15;const near=this.allies(motion);if(!near.length)return false;const rescue=findPortalRescue(this.getThreats(),near,{canRescue:u=>near.includes(u),trace:this.traceThreat});if(!rescue||rescue.eta>(rescue.threat.impactPoint?2:1.5))return false;
  if(rescue.threat.impactPoint){let best=null;const zones=this.getThreats().filter(t=>t.impactPoint&&t.timeToImpact>=0);for(let i=0;i<16;i++){const yaw=i*Math.PI/8,direction={x:Math.sin(yaw),z:Math.cos(yaw)},plan=this.plan(motion,direction);if(plan.distance<4)continue;let score=Infinity;for(const a of plan.actors)for(const zone of zones)score=Math.min(score,Math.hypot(a.position.x+direction.x*plan.distance-zone.impactPoint.x,a.position.z+direction.z*plan.distance-zone.impactPoint.z)-zone.blastRadius-Math.max(a.half.x,a.half.z));if(score>.3&&(!best||score>best.score))best={yaw,plan,score};}if(!best)return false;motion.yaw=best.yaw;return this.start(motion,best.yaw,{cpu:true,plan:best.plan});}
  const threat=rescue.threat,v=threat.velocity||{x:0,y:0,z:0},l=Math.hypot(v.x,v.z)||1,n={x:-v.z/l,z:v.x/l};let best=null;
  for(const sign of [1,-1]){const direction={x:n.x*sign,z:n.z*sign},plan=this.plan(motion,direction);if(plan.distance<4)continue;let score=Infinity;for(let i=0;i<=75;i++){const t=i/60,travel=Math.min(plan.distance,DASH.speed*t),projectile={x:threat.position.x+v.x*t,y:threat.position.y+v.y*t,z:threat.position.z+v.z*t};for(const a of plan.actors){const center={x:a.position.x+direction.x*travel,y:a.position.y+a.half.y,z:a.position.z+direction.z*travel},clearance=Math.hypot(Math.max(0,Math.abs(projectile.x-center.x)-a.half.x),Math.max(0,Math.abs(projectile.y-center.y)-a.half.y),Math.max(0,Math.abs(projectile.z-center.z)-a.half.z));score=Math.min(score,clearance);}}if(score>.35&&(!best||score>best.score))best={direction,plan,score};}
  if(!best)return false;motion.yaw=Math.atan2(best.direction.x,best.direction.z);return this.start(motion,motion.yaw,{cpu:true,plan:best.plan});
 }
 update(dt,motion){
  this.rescues.update(dt);this.cooldown=Math.max(0,this.cooldown-dt);this.trails=[];const dash=this.active;if(!dash)return false;
  for(const a of dash.actors)if(a.unit&&(!a.unit.alive||dist(foot(a.unit),a.position)>=.8))a.unit.dashCarried=false;dash.actors=dash.actors.filter(a=>!a.unit||a.unit.alive&&dist(foot(a.unit),a.position)<.8);const before=dash.actors.map(a=>({...a,position:copy(a.position)})),sections=this.nearby(dash.actors);let remaining=Math.min(DASH.speed*dt,dash.distance-dash.traveled),moved=0;
  while(remaining>1e-8){const length=Math.min(.25,remaining),next=this.next(dash.actors,dash.direction,length,sections);if(!next){this.last.blocked=true;break;}dash.actors=next;moved+=length;remaining-=length;}
  for(const a of dash.actors){if(a.unit){this.onMoveUnit(a.unit,a.position);const old=before.find(v=>v.unit===a.unit);this.rescues.moved(a.unit,old.position,a.position);this.trails.push({from:old.position,to:copy(a.position),kind:a.unit.kind});}else{motion.position=copy(a.position);motion.normal=terrainNormal(a.position.x,a.position.z);if(a.position.y>terrainHeight(a.position.x,a.position.z)+.6)motion.normal={x:0,y:1,z:0};}}
  dash.traveled+=moved;motion.distance+=moved;motion.speed=dt?moved/dt:0;motion.velocity={x:0,y:0,z:0};this.last.to=copy(motion.position);this.last.distance=dash.traveled;
  if(moved<DASH.speed*dt-1e-8||dash.traveled>=dash.distance-1e-8){for(const a of dash.actors)if(a.unit)a.unit.dashCarried=false;this.active=null;}return true;
 }
 diagnostics(){return{...DASH,active:!!this.active,cooldown:this.cooldown,rechargeSeconds:DASH.cooldown,dashes:this.dashes,alliesCarried:this.carried,cpuRescues:this.cpuRescues,last:this.last,rescues:this.rescues.diagnostics()};}
}

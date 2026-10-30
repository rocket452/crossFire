import {segmentBoxFraction,traceImpact} from './combat-collision.js?v=wave-dash-62';
import {terrainHeight,terrainNormal} from './runner-motion.js?v=runner-6';
import {findPortalRescue} from './portal-policy.js?v=evacuation-57';
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z),copy=p=>({x:p.x,y:p.y,z:p.z});
export const DASH={range:10,radius:5,speed:36,cooldown:5,contactRadius:2.4,inputBuffer:.2};
const friendly=u=>['tank','infantry','civilian'].includes(u.kind);
const segmentDistance=(p,a,b)=>{const x=b.x-a.x,z=b.z-a.z,t=Math.max(0,Math.min(1,((p.x-a.x)*x+(p.z-a.z)*z)/(x*x+z*z||1)));return Math.hypot(p.x-a.x-x*t,p.z-a.z-z*t);};
const foot=u=>u.entity.root?copy(u.entity.root.position):{x:u.entity.x,y:u.entity.y,z:u.entity.z};
function worldHalf(size,q={x:0,y:0,z:0,w:1}){const {x,y,z,w}=q,a=size.x,b=size.y,c=size.z;return{x:Math.abs(1-2*y*y-2*z*z)*a+Math.abs(2*x*y-2*z*w)*b+Math.abs(2*x*z+2*y*w)*c,y:Math.abs(2*x*y+2*z*w)*a+Math.abs(1-2*x*x-2*z*z)*b+Math.abs(2*y*z-2*x*w)*c,z:Math.abs(2*x*z-2*y*w)*a+Math.abs(2*y*z+2*x*w)*b+Math.abs(1-2*x*x-2*y*y)*c};}
import {RunnerRescues} from './runner-rescues.js?v=evacuation-57';
export class RunnerDash {
 constructor({getUnits=()=>[],getSections=()=>[],getThreats=()=>[],traceThreat=()=>null,onMoveUnit=()=>{},onPhaseUnit=()=>{},onEvent=()=>{},onRescue=()=>{}}={}){Object.assign(this,{getUnits,getSections,getThreats,traceThreat,onMoveUnit,onPhaseUnit,onEvent});this.bounds={minX:-55,maxX:55,minZ:-55,maxZ:55};this.rescues=new RunnerRescues({getThreats,traceThreat,onRescue});this.reset();}
 reset(){this.cancel();this.rescues.reset();this.cooldown=0;this.dashes=0;this.carried=0;this.cpuRescues=0;this.last=null;this.scan=0;this.trails=[];this.effects=[];this.lastFailure=null;}
 cancel(){if(this.active)this.finish(this.active.motion);this.trails=[];}
 effect(kind,p,size=1){this.effects??=[];if(this.effects.length>=64)this.effects.shift();this.effects.push({kind,position:copy(p),size});}
 takeEffects(){const result=this.effects;this.effects=[];return result;}
 actor(u){return{unit:u,position:foot(u),origin:foot(u),half:u.kind==='tank'?worldHalf({x:1.85,y:1.4,z:2.4},u.entity.root.quaternion):{x:.42,y:1,z:.52}};}
 absorb(u){if(!this.active||!u.alive||!friendly(u)||u.dashCarried)return;const a=this.actor(u);this.rescues.track([a],{cpu:this.active.cpu});u.dashCarried=u.dashPhased=true;this.active.actors.push(a);this.carried++;this.last.allies.push(u.id);this.onPhaseUnit(u,true);this.effect('convert',a.position,u.kind==='tank'?2.2:1);}
 collect(from,to){for(const u of this.getUnits()){if(!u.alive||!friendly(u)||u.dashCarried)continue;const p=foot(u);if(Math.abs(p.y-to.y)>2)continue;const a={x:from.x,y:from.y+1.1,z:from.z},b={x:to.x,y:to.y+1.1,z:to.z},touched=u.shapes?.length?u.shapes.some(s=>segmentBoxFraction(a,b,s.center,s.half,s.rotation,DASH.contactRadius)!==null):segmentDistance(p,from,to)<=DASH.contactRadius+(u.kind==='tank'?1.3:.3);if(touched)this.absorb(u);}}
 placement(a,endpoint,reserved){
  const candidates=[copy(a.position)];for(const r of [2,4,6,8])for(let i=0;i<8;i++){const angle=i*Math.PI/4;candidates.push({x:endpoint.x+Math.sin(angle)*r,y:endpoint.y,z:endpoint.z+Math.cos(angle)*r});}candidates.push(copy(a.origin));
  for(const p of candidates){const next=this.next([{...a,position:p}],{x:0,z:0},0,this.nearby([{...a,position:p}]),false);if(!next)continue;const q=next[0].position;if(reserved.some(b=>Math.abs(q.x-b.position.x)<a.half.x+b.half.x&&Math.abs(q.z-b.position.z)<a.half.z+b.half.z&&Math.abs(q.y+a.half.y-b.position.y-b.half.y)<a.half.y+b.half.y))continue;return q;}
  return copy(a.origin);
 }
 finish(motion){const dash=this.active;if(!dash)return;const reserved=[{position:copy(motion.position),half:dash.actors[0].half}];for(const a of dash.actors.slice(1)){if(!a.unit.alive){a.unit.dashCarried=a.unit.dashPhased=false;this.onPhaseUnit(a.unit,false);continue;}const p=this.placement(a,motion.position,reserved),old=copy(a.position);this.onMoveUnit(a.unit,p);this.rescues.moved(a.unit,old,p);a.position=p;reserved.push(a);a.unit.dashCarried=a.unit.dashPhased=false;this.onPhaseUnit(a.unit,false);this.effect('reform',p,a.unit.kind==='tank'?2.2:1);}this.effect('reform',motion.position,1.3);this.active=null;}

 allies(motion){return this.getUnits().filter(u=>u.alive&&friendly(u)&&!u.dashCarried&&Math.abs(foot(u).y-motion.position.y)<=2&&dist(foot(u),motion.position)<=DASH.radius);}
 actors(motion){return[{position:copy(motion.position),half:{x:.38,y:1.3,z:.38}},...this.allies(motion).map(u=>this.actor(u))];}
 nearby(actors){return this.getSections().filter(c=>!c.hidden&&['intact','settled','dynamic'].includes(c.state)&&actors.some(a=>{const p=c.body?.position||c;return Math.abs(p.x-a.position.x)<DASH.range+Math.hypot(...c.size)/2+4&&Math.abs(p.z-a.position.z)<DASH.range+Math.hypot(...c.size)/2+4&&Math.abs(p.y-a.position.y)<Math.hypot(...c.size)/2+5;}));}
 next(actors,direction,length,sections,ignoreFriendly=true){
  const result=[],group=new Set(actors.map(v=>v.unit));for(const a of actors){const p=a.position,q={x:p.x+direction.x*length,y:p.y,z:p.z+direction.z*length};if(q.x<this.bounds.minX||q.x>this.bounds.maxX||q.z<this.bounds.minZ||q.z>this.bounds.maxZ)return null;
   const ground=terrainHeight(q.x,q.z);let support=traceImpact({x:q.x,y:p.y+.35,z:q.z},{x:q.x,y:p.y-.5,z:q.z},{sections,ground:false,radius:0});if(!support&&p.y-ground>.1&&p.y-ground<=.6){for(const x of [-a.half.x,a.half.x])for(const z of [-a.half.z,a.half.z]){const edge=traceImpact({x:q.x+x,y:p.y+.35,z:q.z+z},{x:q.x+x,y:p.y-.5,z:q.z+z},{sections,ground:false,radius:0});if(edge&&(!support||edge.point.y>support.point.y))support=edge;}}let floor=Math.max(ground,support?.point.y??-Infinity);
   if(Math.max(p.y,floor)-ground>.6){if(!support)return null;for(const x of [-a.half.x,a.half.x])for(const z of [-a.half.z,a.half.z])if(!traceImpact({x:q.x+x,y:floor+.2,z:q.z+z},{x:q.x+x,y:floor-.25,z:q.z+z},{sections,ground:false,radius:0}))return null;}
   if(Math.abs(floor-p.y)>.5)return null;q.y=floor;const from={x:p.x,y:p.y+a.half.y+.04,z:p.z},to={x:q.x,y:q.y+a.half.y+.04,z:q.z};
   for(const c of sections){if(c===support?.section)continue;const center=c.body?.position||c,h=worldHalf({x:c.size[0]/2,y:c.size[1]/2,z:c.size[2]/2},c.body?.quaternion);if(center.y+h.y<=Math.max(p.y,q.y)+.09)continue;const half={x:h.x+a.half.x,y:h.y+a.half.y,z:h.z+a.half.z};if(segmentBoxFraction(from,to,center,half)!==null)return null;}
   for(const u of this.getUnits()){if(!u.alive||u.dashPhased||(ignoreFriendly&&friendly(u))||group.has(u))continue;for(const s of u.shapes){const h=worldHalf(s.half,s.rotation);if(segmentBoxFraction(from,to,s.center,{x:h.x+a.half.x,y:h.y+a.half.y,z:h.z+a.half.z})!==null)return null;}}
   result.push({...a,position:q});
  }return result;
 }
 plan(motion,direction){let actors=this.actors(motion),sections=this.nearby(actors),distance=0;const initial=actors;for(let i=0;i<DASH.range/.25;i++){const next=this.next([actors[0]],direction,.25,sections);if(!next)break;actors=next;distance+=.25;}return{actors:initial,distance,end:actors[0].position};}
 start(motion,yaw,{cpu=false,plan=null}={}){
  if(this.cooldown>0||this.active){this.lastFailure='cooldown';return false;}if(motion.mode!=='ground'||motion.normal.y<.65){this.lastFailure='surface';return false;}
  const direction={x:Math.sin(yaw),z:Math.cos(yaw)},p=plan||this.plan(motion,direction);if(p.distance<.75){this.lastFailure='blocked';return false;}
  this.lastFailure=null;this.active={motion,actors:[p.actors[0]],direction,distance:p.distance,traveled:0,cpu};this.cooldown=DASH.cooldown;this.dashes++;if(cpu)this.cpuRescues++;
  this.last={allies:[],from:copy(motion.position),to:copy(motion.position),distance:0,blocked:p.distance<DASH.range,cpu};this.effect('convert',motion.position,1.3);
  for(const a of p.actors.slice(1))this.absorb(a.unit);this.onEvent('Volt Rush · lightning wave.');return true;
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
  dash.actors=dash.actors.filter(a=>{if(!a.unit||a.unit.alive&&dist(foot(a.unit),a.position)<.8)return true;a.unit.dashCarried=a.unit.dashPhased=false;this.onPhaseUnit(a.unit,false);return false;});
  const before=new Map(dash.actors.filter(a=>a.unit).map(a=>[a.unit,copy(a.position)])),sections=this.nearby(dash.actors);let remaining=Math.min(DASH.speed*dt,dash.distance-dash.traveled),moved=0;
  while(remaining>1e-8){const length=Math.min(.25,remaining),leader=dash.actors[0],next=this.next([leader],dash.direction,length,sections);if(!next){this.last.blocked=true;break;}const p=next[0].position;this.collect(leader.position,p);const delta={x:p.x-leader.position.x,y:p.y-leader.position.y,z:p.z-leader.position.z};for(const a of dash.actors)for(const axis of ['x','y','z'])a.position[axis]+=delta[axis];moved+=length;remaining-=length;}
  for(const a of dash.actors){if(a.unit){this.onMoveUnit(a.unit,a.position);const old=before.get(a.unit)||a.origin;this.rescues.moved(a.unit,old,a.position);this.trails.push({from:old,to:copy(a.position),kind:a.unit.kind});}else{motion.position=copy(a.position);motion.normal=terrainNormal(a.position.x,a.position.z);if(a.position.y>terrainHeight(a.position.x,a.position.z)+.6)motion.normal={x:0,y:1,z:0};}}
  dash.traveled+=moved;motion.distance+=moved;motion.speed=dt?moved/dt:0;motion.velocity={x:0,y:0,z:0};this.last.to=copy(motion.position);this.last.distance=dash.traveled;
  if(moved<DASH.speed*dt-1e-8||dash.traveled>=dash.distance-1e-8)this.finish(motion);return true;
 }
 diagnostics(){return{...DASH,active:!!this.active,phasedAllies:this.active?this.active.actors.length-1:0,lastFailure:this.lastFailure,cooldown:this.cooldown,rechargeSeconds:DASH.cooldown,dashes:this.dashes,alliesCarried:this.carried,cpuRescues:this.cpuRescues,last:this.last,rescues:this.rescues.diagnostics()};}
}

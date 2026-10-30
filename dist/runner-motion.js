import {traceImpact} from './combat-collision.js?v=robot-1';
export const RUNNER_FORGIVENESS={coyoteSeconds:.12,jumpBufferSeconds:.15,landingReach:.28,mantleRise:1.05};
export const RUNNER_CONTROL={radius:.34,skin:.015,stepHeight:.46,wallIntentSeconds:.10,wallReleaseLock:.3,playerWallSpeed:12,playerWallBoost:24};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const length=v=>Math.hypot(v.x,v.y,v.z);
const unit=v=>{const l=length(v)||1;return{x:v.x/l,y:v.y/l,z:v.z/l};};
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
function rotate(v,q,inverse=false){const x=inverse?-q.x:q.x,y=inverse?-q.y:q.y,z=inverse?-q.z:q.z,w=q.w,tx=2*(y*v.z-z*v.y),ty=2*(z*v.x-x*v.z),tz=2*(x*v.y-y*v.x);return{x:v.x+w*tx+y*tz-z*ty,y:v.y+w*ty+z*tx-x*tz,z:v.z+w*tz+x*ty-y*tx};}
export function terrainHeight(x,z){return .08+Math.max(0,3.8-.6*Math.abs(x-50)-.28*Math.abs(z-39),3.2-.55*Math.abs(x+50)-.27*Math.abs(z+39));}
export function terrainNormal(x,z){const e=.02;return unit({x:(terrainHeight(x-e,z)-terrainHeight(x+e,z))/(2*e),y:1,z:(terrainHeight(x,z-e)-terrainHeight(x,z+e))/(2*e)});}
function faceNormal(c,p,radius=0,prefer=null){
 const q=c.body?.quaternion||{x:0,y:0,z:0,w:1},center=c.body?.position||c,local=rotate({x:p.x-center.x,y:p.y-center.y,z:p.z-center.z},q,true);let best=Infinity,result;
 for(let i=0;i<3;i++){const axis=['x','y','z'][i],distance=Math.abs(Math.abs(local[axis])-(c.size[i]/2+radius)),n={x:0,y:0,z:0};n[axis]=local[axis]>=0?1:-1;const world=rotate(n,q);const score=distance-(prefer?dot(world,prefer)*1e-5:0);if(score<best){best=score;result=world;}}
 return result;
}
export class RunnerMotion {
 constructor(){this.bounds={minX:-56,maxX:56,minZ:-56,maxZ:56};this.reset();}
 reset(position={x:-3,y:.08,z:12}){this.position={...position};this.velocity={x:0,y:0,z:0};this.normal={x:0,y:1,z:0};this.mode='ground';this.yaw=Math.PI;this.speed=0;this.distance=0;this.wallSeconds=0;this.idleGrip=0;this.jumping=false;this.support=null;this.climbs=0;this.roofs=0;this.coyote=0;this.jumpBuffer=0;this.assistedLandings=0;this.airTime=0;this.wallLock=0;this.wallIntent=0;this.intentNormal=null;this.slides=0;this.overlapRecoveries=0;this.wallReleases=0;this.stepUps=0;this.departedSupportY=null;this.escapeNormal=null;}
 trace(a,b,radius=0,prefer=null){const hit=traceImpact(a,b,{sections:this.near,radius,ground:false});if(hit)hit.normal=faceNormal(hit.section,hit.point,radius,prefer);return hit;}
 floor(x,z,high,low){
  let result=null;const h=terrainHeight(x,z);if(h<=high+.001&&h>=low-.001)result={height:h,normal:terrainNormal(x,z),section:null};
  const hit=this.trace({x,y:high,z},{x,y:low,z});if(hit&&hit.normal.y>.35&&(!result||hit.point.y>result.height))result={height:hit.point.y,normal:hit.normal,section:hit.section};return result;
 }
 top(c){const p=c.body?.position||c,q=c.body?.quaternion||{x:0,y:0,z:0,w:1},[x,y,z]=c.size;return p.y+Math.abs(2*(q.x*q.y+q.z*q.w))*x/2+Math.abs(1-2*(q.x*q.x+q.z*q.z))*y/2+Math.abs(2*(q.y*q.z-q.x*q.w))*z/2;}
 wallContact(p,n){
  let best=null,score=Infinity;for(const dy of [0,.18,-.18]){const hit=this.trace({x:p.x+n.x*.45,y:p.y+dy,z:p.z+n.z*.45},{x:p.x-n.x*.60,y:p.y+dy,z:p.z-n.z*.60},0,n);if(!hit||Math.abs(hit.normal.y)>.35||dot(hit.normal,n)<.45)continue;const cost=Math.abs(dy)+(hit.section.type==='slab' ? .25 : 0);if(cost<score){score=cost;best=hit;}}return best;
 }
 sweep(from,to,player){
  let nearest=null;for(const c of this.near){if(this.top(c)<=Math.min(from.y,to.y)+RUNNER_CONTROL.stepHeight+.01)continue;for(const height of player?[.70,1.55,2.25]:[.8]){const hit=traceImpact({x:from.x,y:from.y+height,z:from.z},{x:to.x,y:to.y+height,z:to.z},{sections:[c],radius:RUNNER_CONTROL.radius,ground:false});if(!hit)continue;hit.normal=faceNormal(c,hit.point,RUNNER_CONTROL.radius);if(Math.abs(hit.normal.y)>.55)continue;if(!nearest||hit.t<nearest.t)nearest=hit;}}return nearest;
 }
 recoverOverlap(p,desired){
  for(let iteration=0;iteration<4;iteration++){let best=null;for(const c of this.near){if(this.top(c)<=p.y+RUNNER_CONTROL.stepHeight+.01)continue;const center=c.body?.position||c,q=c.body?.quaternion||{x:0,y:0,z:0,w:1},local=rotate({x:p.x-center.x,y:p.y+.8-center.y,z:p.z-center.z},q,true),half={x:c.size[0]/2+RUNNER_CONTROL.radius,y:c.size[1]/2+RUNNER_CONTROL.radius,z:c.size[2]/2+RUNNER_CONTROL.radius};if(['x','y','z'].some(a=>Math.abs(local[a])>=half[a]-.002))continue;
    for(const axis of ['x','y','z']){const unitAxis={x:0,y:0,z:0};unitAxis[axis]=1;let normal=rotate(unitAxis,q);if(Math.abs(normal.y)>.45)continue;let sign=Math.sign(local[axis]);if(!sign)sign=normal.x*desired.x+normal.z*desired.z>=0?1:-1;normal={x:normal.x*sign,y:0,z:normal.z*sign};const horizontal=normal.x*normal.x+normal.z*normal.z,depth=(half[axis]-Math.abs(local[axis])+RUNNER_CONTROL.skin)/horizontal,score=depth-.005*(normal.x*desired.x+normal.z*desired.z);if(!best||score<best.score)best={normal,depth,score};}
   }if(!best)break;const depth=Math.min(.6,best.depth);p.x+=best.normal.x*depth;p.z+=best.normal.z*depth;this.overlapRecoveries++;}
 }
 slide(p,delta,player){let remaining={...delta},contact=null;for(let i=0;i<4;i++){const distance=Math.hypot(remaining.x,remaining.z);if(distance<1e-7)break;const end={x:p.x+remaining.x,y:p.y,z:p.z+remaining.z},hit=this.sweep(p,end,player);if(!hit){p.x=end.x;p.z=end.z;break;}contact??=hit;const t=Math.max(0,hit.t-RUNNER_CONTROL.skin/distance);p.x+=remaining.x*t;p.z+=remaining.z*t;remaining.x*=1-t;remaining.z*=1-t;const n=hit.normal,denominator=n.x*n.x+n.z*n.z,into=(remaining.x*n.x+remaining.z*n.z)/denominator;if(into<0){remaining.x-=into*n.x;remaining.z-=into*n.z;}const v=(this.velocity.x*n.x+this.velocity.z*n.z)/denominator;if(v<0){this.velocity.x-=v*n.x;this.velocity.z-=v*n.z;}this.slides++;if(hit.t===0&&into>=-1e-8)break;}return contact;
 }
 releaseWall({x=0,z=0},speed,up=0){const n={...this.normal};this.position.x+=n.x*.45;this.position.z+=n.z*.45;this.velocity={x:x*speed+n.x*1.2,y:up,z:z*speed+n.z*1.2};this.normal={x:0,y:1,z:0};this.mode='air';this.support=null;this.wallLock=RUNNER_CONTROL.wallReleaseLock;this.escapeNormal=n;this.wallIntent=0;this.wallReleases++;}
 // Snap only a descending foot near a real, walkable slab edge. No support is invented.
 landing(x,z,high,low){
  const direct=this.floor(x,z,high,low);if(direct)return{...direct,x,z};
  if(this.airTime<.06||this.velocity.y>-1.5)return null;
  const reach=RUNNER_FORGIVENESS.landingReach;
  for(const [dx,dz]of [[reach,0],[-reach,0],[0,reach],[0,-reach]]){const hit=this.floor(x+dx,z+dz,high,low);if(!hit?.section||hit.section.type!=='slab'||hit.normal.y<.65||this.departedSupportY!==null&&Math.abs(hit.height-this.departedSupportY)<.25)continue;
   const from={x,y:hit.height+.85,z},to={x:x+dx,y:hit.height+.85,z:z+dz};if(this.trace(from,to,.34))continue;return{...hit,x:x+dx,z:z+dz,assisted:true};}
  return null;
 }
 crest(candidate,normal,speed){
  const x=candidate.x-normal.x*.95,z=candidate.z-normal.z*.95,roof=this.floor(x,z,candidate.y+RUNNER_FORGIVENESS.mantleRise,candidate.y-.35);
  if(!roof?.section||roof.section.type!=='slab'||roof.normal.y<.65||roof.height<=terrainHeight(x,z)+.5)return false;
  // The chest must clear the lip: an intermediate floor behind a facade is not a rooftop.
  for(const height of this.player?[.85,2.25]:[.85]){const y=Math.max(candidate.y,roof.height)+height;if(this.trace({x:candidate.x,y,z:candidate.z},{x,y,z},.34))return false;}
  this.position={x,y:roof.height,z};this.normal=roof.normal;this.support=roof.section;this.mode='ground';if(!this.player)this.yaw=Math.atan2(-normal.x,-normal.z);this.roofs++;this.coyote=RUNNER_FORGIVENESS.coyoteSeconds;this.velocity={x:-normal.x*Math.min(7,speed*.25),y:0,z:-normal.z*Math.min(7,speed*.25)};return true;
 }
 step(input,dt,sections=[]){
  if(!(dt>0))return;this.player=!!input.player;dt=Math.min(dt,.15);if(input.jump)this.jumpBuffer=RUNNER_FORGIVENESS.jumpBufferSeconds;const start={...this.position},margin=(input.boost?46:14)*dt+3;
  this.near=sections.filter(c=>!c.hidden&&(c.state==='intact'||c.state==='settled')&&Math.abs((c.body?.position.x??c.x)-this.position.x)<Math.hypot(...c.size)/2+margin&&Math.abs((c.body?.position.z??c.z)-this.position.z)<Math.hypot(...c.size)/2+margin&&Math.abs((c.body?.position.y??c.y)-this.position.y)<Math.hypot(...c.size)/2+margin+2);
  let forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1),magnitude=Math.hypot(forward,strafe);if(magnitude>1){forward/=magnitude;strafe/=magnitude;}magnitude=Math.min(1,magnitude);
  const speed=input.boost?46:14,steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;
  for(let i=0;i<steps;i++){
   const p=this.position;this.wallLock=Math.max(0,this.wallLock-h);this.airTime=this.mode==='air'?this.airTime+h:0;if(this.mode==='ground')this.coyote=RUNNER_FORGIVENESS.coyoteSeconds;else this.coyote=Math.max(0,this.coyote-h);this.jumpBuffer=Math.max(0,this.jumpBuffer-h);
   if(this.mode==='wall'){
    this.wallSeconds+=h;const n={...this.normal},sy=Math.sin(this.yaw),cy=Math.cos(this.yaw),desired={x:sy*forward+cy*strafe,z:cy*forward-sy*strafe},into=-(desired.x*n.x+desired.z*n.z),tangent=cross(n,{x:0,y:1,z:0}),lateral=this.player?desired.x*tangent.x+desired.z*tangent.z:strafe,climb=this.player?Math.max(0,into):forward,wallSpeed=this.player?(input.boost?RUNNER_CONTROL.playerWallBoost:RUNNER_CONTROL.playerWallSpeed):speed;
    if(this.jumpBuffer>0){this.jumpBuffer=this.coyote=0;this.releaseWall({x:n.x,z:n.z},7,8);continue;}
    if(this.player&&into<-.05){this.releaseWall(desired,speed,Math.min(2,Math.max(0,this.lastClimbSpeed||0)*.2));continue;}
    const candidate={x:p.x+tangent.x*lateral*wallSpeed*h,y:p.y+climb*wallSpeed*h,z:p.z+tangent.z*lateral*wallSpeed*h};this.lastClimbSpeed=climb*wallSpeed;
    if(climb>.05&&this.crest(candidate,n,wallSpeed))continue;
    const wall=this.wallContact(candidate,n);
    if(wall){p.x=wall.point.x+wall.normal.x*.06;p.y=candidate.y;p.z=wall.point.z+wall.normal.z*.06;this.normal=wall.normal;this.support=wall.section;this.idleGrip=(this.player?Math.hypot(climb,lateral):magnitude)>.08?0:this.idleGrip+h;if(this.idleGrip>(this.player ? .22 : .45)){this.releaseWall({x:0,z:0},0,0);continue;}}
    else{this.releaseWall(this.player?desired:{x:0,z:0},this.player?speed:0,Math.min(2,Math.max(0,this.lastClimbSpeed)*.2));continue;}
    if(this.mode==='wall'&&climb<-.05&&p.y<=terrainHeight(p.x,p.z)+.16){this.releaseWall({x:n.x,z:n.z},1,0);this.mode='ground';this.position.y=terrainHeight(this.position.x,this.position.z);this.normal=terrainNormal(this.position.x,this.position.z);this.velocity.y=0;}
   }else{
    const sy=Math.sin(this.yaw),cy=Math.cos(this.yaw),desired={x:sy*forward+cy*strafe,z:cy*forward-sy*strafe};if(this.player&&this.mode==='air'&&this.wallLock>.12&&this.escapeNormal){const n=this.escapeNormal,into=desired.x*n.x+desired.z*n.z;if(into<0){desired.x-=into*n.x;desired.z-=into*n.z;}}const tx=desired.x*speed,tz=desired.z*speed,blend=1-Math.exp(-(magnitude?20:26)*h);
    this.velocity.x+=(tx-this.velocity.x)*blend;this.velocity.z+=(tz-this.velocity.z)*blend;
    if(this.jumpBuffer>0&&(this.mode==='ground'||this.coyote>0)){this.mode='air';this.velocity.y=9;this.support=null;this.departedSupportY=null;this.jumpBuffer=this.coyote=0;}
    if(this.player)this.recoverOverlap(p,desired);const incoming={x:this.velocity.x,z:this.velocity.z},hit=this.slide(p,{x:this.velocity.x*h,z:this.velocity.z*h},this.player);
    if(hit){const n=hit.normal,into=-(desired.x*n.x+desired.z*n.z)/(magnitude||1),viewInto=-(sy*n.x+cy*n.z),tall=this.top(hit.section)-p.y>1.8,deliberate=this.player?forward>.3&&viewInto>.65&&into>.8:forward>.1&&incoming.x*n.x+incoming.z*n.z<-1;
     if(deliberate&&tall&&Math.abs(n.y)<.2&&this.wallLock<=0){if(!this.intentNormal||dot(this.intentNormal,n)<.9)this.wallIntent=0;this.intentNormal={...n};this.wallIntent+=h;if(!this.player||this.wallIntent>=RUNNER_CONTROL.wallIntentSeconds){this.mode='wall';this.normal=n;this.support=hit.section;this.idleGrip=0;this.wallIntent=0;this.climbs++;p.x=hit.point.x-n.x*(RUNNER_CONTROL.radius-.06);p.z=hit.point.z-n.z*(RUNNER_CONTROL.radius-.06);this.velocity={x:0,y:0,z:0};}}
     else this.wallIntent=0;
    }else this.wallIntent=0;
    if(this.mode==='ground'){
     const floor=this.floor(p.x,p.z,p.y+RUNNER_CONTROL.stepHeight,p.y-.65);if(floor){this.departedSupportY=null;if(floor.height-p.y>.12)this.stepUps++;p.y=floor.height;this.normal=floor.normal;this.support=floor.section;this.velocity.y=0;}else{this.departedSupportY=p.y;this.mode='air';this.normal={x:0,y:1,z:0};this.support=null;}
    }
    if(this.mode==='air'){
     const oldY=p.y;this.velocity.y=Math.max(-45,this.velocity.y-25*h);let nextY=p.y+this.velocity.y*h;if(this.player&&this.velocity.y>0){const ceiling=this.trace({x:p.x,y:p.y+2.3,z:p.z},{x:p.x,y:nextY+2.3,z:p.z},.26);if(ceiling&&ceiling.normal.y<-.45){nextY=Math.min(nextY,ceiling.point.y-2.3-.015);this.velocity.y=0;this.jumpBuffer=0;}}p.y=nextY;
     if(this.velocity.y<=0){const floor=this.landing(p.x,p.z,oldY+.25,p.y-.08);if(floor){p.x=floor.x;p.z=floor.z;if(floor.assisted)this.assistedLandings++;p.y=floor.height;this.normal=floor.normal;this.support=floor.section;this.velocity.y=0;this.mode='ground';}}
    }
   }
   p.x=clamp(p.x,this.bounds.minX,this.bounds.maxX);p.z=clamp(p.z,this.bounds.minZ,this.bounds.maxZ);
   const ground=terrainHeight(p.x,p.z);if(p.y<ground){p.y=ground;this.mode='ground';this.normal=terrainNormal(p.x,p.z);this.velocity.y=0;}
  }
  const distance=Math.hypot(this.position.x-start.x,this.position.y-start.y,this.position.z-start.z);this.distance+=distance;this.speed=distance/dt;
 }
 diagnostics(){return{position:{...this.position},normal:{...this.normal},mode:this.mode,speed:this.speed,distance:this.distance,climbs:this.climbs,roofs:this.roofs,verticalVelocity:this.velocity.y,coyote:this.coyote,jumpBuffer:this.jumpBuffer,assistedLandings:this.assistedLandings,wallLock:this.wallLock,wallIntent:this.wallIntent,slides:this.slides,overlapRecoveries:this.overlapRecoveries,wallReleases:this.wallReleases,stepUps:this.stepUps};}
}

export function traceTerrain(from,to,radius=0){
 if(Math.max(Math.abs(from.x),Math.abs(to.x))<43)return null;
 const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),steps=Math.max(1,Math.ceil(distance/.7));let previous=0;
 for(let i=0;i<=steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;if(y<=terrainHeight(x,z)+.02+radius){let lo=previous,hi=t;for(let j=0;j<10;j++){const m=(lo+hi)/2,px=from.x+(to.x-from.x)*m,py=from.y+(to.y-from.y)*m,pz=from.z+(to.z-from.z)*m;if(py<=terrainHeight(px,pz)+.02+radius)hi=m;else lo=m;}return{kind:'ground',t:hi,point:{x:from.x+(to.x-from.x)*hi,y:from.y+(to.y-from.y)*hi,z:from.z+(to.z-from.z)*hi}};}previous=t;}return null;
}

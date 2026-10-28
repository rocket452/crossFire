import {traceImpact} from './combat-collision.js?v=robot-1';
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
 constructor(){this.reset();}
 reset(position={x:-3,y:.08,z:12}){this.position={...position};this.velocity={x:0,y:0,z:0};this.normal={x:0,y:1,z:0};this.mode='ground';this.yaw=Math.PI;this.speed=0;this.distance=0;this.wallSeconds=0;this.idleGrip=0;this.jumping=false;this.support=null;this.climbs=0;this.roofs=0;}
 trace(a,b,radius=0,prefer=null){const hit=traceImpact(a,b,{sections:this.near,radius,ground:false});if(hit)hit.normal=faceNormal(hit.section,hit.point,radius,prefer);return hit;}
 floor(x,z,high,low){
  let result=null;const h=terrainHeight(x,z);if(h<=high+.001&&h>=low-.001)result={height:h,normal:terrainNormal(x,z),section:null};
  const hit=this.trace({x,y:high,z},{x,y:low,z});if(hit&&hit.normal.y>.35&&(!result||hit.point.y>result.height))result={height:hit.point.y,normal:hit.normal,section:hit.section};return result;
 }
 wallContact(p,n){return this.trace({x:p.x+n.x*.45,y:p.y+n.y*.45,z:p.z+n.z*.45},{x:p.x-n.x*.60,y:p.y-n.y*.60,z:p.z-n.z*.60},0,n);}
 step(input,dt,sections=[]){
  if(!(dt>0))return;dt=Math.min(dt,.15);const start={...this.position},margin=(input.boost?46:14)*dt+3;
  this.near=sections.filter(c=>!c.hidden&&(c.state==='intact'||c.state==='settled')&&Math.abs((c.body?.position.x??c.x)-this.position.x)<Math.hypot(...c.size)/2+margin&&Math.abs((c.body?.position.z??c.z)-this.position.z)<Math.hypot(...c.size)/2+margin&&Math.abs((c.body?.position.y??c.y)-this.position.y)<Math.hypot(...c.size)/2+margin+2);
  let forward=clamp(input.forward||0,-1,1),strafe=clamp(input.strafe||0,-1,1),magnitude=Math.hypot(forward,strafe);if(magnitude>1){forward/=magnitude;strafe/=magnitude;}magnitude=Math.min(1,magnitude);
  const speed=input.boost?46:14,steps=Math.max(1,Math.ceil(dt/.008)),h=dt/steps;let jump=!!input.jump;
  for(let i=0;i<steps;i++){
   const p=this.position;
   if(this.mode==='wall'){
    this.wallSeconds+=h;
    if(jump){this.mode='air';this.velocity={x:this.normal.x*8,y:8,z:this.normal.z*8};p.x+=this.normal.x*.5;p.z+=this.normal.z*.5;this.normal={x:0,y:1,z:0};jump=false;continue;}
    const right=cross(this.normal,{x:0,y:1,z:0});const candidate={x:p.x+right.x*strafe*speed*h,y:p.y+forward*speed*h,z:p.z+right.z*strafe*speed*h};
    const wall=this.wallContact(candidate,this.normal);
    if(wall&&dot(wall.normal,this.normal)>.45){
     p.x=wall.point.x+wall.normal.x*.055;p.y=wall.point.y+wall.normal.y*.055;p.z=wall.point.z+wall.normal.z*.055;this.normal=wall.normal;this.support=wall.section;this.idleGrip=magnitude>.05?0:this.idleGrip+h;
     if(this.idleGrip>.45){this.mode='air';this.velocity={x:this.normal.x*2,y:-1,z:this.normal.z*2};p.x+=this.normal.x*.45;p.z+=this.normal.z*.45;this.normal={x:0,y:1,z:0};}
    }else{
     const roof=this.floor(candidate.x-this.normal.x*.85,candidate.z-this.normal.z*.85,candidate.y+1.0,candidate.y-1.5);
     if(forward>.05&&roof&&roof.height>terrainHeight(candidate.x,candidate.z)+.5){p.x=candidate.x-this.normal.x*.85;p.z=candidate.z-this.normal.z*.85;p.y=roof.height;this.yaw=Math.atan2(-this.normal.x,-this.normal.z);this.normal=roof.normal;this.support=roof.section;this.mode='ground';this.roofs++;this.velocity={x:0,y:0,z:0};}
     else{this.mode='air';this.velocity={x:this.normal.x*1.5,y:Math.min(0,forward*speed),z:this.normal.z*1.5};this.normal={x:0,y:1,z:0};}
    }
    if(this.mode==='wall'&&p.y<=terrainHeight(p.x,p.z)+.16){const n={...this.normal};this.mode='ground';p.x+=n.x*.5;p.z+=n.z*.5;p.y=terrainHeight(p.x,p.z);this.yaw=Math.atan2(-n.x,-n.z);this.normal=terrainNormal(p.x,p.z);this.velocity={x:0,y:0,z:0};}
   }else{
    const sy=Math.sin(this.yaw),cy=Math.cos(this.yaw),tx=(sy*forward+cy*strafe)*speed,tz=(cy*forward-sy*strafe)*speed,blend=1-Math.exp(-(magnitude?16:20)*h);
    this.velocity.x+=(tx-this.velocity.x)*blend;this.velocity.z+=(tz-this.velocity.z)*blend;
    if(this.mode==='ground'&&jump){this.mode='air';this.velocity.y=9;this.support=null;jump=false;}
    const candidate={x:p.x+this.velocity.x*h,y:p.y,z:p.z+this.velocity.z*h};
    const hit=this.trace({x:p.x,y:p.y+.8,z:p.z},{x:candidate.x,y:p.y+.8,z:candidate.z},.36);
    if(hit&&Math.abs(hit.normal.y)<.45){
     if(forward>.1&&dot({x:this.velocity.x,y:0,z:this.velocity.z},hit.normal)<-1){this.mode='wall';this.normal=hit.normal;this.support=hit.section;this.idleGrip=0;this.climbs++;p.x=hit.point.x-hit.normal.x*.305;p.z=hit.point.z-hit.normal.z*.305;p.y+=.22;this.velocity={x:0,y:0,z:0};}
     else{const into=this.velocity.x*hit.normal.x+this.velocity.z*hit.normal.z;this.velocity.x-=Math.min(0,into)*hit.normal.x;this.velocity.z-=Math.min(0,into)*hit.normal.z;}
    }else{p.x=candidate.x;p.z=candidate.z;}
    if(this.mode==='ground'){
     const floor=this.floor(p.x,p.z,p.y+.65,p.y-.85);if(floor){p.y=floor.height;this.normal=floor.normal;this.support=floor.section;this.velocity.y=0;}else{this.mode='air';this.normal={x:0,y:1,z:0};this.support=null;}
    }
    if(this.mode==='air'){
     const oldY=p.y;this.velocity.y=Math.max(-45,this.velocity.y-25*h);p.y+=this.velocity.y*h;
     if(this.velocity.y<=0){const floor=this.floor(p.x,p.z,oldY+.25,p.y-.08);if(floor){p.y=floor.height;this.normal=floor.normal;this.support=floor.section;this.velocity.y=0;this.mode='ground';}}
    }
   }
   p.x=clamp(p.x,-56,56);p.z=clamp(p.z,-56,56);
   const ground=terrainHeight(p.x,p.z);if(p.y<ground){p.y=ground;this.mode='ground';this.normal=terrainNormal(p.x,p.z);this.velocity.y=0;}
  }
  const distance=Math.hypot(this.position.x-start.x,this.position.y-start.y,this.position.z-start.z);this.distance+=distance;this.speed=distance/dt;
 }
 diagnostics(){return{position:{...this.position},normal:{...this.normal},mode:this.mode,speed:this.speed,distance:this.distance,climbs:this.climbs,roofs:this.roofs,verticalVelocity:this.velocity.y};}
}

export function traceTerrain(from,to,radius=0){
 if(Math.max(Math.abs(from.x),Math.abs(to.x))<43)return null;
 const distance=Math.hypot(to.x-from.x,to.y-from.y,to.z-from.z),steps=Math.max(1,Math.ceil(distance/.7));let previous=0;
 for(let i=0;i<=steps;i++){const t=i/steps,x=from.x+(to.x-from.x)*t,y=from.y+(to.y-from.y)*t,z=from.z+(to.z-from.z)*t;if(y<=terrainHeight(x,z)+.02+radius){let lo=previous,hi=t;for(let j=0;j<10;j++){const m=(lo+hi)/2,px=from.x+(to.x-from.x)*m,py=from.y+(to.y-from.y)*m,pz=from.z+(to.z-from.z)*m;if(py<=terrainHeight(px,pz)+.02+radius)hi=m;else lo=m;}return{kind:'ground',t:hi,point:{x:from.x+(to.x-from.x)*hi,y:from.y+(to.y-from.y)*hi,z:from.z+(to.z-from.z)*hi}};}previous=t;}return null;
}

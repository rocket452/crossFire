// Collision queries shared by the reticle and missile sweeps. No render meshes or cockpit geometry.
const IDENTITY={x:0,y:0,z:0,w:1};
function inverseRotate(x,y,z,q){const ax=-q.x,ay=-q.y,az=-q.z,w=q.w,tx=2*(ay*z-az*y),ty=2*(az*x-ax*z),tz=2*(ax*y-ay*x);return{x:x+w*tx+ay*tz-az*ty,y:y+w*ty+az*tx-ax*tz,z:z+w*tz+ax*ty-ay*tx};}
export function segmentBoxFraction(from,to,center,half,rotation=IDENTITY,radius=0,previousCenter=center){
 const extent=(half.boundingRadius??(half.boundingRadius=Math.hypot(half.x,half.y,half.z)))+radius;
 if(Math.max(from.x,to.x)<Math.min(center.x,previousCenter.x)-extent||Math.min(from.x,to.x)>Math.max(center.x,previousCenter.x)+extent||Math.max(from.y,to.y)<Math.min(center.y,previousCenter.y)-extent||Math.min(from.y,to.y)>Math.max(center.y,previousCenter.y)+extent||Math.max(from.z,to.z)<Math.min(center.z,previousCenter.z)-extent||Math.min(from.z,to.z)>Math.max(center.z,previousCenter.z)+extent)return null;
 const a=inverseRotate(from.x-previousCenter.x,from.y-previousCenter.y,from.z-previousCenter.z,rotation),b=inverseRotate(to.x-center.x,to.y-center.y,to.z-center.z,rotation);let near=0,far=1;
 for(const axis of ['x','y','z']){const size=half[axis]+radius,d=b[axis]-a[axis];if(Math.abs(d)<1e-10){if(a[axis]<-size||a[axis]>size)return null;continue;}let t0=(-size-a[axis])/d,t1=(size-a[axis])/d;if(t0>t1)[t0,t1]=[t1,t0];near=Math.max(near,t0);far=Math.min(far,t1);if(near>far+1e-9)return null;}
 return near>=0&&near<=1?near:null;
}
export function traceImpact(from,to,{sections=[],targets=[],ignoreUnit=null,radius=.10,movingTargets=false,ground=true}={}){
 let nearest=Infinity,hit=null;
 for(const c of sections){if(c.hidden)continue;const position=c.body?.position||{x:c.x,y:c.y,z:c.z},rotation=c.body?.quaternion||IDENTITY,half=c.collisionHalf||(c.collisionHalf={x:c.size[0]/2,y:c.size[1]/2,z:c.size[2]/2});const t=segmentBoxFraction(from,to,position,half,rotation,radius);if(t!==null&&t<nearest){nearest=t;hit={kind:'building',section:c};}}
 for(const target of targets){if(target.id===ignoreUnit||target.hidden||target.dashPhased)continue;for(const shape of target.shapes){const t=segmentBoxFraction(from,to,shape.center,shape.half,shape.rotation||IDENTITY,radius,movingTargets?shape.previousCenter||shape.center:shape.center);if(t!==null&&t<nearest){nearest=t;hit={kind:'unit',unit:target};}}}
 if(ground&&(from.y<=.10+radius||to.y<=.10+radius)){const t=from.y<=.10+radius?0:(from.y-(.10+radius))/(from.y-to.y);if(t<nearest){nearest=t;hit={kind:'ground'};}}
 if(!hit)return null;hit.t=nearest;hit.point={x:from.x+(to.x-from.x)*nearest,y:from.y+(to.y-from.y)*nearest,z:from.z+(to.z-from.z)*nearest};return hit;
}
export class UnitDamage {
 constructor(onDisabled=()=>{}){this.units=[];this.onDisabled=onDisabled;this.damageEvents=0;this.disabledEvents=0;}
 add(id,kind,entity,maxHealth=kind==='tank'?100:kind==='helicopter'?90:35){const unit={id,kind,entity,maxHealth,health:maxHealth,alive:true,shapes:[]};this.units.push(unit);entity.combatUnit=unit;return unit;}
 hurt(unit,power,point){if(!unit?.alive||unit.dashPhased||power<=0)return 0;const damage=Math.min(unit.health,power);unit.health=Math.max(0,unit.health-damage);this.damageEvents++;if(unit.health===0){unit.alive=false;this.disabledEvents++;this.onDisabled(unit,point);}return damage;}
 blast(point,{direct=null,radius=5,power=65,exclude=null,filter=()=>true}={}){const results=[];for(const unit of this.units){if(!unit.alive||unit.dashPhased||unit.id===exclude||!unit.shapes.length||!filter(unit))continue;const distance=Math.min(...unit.shapes.map(s=>Math.max(0,Math.hypot(s.center.x-point.x,s.center.y-point.y,s.center.z-point.z)-Math.max(s.half.x,s.half.y,s.half.z))));let damage=unit===direct?power:distance<radius?power*.65*(1-distance/radius):0;if(damage<=0)continue;damage=this.hurt(unit,damage,point);results.push({unit,damage,disabled:!unit.alive});}return results;}
 reset(){for(const u of this.units){u.health=u.maxHealth;u.alive=true;}this.damageEvents=this.disabledEvents=0;}
 stats(){return{damageEvents:this.damageEvents,disabled:this.disabledEvents,units:this.units.map(u=>({id:u.id,kind:u.kind,health:Math.round(u.health),alive:u.alive,stance:u.kind==='infantry'?u.entity.clip:undefined,position:u.shapes[0]?.center}))};}
}

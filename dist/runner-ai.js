const angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class RunnerAI {
 constructor(){this.route=[{x:0,z:12},{x:12,z:12},{x:24,z:12},{x:24,z:-24},{x:0,z:-24},{x:-24,z:-24},{x:-24,z:24},{x:0,z:24}];this.reset();}
 reset(){this.mode='patrol';this.index=0;this.cooldown=.85;this.attackTime=0;this.bursts=0;this.distance=0;this.lastPosition=null;this.sightTimer=0;this.visible=false;this.stuck=0;this.recoveries=0;this.suspended=false;}
 suspend(){this.suspended=true;this.mode='player';this.attackTime=0;}
 resume(position){this.suspended=false;this.mode='patrol';this.attackTime=0;this.cooldown=.65;this.sightTimer=0;this.stuck=0;let best=Infinity;for(let i=0;i<this.route.length;i++){const p=this.route[i],d=Math.hypot(p.x-position.x,p.z-position.z);if(d<best){best=d;this.index=i;}}this.lastPosition={...position};}
 update(dt,{motion,robotAlive,canShoot,target}){
  if(this.suspended)return{input:{},fire:false,yaw:motion.yaw};const p=motion.position;
  const traveled=this.lastPosition?Math.hypot(p.x-this.lastPosition.x,p.y-this.lastPosition.y,p.z-this.lastPosition.z):0;this.distance+=traveled;this.lastPosition={...p};this.cooldown=Math.max(0,this.cooldown-dt);this.sightTimer-=dt;
  if(this.sightTimer<=0){this.visible=!!robotAlive&&canShoot();this.sightTimer=.2;}
  if(motion.mode==='wall'){this.mode='climbing';this.attackTime=0;return{input:{forward:1,boost:false},fire:false,yaw:motion.yaw};}
  if(motion.mode==='air'){this.mode='recovering';this.attackTime=0;return{input:{},fire:false,yaw:motion.yaw};}
  if(this.mode==='climbing'||this.mode==='recovering'){this.mode='patrol';this.cooldown=.5;}
  if(this.mode==='attack'){
   this.attackTime-=dt;
   if(this.attackTime<=0||!robotAlive||!this.visible){this.mode='patrol';this.cooldown=3.0;}
   else return{input:{},fire:true,yaw:Math.atan2(target.x-p.x,target.z-p.z),target};
  }
  if(this.cooldown===0&&this.visible&&robotAlive){this.mode='attack';this.attackTime=1.05;this.bursts++;return{input:{},fire:true,yaw:Math.atan2(target.x-p.x,target.z-p.z),target};}
  let waypoint=this.route[this.index],distance=Math.hypot(waypoint.x-p.x,waypoint.z-p.z);if(distance<2.2){this.index=(this.index+1)%this.route.length;waypoint=this.route[this.index];distance=Math.hypot(waypoint.x-p.x,waypoint.z-p.z);}
  const desired=Math.atan2(waypoint.x-p.x,waypoint.z-p.z),yaw=motion.yaw+angle(desired,motion.yaw)*Math.min(1,dt*12);
  this.stuck=traveled<.008&&motion.speed<.3?this.stuck+dt:0;const jump=this.stuck>1.2;if(jump){this.stuck=0;this.recoveries++;}
  return{input:{forward:1,boost:distance>11,jump},fire:false,yaw};
 }
 diagnostics(){return{mode:this.mode,waypoint:this.index,bursts:this.bursts,distance:this.distance,recoveries:this.recoveries,suspended:this.suspended};}
}

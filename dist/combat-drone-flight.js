import * as CANNON from './vendor/cannon-es.js';

const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const angleDelta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));

export class DroneFlight {
 constructor(body,engines,config){
  Object.assign(this,{body,engines,config});
  this.inverse=new CANNON.Quaternion();
  this.up=new CANNON.Vec3();this.angular=new CANNON.Vec3();this.forward=new CANNON.Vec3();
  this.force=new CANNON.Vec3();this.worldYaw=new CANNON.Vec3();
  this.forces=new Array(engines.length).fill(0);
 }
 apply(goal,heading,mode,gravity){
  const {body,engines,config:c}=this;
  const hover=body.mass*gravity/engines.length;
  let thrust=hover*c.failedThrust, pitch=0,roll=0,yaw=0;
  if(mode==='flying'){
   const vx=clamp((goal.x-body.position.x)*c.approachGain,-c.maxSpeed,c.maxSpeed);
   const vz=clamp((goal.z-body.position.z)*c.approachGain,-c.maxSpeed,c.maxSpeed);
   const ax=clamp((vx-body.velocity.x)*c.speedDamping,-c.maxAcceleration,c.maxAcceleration);
   const az=clamp((vz-body.velocity.z)*c.speedDamping,-c.maxAcceleration,c.maxAcceleration);
   const ay=clamp((goal.y-body.position.y)*c.altitudeGain-body.velocity.y*c.climbDamping,-5,5);
   body.quaternion.conjugate(this.inverse);
   this.up.set(ax,gravity,az);this.up.normalize();
   this.inverse.vmult(this.up,this.up);
   this.inverse.vmult(body.angularVelocity,this.angular);
   pitch=body.inertia.x*(c.attitudeGain*this.up.z-c.angularGain*this.angular.x);
   roll=body.inertia.z*(-c.attitudeGain*this.up.x-c.angularGain*this.angular.z);
   this.forward.set(0,0,1);body.quaternion.vmult(this.forward,this.forward);
   const bearing=Math.atan2(this.forward.x,this.forward.z);
   yaw=body.inertia.y*(c.yawGain*angleDelta(heading,bearing)-c.yawDamping*this.angular.y);
   this.up.set(0,1,0);body.quaternion.vmult(this.up,this.up);
   thrust=body.mass*(gravity+ay)/(Math.max(.64,this.up.y)*engines.length);
  }
  const x2=engines.reduce((total,e)=>total+e.offset.x**2,0);
  const z2=engines.reduce((total,e)=>total+e.offset.z**2,0);
  let reaction=0;
  for(const [index,engine]of engines.entries()){
   const value=mode==='wreck'||engine.health<=0?0:clamp(
    thrust-pitch*engine.offset.z/z2+roll*engine.offset.x/x2+clamp(yaw/(engines.length*c.reactionArm),-hover*c.yawReserve,hover*c.yawReserve)*engine.spin,
    0,c.maxThrust);
   this.forces[index]=value;
   if(!value)continue;
   this.force.set(0,value,0);
   body.applyLocalForce(this.force,engine.offset);
   reaction+=value*engine.spin*c.reactionArm;
  }
  this.worldYaw.set(0,reaction,0);body.quaternion.vmult(this.worldYaw,this.worldYaw);
  body.torque.vadd(this.worldYaw,body.torque);
 }
}

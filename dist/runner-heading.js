const angleDelta=(to,from)=>Math.atan2(Math.sin(to-from),Math.cos(to-from));
export const RUNNER_CAMERA_FOLLOW=Object.freeze({response:6,maxTurnRate:Math.PI,manualGrace:.65,minSpeed:2,inputTurnThreshold:.12});
// Hold a movement reference while a direction is held: camera recentering must not
// feed back into locomotion and bend a straight run into a circle.
export class RunnerHeading {
 constructor(){this.reset(0);}
 reset(yaw){this.moveYaw=yaw;this.inputAngle=null;this.manualSeconds=0;this.following=false;}
 manual(deltaYaw=0){this.moveYaw+=deltaYaw;this.manualSeconds=RUNNER_CAMERA_FOLLOW.manualGrace;this.following=false;}
 movementYaw(yaw,input,mode){
  const forward=input.forward||0,strafe=input.strafe||0,moving=Math.hypot(forward,strafe)>.08;
  if(!moving||mode==='wall'){this.moveYaw=yaw;this.inputAngle=null;return yaw;}
  const angle=Math.atan2(strafe,forward);
  // A deliberate new direction is relative to the current view. Small thumb
  // noise does not restart the reference, nor does automatic camera rotation.
  if(this.inputAngle===null||Math.abs(angleDelta(angle,this.inputAngle))>RUNNER_CAMERA_FOLLOW.inputTurnThreshold){this.moveYaw=yaw;this.inputAngle=angle;}
  return this.moveYaw;
 }
 follow(yaw,dt,{input={},mode='ground',velocity={x:0,z:0},heading=yaw,aiming=false,blocked=false}={}){
  const h=Math.max(0,dt);this.manualSeconds=Math.max(0,this.manualSeconds-h);
  this.following=!blocked&&!aiming&&mode==='ground'&&this.manualSeconds<=0&&Math.hypot(input.forward||0,input.strafe||0)>.08&&Math.hypot(velocity.x,velocity.z)>RUNNER_CAMERA_FOLLOW.minSpeed;
  if(!this.following)return yaw;
  const error=angleDelta(heading,yaw),cap=RUNNER_CAMERA_FOLLOW.maxTurnRate*h;
  return yaw+Math.max(-cap,Math.min(cap,error*(1-Math.exp(-RUNNER_CAMERA_FOLLOW.response*h))));
 }
 diagnostics(){return{following:this.following,movementYaw:this.moveYaw,manualSeconds:this.manualSeconds};}
}

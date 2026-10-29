import * as THREE from './vendor/three.module.js';
export const SOLARA_STEERING=Object.freeze({minRadius:8,maxTurnRate:.65,turnAcceleration:1.4,acceleration:18,braking:20,bodyTurnRate:.8});
const clamp=THREE.MathUtils.clamp,angle=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));
export class SolaraSteering {
 constructor(){this.reset();}
 reset(){this.turnRate=0;this.initialized=false;this.heading=0;}
 update(velocity,desired,dt,facing=0){
  if(dt<=0)return;const speed=Math.hypot(velocity.x,velocity.z),targetSpeed=Math.hypot(desired.x,desired.z);if(!this.initialized){this.heading=speed>.1?Math.atan2(velocity.x,velocity.z):facing;this.initialized=true;}
  const targetHeading=targetSpeed>.05?Math.atan2(desired.x,desired.z):this.heading,error=angle(targetHeading,this.heading),turnSpeed=targetSpeed*(.35+.65*Math.max(0,Math.cos(error)));
  const nextSpeed=THREE.MathUtils.lerp(speed,turnSpeed,1-Math.exp(-2.8*dt)),limit=(nextSpeed>speed?SOLARA_STEERING.acceleration:SOLARA_STEERING.braking)*dt,travelSpeed=speed+clamp(nextSpeed-speed,-limit,limit);
  const maxTurn=Math.min(SOLARA_STEERING.maxTurnRate,Math.max(speed,travelSpeed)/SOLARA_STEERING.minRadius),requested=clamp(error*2,-maxTurn,maxTurn);this.turnRate+=clamp(requested-this.turnRate,-SOLARA_STEERING.turnAcceleration*dt,SOLARA_STEERING.turnAcceleration*dt);this.turnRate=clamp(this.turnRate,-maxTurn,maxTurn);
  const step=this.turnRate*dt;if(Math.abs(step)>Math.abs(error)&&Math.sign(step)===Math.sign(error)){this.heading+=error;this.turnRate=0;}else this.heading+=step;
  this.heading=Math.atan2(Math.sin(this.heading),Math.cos(this.heading));velocity.x=Math.sin(this.heading)*travelSpeed;velocity.z=Math.cos(this.heading)*travelSpeed;velocity.y=THREE.MathUtils.lerp(velocity.y,desired.y,1-Math.exp(-3.4*dt));
 }
 bodyYaw(yaw,velocity,dt){if(Math.hypot(velocity.x,velocity.z)<.25)return yaw;const target=Math.atan2(velocity.x,velocity.z),limit=SOLARA_STEERING.bodyTurnRate*Math.max(0,dt);return yaw+clamp(angle(target,yaw)*(1-Math.exp(-3.5*dt)),-limit,limit);}
 diagnostics(){return{heading:this.heading,turnRate:this.turnRate,minRadius:SOLARA_STEERING.minRadius,maxTurnRate:SOLARA_STEERING.maxTurnRate};}
}

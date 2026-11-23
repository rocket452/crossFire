import {MathUtils,Vector3} from './vendor/three.module.js';

// Orbit the camera about the hero and keep the boom behind them at either pole.
export function pitchHeroBoom(eye,focus,forward,pitch,{lift=1.2,overheadClearance=.16,downStart=0}={}){
 const back=(focus.x-eye.x)*forward.x+(focus.z-eye.z)*forward.z;
 const height=eye.y-focus.y;
 const restElevation=Math.atan2(height,back),limit=Math.PI/2-overheadClearance;
 const swing=MathUtils.clamp(Math.max(0,pitch)*lift+Math.min(0,pitch-downStart),restElevation-limit,restElevation+limit);
 return eye.addScaledVector(forward,back-back*Math.cos(swing)-height*Math.sin(swing))
  .setY(focus.y+height*Math.cos(swing)-back*Math.sin(swing));
}

export function heroViewDirection(camera,focus,yaw,pitch){
 const x=Math.sin(yaw),z=Math.cos(yaw);
 const depth=(focus.x-camera.position.x)*x+(focus.z-camera.position.z)*z;
 const elevation=Math.atan2(focus.y-camera.position.y,Math.max(.1,depth));
 // Reframe from the actual camera position after the boom meets walls or terrain.
 const fov=MathUtils.degToRad(camera.getEffectiveFOV());
 const upperMargin=MathUtils.lerp(.21,.34,MathUtils.smoothstep(pitch,0,.55));
 pitch=MathUtils.clamp(pitch,elevation-fov*.16,elevation+fov*upperMargin);
 const horizontal=Math.cos(pitch);
 return new Vector3(x*horizontal,Math.sin(pitch),z*horizontal);
}

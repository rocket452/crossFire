import {MathUtils,Vector3} from './vendor/three.module.js';

// Swing the boom down as aim rises so the hero remains below the reticle.
export function pitchHeroBoom(eye,focus,forward,pitch){
 const angle=Math.max(0,pitch)*1.2;
 const back=(focus.x-eye.x)*forward.x+(focus.z-eye.z)*forward.z;
 const height=eye.y-focus.y;
 const swing=MathUtils.clamp(angle,0,Math.atan2(height,back)+Math.PI/2-.16);
 return eye.addScaledVector(forward,back-back*Math.cos(swing)-height*Math.sin(swing))
  .setY(focus.y+height*Math.cos(swing)-back*Math.sin(swing));
}

export function heroViewDirection(camera,focus,yaw,pitch){
 const x=Math.sin(yaw),z=Math.cos(yaw);
 if(pitch>0){
  const depth=(focus.x-camera.position.x)*x+(focus.z-camera.position.z)*z;
  const elevation=Math.atan2(focus.y-camera.position.y,Math.max(.1,depth));
  // Ground and nearby walls can prevent the boom from swinging far enough.
  // Reserve space below the reticle for the hero before raising aim further.
  const margin=MathUtils.degToRad(camera.getEffectiveFOV()*.34);
  pitch=Math.min(pitch,elevation+margin);
 }
 const horizontal=Math.cos(pitch);
 return new Vector3(x*horizontal,Math.sin(pitch),z*horizontal);
}

import * as THREE from './vendor/three.module.js';
export const RUNNER_LOOK=Object.freeze({torsoLimit:85*Math.PI/180,headLimit:25*Math.PI/180,torsoShare:.9,response:12,headResponse:16});
// Additive look layer, applied after the authored animation and before arm IK.
// World-space turns respect the imported bones' axes and wall/slope orientation.
export class RunnerLookPose {
 constructor(){this.up=new THREE.Vector3();this.forward=new THREE.Vector3();this.direction=new THREE.Vector3();this.cross=new THREE.Vector3();this.parent=new THREE.Quaternion();this.turn=new THREE.Quaternion();this.local=new THREE.Quaternion();this.reset();}
 reset(){this.yaw=this.headYaw=this.targetYaw=0;}
 rotate(node,angle){if(!node||Math.abs(angle)<1e-8)return;node.parent.getWorldQuaternion(this.parent);this.turn.setFromAxisAngle(this.up,angle);this.local.copy(this.parent).invert().multiply(this.turn).multiply(this.parent);node.quaternion.premultiply(this.local);node.updateWorldMatrix(false,true);}
 update(dt,{root,normal,direction,character=null,nodes=null,enabled=true}){
  root.updateWorldMatrix(true,true);this.up.copy(normal).normalize();this.forward.set(0,0,1).applyQuaternion(root.quaternion).projectOnPlane(this.up).normalize();this.direction.copy(direction).projectOnPlane(this.up);this.targetYaw=enabled&&this.direction.lengthSq()>1e-6?Math.atan2(this.up.dot(this.cross.crossVectors(this.forward,this.direction)),this.forward.dot(this.direction)):0;
  // Keep the current look-over-shoulder side while crossing directly behind.
  if(Math.abs(this.targetYaw)>Math.PI*.85&&Math.abs(this.yaw)>.1)this.targetYaw=Math.sign(this.yaw)*Math.abs(this.targetYaw);
  const torso=THREE.MathUtils.clamp(this.targetYaw*RUNNER_LOOK.torsoShare,-RUNNER_LOOK.torsoLimit,RUNNER_LOOK.torsoLimit),head=THREE.MathUtils.clamp(this.targetYaw-torso,-RUNNER_LOOK.headLimit,RUNNER_LOOK.headLimit);
  this.yaw=dt>0?THREE.MathUtils.damp(this.yaw,torso,RUNNER_LOOK.response,dt):torso;this.headYaw=dt>0?THREE.MathUtils.damp(this.headYaw,head,RUNNER_LOOK.headResponse,dt):head;
  if(nodes){this.rotate(nodes.chest,this.yaw);this.rotate(nodes.head,this.headYaw);}
  if(character){for(const[name,weight]of[['B_Spine',.25],['B_Spine1',.35],['B_Spine2',.4]])this.rotate(character.nodes[name],this.yaw*weight);this.rotate(character.nodes.B_Neck,this.headYaw*.4);this.rotate(character.nodes.B_Head,this.headYaw*.6);}
 }
 diagnostics(){return{targetYaw:this.targetYaw,torsoYaw:this.yaw,headYaw:this.headYaw};}
}

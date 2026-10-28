import * as THREE from './vendor/three.module.js';
const TAU=Math.PI*2,clamp=THREE.MathUtils.clamp;
const smooth=t=>{t=clamp(t,0,1);return t*t*t*(10+t*(-15+6*t));};
export class RunnerAnimator {
 constructor(root,nodes){this.root=root;this.nodes=nodes;this.rest={};for(const [name,node]of Object.entries(nodes))this.rest[name]=node.position.clone();this.down=new THREE.Vector3(0,-1,0);this.reset();}
 reset(){this.phase=0;this.clock=0;this.speed=0;this.runBlend=0;this.airBlend=0;this.bank=0;this.compression=0;this.previousHeading=null;this.previousMode='ground';this.frequency=0;for(const [name,node]of Object.entries(this.nodes)){node.position.copy(this.rest[name]);node.rotation.set(0,0,0);}this.feet=[];}
 update(dt,motion,firing=false){
  this.clock+=dt;const previousSpeed=this.speed;this.speed=THREE.MathUtils.damp(this.speed,motion.speed,10,dt);this.runBlend=THREE.MathUtils.damp(this.runBlend,clamp(this.speed/5,0,1),13,dt);this.airBlend=THREE.MathUtils.damp(this.airBlend,motion.mode==='air'?1:0,16,dt);
  this.frequency=Math.min(4.5,.9+this.speed*.1);this.phase+=TAU*this.frequency*this.runBlend*dt;
  const heading=Math.atan2(motion.velocity.x,motion.velocity.z);let turn=0;if(this.previousHeading!==null&&this.speed>3&&Math.hypot(motion.velocity.x,motion.velocity.z)>1&&motion.mode!=='wall'&&dt>0)turn=clamp(Math.atan2(Math.sin(heading-this.previousHeading),Math.cos(heading-this.previousHeading))/dt,-2.5,2.5);if(Math.hypot(motion.velocity.x,motion.velocity.z)>1&&motion.mode!=='wall')this.previousHeading=heading;
  this.bank=THREE.MathUtils.damp(this.bank,-turn*.075,9,dt);
  if(this.previousMode==='air'&&motion.mode!=='air')this.compression=.075;this.compression*=Math.exp(-15*dt);this.previousMode=motion.mode;
  const n=this.nodes,run=this.runBlend*(1-this.airBlend),bob=Math.cos(this.phase*2)*.027*run;
  n.pelvis.position.y=this.rest.pelvis.y-.06-.065*run+bob-this.compression;
  n.pelvis.rotation.set(0,Math.sin(this.phase)*.065*run,this.bank);
  const acceleration=dt>0?clamp((this.speed-previousSpeed)/dt/25,-1,1):0;
  n.chest.rotation.set((.15+clamp(this.speed/46,0,1)*.18)*run+acceleration*.035*run, -n.pelvis.rotation.y*.55,-this.bank*.35);
  n.head.rotation.set(-n.chest.rotation.x*.72,0,-this.bank*.3);
  for(const [side,sign]of [['l',1],['r',-1]]){const pump=Math.cos(this.phase)*sign;n['upperarm_'+side].rotation.set((pump*.82-.12)*run-.12*(1-run),this.bank*.15,side==='l'?.10:-.10);n['forearm_'+side].rotation.x=-.82-Math.max(0,pump)*.35*run;}
  this.root.updateMatrixWorld(true);this.feet=[];
  const stride=(.58+Math.min(.20,this.speed*.005))*this.runBlend;
  for(const [side,offset]of [['l',0],['r',.5]]){
   const phase=((this.phase/TAU+offset)%1+1)%1;let z,lift,pitch;
   if(phase<.34){const u=phase/.34;z=(.5-u)*stride;lift=0;pitch=u<.2?-.16*(1-smooth(u/.2)):.28*smooth((u-.72)/.28);}
   else{const u=(phase-.34)/.66;z=(-.5+smooth(u))*stride;lift=Math.sin(Math.PI*u)**2*.32*this.runBlend;pitch=u<.35?.28*(1-smooth(u/.35)):-.16*smooth((u-.72)/.28);}
   z=THREE.MathUtils.lerp(z,side==='l'?-.12:.12,this.airBlend);lift+=this.airBlend*.19;pitch*=this.runBlend*(1-this.airBlend);
   const pivotZ=pitch>=0?.35:-.145,raise=-.20+.20*Math.cos(pitch)+pivotZ*Math.sin(pitch);
   const local=new THREE.Vector3(side==='l'?-.19:.19,.21+lift+raise,z);
   this.solve(side,local,pitch);this.feet.push({side,phase,lift,pitch,stance:phase<.34&&this.airBlend<.5,target:local.toArray()});
  }
  this.root.updateMatrixWorld(true);
 }
 solve(side,local,pitch){
  const thigh=this.nodes['thigh_'+side],shin=this.nodes['shin_'+side],foot=this.nodes['foot_'+side];
  const hip=thigh.getWorldPosition(new THREE.Vector3()),end=this.root.localToWorld(local.clone()),delta=end.clone().sub(hip),distance=delta.length(),direction=delta.clone().normalize(),upper=shin.position.length(),lower=foot.position.length(),d=clamp(distance,Math.abs(upper-lower)+.001,upper+lower-.001);
  const bend=new THREE.Vector3(0,0,1).transformDirection(this.root.matrixWorld);bend.addScaledVector(direction,-bend.dot(direction)).normalize();const along=(upper*upper-lower*lower+d*d)/(2*d),height=Math.sqrt(Math.max(0,upper*upper-along*along)),knee=hip.clone().addScaledVector(direction,along).addScaledVector(bend,height);
  const frame=this.root.getWorldQuaternion(new THREE.Quaternion()),inverse=frame.clone().invert();
  const upperDirection=knee.clone().sub(hip).normalize().applyQuaternion(inverse),lowerDirection=end.clone().sub(knee).normalize().applyQuaternion(inverse);
  const upperWorld=new THREE.Quaternion().setFromUnitVectors(this.down,upperDirection).premultiply(frame);thigh.quaternion.copy(thigh.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(upperWorld);thigh.updateWorldMatrix(false,true);
  const lowerWorld=new THREE.Quaternion().setFromUnitVectors(this.down,lowerDirection).premultiply(frame);shin.quaternion.copy(upperWorld).invert().multiply(lowerWorld);shin.updateWorldMatrix(false,true);
  const soleWorld=frame.clone().multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),pitch));foot.quaternion.copy(lowerWorld).invert().multiply(soleWorld);foot.updateWorldMatrix(false,true);
 }
 diagnostics(){return{phase:this.phase,frequency:this.frequency,speed:this.speed,runBlend:this.runBlend,airBlend:this.airBlend,bank:this.bank,feet:this.feet};}
}

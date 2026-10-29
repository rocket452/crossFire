import * as THREE from './vendor/three.module.js';
import {SolaraAnimation} from './solara-animation.js?v=solara-motion-34';
import {HumanoidCharacter} from './humanoid-character.js?v=solara-female-31';
export class SolaraCharacter {
 constructor(root,humanoid,model,spec){
  this.root=root;this.character=new HumanoidCharacter(humanoid,{variant:'solara',height:2.59});this.character.variant='solara';for(const mesh of this.character.meshes)mesh.material=mesh.material.clone();root.add(this.character.root);this.animation=new SolaraAnimation();this.handTargets={};this.armNormals={};this.armRotations={};this.footTargets={};this.lastHead=null;this.parts=[];this.flameUniform={value:0};
  const c=this.character;for(let i=0;i<c.bones.length;i++){c.bones[i].position.copy(c.rest[i].p);c.bones[i].quaternion.copy(c.rest[i].q);}root.updateMatrixWorld(true);model.scene.updateMatrixWorld(true);
  this.armRoll={};for(const side of['R','L']){const upper=c.nodes['B_'+side+'_UpperArm'],lower=c.nodes['B_'+side+'_Forearm'],hand=c.nodes['B_'+side+'_Hand'],a=c.world(upper.name),b=c.world(lower.name),end=c.world(hand.name),u=b.clone().sub(a),l=end.clone().sub(b),normal=new THREE.Vector3().crossVectors(u,l).normalize();this.armRoll[side]={upper:this.armFrame(u,normal).invert().multiply(upper.getWorldQuaternion(new THREE.Quaternion())),lower:this.armFrame(l,normal).invert().multiply(lower.getWorldQuaternion(new THREE.Quaternion()))};}

  for(const part of spec.parts){const source=model.scene.getObjectByName(part.name);if(!source)throw Error('Missing Solara accessory '+part.name);const group=new THREE.Group();group.name=part.name;root.add(group);
   source.traverse(o=>{if(!o.isMesh)return;const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);geometry.translate(-part.pivot[0],-part.pivot[1],-part.pivot[2]);const fitting=c.metadata.headAccessories?.[part.name.endsWith('_eye')?'eyes':'hair'];if(fitting){geometry.scale(...fitting.scale);geometry.translate(...fitting.offset);}
    let material=o.material.clone();if(part.name.endsWith('_eye'))material=new THREE.MeshBasicMaterial({color:part.name==='fire_eye'?'#ff3026':'#80edff',toneMapped:false});if(part.name==='fire_hair'){material.onBeforeCompile=shader=>{shader.uniforms.solaraTime=this.flameUniform;shader.vertexShader='uniform float solaraTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n float flameTip=clamp((position.y-.24)*.13,0.,.07);transformed.x=min(0.,transformed.x+sin(solaraTime*7.+position.y*18.+position.z*9.)*flameTip);transformed.z+=cos(solaraTime*6.+position.y*13.)*flameTip*.5;');};material.customProgramCacheKey=()=> 'solara-fire-hair-v1';}
    const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=mesh.receiveShadow=true;group.add(mesh);
   });const bone=c.nodes[part.bone];this.parts.push({mesh:group,bone,inverseBind:bone.getWorldQuaternion(new THREE.Quaternion()).invert()});
  }
  const material=c.meshes[0].material;material.roughness=.48;material.metalness=.28;material.onBeforeCompile=shader=>{
   shader.vertexShader='attribute float _region;varying vec3 solaraBind;varying float solaraRegion;\n'+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n solaraBind=position;solaraRegion=_region;');
   shader.fragmentShader='varying vec3 solaraBind;varying float solaraRegion;\n'+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    float iceHalf=step(0.,solaraBind.x);float skin=1.-step(.3,abs(solaraRegion-1.));
    vec3 fireColor=mix(vec3(.34,.045,.008),vec3(1.,.22,.035),skin);
    vec3 iceColor=mix(vec3(.025,.28,.52),vec3(.15,.70,1.),skin);
    float vein=pow(max(0.,sin(solaraBind.y*48.+solaraBind.z*18.)),18.);
    diffuseColor.rgb=mix(fireColor,iceColor,iceHalf)*(1.+vein*.45);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\n totalEmissiveRadiance+=mix(vec3(1.,.11,.003),vec3(.015,.37,.85),step(0.,solaraBind.x))*(.12+vein*.3);');
  };material.customProgramCacheKey=()=> 'solara-perfect-half-v1';this.sync(0);
 }
 rotate(bone,axis,angle){const world=bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(new THREE.Quaternion().setFromAxisAngle(axis,angle));bone.quaternion.copy(bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert()).multiply(world);bone.updateWorldMatrix(false,true);}
 leg(side,target){const c=this.character,upper=c.nodes['B_'+side+'_Thigh'],lower=c.nodes['B_'+side+'_Calf'],foot=c.nodes['B_'+side+'_Foot'];const a=c.world(upper.name),b=c.world(lower.name),end=c.world(foot.name),u=a.distanceTo(b),l=b.distanceTo(end),direction=target.clone().sub(a),distance=THREE.MathUtils.clamp(direction.length(),Math.abs(u-l)+.001,u+l-.001);direction.normalize();const pole=this.root.localToWorld(new THREE.Vector3(0,.7,1)).sub(a);pole.addScaledVector(direction,-pole.dot(direction)).normalize();const along=(u*u-l*l+distance*distance)/(2*distance),knee=a.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-along*along)));c.point(upper,lower,knee);c.point(lower,foot,target);const toe=c.nodes['B_'+side+'_Toe0'];c.point(foot,toe,foot.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0,0,1).transformDirection(this.root.matrixWorld)));}
 armFrame(direction,normal){const y=direction.clone().normalize(),x=normal.clone().addScaledVector(y,-normal.dot(y)).normalize(),z=new THREE.Vector3().crossVectors(x,y).normalize();return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));}
 arm(side,target,dt){
  const c=this.character,upper=c.nodes['B_'+side+'_UpperArm'],lower=c.nodes['B_'+side+'_Forearm'],hand=c.nodes['B_'+side+'_Hand'],a=c.world(upper.name),b=c.world(lower.name),end=c.world(hand.name),u=a.distanceTo(b),l=b.distanceTo(end),delta=target.clone().sub(a),distance=THREE.MathUtils.clamp(delta.length(),Math.abs(u-l)+.002,(u+l)*.975),direction=delta.normalize();
  let pole=this.root.localToWorld(new THREE.Vector3(side==='R'?-.95:.95,1.25,-.5)).sub(a);pole.addScaledVector(direction,-pole.dot(direction)).normalize();let normal=new THREE.Vector3().crossVectors(pole,direction).normalize();
  const previous=this.armNormals[side];if(previous&&dt>0){const old=previous.clone().transformDirection(this.root.matrixWorld);old.addScaledVector(direction,-old.dot(direction)).normalize();if(normal.dot(old)<0)normal.negate();normal.copy(old.lerp(normal,1-Math.exp(-10*dt))).normalize();}this.armNormals[side]=normal.clone().applyQuaternion(this.root.getWorldQuaternion(new THREE.Quaternion()).invert());pole=new THREE.Vector3().crossVectors(direction,normal).normalize();
  const along=(u*u-l*l+distance*distance)/(2*distance),elbow=a.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,u*u-along*along))),reach=a.clone().addScaledVector(direction,distance),first=elbow.clone().sub(a),second=reach.clone().sub(elbow),set=(bone,axis,offset)=>{const world=this.armFrame(axis,normal).multiply(offset);const desired=bone.parent.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(world),old=this.armRotations[bone.name];if(old&&dt>0){old.rotateTowards(desired,10*dt);bone.quaternion.copy(old);}else{bone.quaternion.copy(desired);this.armRotations[bone.name]=desired.clone();}bone.updateWorldMatrix(false,true);};set(upper,first,this.armRoll[side].upper);set(lower,second,this.armRoll[side].lower);
 }
 pose(dt,time,{speed=0,turnRate=0,fireTarget=null,iceTarget=null,chargeProgress=0,releaseProgress=-1,iceProgress=0}={}){
  const c=this.character,p=this.animation.sample(dt,{speed,turnRate,charge:chargeProgress,release:releaseProgress,ice:iceProgress,fireActive:!!fireTarget,iceActive:!!iceTarget});
  c.update('Idle',dt);for(let i=0;i<c.bones.length;i++)if(!c.bones[i].name.includes('Finger')){c.bones[i].position.copy(c.rest[i].p);c.bones[i].quaternion.copy(c.rest[i].q);}c.root.updateWorldMatrix(true,true);
  const axis=local=>local.transformDirection(this.root.matrixWorld),right=axis(new THREE.Vector3(1,0,0)),up=axis(new THREE.Vector3(0,1,0)),forward=axis(new THREE.Vector3(0,0,1)),rotate=(bone,pose,weight=1)=>{this.rotate(bone,right,(pose.pitch||0)*weight);this.rotate(bone,up,(pose.yaw||0)*weight);this.rotate(bone,forward,(pose.roll||0)*weight);};
  const pelvis=c.nodes.B_Pelvis;pelvis.position.copy(pelvis.parent.worldToLocal(this.root.localToWorld(new THREE.Vector3(p.pelvis.x,(c.metadata.pose?.pelvisHeight||1.19)+p.pelvis.y,p.pelvis.z))));pelvis.updateWorldMatrix(false,true);rotate(pelvis,p.pelvis);
  for(const[name,weight]of[['B_Spine',.25],['B_Spine1',.35],['B_Spine2',.4]])rotate(c.nodes[name],p.spine,weight);
  for(const[side,sign]of[['R',-1],['L',1]]){
   const f=p.feet[side],foot=this.root.localToWorld(new THREE.Vector3(f.x,f.y,f.z));this.footTargets[side]=foot.clone();this.leg(side,foot);
   const toe=c.nodes['B_'+side+'_Toe0'],ankle=c.nodes['B_'+side+'_Foot'],toeDirection=new THREE.Vector3(Math.sin(f.yaw),0,Math.cos(f.yaw)).transformDirection(this.root.matrixWorld);c.point(ankle,toe,c.world(ankle.name).add(toeDirection));
   rotate(c.nodes['B_'+side+'_Clavicle'],{roll:sign*(.025+.04*p.speedBlend),yaw:sign*p.shoulderSwing});
   const h=p.hands[side],neutral=this.root.localToWorld(new THREE.Vector3(h.x,h.y,h.z));let desired=neutral;
   if(side==='R'&&fireTarget){
    const gather=this.root.localToWorld(new THREE.Vector3(-.43,1.72+.08*p.fire.wind,-.32)),from=c.world('B_R_UpperArm'),reach=fireTarget.clone().sub(from).normalize().multiplyScalar(.86).add(from);
    desired=gather.lerp(reach,p.fire.extend);desired.lerp(neutral,releaseProgress>=0?.2*releaseProgress:0);desired=neutral.clone().lerp(desired,p.fireBlend);
   }else if(side==='L'&&iceTarget){
    const from=c.world('B_L_UpperArm'),direction=iceTarget.clone().sub(from).normalize(),reach=from.clone().addScaledVector(direction,.78);reach.y+=.16*(1-p.ice.progress);reach.addScaledVector(right,.07*Math.sin(p.ice.progress*Math.PI*2));desired=neutral.clone().lerp(reach,p.iceBlend);
   }
   // Local-space filtering retains the hand pose during travel/turns without world lag.
   const local=this.root.worldToLocal(desired.clone()),previous=this.handTargets[side];if(!previous||dt===0)this.handTargets[side]=local;else previous.lerp(local,1-Math.exp(-22*Math.max(0,dt)));this.arm(side,this.root.localToWorld(this.handTargets[side].clone()),dt);
  }
  let headPose={pitch:p.head.pitch-p.spine.pitch*.4,yaw:p.head.yaw-p.spine.yaw*.35};const target=fireTarget||iceTarget;
  if(target){const at=this.root.worldToLocal(c.world('B_Head')),to=this.root.worldToLocal(target.clone()).sub(at);headPose={pitch:THREE.MathUtils.clamp(-Math.atan2(to.y,Math.hypot(to.x,to.z)),-.45,.50),yaw:THREE.MathUtils.clamp(Math.atan2(to.x,to.z),-.75,.75)};}
  if(!this.lastHead||dt===0)this.lastHead=headPose;else{const blend=1-Math.exp(-8*Math.max(0,dt));this.lastHead.pitch=THREE.MathUtils.lerp(this.lastHead.pitch,headPose.pitch,blend);this.lastHead.yaw=THREE.MathUtils.lerp(this.lastHead.yaw,headPose.yaw,blend);}rotate(c.nodes.B_Neck,this.lastHead,.35);rotate(c.nodes.B_Head,this.lastHead,.65);this.sync(time);
 }
 sync(time){this.flameUniform.value=time;this.root.updateMatrixWorld(true);const inverse=this.root.getWorldQuaternion(new THREE.Quaternion()).invert();for(const p of this.parts){p.mesh.position.copy(this.root.worldToLocal(p.bone.getWorldPosition(new THREE.Vector3())));p.mesh.quaternion.copy(inverse).multiply(p.bone.getWorldQuaternion(new THREE.Quaternion())).multiply(p.inverseBind);}}
 hand(side){return this.character.hand(side);}
 reset(){this.animation.reset();this.handTargets={};this.armNormals={};this.armRotations={};this.footTargets={};this.lastHead=null;this.character.reset();this.sync(0);}
 diagnostics(){return{...this.character.diagnostics(),motion:this.animation.diagnostics(),baseModel:this.character.metadata.source||'Volt Rush',accessoryParts:this.parts.length,elementSplit:'anatomical right fire / left ice',flameTime:this.flameUniform.value};}
}

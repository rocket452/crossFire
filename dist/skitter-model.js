import * as THREE from './vendor/three.module.js';
import {neonRim,hazardMaterial} from './astra-ronin-cyber.js?v=472';
// Skitter rig on the user-supplied quadruped (private GLB, procedural animation only). Each leg is a
// hip -> knee -> ankle chain ending in a four-finger claw, with a strut bar above the knee and an upright
// post at the ankle. Feet are planted in world space on whatever surface the body stands on (street, wall
// or roof); two-bone IK bends each knee away from that surface and the struts follow as a linkage.
const V=(x=0,y=0,z=0)=>new THREE.Vector3(x,y,z);
const q1=new THREE.Quaternion(),q2=new THREE.Quaternion(),q3=new THREE.Quaternion(),v1=V(),v2=V(),v3=V();
const LEGS=[
 {hip:'Bone001',knee:'Bone002',ankle:'Bone003',fingers:['Bone010','Bone012','Bone014','Bone016'],bar:'Bone004',post:'Bone005'},
 {hip:'Bone006',knee:'Bone007',ankle:'Bone008',fingers:['Bone018','Bone020','Bone022','Bone024'],bar:'Bone009',post:'Bone026'},
 {hip:'Bone027',knee:'Bone028',ankle:'Bone029',fingers:['Bone030','Bone032','Bone034','Bone036'],bar:'Bone038',post:'Bone039'},
 {hip:'Bone040',knee:'Bone041',ankle:'Bone042',fingers:['Bone043','Bone045','Bone047','Bone049'],bar:'Bone051',post:'Bone052'}];

// A skinned clone whose skeleton binds to its own bones (the vendor set has no SkeletonUtils).
export function cloneSkinned(source){
 const clone=source.clone(true),from=[],to=[];source.traverse(o=>from.push(o));clone.traverse(o=>to.push(o));const map=new Map(from.map((o,i)=>[o,to[i]]));
 clone.traverse(o=>{if(!o.isSkinnedMesh)return;const src=from[to.indexOf(o)];o.bind(new THREE.Skeleton(src.skeleton.bones.map(b=>map.get(b)),src.skeleton.boneInverses),src.bindMatrix);});
 return clone;
}
// Cyber finish: black shell and gunmetal leg plates with the neon rim, chrome joints, magenta core, a red
// hunter eye, hazard-striped turret cap and claws whose edges glow hot (brighter while attacking).
function materials(){
 const claw=new THREE.MeshStandardMaterial({color:'#2a2f3a',metalness:.85,roughness:.22,emissive:'#ff1fcf',emissiveIntensity:0});
 const flare={value:.25};claw.userData.flare=flare;
 claw.onBeforeCompile=shader=>{shader.uniforms.uFlare=flare;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying float vTip;').replace('#include <begin_vertex>','#include <begin_vertex>\nvTip=smoothstep(.575,.61,length(position.xz));');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying float vTip;uniform float uFlare;').replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.12,.8)*vTip*uFlare*2.6;');};
 claw.customProgramCacheKey=()=>'skitter-claw';
 return{
  shell:neonRim(new THREE.MeshStandardMaterial({color:'#1b1d25',metalness:.45,roughness:.42}),{strength:.4,power:3}),
  plates:neonRim(new THREE.MeshStandardMaterial({color:'#525a69',metalness:.72,roughness:.28}),{strength:.25,power:3.2}),
  frame:neonRim(new THREE.MeshStandardMaterial({color:'#0e0f14',metalness:.55,roughness:.55}),{strength:.2,power:3.2}),
  joints:new THREE.MeshStandardMaterial({color:'#aeb8c6',metalness:1,roughness:.16}),
  core:new THREE.MeshStandardMaterial({color:'#ff86e6',emissive:'#ff1fcf',emissiveIntensity:3,roughness:.35}),
  cap:hazardMaterial(),
  cap001:neonRim(new THREE.MeshStandardMaterial({color:'#1b1d25',metalness:.45,roughness:.42}),{strength:.4,power:3}),
  sensor_housing:new THREE.MeshStandardMaterial({color:'#262a33',metalness:.8,roughness:.3}),
  sensor:new THREE.MeshStandardMaterial({color:'#b8f8ff',emissive:'#19e3ff',emissiveIntensity:2.4,roughness:.3}),
  lens:new THREE.MeshStandardMaterial({color:'#ff9aa8',emissive:'#ff1a3c',emissiveIntensity:3.6,roughness:.2}),
  limbs:claw};
}
const glowMaterial=()=>new THREE.ShaderMaterial({uniforms:{uPower:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
 vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
 fragmentShader:'uniform float uPower;varying vec2 vUv;void main(){float r=length(vUv*2.-1.);if(r>1.)discard;gl_FragColor=vec4(vec3(1.,.15,.75)*pow(1.-r,2.4)*.42*uPower,1.);}'});

export class SkitterModel{
 constructor(gltf,span){
  this.span=span;this.root=new THREE.Group();this.root.name='Skitter model';
  this.rig=cloneSkinned(gltf.scene);this.rig.scale.setScalar(span);this.root.add(this.rig);
  this.materials=materials();this.meshes=[];
  this.rig.traverse(o=>{if(!o.isSkinnedMesh)return;o.material=this.materials[o.name.replace('niko_','')]||this.materials.shell;o.castShadow=true;o.receiveShadow=true;o.frustumCulled=false;this.meshes.push(o);});
  const bone=name=>{let found=null;this.rig.traverse(o=>{if(o.isBone&&o.name===name)found=o;});if(!found)throw Error('Skitter rig is missing '+name);return found;};
  this.body=bone('Bone');this.turret=bone('Bone053');this.bones=[];this.rig.traverse(o=>{if(o.isBone)this.bones.push(o);});
  this.bind=new Map(this.bones.map(b=>[b,{p:b.position.clone(),q:b.quaternion.clone()}]));
  this.root.updateMatrixWorld(true);
  const local=node=>this.root.worldToLocal(node.getWorldPosition(V())),rootInv=this.root.getWorldQuaternion(q1).invert();
  const rel=node=>rootInv.clone().multiply(node.getWorldQuaternion(new THREE.Quaternion()));
  this.legs=LEGS.map((names,i)=>{const leg={index:i,hip:bone(names.hip),knee:bone(names.knee),ankle:bone(names.ankle),fingers:names.fingers.map(bone),bar:bone(names.bar),post:bone(names.post)};
   leg.l1=local(leg.knee).distanceTo(local(leg.hip));leg.l2=local(leg.ankle).distanceTo(local(leg.knee));
   leg.restAnkle=local(leg.ankle);leg.lift=leg.restAnkle.y;leg.restFoot=leg.restAnkle.clone().setY(0);
   leg.ankleRel=rel(leg.ankle);leg.postRel=rel(leg.post);leg.barOffset=local(leg.bar).sub(local(leg.knee));leg.barFromKnee=leg.knee.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(leg.bar.getWorldQuaternion(new THREE.Quaternion()));
   leg.front=leg.restAnkle.z>0;leg.side=Math.sign(leg.restAnkle.x);
   leg.fingerAxes=leg.fingers.map(f=>{const dir=local(f.children[0]||f).sub(local(f)).normalize(),out=leg.restAnkle.clone().setY(0).normalize();return new THREE.Vector3().crossVectors(out,dir).normalize();});
   return leg;});
  this.bodyHeight=local(this.body).y;this.turretRel=rel(this.turret);this.headHeight=local(this.turret).y;
  this.glow=new THREE.Mesh(new THREE.CircleGeometry(.62,40),glowMaterial());this.glow.rotation.x=-Math.PI/2;this.glow.position.y=.02/span;this.glow.scale.setScalar(1);this.glow.renderOrder=1;this.glow.name='Skitter underglow';this.rig.add(this.glow);
 }
 get clawFlare(){return this.materials.limbs.userData.flare;}
 stats(){let triangles=0;for(const m of this.meshes)triangles+=(m.geometry.index?.count||m.geometry.attributes.position.count)/3;return{triangles,meshes:this.meshes.length+1,bones:this.bones.length};}
 reset(){for(const [b,r]of this.bind){b.position.copy(r.p);b.quaternion.copy(r.q);}this.root.position.set(0,0,0);this.root.quaternion.identity();this.root.visible=true;this.root.scale.setScalar(1);for(const m of this.meshes)m.visible=true;}
 // Ideal foot point for a leg in model space, given a stance spread and per-leg offset (step lead etc.).
 footLocal(leg,spread=1){return leg.restFoot.clone().multiplyScalar(spread);}
 aim(bone,child,target){
  const pos=bone.getWorldPosition(v1),cur=child.getWorldPosition(v2).sub(pos).normalize(),want=v3.copy(target).sub(pos).normalize();
  if(cur.lengthSq()<1e-8||want.lengthSq()<1e-8)return;q1.setFromUnitVectors(cur,want);const world=bone.getWorldQuaternion(q2);q1.multiply(world);
  bone.quaternion.copy(bone.parent.getWorldQuaternion(q3).invert().multiply(q1));bone.updateMatrixWorld(true);
 }
 setWorldQuaternion(bone,world){bone.quaternion.copy(bone.parent.getWorldQuaternion(q3).invert().multiply(world));bone.updateMatrixWorld(true);}
 setWorldPosition(bone,world){bone.position.copy(bone.parent.worldToLocal(world.clone()));bone.updateMatrixWorld(true);}
 /* pose: {feet:[world Vector3 x4], up:world normal, bodyOffset:[x,y,z] model units, bodyTilt:[pitch,yaw,roll],
    lookAt:world point|null, claws:[open x4], curl:0..1 (death)} */
 pose(p){
  for(const [b,r]of this.bind){b.position.copy(r.p);b.quaternion.copy(r.q);}
  this.root.updateMatrixWorld(true);
  // Rest lengths are measured in this group's own space (metres), so only its world scale applies.
  const frame=this.root.getWorldQuaternion(new THREE.Quaternion()),up=V(0,1,0).applyQuaternion(frame),scale=this.root.getWorldScale(V()).x;
  // Body bob and tilt in the model frame, applied in world space (the bones carry the armature's own scale).
  const o=p.bodyOffset||[0,0,0],t=p.bodyTilt||[0,0,0];
  if(o.some(Boolean)||t.some(Boolean)){const world=this.body.getWorldPosition(V()).add(V(o[0],o[1],o[2]).multiplyScalar(scale).applyQuaternion(frame));
   const tilt=frame.clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(t[0],t[1],t[2]))).multiply(frame.clone().invert());
   this.setWorldQuaternion(this.body,tilt.multiply(this.body.getWorldQuaternion(new THREE.Quaternion())));this.setWorldPosition(this.body,world);}
  for(const leg of this.legs){
   const foot=p.feet?.[leg.index];if(!foot)continue;const curl=p.curl||0;
   const ankleTarget=foot.clone().addScaledVector(up,leg.lift*scale*(1-curl*.4));
   // Death: the legs fold in and up over the body like a dead spider's.
   if(curl>0)ankleTarget.lerp(leg.hip.getWorldPosition(V()).addScaledVector(up,.9*scale),curl*.82);
   const hip=leg.hip.getWorldPosition(V()),L1=leg.l1*scale,L2=leg.l2*scale,delta=ankleTarget.clone().sub(hip),d=THREE.MathUtils.clamp(delta.length(),.1*scale,L1+L2-1e-4*scale),dir=delta.normalize();
   const pole=up.clone().addScaledVector(dir,-up.dot(dir));if(pole.lengthSq()<1e-6)pole.set(0,0,1);pole.normalize();
   const along=(L1*L1-L2*L2+d*d)/(2*d),height=Math.sqrt(Math.max(0,L1*L1-along*along)),knee=hip.clone().addScaledVector(dir,along).addScaledVector(pole,height*(1+curl*.6));
   this.aim(leg.hip,leg.knee,knee);this.aim(leg.knee,leg.ankle,hip.clone().addScaledVector(dir,d));
   this.setWorldQuaternion(leg.ankle,frame.clone().multiply(leg.ankleRel));
   // Linkage: the strut rides above the knee parallel to the lower leg; the post stands at the ankle.
   this.setWorldPosition(leg.bar,leg.knee.getWorldPosition(V()).addScaledVector(up,leg.barOffset.y*scale));this.setWorldQuaternion(leg.bar,leg.knee.getWorldQuaternion(new THREE.Quaternion()).multiply(leg.barFromKnee));
   this.setWorldPosition(leg.post,leg.ankle.getWorldPosition(V()));this.setWorldQuaternion(leg.post,frame.clone().multiply(leg.postRel));
   const open=(p.claws?.[leg.index]||0)-curl*.7;if(open)for(const [i,f]of leg.fingers.entries()){const axis=leg.fingerAxes[i].clone().applyQuaternion(frame);this.setWorldQuaternion(f,q2.setFromAxisAngle(axis,open).multiply(f.getWorldQuaternion(new THREE.Quaternion())));}
  }
  // Sensor turret tracks the target about the body's up axis.
  if(p.lookAt){const tw=this.turret.getWorldPosition(V()),bodyUp=up,fwd=V(0,0,1).applyQuaternion(frame),to=p.lookAt.clone().sub(tw);to.addScaledVector(bodyUp,-to.dot(bodyUp));
   if(to.lengthSq()>1e-4){const yaw=THREE.MathUtils.clamp(Math.atan2(V().crossVectors(fwd,to).dot(bodyUp),fwd.dot(to)),-1.6,1.6);this.setWorldQuaternion(this.turret,q2.setFromAxisAngle(bodyUp,yaw).multiply(this.turret.getWorldQuaternion(new THREE.Quaternion())));}}
  this.root.updateMatrixWorld(true);
 }
 point(name='body'){return(name==='head'?this.turret:this.body).getWorldPosition(V());}
}

import * as THREE from './vendor/three.module.js';
import {ArgusFrame} from './argus-frame.js?v=argus-aster-199';
// Dedicated Blender Aster frame with stable gameplay part IDs and world-space foot IK.
export class ArgusModel {
 constructor(scene,gltf,spec,config,callbacks={}){
  this.config=config;this.hitFlashes=new Map();this.flashColor=new THREE.Color(config.weakPointFlash?.color||'#ff304a');this.frame=new ArgusFrame(scene,gltf,spec,callbacks);this.walker=this.frame;this.root=this.walker.root;this.root.name='ARGUS';this.nodes=this.walker.nodes;this.meshes=this.walker.meshes;
  this.targets=config.joints.locations.map(location=>{const material=new THREE.MeshStandardMaterial({color:'#ffc458',emissive:'#ff9f26',emissiveIntensity:2,roughness:.4}),mesh=new THREE.Mesh(new THREE.CylinderGeometry(config.joints.radius,config.joints.radius,.16,8).rotateX(Math.PI/2),material);mesh.position.fromArray(location.offset);const rim=new THREE.Mesh(new THREE.TorusGeometry(config.joints.radius,.045,5,24),new THREE.MeshStandardMaterial({color:'#6d97a9',metalness:.7,roughness:.3}));mesh.add(rim);this.meshes[location.node].add(mesh);return{...location,mesh,material};});
  const box=this.walker.boxes.reactor;this.shutter=new THREE.Mesh(new THREE.CylinderGeometry(1.12,1.12,.18,6).rotateX(Math.PI/2),new THREE.MeshStandardMaterial({color:'#c9d9e0',metalness:.58,roughness:.32}));this.shutter.position.copy(box.center).z+=box.size.z/2+.25;this.meshes.reactor.add(this.shutter);this.shutter.material.envMap=this.frame.materials[0].material.envMap;this.shutter.material.envMapIntensity=.8;this.shutterRest=this.shutter.position.clone();this.shutterSize={width:2.24,height:2.24,depth:.18};this.openAmount=0;this.core=new THREE.Mesh(new THREE.IcosahedronGeometry(config.attacks.lance.coreRadius,2),new THREE.MeshStandardMaterial({color:'#ff6e35',emissive:'#ff391b',emissiveIntensity:3}));this.core.position.copy(this.shutterRest).z+=.1;this.core.visible=false;this.core.scale.z=.55;this.meshes.reactor.add(this.core);
  const brace=new THREE.Mesh(new THREE.BoxGeometry(1.12,.08,.035),new THREE.MeshStandardMaterial({color:'#304a5d'}));brace.position.z=.105;brace.rotation.z=.4;this.shutter.add(brace);this.coreRings=new THREE.Group();for(const radius of[.82,1.02]){const ring=new THREE.Mesh(new THREE.TorusGeometry(radius,.025,5,40),new THREE.MeshBasicMaterial({color:'#86f9ef',toneMapped:false}));this.coreRings.add(ring);}this.core.add(this.coreRings);
  this.telegraph=new THREE.Mesh(new THREE.RingGeometry(config.melee.telegraphRadius-.18,config.melee.telegraphRadius,48),new THREE.MeshBasicMaterial({color:'#ffbd4b',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.telegraph.rotation.x=-Math.PI/2;this.telegraph.visible=false;scene.add(this.telegraph);
  this.impact=new THREE.Mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:'#fff1b7',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));this.impact.rotation.x=-Math.PI/2;scene.add(this.impact);this.impactAge=1;
 }
 reset(){this.openAmount=0;this.hitFlashes.clear();this.walker.reset();this.setCore(false,0,0);this.core.visible=false;this.shutter.visible=true;this.telegraph.visible=false;this.impact.visible=false;this.impactAge=1;}
 pose(pose,time,slam=null){
  const feet=pose.feet.map(f=>{const t=f.swinging?Math.min(1,f.age/f.duration):0;return{...f,ankle:{...f.ankle},pitch:f.swinging?Math.sin(t*Math.PI*2)*this.frame.animation.footPitch:0};});
  if(slam){const t=slam.progress,k=t<.72?t/.72:1-(t-.72)/.28,e=k*k*(3-2*k);feet[1].ankle.y+=e*this.config.melee.footLift;}
  const compression=this.impactAge<.5?Math.sin(this.impactAge*Math.PI/.5)*.09:0;
  this.walker.applyWalkPose({...pose,y:pose.y-compression,feet});this.frame.animate(pose,time,slam,this.actor,this.impactAge);this.lanceBase={arm:this.nodes.upperarm_r.quaternion.clone(),fore:this.nodes.forearm_r.quaternion.clone()};
  this.telegraph.visible=!!slam;if(slam){this.telegraph.position.set(slam.point.x,.13,slam.point.z);this.telegraph.material.opacity=.35+.55*Math.sin(time*Math.PI*this.config.melee.flashHz)**2;}
 }
 targetPosition(id){return this.targets.find(t=>t.id===id)?.mesh.getWorldPosition(new THREE.Vector3());}
 shape(mesh,half,part){mesh.updateWorldMatrix(true,false);const q=mesh.getWorldQuaternion(new THREE.Quaternion()),p=mesh.getWorldPosition(new THREE.Vector3());return{part,center:{x:p.x,y:p.y,z:p.z},half,rotation:{x:q.x,y:q.y,z:q.z,w:q.w}};}
 flashWeakPoint(part){const c=this.config.weakPointFlash;if(!c?.seconds)return;const s=this.hitFlashes.get(part);if(!s)this.hitFlashes.set(part,{age:0,life:c.seconds});else{if(s.age>=c.retriggerSeconds)s.age=0;s.life=c.seconds;}}
 paintHit(material,part){const s=this.hitFlashes.get(part);if(!s)return;const fade=Math.max(0,1-s.age/this.config.weakPointFlash.seconds)**2;material.color.lerp(this.flashColor,fade);material.emissive.lerp(this.flashColor,fade);material.emissiveIntensity+=this.config.weakPointFlash.intensity*fade;}
 setCore(open,dt,time){this.openAmount+=(Number(open)-this.openAmount)*(1-Math.exp(-12*Math.max(0,dt)));this.shutter.position.copy(this.shutterRest).y+=this.openAmount*1.75;this.shutter.rotation.x=-this.openAmount*.12;this.core.visible=open;this.shutter.visible=this.openAmount<.995;this.coreRings.rotation.z=time*.45;this.core.material.color.set('#ff6e35');this.core.material.emissive.set('#ff391b');this.core.material.emissiveIntensity=3+Math.sin(time*12);if(open)this.paintHit(this.core.material,'argus-core-open');}
 shapes(joints,coreOpen=false){
  const r=this.config.joints.radius,result=this.targets.filter(t=>joints.get(t.id)?.health>0).map(t=>this.shape(t.mesh,{x:r,y:r,z:r},t.id));
  const size=this.shutterSize,radius=this.config.attacks.lance.coreRadius;result.push(coreOpen?this.shape(this.core,{x:radius,y:radius,z:radius},'argus-core-open'):this.shape(this.core,{x:size.width/2,y:size.height/2,z:size.depth/2},'argus-core-closed'));return result.concat(this.walker.shapes());
 }
 paint(joints,time,dead=false,warning=0){
  this.frame.paint(joints,time,dead,warning);this.shutter.material.color.set(dead?'#394650':'#c9d9e0');this.shutter.material.emissiveIntensity=0;
  for(const t of this.targets){const joint=joints.get(t.id),fraction=joint.health/this.config.joints.health;t.material.color.set(joint.destroyed?'#292b28':fraction<.5?'#ff703a':'#ffc458');t.material.emissive.set('#ff9d21');t.material.emissiveIntensity=dead||joint.destroyed?0:1.5+Math.sin(time*(fraction<.5?19:5))*.5;if(!dead&&!joint.destroyed)this.paintHit(t.material,t.id);}
 }
 impactAt(point){this.impactAge=0;this.impact.position.set(point.x,.15,point.z);this.impact.visible=true;}
 effects(dt){for(const [id,s]of this.hitFlashes){s.age+=dt;s.life-=dt;if(s.life<=0)this.hitFlashes.delete(id);}this.impactAge+=dt;if(this.impactAge>=.6){this.impact.visible=false;return;}this.impact.scale.setScalar(1+this.impactAge*this.config.melee.impactRadius*3);this.impact.material.opacity=1-this.impactAge/.6;}
 hullBounds(){
  const r=this.config.joints.radius,size=this.shutterSize,shapes=[...this.walker.shapes(),this.shape(this.shutter,{x:size.width/2,y:size.height/2,z:size.depth/2},'shutter'),...this.targets.map(t=>this.shape(t.mesh,{x:r,y:r,z:r},t.id))];
  return shapes.map(shape=>{const c=shape.center,h=shape.half,q=shape.rotation,matrix=new THREE.Matrix4().compose(new THREE.Vector3(c.x,c.y,c.z),new THREE.Quaternion(q.x,q.y,q.z,q.w),new THREE.Vector3(1,1,1));return new THREE.Box3(new THREE.Vector3(-h.x,-h.y,-h.z),new THREE.Vector3(h.x,h.y,h.z)).applyMatrix4(matrix);});
 }
 blockers(chunks,previous=[]){
  const boxes=this.hullBounds();boxes.forEach((box,i)=>{if(previous[i])box.union(previous[i]);box.expandByScalar(this.config.breach.skin);});const broad=boxes.reduce((b,box)=>b.union(box),new THREE.Box3()),hits=[];
  for(const c of chunks){if(c.state!=='intact'||c.hidden||c.collisionDisabled)continue;let box=c.bounds;if(!box){const p=c.body.position;box=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(p.x,p.y,p.z),new THREE.Vector3(...c.size));}if(!broad.intersectsBox(box))continue;if(boxes.some(b=>b.intersectsBox(box)))hits.push(c);}
  return hits;
 }
 aimLance(direction,chunks){const arm=this.nodes.upperarm_r,fore=this.nodes.forearm_r,old=arm.quaternion.clone(),oldFore=fore.quaternion.clone(),local=direction.clone().applyQuaternion(arm.parent.getWorldQuaternion(new THREE.Quaternion()).invert());const attack=this.actor?.attacks?.active,t=attack?.stage==='windup'?THREE.MathUtils.smoothstep(attack.age/this.config.attacks.lance.armRaiseSeconds,0,1):1;arm.quaternion.copy(this.lanceBase?.arm||old).slerp(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,-1,0),local),t);fore.quaternion.copy(this.lanceBase?.fore||oldFore).slerp(new THREE.Quaternion(),t);this.root.updateMatrixWorld(true);if(this.blockers(chunks).length){arm.quaternion.copy(old);fore.quaternion.copy(oldFore);this.root.updateMatrixWorld(true);return false;}this.frame.updateHydraulics();return true;}
 // Read the rendered muzzle axis and elbow, rather than trusting the charge timer.
 lanceAligned(direction){this.root.updateMatrixWorld(true);const axis=new THREE.Vector3(0,-1,0).transformDirection(this.nodes.forearm_r.matrixWorld),tolerance=THREE.MathUtils.degToRad(this.config.attacks.lance.fireAlignmentDegrees);return axis.angleTo(direction)<=tolerance&&this.nodes.forearm_r.quaternion.angleTo(new THREE.Quaternion())<=tolerance;}
 flashLance(time){const strength=.15+Math.sin(time*Math.PI*this.config.attacks.lance.chargeFlashHz)**2*5;for(const surface of this.frame.renderRoots.forearm_r.children){if(!surface.isMesh)continue;surface.material.emissive.set('#ff7439');surface.material.emissiveIntensity=strength;}}
 destroy(){this.hitFlashes.clear();this.core.visible=false;this.shutter.visible=true;this.telegraph.visible=false;this.walker.destroy();}
 updateDeath(dt,time){const scaled=dt*1.5/this.config.death.collapseSeconds;this.walker.update(scaled,time,[]);}
 syncWrecks(){this.walker.syncWrecks();}
}

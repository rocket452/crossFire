import * as THREE from './vendor/three.module.js';
import {SiegeWalker} from './siege-walker.js?v=beam-tracking-150';
// Compose the original rigid rig/IK and wreck builder; never run its ranged weapon update while alive.
export class ArgusModel {
 constructor(scene,gltf,spec,config,callbacks={}){
  this.config=config;this.walker=new SiegeWalker(scene,gltf,spec,{...callbacks,onBeam:()=>{},onFire:()=>{},onEffect:callbacks.onEffect||(()=>{})});this.root=this.walker.root;this.root.name='ARGUS';this.nodes=this.walker.nodes;this.meshes=this.walker.meshes;
  this.targets=config.joints.locations.map(location=>{const material=new THREE.MeshStandardMaterial({color:'#ffc458',emissive:'#ff9f26',emissiveIntensity:2,roughness:.4}),mesh=new THREE.Mesh(new THREE.IcosahedronGeometry(config.joints.radius,1),material);mesh.position.fromArray(location.offset);this.meshes[location.node].add(mesh);return{...location,mesh,material};});
  const box=this.walker.boxes.reactor;this.shutter=new THREE.Mesh(new THREE.BoxGeometry(box.size.x+.4,box.size.y+.4,.45),new THREE.MeshStandardMaterial({color:'#394a42',metalness:.55,roughness:.7}));this.shutter.position.copy(box.center).z+=box.size.z/2+.25;this.meshes.reactor.add(this.shutter);this.shutterRest=this.shutter.position.clone();this.core=new THREE.Mesh(new THREE.IcosahedronGeometry(config.attacks.lance.coreRadius,1),new THREE.MeshStandardMaterial({color:'#ff6e35',emissive:'#ff391b',emissiveIntensity:3}));this.core.position.copy(this.shutterRest).z+=.1;this.core.visible=false;this.meshes.reactor.add(this.core);
  const brace=new THREE.Mesh(new THREE.BoxGeometry(box.size.x+.55,.2,.15),new THREE.MeshStandardMaterial({color:'#b4b888'}));brace.position.z=.3;brace.rotation.z=.4;this.shutter.add(brace);
  this.telegraph=new THREE.Mesh(new THREE.RingGeometry(config.melee.telegraphRadius-.18,config.melee.telegraphRadius,48),new THREE.MeshBasicMaterial({color:'#ffbd4b',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));this.telegraph.rotation.x=-Math.PI/2;this.telegraph.visible=false;scene.add(this.telegraph);
  this.impact=new THREE.Mesh(new THREE.RingGeometry(.9,1,48),new THREE.MeshBasicMaterial({color:'#fff1b7',transparent:true,opacity:0,side:THREE.DoubleSide,depthWrite:false}));this.impact.rotation.x=-Math.PI/2;scene.add(this.impact);this.impactAge=1;
 }
 reset(){this.walker.reset();this.core.visible=false;this.shutter.visible=true;this.telegraph.visible=false;this.impact.visible=false;this.impactAge=1;}
 pose(pose,time,slam=null){
  const feet=pose.feet.map(f=>({...f,ankle:{...f.ankle}}));if(slam)feet[1].ankle.y+=Math.sin(Math.PI*slam.progress)*this.config.melee.footLift;
  this.walker.applyWalkPose({...pose,feet});
  const swing=pose.sway;this.nodes.upperarm_l.rotation.x=-.12+swing;this.nodes.upperarm_r.rotation.x=-.12-swing;this.nodes.forearm_l.rotation.x=this.nodes.forearm_r.rotation.x=-.22;
  this.nodes.chest.rotation.set(.03+(slam?.progress||0)*.12,0,-pose.roll*.4);this.nodes.waist.rotation.y=0;this.walker.trackHead(slam?.point||null,0.1);this.root.updateMatrixWorld(true);
  this.telegraph.visible=!!slam;if(slam){this.telegraph.position.set(slam.point.x,.13,slam.point.z);this.telegraph.material.opacity=.35+.55*Math.sin(time*Math.PI*this.config.melee.flashHz)**2;}
 }
 targetPosition(id){return this.targets.find(t=>t.id===id)?.mesh.getWorldPosition(new THREE.Vector3());}
 shape(mesh,half,part){mesh.updateWorldMatrix(true,false);const q=mesh.getWorldQuaternion(new THREE.Quaternion()),p=mesh.getWorldPosition(new THREE.Vector3());return{part,center:{x:p.x,y:p.y,z:p.z},half,rotation:{x:q.x,y:q.y,z:q.z,w:q.w}};}
 setCore(open,dt,time){this.core.visible=open;this.shutter.visible=!open;this.core.material.emissiveIntensity=3+Math.sin(time*12);}
 shapes(joints,coreOpen=false){
  const r=this.config.joints.radius,result=this.targets.filter(t=>joints.get(t.id)?.health>0).map(t=>this.shape(t.mesh,{x:r,y:r,z:r},t.id));
  const size=this.shutter.geometry.parameters,radius=this.config.attacks.lance.coreRadius;result.push(coreOpen?this.shape(this.core,{x:radius,y:radius,z:radius},'argus-core-open'):this.shape(this.shutter,{x:size.width/2,y:size.height/2,z:size.depth/2},'argus-core-closed'));return result.concat(this.walker.shapes());
 }
 paint(joints,time,dead=false,warning=0){
  for(const [name,mesh]of Object.entries(this.meshes)){mesh.material.color.set(dead?'#555951':'#ffffff');mesh.material.emissiveIntensity=0;const damaged=this.targets.filter(t=>t.node===name).map(t=>joints.get(t.id)).find(j=>j?.destroyed);if(damaged)mesh.material.color.multiplyScalar(.46);if(warning&&!dead){mesh.material.emissive.set('#ffc14f');mesh.material.emissiveIntensity=.4+warning*.7;}}
  this.shutter.material.emissiveIntensity=0;
  for(const t of this.targets){const joint=joints.get(t.id),fraction=joint.health/this.config.joints.health;t.material.color.set(joint.destroyed?'#292b28':fraction<.5?'#ff703a':'#ffc458');t.material.emissive.set('#ff9d21');t.material.emissiveIntensity=dead||joint.destroyed?0:1.5+Math.sin(time*(fraction<.5?19:5))*.5;}
 }
 impactAt(point){this.impactAge=0;this.impact.position.set(point.x,.15,point.z);this.impact.visible=true;}
 effects(dt){this.impactAge+=dt;if(this.impactAge>=.6){this.impact.visible=false;return;}this.impact.scale.setScalar(1+this.impactAge*this.config.melee.impactRadius*3);this.impact.material.opacity=1-this.impactAge/.6;}
 hullBounds(){
  const r=this.config.joints.radius,size=this.shutter.geometry.parameters,shapes=[...this.walker.shapes(),this.shape(this.shutter,{x:size.width/2,y:size.height/2,z:size.depth/2},'shutter'),...this.targets.map(t=>this.shape(t.mesh,{x:r,y:r,z:r},t.id))];
  return shapes.map(shape=>{const c=shape.center,h=shape.half,q=shape.rotation,matrix=new THREE.Matrix4().compose(new THREE.Vector3(c.x,c.y,c.z),new THREE.Quaternion(q.x,q.y,q.z,q.w),new THREE.Vector3(1,1,1));return new THREE.Box3(new THREE.Vector3(-h.x,-h.y,-h.z),new THREE.Vector3(h.x,h.y,h.z)).applyMatrix4(matrix);});
 }
 blockers(chunks,previous=[]){
  const boxes=this.hullBounds();boxes.forEach((box,i)=>{if(previous[i])box.union(previous[i]);box.expandByScalar(this.config.breach.skin);});const broad=boxes.reduce((b,box)=>b.union(box),new THREE.Box3()),hits=[];
  for(const c of chunks){if(c.state!=='intact'||c.hidden||c.collisionDisabled)continue;let box=c.bounds;if(!box){const p=c.body.position;box=new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(p.x,p.y,p.z),new THREE.Vector3(...c.size));}if(!broad.intersectsBox(box))continue;if(boxes.some(b=>b.intersectsBox(box)))hits.push(c);}
  return hits;
 }
 aimLance(direction,chunks){const arm=this.nodes.upperarm_r,fore=this.nodes.forearm_r,old=arm.quaternion.clone(),oldFore=fore.quaternion.clone(),local=direction.clone().applyQuaternion(arm.parent.getWorldQuaternion(new THREE.Quaternion()).invert());arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),local);fore.rotation.set(0,0,0);this.root.updateMatrixWorld(true);if(this.blockers(chunks).length){arm.quaternion.copy(old);fore.quaternion.copy(oldFore);this.root.updateMatrixWorld(true);return false;}return true;}
 destroy(){this.core.visible=false;this.shutter.visible=true;this.telegraph.visible=false;this.walker.destroy();}
 updateDeath(dt,time){const scaled=dt*1.5/this.config.death.collapseSeconds;this.walker.update(scaled,time,[]);}
 syncWrecks(){this.walker.syncWrecks();}
}

import * as THREE from './vendor/three.module.js';
// Combat warning overlay: visible through cover so breached walls do not hide the danger.
export class BeamTelegraph {
 constructor(scene){
  this.root=new THREE.Group();scene.add(this.root);this.root.visible=false;this.plan=null;
  this.up=new THREE.Vector3(0,1,0);this.direction=new THREE.Vector3();this.position=new THREE.Vector3();this.dummy=new THREE.Object3D();
  const mat=(opacity)=>new THREE.MeshBasicMaterial({color:'#ff1738',transparent:true,opacity,depthTest:false,depthWrite:false,toneMapped:false,side:THREE.DoubleSide});
  this.lineMaterial=mat(.36);this.haloMaterial=mat(.06);this.fanMaterial=mat(.025);
  this.rays=[];const tube=new THREE.CylinderGeometry(1,1,1,8,1,true);
  for(let i=0;i<3;i++){const mesh=new THREE.Mesh(tube,this.lineMaterial);mesh.renderOrder=51;mesh.frustumCulled=false;this.root.add(mesh);this.rays.push(mesh);}
  this.halo=new THREE.Mesh(tube,this.haloMaterial);this.halo.renderOrder=50;this.halo.frustumCulled=false;this.root.add(this.halo);
  this.fanPositions=new Float32Array(18);const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(this.fanPositions,3));this.fan=new THREE.Mesh(geometry,this.fanMaterial);this.fan.renderOrder=49;this.fan.frustumCulled=false;this.root.add(this.fan);
  this.arrows=new THREE.InstancedMesh(new THREE.ConeGeometry(.32,1.0,3),this.lineMaterial,7);this.arrows.renderOrder=52;this.arrows.frustumCulled=false;this.root.add(this.arrows);
  this.target=new THREE.Group();this.root.add(this.target);
  for(const tilt of [0,Math.PI/2]){const ring=new THREE.Mesh(new THREE.TorusGeometry(1.15,.055,5,40),this.lineMaterial);ring.rotation.x=tilt;ring.renderOrder=53;this.target.add(ring);}
 }
 clear(){this.root.visible=false;this.plan=null;}
 segment(mesh,ray,radius){
  this.direction.set(ray.end.x-ray.from.x,ray.end.y-ray.from.y,ray.end.z-ray.from.z);const length=this.direction.length();
  mesh.position.set((ray.from.x+ray.end.x)/2,(ray.from.y+ray.end.y)/2,(ray.from.z+ray.end.z)/2);
  if(length>.001)mesh.quaternion.setFromUnitVectors(this.up,this.direction.divideScalar(length));
  mesh.scale.set(radius,length,radius);
 }
 update(plan,charge,time){
  if(!plan){this.clear();return;}
  this.root.visible=true;this.plan=plan;this.fanMaterial.opacity=.018+charge*.020;
  const center=plan.rays[1];
  const side=new THREE.Vector3(center.direction.x,0,center.direction.z).cross(this.up).normalize().multiplyScalar(plan.radius);
  const outer=(ray,sign)=>({...ray,from:{x:ray.from.x+side.x*sign,y:ray.from.y,z:ray.from.z+side.z*sign},end:{x:ray.end.x+side.x*sign,y:ray.end.y,z:ray.end.z+side.z*sign}});
  const left=outer(plan.rays[0],1),right=outer(plan.rays[2],-1);
  [left,center,right].forEach((ray,i)=>this.segment(this.rays[i],ray,i===1?.12:.065));
  this.segment(this.halo,center,.34);
  [left.from,left.end,right.end,left.from,right.end,right.from].forEach((p,i)=>{this.fanPositions[i*3]=p.x;this.fanPositions[i*3+1]=p.y;this.fanPositions[i*3+2]=p.z;});this.fan.geometry.attributes.position.needsUpdate=true;
  this.direction.set(center.direction.x,center.direction.y,center.direction.z);
  for(let i=0;i<7;i++){
   const t=(i/7+time*.16)%1;
   this.dummy.position.set(center.from.x+(center.end.x-center.from.x)*t,center.from.y+(center.end.y-center.from.y)*t,center.from.z+(center.end.z-center.from.z)*t);
   this.dummy.quaternion.setFromUnitVectors(this.up,this.direction);this.dummy.scale.setScalar(1);this.dummy.updateMatrix();this.arrows.setMatrixAt(i,this.dummy.matrix);
  }this.arrows.instanceMatrix.needsUpdate=true;
  this.target.position.set(plan.target.x,plan.target.y,plan.target.z);this.target.rotation.y=time*.25;
 }
 diagnostics(){return{visible:this.root.visible,target:this.plan?.target||null,sweepRadians:this.plan?.sweep||0,rays:this.plan?.rays||[]};}
}

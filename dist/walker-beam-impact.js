import * as THREE from './vendor/three.module.js';

const MARK_LIMIT=20;
const MARK_SECONDS=1.15;
const FORWARD=new THREE.Vector3(0,0,1);

export class WalkerBeamImpact {
 constructor(scene){
  const material=new THREE.MeshBasicMaterial({
   color:0xffffff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide,toneMapped:false
  });
  this.marks=new THREE.InstancedMesh(new THREE.RingGeometry(.50,1,24),material,MARK_LIMIT);
  this.marks.name='Siege Walker beam contact rings';
  this.marks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  this.marks.frustumCulled=false;
  this.dummy=new THREE.Object3D();
  this.color=new THREE.Color();
  this.contacts=[];
  scene.add(this.marks);
  this.reset();
 }
 reset(){this.contacts.length=0;this.marks.count=0;}
 hit(point,direction,section){
  const center=section.body.position,rotation=new THREE.Quaternion().copy(section.body.quaternion);
  const local=new THREE.Vector3().copy(point).sub(center).applyQuaternion(rotation.clone().invert());
  const surface=local.clone();
  for(const [i,axis] of ['x','y','z'].entries()){
   const half=section.size[i]/2;
   surface[axis]=THREE.MathUtils.clamp(local[axis],-half,half);
  }
  const normal=local.sub(surface).applyQuaternion(rotation).normalize();
  if(normal.lengthSq()<.01)normal.copy(direction).negate().normalize();
  surface.applyQuaternion(rotation).add(center).addScaledVector(normal,.035);
  if(this.contacts.length>=MARK_LIMIT)this.contacts.shift();
  this.contacts.push({point:surface,rotation:new THREE.Quaternion().setFromUnitVectors(FORWARD,normal),age:0});
  return {point:surface,normal};
 }
 update(dt){
  for(const hit of this.contacts)hit.age+=dt;
  while(this.contacts[0]?.age>=MARK_SECONDS)this.contacts.shift();
  this.marks.count=this.contacts.length;
  for(const [i,hit] of this.contacts.entries()){
   const t=hit.age/MARK_SECONDS,scale=.75+1.75*(1-Math.exp(-5*t));
   this.dummy.position.copy(hit.point);
   this.dummy.quaternion.copy(hit.rotation);
   this.dummy.scale.setScalar(scale);
   this.dummy.updateMatrix();
   this.marks.setMatrixAt(i,this.dummy.matrix);
   this.color.set('#71dbff').multiplyScalar((1-t)**2*(1.35+.45*Math.sin(hit.age*45)));
   this.marks.setColorAt(i,this.color);
  }
  if(this.marks.count){this.marks.instanceMatrix.needsUpdate=true;this.marks.instanceColor.needsUpdate=true;}
 }
}

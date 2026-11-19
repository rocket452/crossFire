import * as THREE from './vendor/three.module.js';

export function buildCombatDrone(config){
 const root=new THREE.Group();root.name='Four-engine combat drone';
 const box=new THREE.BoxGeometry();
 const cylinder=new THREE.CylinderGeometry(1,1,1,12);
 const plumeShape=new THREE.ConeGeometry(1,1,8).rotateZ(Math.PI).translate(0,-.5,0);
 const standard=color=>new THREE.MeshStandardMaterial({color,metalness:.35,roughness:.62});
 const shell=standard('#36455a'), ceramic=standard('#afbbca'), metal=standard('#202936');
 const amber=standard('#e6913d');
 const emissive=(color,strength)=>new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:strength});
 const part=(parent,geometry,material,position,size)=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.fromArray(position);mesh.scale.fromArray(size);
  mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);
  return mesh;
 };
 const block=(parent,material,p,s)=>part(parent,box,material,p,s);
 const [cx,cy,cz]=config.centerOfMass;
 const frame=new THREE.Group();frame.position.set(-cx,-cy,-cz);root.add(frame);
 const armor=block(frame,shell,[0,0,0],config.hullSize);
 block(frame,ceramic,[0,.71,-.25],[2.33,.23,2.43]);
 block(frame,metal,[0,.1,1.73],[2.1,.95,.5]);
 block(frame,emissive('#ffb25c',2),[0,.21,2.005],[1.55,.17,.07]);
 block(frame,metal,[0,-.63,-.5],[2.5,.24,1.54]);
 for(const side of [-1,1]){
  block(frame,ceramic,[side*1.27,.23,.48],[.24,.67,2.3]);
  block(frame,amber,[side*1.22,.51,1.13],[.23,.1,.76]);
  for(const z of [-1.62,1.62]){
   block(frame,metal,[side*1.89,.11,z],[1.72,.32,.76]);
   block(frame,ceramic,[side*1.72,.26,z],[1.22,.19,.48]);
  }
 }
 const engines=config.engines.map((entry,i)=>{
  const node=new THREE.Group();node.name=entry.id+' engine';node.position.fromArray(entry.position);frame.add(node);
  const casing=standard(i%2?'#596d80':'#4b6077');
  part(node,cylinder,casing,[0,0,0],[.72,.75,.72]);
  part(node,cylinder,metal,[0,.42,0],[.68,.21,.68]);
  part(node,cylinder,ceramic,[0,-.31,0],[.75,.18,.75]);
  const fan=new THREE.Group();fan.position.y=.54;node.add(fan);
  part(fan,cylinder,amber,[0,.019,0],[.17,.12,.17]);
  for(let j=0;j<6;j++){
   const a=j*Math.PI/3;
   block(fan,metal,[.28*Math.sin(a),0,.28*Math.cos(a)],[.135,.06,.46]).rotation.y=a+.32;
  }
  const exhaust=part(node,cylinder,emissive('#47ddff',2.8),[0,-.45,0],[.54,.12,.54]);
  const plume=part(node,plumeShape,new THREE.MeshBasicMaterial({
   color:new THREE.Color('#64dbff').multiplyScalar(1.55),transparent:true,opacity:.42,
   depthWrite:false,blending:THREE.AdditiveBlending
  }),[0,-.49,0],[.44,.85,.44]);
  plume.castShadow=false;
  block(node,amber,[0,.05,Math.sign(entry.position[2])*.70],[.55,.22,.14]);
  const stub=block(frame,metal,[entry.position[0]*.77,entry.position[1],entry.position[2]],[.68,.32,.62]);
  stub.visible=false;
  return {node,fan,exhaust,plume,casing,stub};
 });
 const turret=new THREE.Group();turret.position.set(0,-1.05,.16);frame.add(turret);
 part(turret,cylinder,metal,[0,.23,0],[.68,.52,.68]);
 const pitch=new THREE.Group();turret.add(pitch);
 block(pitch,shell,[0,0,.13],[.83,.65,1.18]);
 block(pitch,amber,[.48,-.03,-.06],[.3,.56,.87]);
 for(let i=0;i<5;i++)block(pitch,ceramic,[.65,-.16+i*.08,-.02],[.09,.036,.48]);
 const rotor=new THREE.Group();rotor.position.z=.35;pitch.add(rotor);
 for(let i=0;i<6;i++){
  const a=i*Math.PI/3,x=Math.cos(a)*.235,y=Math.sin(a)*.235;
  part(rotor,cylinder,metal,[x,y,.8],[.079,1.45,.079]).rotation.x=Math.PI/2;
 }
 part(rotor,cylinder,ceramic,[0,0,1.05],[.34,.14,.34]).rotation.x=Math.PI/2;
 const muzzle=new THREE.Object3D();muzzle.position.z=1.95;pitch.add(muzzle);
 const flash=part(muzzle,new THREE.IcosahedronGeometry(.26,0),new THREE.MeshBasicMaterial({
  color:new THREE.Color('#ffba61').multiplyScalar(2.4)
 }),[0,0,.18],[1,1,2.9]);
 flash.castShadow=false;flash.visible=false;
 return {root,armor,engines,turret,pitch,rotor,muzzle,flash};
}

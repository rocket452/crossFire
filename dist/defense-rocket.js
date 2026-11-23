import * as THREE from './vendor/three.module.js';

export const EVAC_ROCKET=Object.freeze({height:39,health:3200,ignition:1.2,launchSeconds:5.8});

// Vertically launched rescue shuttle with a static launch pad and independently animated ship.
export class DefenseRocket {
 constructor(scene,site){
  this.root=new THREE.Group();
  this.root.name='Evacuation rocket';
  this.root.position.set(site.x,0,site.z);
  const pad=new THREE.Group();
  pad.name='Evacuation launch pad';
  pad.position.copy(this.root.position);
  scene.add(pad,this.root);
  const shell=new THREE.MeshStandardMaterial({color:'#c5dbec',metalness:.48,roughness:.3,emissive:'#000000'});
  const dark=new THREE.MeshStandardMaterial({color:'#192437',metalness:.65,roughness:.45});
  const stripe=new THREE.MeshStandardMaterial({color:'#362847',metalness:.55,roughness:.35});
  this.shell=shell;
  this.neon=new THREE.MeshBasicMaterial({color:new THREE.Color('#ff54aa').multiplyScalar(2),toneMapped:false});
  const glass=new THREE.MeshBasicMaterial({color:new THREE.Color('#80e6ff').multiplyScalar(1.8),toneMapped:false});
  const add=(parent,geometry,material,y)=>{const mesh=new THREE.Mesh(geometry,material);mesh.position.y=y;parent.add(mesh);return mesh;};
  const tube=(top,bottom,height,material,y,parent=this.root)=>add(parent,new THREE.CylinderGeometry(top,bottom,height,12),material,y);
  tube(10,11,.6,dark,.3,pad);
  tube(7.5,8,.45,stripe,.75,pad);
  const ring=add(pad,new THREE.TorusGeometry(10.6,.13,6,40),this.neon,.45);
  ring.rotation.x=-Math.PI/2;
  const hull=tube(4,4.6,25,shell,16);
  hull.castShadow=true;
  tube(0,4,10,shell,33.5).castShadow=true;
  tube(4.55,4.6,1.25,stripe,5.3);
  tube(4.27,4.37,1.6,stripe,16);
  tube(4.17,4.22,.22,this.neon,26.3);
  tube(2.65,3.75,4.2,dark,2.6);
  for(const side of [-1,1]){
   const window=add(this.root,new THREE.BoxGeometry(1.9,3.1,.5),glass,27);
   window.position.z=side*3.65;
   const badge=add(this.root,new THREE.BoxGeometry(.32,9,.16),this.neon,15.6);
   badge.position.z=side*4.37;
  }
  for(let i=0;i<4;i++){
   const a=i*Math.PI/2,fin=new THREE.Group();
   fin.rotation.y=a;this.root.add(fin);
   const finShape=new THREE.Shape().moveTo(3.6,3).lineTo(7,1.8).lineTo(6.25,8.2).lineTo(3.9,13).closePath();
   fin.add(new THREE.Mesh(new THREE.ExtrudeGeometry(finShape,{depth:.65,bevelEnabled:false}),stripe));
   const tip=add(fin,new THREE.BoxGeometry(.3,1.6,.76),this.neon,3.45);
   tip.position.set(6.6,3.45,.34);
  }
  this.plume=new THREE.Group();
  this.root.add(this.plume);
  const exhaust=new THREE.MeshBasicMaterial({color:'#ff4faa',blending:THREE.AdditiveBlending,transparent:true,opacity:.58,depthWrite:false,toneMapped:false});
  add(this.plume,new THREE.ConeGeometry(3.3,15,12),exhaust,-7.5).rotation.z=Math.PI;
  add(this.plume,new THREE.ConeGeometry(1.95,10,10),glass,-5).rotation.z=Math.PI;
  this.shapes=[[5,5,4.6],[19,9,4.25],[31,5,3.2]].map(([y,h,r])=>({
   center:new THREE.Vector3(site.x,y,site.z),localY:y,half:{x:r,y:h,z:r}
  }));
  this.reset();
 }
 reset(){this.root.visible=true;this.root.position.y=0;this.plume.visible=false;
  for(const shape of this.shapes)shape.center.y=shape.localY;
  this.pose(0);}
 pose(flash){
  this.neon.color.set('#ff54aa').lerp(new THREE.Color('#ff2424'),flash).multiplyScalar(2+flash);
  this.shell.emissive.set('#ff2424');this.shell.emissiveIntensity=1.7*flash;
 }
 climb(elapsed){
  const {ignition,launchSeconds}=EVAC_ROCKET;
  const flight=THREE.MathUtils.clamp((elapsed-ignition)/(launchSeconds-ignition),0,1);
  this.root.position.y=flight*flight*170;
  this.plume.visible=true;
  this.plume.scale.set(1+Math.sin(elapsed*39)*.09,.35+flight*2.5,1+Math.cos(elapsed*36)*.09);
  for(const shape of this.shapes)shape.center.y=this.root.position.y+shape.localY;
 }
}

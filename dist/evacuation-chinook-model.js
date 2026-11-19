import * as THREE from './vendor/three.module.js';

// Octagonal cross-sections shape the stretched cabin and tapered nose.
function fuselage(sections) {
 const vertices=[],indices=[];
 for(const [z,width,low,high] of sections){
  const corners=[
   [-.72,0],[.72,0],[1,.23],[1,.77],
   [.66,1],[-.66,1],[-1,.77],[-1,.23]
  ];
  for(const [x,y] of corners)vertices.push(x*width,THREE.MathUtils.lerp(low,high,y),z);
 }
 for(let ring=0;ring<sections.length-1;ring++){
  for(let side=0;side<8;side++){
   const a=ring*8+side,b=ring*8+(side+1)%8;
   indices.push(a,b,a+8,b,b+8,a+8);
  }
 }
 const last=(sections.length-1)*8;
 for(let i=1;i<7;i++)indices.push(0,i+1,i,last,last+i,last+i+1);
 const indexed=new THREE.BufferGeometry();
 indexed.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
 indexed.setIndex(indices);
 const geometry=indexed.toNonIndexed();
 indexed.dispose();
 geometry.computeVertexNormals();
 return geometry;
}

export function buildEvacuationChinook(box) {
 const aircraft=new THREE.Group();
 aircraft.name='Cyberpunk evacuation Chinook';
 const standard=color=>new THREE.MeshStandardMaterial({color,roughness:.58,metalness:.24});
 const neon=(color,intensity)=>new THREE.MeshBasicMaterial({color:new THREE.Color(color).multiplyScalar(intensity)});
 const shell=standard('#527798'),plates=standard('#a7c9dc'),dark=standard('#162736');
 const glass=new THREE.MeshStandardMaterial({color:'#12435d',roughness:.25,emissive:'#0d5465',emissiveIntensity:.7});
 const cyan=neon('#62f4ff',2.1),magenta=neon('#ff4f9f',1.8),mint=neon('#a8ffde',2);
 const add=(parent,geometry,material,position,size=[1,1,1])=>{
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.fromArray(position);
  mesh.scale.fromArray(size);
  mesh.castShadow=!material.isMeshBasicMaterial;
  parent.add(mesh);
  return mesh;
 };
 const part=(parent,material,position,size)=>add(parent,box,material,position,size);
 add(aircraft,fuselage([
  [-5.05,1.14,.03,1.98],[-3.78,1.56,-.38,2.57],
  [2.62,1.62,-.38,2.57],[4.53,1.5,-.13,1.98],[5.66,.97,.35,1.51],
 ]),shell,[0,0,0]);
 const canopy=add(aircraft,fuselage([
  [2.62,1.23,1.59,2.61],[3.73,1.39,1.51,2.52],[5.31,1.04,1.1,1.79],
 ]),glass,[0,0,0]);
 canopy.name='Armored cockpit canopy';
 const windscreenRail=part(aircraft,plates,[0,2.22,4.51],[.09,.1,1.79]);
 windscreenRail.rotation.x=.45;

 const hub=new THREE.CylinderGeometry(.42,.5,.37,10);
 const wheel=new THREE.CylinderGeometry(.37,.37,.34,10);
 for(const side of [-1,1]){
  part(aircraft,plates,[side*1.31,1.52,-1.07],[.56,.95,4.78]);
  part(aircraft,dark,[side*1.62,1.59,-.52],[.13,.65,3.05]);
  for(const z of [-1.64,-.52,.6])part(aircraft,glass,[side*1.70,1.61,z],[.032,.47,.86]);
  part(aircraft,cyan,[side*1.67,1.16,-.5],[.055,.09,4.6]);
  part(aircraft,magenta,[side*1.56,1.09,-3.99],[.09,.13,.57]);
  part(aircraft,mint,[side*.82,.78,5.62],[.36,.16,.13]);
  for(const z of [-3,3]){
   part(aircraft,dark,[side*1.38,.02,z],[.28,.75,.39]);
   add(aircraft,wheel,dark,[side*1.67,-.4,z]).rotation.z=Math.PI/2;
  }
  part(aircraft,cyan,[side*.85,.99,-5.07],[.07,1.31,.035]);
 }
 part(aircraft,dark,[0,.94,-5.05],[1.48,1.4,.07]);
 part(aircraft,mint,[0,.36,-5.1],[1.52,.10,.06]);
 // The two independent rotor pivots are driven by the existing flight loop.
 const rotors=[-3.6,3.4].map(z=>{
  add(aircraft,fuselage([[-.81,.54,2.19,3.53],[.77,.53,2.19,3.8]]),shell,[0,0,z]);
  part(aircraft,cyan,[0,3.02,z+.78],[.44,.09,.025]);
  const rotor=new THREE.Group();
  rotor.name='Tandem rotor';
  rotor.position.set(0,4,z);
  aircraft.add(rotor);
  add(rotor,hub,plates,[0,0,0]);
  for(const [material,span,height,width,depth] of [[dark,2.83,0,.30,5.04],[mint,5.23,.006,.31,.32]]){
   const blades=new THREE.InstancedMesh(box,material,6),blade=new THREE.Object3D();
   blades.castShadow=!material.isMeshBasicMaterial;
   blade.scale.set(width,.068,depth);
   for(let i=0;i<6;i++){
    const angle=i*Math.PI/3;
    blade.position.set(Math.sin(angle)*span,height,Math.cos(angle)*span);
    blade.rotation.y=angle;
    blade.updateMatrix();
    blades.setMatrixAt(i,blade.matrix);
   }
   blades.instanceMatrix.needsUpdate=true;
   rotor.add(blades);
  }
  return rotor;
 });
 return {aircraft,rotors};
}

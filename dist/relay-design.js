import * as THREE from './vendor/three.module.js';

// Broad podium, narrow waist, and a flared crown. Each tier is four
// independently destructible quarters built from the same silhouette data.
export const RELAY_TIERS=[
 {height:12,width:20,tint:'#58203e'},
 {height:10,width:20,tint:'#c83d78'},
 {height:13,width:14,tint:'#752557'},
 {height:13,width:14,tint:'#a32869'},
 {height:12,width:16,tint:'#a32869'},
 {height:12,width:20,tint:'#cb407e'}
];

export function makeRelayAsset(templates){
 const pieces=[];
 const material=new THREE.MeshStandardMaterial({metalness:.32,roughness:.44});
 let base=0;
 for(const [floor,tier] of RELAY_TIERS.entries()){
  const half=tier.width/2,cut=half*.32;
  for(const x of [-1,1])for(const z of [-1,1]){
   const shape=new THREE.Shape();
   shape.moveTo(-x*half/2,z*half/2);
   for(const [u,v] of [[half,0],[half,half-cut],[half-cut,half],[0,half]]){
    shape.lineTo(x*(u-half/2),-z*(v-half/2));
   }
   shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth:tier.height-.14,bevelEnabled:false});
   geometry.rotateX(-Math.PI/2);
   geometry.translate(0,-(tier.height-.14)/2,0);
   const node='relay-'+pieces.length;
   templates.set(node,{geometry,material});
   pieces.push({node,type:'column',floor,center:[x*half/2,base+tier.height/2,z*half/2],
    size:[half,tier.height,half],tint:tier.tint});
  }
  base+=tier.height;
 }
 return {height:base,footprint:[20,20],pieces};
}

// Match the chamfered facade and hold the band just outside it.
export function makeRelayTrim(){
 const inset=.68;
 const outline=[[1,inset],[inset,1],[-inset,1],[-1,inset],[-1,-inset],[-inset,-1],[inset,-1],[1,-inset]];
 const positions=[];
 for(const [i,[x,z]] of outline.entries()){
  const [nextX,nextZ]=outline[(i+1)%outline.length];
  positions.push(x,-.2,z,nextX,-.2,nextZ,x,.2,z,x,.2,z,nextX,-.2,nextZ,nextX,.2,nextZ);
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 return geometry;
}

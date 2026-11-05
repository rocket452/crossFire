import * as THREE from './vendor/three.module.js';
export const ESCORT_APPROACH=Object.freeze({minX:-216,maxX:120,minZ:-120,maxZ:216,spawnZ:210,stopZ:36,speed:3.2,squadSize:3,rowSpacing:6,lanes:Object.freeze([-4,0,4])});
export const escortMovementBounds=(inset=4)=>({minX:ESCORT_APPROACH.minX+inset,maxX:ESCORT_APPROACH.maxX-inset,minZ:ESCORT_APPROACH.minZ+inset,maxZ:ESCORT_APPROACH.maxZ-inset});
// Open boulevard beyond the original city: no new buildings on the squad's approach.
export function addEscortApproach(scene,{x=0}={}){
 const root=new THREE.Group();root.name='Evacuation outer boulevard';scene.add(root);
 const box=new THREE.BoxGeometry(1,1,1),materials={road:new THREE.MeshStandardMaterial({color:'#49565a',roughness:1}),pavement:new THREE.MeshStandardMaterial({color:'#a3aaa0',roughness:1}),paint:new THREE.MeshStandardMaterial({color:'#c0bba2',roughness:1}),warning:new THREE.MeshStandardMaterial({color:'#d4854e',roughness:1})};
 const start=54,end=ESCORT_APPROACH.maxZ,length=end-start,middle=(start+end)/2;
 const batches={road:[],pavement:[],paint:[],warning:[]},put=(kind,p,s)=>{if(p[0]+x-s[0]/2<ESCORT_APPROACH.minX||p[0]+x+s[0]/2>ESCORT_APPROACH.maxX)return;batches[kind].push({p,s});};
 put('road',[0,.02,middle],[18,.035,length]);
 for(const x of[-10,10])put('pavement',[x,.05,middle],[2,.1,length]);
 for(const x of[-8.4,8.4])put('paint',[x,.06,middle],[.16,.025,length]);
 for(let z=57;z<end-2;z+=5)put('paint',[0,.065,z],[.15,.025,2.3]);
 for(let x=-7;x<=7;x+=2)put('warning',[x,.07,end-3],[1,.03,.7]);
 const dummy=new THREE.Object3D();for(const[k,items]of Object.entries(batches)){
  const mesh=new THREE.InstancedMesh(box,materials[k],items.length);mesh.name='Approach '+k;mesh.receiveShadow=true;
  items.forEach(({p,s},i)=>{dummy.position.set(p[0]+x,p[1],p[2]);dummy.scale.set(...s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});root.add(mesh);
 }return root;
}

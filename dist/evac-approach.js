import * as THREE from './vendor/three.module.js';
export const ESCORT_APPROACH=Object.freeze({minX:-60,maxX:60,minZ:-60,maxZ:108,spawnZ:102,stopZ:36,speed:3.2,squadSize:7,rowSpacing:6,lanes:Object.freeze([-4,0,4])});
// Open boulevard beyond the original city: no new buildings on the squad's approach.
export function addEscortApproach(scene){
 const root=new THREE.Group();root.name='Evacuation outer boulevard';scene.add(root);
 const box=new THREE.BoxGeometry(1,1,1),materials={road:new THREE.MeshStandardMaterial({color:'#49565a',roughness:1}),pavement:new THREE.MeshStandardMaterial({color:'#a3aaa0',roughness:1}),paint:new THREE.MeshStandardMaterial({color:'#c0bba2',roughness:1}),warning:new THREE.MeshStandardMaterial({color:'#d4854e',roughness:1})};
 const batches={road:[],pavement:[],paint:[],warning:[]},put=(kind,p,s)=>batches[kind].push({p,s});
 put('road',[0,.02,81],[18,.035,54]);
 for(const x of[-10,10])put('pavement',[x,.05,81],[2,.1,54]);
 for(const x of[-8.4,8.4])put('paint',[x,.06,81],[.16,.025,54]);
 for(let z=57;z<106;z+=5)put('paint',[0,.065,z],[.15,.025,2.3]);
 for(const x of[-22,22])put('pavement',[x,.015,84],[20,.03,46]);
 for(let x=-7;x<=7;x+=2)put('warning',[x,.07,105],[1,.03,.7]);
 const dummy=new THREE.Object3D();for(const[k,items]of Object.entries(batches)){
  const mesh=new THREE.InstancedMesh(box,materials[k],items.length);mesh.name='Approach '+k;mesh.receiveShadow=true;
  items.forEach(({p,s},i)=>{dummy.position.set(...p);dummy.scale.set(...s);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);});root.add(mesh);
 }return root;
}

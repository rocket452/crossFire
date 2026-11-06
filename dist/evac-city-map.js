import * as THREE from './vendor/three.module.js';
import {ESCORT_APPROACH} from './evac-approach.js?v=evac-centered-215';
import {evacuationBuildingAllowed} from './evacuation-config.js?v=evac-centered-215';

// Preserve the exposed civilian crossing and the entire Chinook/Bruiser boulevard.
// New city blocks use the existing destructible 10m building kit.
export function evacuationCityBuildings(original){
 const buildings=original.filter(evacuationBuildingAllowed).map(b=>({...b}));
 const blocks=[];
 for(const x of[-180,-132,-84,84])for(const z of[-84,-36,12,84,132,180])blocks.push({x,z});
 for(const x of[-12,36])for(const z of[132,180])blocks.push({x,z});
 const tints=['#a5a99b','#879b9c','#a29d8c','#8b9692'];
 blocks.forEach((b,i)=>buildings.push({...b,id:'EVAC-'+String(i+1).padStart(2,'0'),floors:2+i%4,tint:tints[i%tints.length],name:'Outer district'}));
 const towers=[];for(const x of[-156,-108,60,108])for(const z of[-60,156])towers.push({x,z});
 towers.forEach((b,i)=>buildings.push({...b,id:'EVAC-TOWER-'+(i+1),floors:10+i%5,tint:tints[(i+1)%tints.length],name:'Evacuation district tower'}));
 // Keep all additions on the perimeter, at least 150m from the central Chinook.
 const outerTowers=[];for(const x of[-156,-108,-12,36])for(const z of[-108,204])outerTowers.push({x,z});
 outerTowers.forEach((b,i)=>buildings.push({...b,id:'EVAC-OUTER-TOWER-'+(i+1),floors:10+i%4,tint:tints[(i+2)%tints.length],name:'Perimeter skyline tower'}));
 return buildings;
}

// Only new road segments; the original city grid and approach remain in place.
const roads=[],put=(x,z,width,depth)=>roads.push(Object.freeze({x,z,width,depth}));
const {minX,maxX,minZ,maxZ}=ESCORT_APPROACH;
for(let z=Math.ceil((minZ+6)/24)*24;z<=maxZ-6;z+=24){
 if(z>60){put((minX-57)/2,z,-57-minX,11);put((-39+maxX)/2,z,maxX+39,11);}
 else if(![-24,0,24].includes(z))put((minX+maxX)/2,z,maxX-minX,11);
 else{put((minX-55)/2,z,-55-minX,11);put((55+maxX)/2,z,maxX-55,11);}
}
for(let x=Math.ceil((minX+6)/24)*24;x<=maxX-6;x+=24){
 if(Math.abs(x)<48)put(x,(minZ-55)/2,11,-55-minZ);
 const start=Math.abs(x)<48?55:minZ,end=x===-48?54:maxZ;
 put(x,(start+end)/2,11,end-start);
}
export const EVAC_CITY_ROADS=Object.freeze(roads);
export function addEvacuationDistrictRoads(scene){
 const root=new THREE.Group();root.name='Evacuation district streets';scene.add(root);
 const geometry=new THREE.BoxGeometry(1,1,1),matrix=new THREE.Object3D();
 const road=new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial({color:'#49565a',roughness:1}),roads.length);
 road.name='District asphalt';road.receiveShadow=true;
 roads.forEach((r,i)=>{matrix.position.set(r.x,.02,r.z);matrix.scale.set(r.width,.035,r.depth);matrix.updateMatrix();road.setMatrixAt(i,matrix.matrix);});root.add(road);
 return root;
}

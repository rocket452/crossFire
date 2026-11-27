import * as THREE from './vendor/three.module.js';
import {mergeGeometries} from './vendor/BufferGeometryUtils.js';
export function prepareKunaiModel(model){
 if(!model){const geometry=new THREE.ConeGeometry(.13,.85,4);geometry.rotateX(Math.PI/2);return{geometry,materials:null,source:'procedural'};}
 model.scene.updateMatrixWorld(true);const geometries=[],materials=[];
 model.scene.traverse(mesh=>{if(!mesh.isMesh)return;geometries.push(mesh.geometry.clone().applyMatrix4(mesh.matrixWorld));materials.push(mesh.material.clone());});
 const geometry=mergeGeometries(geometries,true);if(!geometry)throw Error('Kunai geometry could not be assembled');
 for(const g of geometries)g.dispose();geometry.computeBoundingSphere();
 return{geometry,materials,source:'original'};
}

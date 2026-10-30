import * as THREE from './vendor/three.module.js';
// Draw only fragments behind opaque scene depth. Share geometry/materials and
// parent to the projectile so motion, portal travel and cleanup stay automatic.
const materials=new Map(),marked=new WeakMap();
export function markVisibleProjectile(material){
 if(!marked.has(material)){
  const copy=material.clone();copy.stencilWrite=true;copy.stencilRef=1;copy.stencilFunc=THREE.AlwaysStencilFunc;copy.stencilZPass=THREE.ReplaceStencilOp;marked.set(material,copy);
 }
 return marked.get(material);
}
export function silhouetteMaterial(color){
 if(!materials.has(color))materials.set(color,new THREE.MeshBasicMaterial({color,transparent:true,opacity:.85,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,toneMapped:false,fog:false,stencilWrite:true,stencilRef:1,stencilFunc:THREE.NotEqualStencilFunc}));
 return materials.get(color);
}
export function projectileSilhouette(source,color='#ffae54',scale=1.06){
 source.material=Array.isArray(source.material)?source.material.map(markVisibleProjectile):markVisibleProjectile(source.material);
 const silhouette=new THREE.Mesh(source.geometry,silhouetteMaterial(color));
 silhouette.name='Occluded enemy projectile silhouette';silhouette.scale.setScalar(scale);silhouette.renderOrder=100;silhouette.castShadow=silhouette.receiveShadow=false;source.add(silhouette);return silhouette;
}

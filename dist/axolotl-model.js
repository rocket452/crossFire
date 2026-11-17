import * as THREE from './vendor/three.module.js';
export function axolotlModel(gltf){
 const body=gltf.scene.getObjectByName('axo_body').clone(true);
 body.traverse(o=>{if(!o.isMesh)return;o.castShadow=o.receiveShadow=true;
  const adapt=m=>{if(m.name==='Glass')return new THREE.MeshStandardMaterial({name:m.name,color:'#8bbce5',transparent:true,opacity:.45,roughness:.22,depthWrite:false});return m;};
  o.material=Array.isArray(o.material)?o.material.map(adapt):adapt(o.material);
 });
 const find=n=>{const o=body.getObjectByName(n);if(!o)throw Error('Axolotl rig missing '+n);return o;};
 return{body,head:find('axo_head'),jaw:find('axo_jaw'),mouth:find('axo_mouth'),tail:find('axo_tail_0'),tailLinks:[find('axo_tail_1'),find('axo_tail_2')],legs:['L_front','L_rear','R_front','R_rear'].map(n=>find('axo_leg_'+n)),gills:['L','R'].flatMap(s=>[0,1,2].map(i=>find('axo_gill_'+s+'_'+i)))};
}

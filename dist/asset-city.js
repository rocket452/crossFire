import * as THREE from './vendor/three.module.js';
import {SpatialChunkBatch} from './spatial-chunk-batch.js?v=overall-performance-238';
import {ASSET_CITY} from './asset-city-config.js?v=311';

// Imported geometry is the visible destructible geometry. No legacy tower shell
// or duplicate invisible tower is placed underneath it.
export class AssetCity {
 constructor(asset,manifest){
  this.textures = new Map();
  this.signMaterials = [];
  this.manifest=manifest;this.templates=new Map();this.attachments=new Map();
  asset.scene.updateMatrixWorld(true);
  asset.scene.traverse(o=>{if(o.isMesh){
   const geometry=o.geometry.clone().applyMatrix4(o.matrixWorld);
   const material=o.material.clone();material.roughness=.78;
   this.templates.set(o.name,{geometry,material});
  }});
  for(const spec of Object.values(manifest.assets))for(const node of spec.pieces?.map(p=>p.node)||[spec.node]){
   if(!this.templates.has(node))throw Error('City asset missing mesh: '+node);
  }
 }
 layout(base){return{...base,buildings:ASSET_CITY.buildings.map(b=>({...b,floors:(this.manifest.assets[b.asset].height+.08)/3}))};}
 install(scene,physics,buildings,batches,records){
  this.buildings=buildings;this.physics=physics;this.batches=batches;
  const lists=new Map(),dummy=new THREE.Object3D();
  for(const b of buildings){
   records.set(b.id,b);
   for(const p of this.manifest.assets[b.asset].pieces){
    const local=new THREE.Vector3(...p.center).applyAxisAngle(new THREE.Vector3(0,1,0),b.yaw);
    const key='city-'+p.node;
    if(!lists.has(key))lists.set(key,[]);
    lists.get(key).push({type:p.type,visualKey:key,building:b.id,floor:p.floor,x:b.x+local.x,y:local.y+.08,z:b.z+local.z,yaw:b.yaw,size:[...p.size],scale:[1,1,1],tint:b.tint});
   }
  }
  for(const [key,list]of lists){
   const template=this.templates.get(key.slice(5));
   const batch=new SpatialChunkBatch(scene,template.geometry,template.material,list,{buildingPosition:c=>records.get(c.building)});
   batches[key]=batch;
   for(const [index,spec]of list.entries()){
    const c=physics.addChunk({...spec,index});
    dummy.position.set(c.x,c.y,c.z);dummy.rotation.set(0,c.yaw,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
    batch.setMatrixAt(index,dummy.matrix);batch.setColorAt(index,new THREE.Color(c.tint));
    c.bounds=new THREE.Box3(new THREE.Vector3(...c.size).multiplyScalar(-.5),new THREE.Vector3(...c.size).multiplyScalar(.5)).applyMatrix4(dummy.matrix);
   }
   batch.seal();
  }
  const sidewalk=new THREE.InstancedMesh(new THREE.BoxGeometry(12,.14,12),new THREE.MeshStandardMaterial({color:'#9aaeb1',roughness:1}),buildings.length);
  sidewalk.name='Asset district sidewalks';sidewalk.receiveShadow=true;
  buildings.forEach((b,i)=>{dummy.position.set(b.x,.05,b.z);dummy.rotation.set(0,0,0);dummy.updateMatrix();sidewalk.setMatrixAt(i,dummy.matrix);});
  sidewalk.computeBoundingSphere();scene.add(sidewalk);
  this.addSigns(scene,dummy);
 }
 addSigns(scene,dummy){
  for(const [variant,name]of ['Advertising_5','Advertising_6','Advertising_7'].entries()){
   const buildings=this.buildings.filter((b,i)=>i%3===variant),template=this.templates.get(name),material=template.material.clone();
   this.signMaterials.push(material);
   material.emissive.set(variant===1?'#6d240a':'#083f3f');material.emissiveIntensity=.35;
   const batch=new THREE.InstancedMesh(template.geometry,material,buildings.length);
   batch.name=name+' mounted signs';batch.castShadow=true;batch.receiveShadow=true;batch.frustumCulled=false;
   buildings.forEach((b,index)=>{
    const spec=this.manifest.assets[b.asset];
    const local=new THREE.Vector3(0,b.asset==='tower'?19:2,spec.footprint[1]/2+.16).applyAxisAngle(new THREE.Vector3(0,1,0),b.yaw);
    const position=new THREE.Vector3(b.x+local.x,local.y+.08,b.z+local.z);
    const section=this.physics.buildings.get(b.id).chunks.filter(c=>c.type==='column').sort((a,b)=>position.distanceToSquared(a.body.position)-position.distanceToSquared(b.body.position))[0];
    dummy.position.copy(position);dummy.rotation.set(0,b.yaw,0);dummy.scale.setScalar(2);dummy.updateMatrix();
    const parent=new THREE.Matrix4().compose(new THREE.Vector3(section.x,section.y,section.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),b.yaw),new THREE.Vector3(1,1,1));
    const offset=parent.invert().multiply(dummy.matrix);
    if(!this.attachments.has(section))this.attachments.set(section,[]);
    this.attachments.get(section).push({batch,index,offset});
    this.syncAttachments(section);
   });
   scene.add(batch);
  }
 }
 applyTexture(slot, texture) {
  const previous = this.textures.get(slot);
  const materials = slot.startsWith('building')
   ? Object.values(this.batches).map(batch => batch.material)
   : this.signMaterials;
  for (const material of materials) {
   if (slot.endsWith('Color')) {
    material.map = texture;
    material.vertexColors = false;
    material.color.set(0xffffff);
   } else {
    material.emissiveMap = texture;
    material.emissive.set(0xffffff);
    material.emissiveIntensity = 2.0;
   }
   material.needsUpdate = true;
  }
  this.textures.set(slot, texture);
  if (previous && previous !== texture) previous.dispose();
 }
 syncAttachments(c){
  const entries=this.attachments.get(c);if(!entries)return;
  const matrix=new THREE.Matrix4().compose(new THREE.Vector3().copy(c.body.position),new THREE.Quaternion().copy(c.body.quaternion),new THREE.Vector3(1,1,1));
  for(const {batch,index,offset}of entries){
   batch.setMatrixAt(index,new THREE.Matrix4().multiplyMatrices(matrix,offset));batch.instanceMatrix.needsUpdate=true;
   batch.setColorAt(index,new THREE.Color(c.tint).multiplyScalar(Math.min(c.hasDetached ? .78 : 1,1-c.scorch)));batch.instanceColor.needsUpdate=true;
  }
 }
 diagnostics(){return{buildings:this.buildings.length,sections:this.physics.chunks.length,importedModels:5,missingTextures:this.manifest.missingTextures,temporaryMaterials:!(this.textures.has('buildingColor')&&this.textures.has('signColor')),loadedTextures:[...this.textures.keys()]};}
}

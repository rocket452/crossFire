import * as THREE from './vendor/three.module.js';
import {SpatialChunkBatch} from './spatial-chunk-batch.js?v=475';
import {makeRelayAsset} from './relay-design.js?v=347';
import {ASSET_CITY} from './asset-city-config.js?v=311';

// Imported geometry is the visible destructible geometry. No legacy tower shell
// or duplicate invisible tower is placed underneath it.
export class AssetCity {
 constructor(asset,manifest){
  this.textures = new Map();
  this.signMaterials = [];
  this.signLights = [];
  this.assets={...manifest.assets};this.templates=new Map();this.attachments=new Map();
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
 layout(base){return{...base,buildings:ASSET_CITY.buildings.map(b=>({...b,floors:(this.assets[b.asset].height+.08)/3}))};}
 fitEvacuationBuildings(buildings){
  return buildings.map((b,i)=>{
   const asset=b.asset??(b.floors>=6?'tower':'shop');
   if(asset==='relay')this.assets.relay??=makeRelayAsset(this.templates);
   const {footprint,height}=this.assets[asset];
   const width=b.footprint??10;
   return {...b,asset,yaw:(i%4)*Math.PI/2,
    assetScale:[width/footprint[0],(b.floors*3-.08)/height,width/footprint[1]]};
  });
 }
 install(scene,physics,buildings,batches,records){
  this.buildings=buildings;this.physics=physics;this.batches=batches;
  const lists=new Map(),dummy=new THREE.Object3D();
  for(const b of buildings){
   records.set(b.id,b);
   const scale=b.assetScale??[1,1,1];
   const sectionScale=new THREE.Vector3(...scale);
   for(const p of this.assets[b.asset].pieces){
    const local=new THREE.Vector3(...p.center).multiply(sectionScale).applyAxisAngle(new THREE.Vector3(0,1,0),b.yaw);
    const key=(b.solidPaint?'city-painted-':'city-')+p.node;
    if(!lists.has(key))lists.set(key,[]);
    lists.get(key).push({type:p.type,visualKey:key,building:b.id,floor:p.floor,x:b.x+local.x,y:local.y+.08,z:b.z+local.z,yaw:b.yaw,size:p.size.map((n,i)=>n*scale[i]),scale,tint:p.tint??b.tint});
   }
  }
  for(const [key,list]of lists){
   const painted=key.startsWith('city-painted-');
   const template=this.templates.get(key.slice(painted?'city-painted-'.length:5));
   const material=painted?template.material.clone():template.material;
   if(painted){
    material.map=null;material.vertexColors=false;material.color.set(0xffffff);
    if(key.startsWith('city-painted-relay-')){
     material.emissive.set('#440927');material.emissiveIntensity=.55;
    }
   }
   const batch=new SpatialChunkBatch(scene,template.geometry,material,list,{buildingPosition:c=>records.get(c.building)});
   batches[key]=batch;
   for(const [index,spec]of list.entries()){
    const c=physics.addChunk({...spec,index});
    dummy.position.set(c.x,c.y,c.z);dummy.rotation.set(0,c.yaw,0);dummy.scale.set(...c.scale);dummy.updateMatrix();
    batch.setMatrixAt(index,dummy.matrix);batch.setColorAt(index,new THREE.Color(c.tint));
    // Collision dimensions already include the model scale.
    c.bounds=new THREE.Box3().setFromCenterAndSize(dummy.position,new THREE.Vector3(
     Math.abs(Math.cos(c.yaw))*c.size[0]+Math.abs(Math.sin(c.yaw))*c.size[2],
     c.size[1],
     Math.abs(Math.sin(c.yaw))*c.size[0]+Math.abs(Math.cos(c.yaw))*c.size[2]));
   }
   batch.seal();
  }
  const sidewalk=new THREE.InstancedMesh(new THREE.BoxGeometry(12,.14,12),new THREE.MeshStandardMaterial({color:'#5d6180',roughness:.82}),buildings.length);
  sidewalk.name='Asset district sidewalks';sidewalk.receiveShadow=true;
  buildings.forEach((b,i)=>{dummy.position.set(b.x,.05,b.z);dummy.rotation.set(0,0,0);dummy.updateMatrix();sidewalk.setMatrixAt(i,dummy.matrix);});
  sidewalk.computeBoundingSphere();scene.add(sidewalk);
  this.addSigns(scene,dummy);
 }
 addSigns(scene,dummy){
  for(const [variant,name]of ['Advertising_5','Advertising_6','Advertising_7'].entries()){
   const buildings=this.buildings.filter((b,i)=>b.asset!=='relay'&&i%3===variant),template=this.templates.get(name),material=template.material.clone();
   this.signMaterials.push(material);
   material.emissive.set(variant===1?'#6d240a':'#083f3f');material.emissiveIntensity=.35;
   const batch=new THREE.InstancedMesh(template.geometry,material,buildings.length);
   batch.name=name+' mounted signs';batch.castShadow=true;batch.receiveShadow=true;batch.frustumCulled=false;
   buildings.forEach((b,index)=>{
    const spec=this.assets[b.asset];
    const [,sy,sz]=b.assetScale??[1,1,1];
    const local=new THREE.Vector3(0,(b.asset==='tower'?13:1.8)*sy,spec.footprint[1]/2*sz+.16).applyAxisAngle(new THREE.Vector3(0,1,0),b.yaw);
    const position=new THREE.Vector3(b.x+local.x,local.y+.08,b.z+local.z);
    const section=this.physics.buildings.get(b.id).chunks.filter(c=>c.type==='column').sort((a,b)=>position.distanceToSquared(a.body.position)-position.distanceToSquared(b.body.position))[0];
    const spillPoint=new THREE.Vector3(0,1,2.3).applyAxisAngle(new THREE.Vector3(0,1,0),b.yaw).add(position);
    this.signLights.push({section,point:spillPoint,color:['#25eeb8','#ffe26c','#ef55e3'][variant]});
    dummy.position.copy(position);dummy.rotation.set(0,b.yaw,0);dummy.scale.setScalar(b.asset==='tower'?3.3:2.6);dummy.updateMatrix();
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
   ? Object.entries(this.batches)
     .filter(([key]) => !key.startsWith('city-painted-relay-')&&
      (slot!=='buildingColor'||!key.startsWith('city-painted-')))
     .map(([,batch]) => batch.material)
   : this.signMaterials;
  for (const material of materials) {
   if (slot.endsWith('Color')) {
    material.map = texture;
    material.vertexColors = false;
    material.color.set(0xffffff);
   } else {
    material.emissiveMap = texture;
    material.emissive.set(slot==='buildingGlow'?'#ffe8c5':'#ffffff');
    material.emissiveIntensity = slot === 'buildingGlow' ? 2.5 : 4.0;
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
 diagnostics(){return{buildings:this.buildings.length,sections:this.physics.chunks.length,importedModels:5,missingTextures:['buildingColor','buildingGlow','signColor','signGlow'].filter(slot=>!this.textures.has(slot)),temporaryMaterials:!(this.textures.has('buildingColor')&&this.textures.has('signColor')),loadedTextures:[...this.textures.keys()]};}
}

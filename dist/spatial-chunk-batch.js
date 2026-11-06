import * as THREE from './vendor/three.module.js';

// Stable physics indices, local visibility bounds, one packed color draw per type.
export class SpatialChunkBatch {
 constructor(scene,geometry,material,sections,{cellSize=32,minCullSaving=.3,buildingPosition=section=>section}={}){
  Object.assign(this,{geometry,material,count:sections.length,minCullSaving});this.meshes=[];this.locations=new Array(sections.length);this.matrixDirty=new Set();this.colorDirty=new Set();this.sealed=false;this.instanceSphere=new THREE.Sphere();this.frustum=new THREE.Frustum();this.projection=new THREE.Matrix4();this.lastKey=null;
  if(!geometry.boundingSphere)geometry.computeBoundingSphere();
  const groups=new Map();sections.forEach((section,index)=>{const p=buildingPosition(section),key=Math.floor(p.x/cellSize)+','+Math.floor(p.z/cellSize);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(index);});
  // These containers stay off-scene: their arrays and spheres describe districts.
  for(const [key,indices]of groups){const mesh=new THREE.InstancedMesh(geometry,material,indices.length);mesh.name='Destructible district '+key;this.meshes.push(mesh);indices.forEach((global,local)=>this.locations[global]={mesh,local});}
  this.main=new THREE.InstancedMesh(geometry,material,sections.length);this.main.name='Visible destructible sections';this.main.receiveShadow=true;this.main.castShadow=false;this.main.frustumCulled=false;this.main.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(sections.length*3).fill(1),3);this.main.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.main.instanceColor.setUsage(THREE.DynamicDrawUsage);
  this.packedMatrix=this.main.instanceMatrix;this.packedColor=this.main.instanceColor;
  const beforeRender=scene.onBeforeRender;scene.onBeforeRender=(renderer,world,camera,...args)=>{beforeRender.call(scene,renderer,world,camera,...args);this.prepare(camera);};scene.add(this.main);
  // Shadow geometry remains identical to the original city-wide batch. The
  // color pass submits zero instances here, avoiding a duplicate color draw.
  this.shadow=new THREE.InstancedMesh(geometry,material,sections.length);this.shadow.name='Destructible shared shadows';this.shadow.instanceColor=new THREE.InstancedBufferAttribute(new Float32Array(sections.length*3).fill(1),3);this.shadow.instanceColor.setUsage(THREE.DynamicDrawUsage);this.shadow.castShadow=true;this.shadow.frustumCulled=false;this.shadow.onBeforeShadow=()=>{this.shadow.count=this.count;};this.shadow.onBeforeRender=()=>{this.shadow.count=0;};scene.add(this.shadow);
  const owner=this,flush=(pending,attribute)=>{for(const mesh of pending)if(mesh[attribute])mesh[attribute].needsUpdate=true;pending.clear();};
  this.instanceMatrix={setUsage:usage=>{for(const mesh of [...owner.meshes,owner.shadow])mesh.instanceMatrix.setUsage(usage);},set needsUpdate(value){if(value)flush(owner.matrixDirty,'instanceMatrix');}};
  this.instanceColor={set needsUpdate(value){if(value)flush(owner.colorDirty,'instanceColor');}};
 }
 setMatrixAt(index,matrix){const {mesh,local}=this.locations[index];this.shadow.setMatrixAt(index,matrix);if(this.sealed)this.shadow.instanceMatrix.addUpdateRange(index*16,16);this.matrixDirty.add(this.shadow);mesh.setMatrixAt(local,matrix);this.matrixDirty.add(mesh);if(this.sealed){this.instanceSphere.copy(this.geometry.boundingSphere).applyMatrix4(matrix);mesh.boundingSphere.union(this.instanceSphere);}}
 getMatrixAt(index,matrix){this.shadow.getMatrixAt(index,matrix);}
 setColorAt(index,color){const {mesh,local}=this.locations[index];mesh.setColorAt(local,color);this.colorDirty.add(mesh);this.shadow.setColorAt(index,color);this.colorDirty.add(this.shadow);}
 getColorAt(index,color){const {mesh,local}=this.locations[index];mesh.getColorAt(local,color);}
 seal(){this.shadow.instanceMatrix.clearUpdateRanges();this.instanceMatrix.needsUpdate=true;this.instanceColor.needsUpdate=true;for(const mesh of this.meshes){mesh.computeBoundingSphere();mesh.frustumCulled=true;}this.sealed=true;this.lastKey=null;}
 prepare(camera){this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse);this.frustum.setFromProjectionMatrix(this.projection);const visible=this.meshes.filter(mesh=>this.frustum.intersectsObject(mesh)),key=visible.map(mesh=>mesh.id+':'+mesh.instanceMatrix.version+':'+(mesh.instanceColor?.version||0)).join('|');if(key===this.lastKey)return;this.lastKey=key;const visibleCount=visible.reduce((n,mesh)=>n+mesh.count,0);if(visibleCount>=this.count*(1-this.minCullSaving)){this.main.instanceMatrix=this.shadow.instanceMatrix;this.main.instanceColor=this.shadow.instanceColor;this.main.count=this.count;this.mode='direct';return;}this.main.instanceMatrix=this.packedMatrix;this.main.instanceColor=this.packedColor;this.mode='culled';let offset=0;
  for(const mesh of visible){this.main.instanceMatrix.array.set(mesh.instanceMatrix.array.subarray(0,mesh.count*16),offset*16);if(mesh.instanceColor)this.main.instanceColor.array.set(mesh.instanceColor.array.subarray(0,mesh.count*3),offset*3);else this.main.instanceColor.array.fill(1,offset*3,(offset+mesh.count)*3);offset+=mesh.count;}
  this.main.count=offset;if(offset){this.main.instanceMatrix.clearUpdateRanges();this.main.instanceMatrix.addUpdateRange(0,offset*16);this.main.instanceColor.clearUpdateRanges();this.main.instanceColor.addUpdateRange(0,offset*3);this.main.instanceMatrix.needsUpdate=true;this.main.instanceColor.needsUpdate=true;}
 }
 diagnostics(){return{meshes:1,districts:this.meshes.length,instances:this.count,visibleInstances:this.main.count,mode:this.mode||'initial',frustumCulled:true,shadowBatches:1};}
}

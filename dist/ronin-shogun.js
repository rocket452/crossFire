import * as THREE from './vendor/three.module.js';
// Both looks share the combat rig, so switching changes no attack or hit state.
export class RoninShogun {
 constructor(model,asset){
  this.model=model;this.meshes=[];this.original=[];this.enabled=false;this.mode='original';
  model.frame.traverse(o=>{if(o.isMesh){let p=o,shield=false;while(p){if(p===model.parts.shield)shield=true;p=p.parent;}if(!shield)this.original.push({mesh:o,visible:o.visible});}});
  model.root.updateWorldMatrix(true,true);asset.scene.updateMatrixWorld(true);
  asset.scene.traverse(src=>{if(!src.isSkinnedMesh)return;
   const materials=[].concat(src.material).map(m=>m.clone());const mesh=new THREE.SkinnedMesh(src.geometry,Array.isArray(src.material)?materials:materials[0]);mesh.name='Shogun '+src.name;
   const bones=src.skeleton.bones.map(b=>{const n=model.parts[b.name];if(!n)throw Error('Missing Ronin Shogun joint '+b.name);return n;});
   const skeleton=new THREE.Skeleton(bones,bones.map(b=>b.matrixWorld.clone().invert()));
   model.root.add(mesh);mesh.bind(skeleton,model.root.matrixWorld);mesh.castShadow=mesh.receiveShadow=true;mesh.frustumCulled=false;mesh.visible=false;this.meshes.push(mesh);
  });
  if(!this.meshes.length)throw Error('Shogun asset contains no weighted meshes');
 }
 select(value){this.mode=value==='shogun'?'shogun':'original';this.enabled=this.mode==='shogun';this.sync();}
 sync(){for(const o of this.original)o.mesh.visible=this.enabled?false:o.visible;for(const m of this.meshes)m.visible=this.enabled;}
 // Freeze the real deformed skin into conventional wreck parts; no live skeleton
 // or old-model geometry is left in debris after the Shogun dies.
 wreck(id){const allowed=id==='torso'?n=>!n.includes('arm')&&!n.includes('hand')&&!n.includes('leg')&&!n.includes('foot')&&!n.includes('toe')&&n!=='head'&&n!=='sword':id==='head'?n=>n==='head':n=>id==='right-upper-arm'&&n==='sword'||n.startsWith(id.split('-')[0]+'-')&&(id.includes('arm')?/arm|hand|wrist|sword/.test(n):/leg|foot|toe/.test(n));
  const group=new THREE.Group();this.model.root.updateWorldMatrix(true,true);
  for(const mesh of this.meshes){mesh.skeleton.update();const geo=mesh.geometry,skin=geo.attributes.skinIndex,weights=geo.attributes.skinWeight,indices=geo.index,positions=[],v=new THREE.Vector3();
   const groups=geo.groups.length?geo.groups:[{start:0,count:indices?.count||geo.attributes.position.count,materialIndex:0}];
   for(const draw of groups){positions.length=0;
    for(let i=draw.start;i<draw.start+draw.count;i+=3){const ids=[0,1,2].map(k=>indices?indices.getX(i+k):i+k),votes=new Map();
     for(const index of ids)for(let j=0;j<4;j++){const name=mesh.skeleton.bones[skin.getComponent(index,j)].name;votes.set(name,(votes.get(name)||0)+weights.getComponent(index,j));}
     const dominant=[...votes].sort((a,b)=>b[1]-a[1])[0]?.[0];if(!dominant||!allowed(dominant))continue;
     for(const index of ids){mesh.getVertexPosition(index,v);positions.push(v.x,v.y,v.z);}
    }
    if(!positions.length)continue;const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.userData.shogunWreck=true;const materials=[].concat(mesh.material);group.add(new THREE.Mesh(geometry,materials[draw.materialIndex]||materials[0]));
   }
  }
  this.model.root.add(group);return group;
 }
 diagnostics(){return{selected:this.mode,available:true,meshes:this.meshes.length,triangles:this.meshes.reduce((n,m)=>n+(m.geometry.index?.count||m.geometry.attributes.position.count)/3,0)};}
}

import * as THREE from './vendor/three.module.js';
// Reserve stencil bit 2 for visible actors. GreaterDepth renders only the
// covered fragments, without tinting their visible faces or writing depth.
const BIT=2;
function material(color){return new THREE.MeshBasicMaterial({color,transparent:true,opacity:.88,depthTest:true,depthFunc:THREE.GreaterDepth,depthWrite:false,fog:false,toneMapped:false,stencilWrite:true,stencilRef:BIT,stencilFuncMask:BIT,stencilWriteMask:0,stencilFunc:THREE.NotEqualStencilFunc});}
function mark(source){source.renderOrder=10;for(const m of [].concat(source.material)){m.stencilWrite=true;m.stencilRef=BIT;m.stencilWriteMask=BIT;m.stencilFunc=THREE.AlwaysStencilFunc;m.stencilZPass=THREE.ReplaceStencilOp;}}
function setup(mesh){mesh.name='Through-cover actor silhouette';mesh.userData.actorSilhouette=true;mesh.renderOrder=101;mesh.frustumCulled=false;mesh.castShadow=mesh.receiveShadow=false;return mesh;}
export class ActorSilhouettes {
 constructor(){this.enemyMaterial=material('#791d26');this.civilianMaterial=material('#ffffff');this.registered=new WeakSet();this.enemies=[];this.crowd=null;this.dark=new THREE.Color('#8c730c');this.warning=new THREE.Color('#d9a51b');this.flash=new THREE.Color('#b52d24');this.threatened=0;}
 register(actor){if(!actor?.root||this.registered.has(actor))return;this.registered.add(actor);const sources=[];actor.root.traverse(o=>{if(o.isMesh&&!o.userData.actorSilhouette&&!o.material?.transparent)sources.push(o);});for(const source of sources){mark(source);const overlay=setup(source.isInstancedMesh?new THREE.InstancedMesh(source.geometry,this.enemyMaterial,source.instanceMatrix.count):new THREE.Mesh(source.geometry,this.enemyMaterial));if(source.isInstancedMesh){overlay.instanceMatrix=source.instanceMatrix;overlay.count=source.count;}source.add(overlay);this.enemies.push({actor,source,overlay});}}
 update(actors,evacuation,danger,time){
  for(const actor of actors)this.register(actor);
  for(const e of this.enemies)e.overlay.visible=!e.actor.dead&&e.actor.combatUnit?.alive!==false;
  const source=evacuation?.people;if(source&&this.crowd?.source!==source){mark(source);const overlay=setup(new THREE.InstancedMesh(source.geometry,this.civilianMaterial,source.instanceMatrix.count));overlay.instanceMatrix=source.instanceMatrix;source.add(overlay);this.crowd={source,overlay};}
  this.threatened=0;if(!this.crowd)return;const {overlay}=this.crowd;let index=0;
  for(const c of evacuation.civilians){if(!c.unit.alive||c.unit.dashPhased)continue;const threat=danger.has(c.group||c);if(threat)this.threatened++;const color=threat?(Math.sin(time*Math.PI*6)>0?this.flash:this.warning):this.dark;for(let i=0;i<6;i++)overlay.setColorAt(index++,color);}
  // Keep one instanced draw and exactly the source's live/boarding/phase filtering.
  overlay.count=source.count;if(overlay.instanceColor)overlay.instanceColor.needsUpdate=true;
 }
 diagnostics(){return{enemyMeshes:this.enemies.filter(e=>e.overlay.visible&&e.actor.root.visible).length,civilianInstances:this.crowd?.overlay.count||0,threatenedCivilians:this.threatened};}
}

import * as THREE from './vendor/three.module.js';

// FORGE mecha (CC0, github.com/RamonLinares/atlas-09) prepared as low-poly runtime models by
// source/forge-mecha/build_lowpoly.sh. Asset preparation only: nothing here is wired into enemy AI or gameplay.
export const FORGE_MECHA=Object.freeze({
 'titan-06':{url:'city-assets/forge-mecha/titan-06-lowpoly.glb?v=475',height:19,
  clips:{idle:'Sentinel',run:'Run',chestBeam:'ChestBeam',rocketPunch:'RocketPunch',kneelFire:'KneelFire',backflip:'Backflip'}}
});

// Loads a FORGE mecha and gives only its materials the faceted low-poly look (flatShading). Other models'
// shading is untouched because the materials belong to this GLB alone.
export async function loadForgeMecha(loader,id){
 const spec=FORGE_MECHA[id];if(!spec)throw Error('Unknown FORGE mecha '+id);
 const gltf=await loader.loadAsync(spec.url);
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;
  for(const m of [].concat(o.material)){m.flatShading=true;m.needsUpdate=true;}
  o.castShadow=o.receiveShadow=true;
  // Clips move limbs (and the launched rocket fist) well outside the bind-pose bounds.
  if(o.isSkinnedMesh)o.frustumCulled=false;
 });
 return{spec,scene:gltf.scene,animations:gltf.animations};
}

// A standalone viewer for checking a mecha in the game scene: it plays one clip at a time and is updated by its
// own clock, independent of the simulation.
export class ForgeMechaPreview {
 constructor(scene,model,{position=new THREE.Vector3(),yaw=0,scale=1}={}){
  this.model=model;this.root=model.scene;this.root.position.copy(position);this.root.rotation.y=yaw;this.root.scale.setScalar(scale);
  scene.add(this.root);this.mixer=new THREE.AnimationMixer(this.root);this.clock=new THREE.Clock();this.current=null;
 }
 play(name){
  const clip=this.model.animations.find(c=>c.name===name);if(!clip)throw Error('No clip '+name);
  const action=this.mixer.clipAction(clip);if(this.current&&this.current!==action)this.current.fadeOut(.2);
  action.reset().fadeIn(.2).play();this.current=action;return clip;
 }
 update(){this.mixer.update(Math.min(this.clock.getDelta(),.1));}
}

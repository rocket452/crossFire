import * as THREE from './vendor/three.module.js';
export const HERO_HURT=Object.freeze({flashSeconds:.2,duration:.42,retrigger:.24,blend:.75,color:'#ff233d'});
// Isolated materials and an off-scene clip sampler keep other heroes and running legs unchanged.
export class HeroHurt {
 constructor(character,root){this.character=character;this.color=new THREE.Color(HERO_HURT.color);this.materials=[];const clones=new Map();root.traverse(o=>{if(!o.isMesh)return;const original=[].concat(o.material),owned=original.map(m=>{if(!m.emissive)return m;if(!clones.has(m)){const copy=m.clone();clones.set(m,copy);this.materials.push({material:copy,color:copy.color.clone(),emissive:copy.emissive.clone(),intensity:copy.emissiveIntensity});}return clones.get(m);});o.material=Array.isArray(o.material)?owned:owned[0];});
  const clip=character?.clips.get('Hit');this.channels=[];if(clip){const source=character.body.clone(true),bones=new Map();source.traverse(o=>{if(o.isBone)bones.set(o.name,o);});source.traverse(o=>{if(o.isSkinnedMesh)o.skeleton=new THREE.Skeleton(o.skeleton.bones.map(b=>bones.get(b.name)),o.skeleton.boneInverses);});this.mixer=new THREE.AnimationMixer(source);this.action=this.mixer.clipAction(clip).play();this.clipDuration=clip.duration;source.traverse(o=>{if(o.isBone&&/^(B_Spine\d*|B_Chest|B_Neck|B_Head|B_[LR]_(Clavicle|UpperArm|Forearm|Hand))$/.test(o.name)&&character.nodes[o.name])this.channels.push({source:o,target:character.nodes[o.name]});});}this.reset();
 }
 restore(){for(const s of this.materials){s.material.color.copy(s.color);s.material.emissive.copy(s.emissive);s.material.emissiveIntensity=s.intensity;}}
 reset(){this.clear();this.hits=0;this.reactions=0;}
 clear(){this.age=HERO_HURT.duration;this.flashAge=HERO_HURT.flashSeconds;this.sinceReaction=HERO_HURT.retrigger;this.restore();}
 hit(){this.hits++;if(this.sinceReaction>=HERO_HURT.retrigger){this.age=0;this.sinceReaction=0;this.reactions++;}if(this.flashAge>=HERO_HURT.flashSeconds*.65)this.flashAge=0;this.paint();}
 step(dt,active=true){if(!active){this.clear();return;}this.age=Math.min(HERO_HURT.duration,this.age+Math.max(0,dt));this.flashAge+=Math.max(0,dt);this.sinceReaction+=Math.max(0,dt);this.paint();}
 paint(){this.restore();if(this.flashAge>=HERO_HURT.flashSeconds)return;const fade=1-this.flashAge/HERO_HURT.flashSeconds;for(const s of this.materials){s.material.color.lerp(this.color,.65*fade);s.material.emissive.copy(this.color);s.material.emissiveIntensity=2.6*fade;}}
 applyPose(){if(!this.action||this.age>=HERO_HURT.duration)return;const t=this.age/HERO_HURT.duration,weight=HERO_HURT.blend*Math.min(1,t/.07)*Math.min(1,(1-t)/.35);this.action.time=this.clipDuration*t;this.mixer.update(0);for(const c of this.channels)c.target.quaternion.slerp(c.source.quaternion,weight);this.character.root.updateWorldMatrix(true,true);}
 diagnostics(){return{active:this.age<HERO_HURT.duration,flashing:this.flashAge<HERO_HURT.flashSeconds,age:this.age,hits:this.hits,reactions:this.reactions,clip:this.action?'Hit':null,bones:this.channels.length};}
}

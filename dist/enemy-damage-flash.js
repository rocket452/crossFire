import * as THREE from './vendor/three.module.js';
export const ENEMY_FLASH=Object.freeze({seconds:.18,retriggerSeconds:.12,intensity:1.05,color:'#fff4dc',maxTargets:16});
// One owner for transient enemy armor emission; weapon FX do not save/restore
// the same materials. Warning lights and weak-point colors keep their own owners.
export class EnemyDamageFlash {
 constructor(){this.states=new Map();this.hits=0;this.color=new THREE.Color(ENEMY_FLASH.color);}
 restore(s){for(const m of s.materials){m.material.emissive.copy(m.emissive);m.material.emissiveIntensity=m.intensity;}}
 clear(){for(const s of this.states.values())this.restore(s);this.states.clear();this.hits=0;}
 hit(unit,damage){
  if(unit?.kind!=='robot'||!(damage>0)||!unit.entity?.root)return;
  let s=this.states.get(unit.id);
  if(!s){
   if(this.states.size>=ENEMY_FLASH.maxTargets){const id=this.states.keys().next().value;this.restore(this.states.get(id));this.states.delete(id);}
   const indicators=new Set(['reactor','visor','rocket_pod','plasma_cannon'].flatMap(name=>[].concat(unit.entity.meshes?.[name]?.material||[]))),seen=new Set(),materials=[];
   unit.entity.root.traverse(mesh=>{for(const material of mesh.isMesh?[].concat(mesh.material):[])if(material.emissive&&material.emissive.getHex()===0&&!indicators.has(material)&&!seen.has(material)){seen.add(material);materials.push({material,emissive:material.emissive.clone(),intensity:material.emissiveIntensity});}});
   s={unit,materials,life:ENEMY_FLASH.seconds,age:0};this.states.set(unit.id,s);
  }else{if(s.age>=ENEMY_FLASH.retriggerSeconds-1e-8)s.age=0;s.life=ENEMY_FLASH.seconds;}
  this.hits++;this.paint(s);
 }
 paint(s){const fade=Math.max(0,1-s.age/ENEMY_FLASH.seconds);for(const m of s.materials){m.material.emissive.copy(this.color);m.material.emissiveIntensity=ENEMY_FLASH.intensity*fade*fade;}}
 update(dt){for(const[id,s]of this.states){s.life-=Math.max(0,dt);s.age+=Math.max(0,dt);if(s.life<=1e-8){this.restore(s);this.states.delete(id);}else this.paint(s);}}
 diagnostics(){return{active:this.states.size,hits:this.hits,seconds:ENEMY_FLASH.seconds,targets:[...this.states.values()].map(s=>({id:s.unit.id,remaining:s.life,age:s.age,materials:s.materials.length}))};}
}

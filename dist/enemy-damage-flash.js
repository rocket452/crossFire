import * as THREE from './vendor/three.module.js';
export const ENEMY_FLASH=Object.freeze({seconds:.20,retriggerSeconds:.12,intensity:1.8,color:'#ff233d',maxTargets:20});
// Red feedback belongs to a specific Walker weapon or an entire small robot.
// Restore overlays before simulation so warning lights retain current ownership.
export class EnemyDamageFlash {
 dashMaterials=new Map();
 dashColor=new THREE.Color('#ffd522');
 dashTargets=[];
 beginDashFrame(){
  for(const [material,base] of this.dashMaterials){
   material.emissive.copy(base.color);
   material.emissiveIntensity=base.intensity;
  }
  this.dashMaterials.clear();
  this.dashTargets=[];
 }
 paintDashTargets(units,time){
  const pulse=.5+.5*Math.sin(time*Math.PI*4);
  const redMaterials=new Set();
  for(const state of this.states.values())if(state.painted){
   for(const {material} of state.materials)redMaterials.add(material);
  }
  for(const unit of units){
   this.dashTargets.push(unit.id);
   unit.entity.root.traverseVisible(mesh=>{
    if(!mesh.isMesh)return;
    for(const material of [].concat(mesh.material)){
     if(!material.emissive||redMaterials.has(material)||this.dashMaterials.has(material))continue;
     this.dashMaterials.set(material,{color:material.emissive.clone(),intensity:material.emissiveIntensity});
     material.emissive.lerp(this.dashColor,.65+.35*pulse);
     material.emissiveIntensity=.45+2.4*pulse*pulse;
    }
   });
  }
 }
 constructor(){this.states=new Map();this.hits=0;this.color=new THREE.Color(ENEMY_FLASH.color);}
 restore(s){if(!s.painted)return;for(const m of s.materials){m.material.emissive.copy(m.emissive);m.material.emissiveIntensity=m.intensity;}s.painted=false;}
 beginFrame(){for(const s of this.states.values())this.restore(s);}
 clear(){this.beginDashFrame();this.beginFrame();this.states.clear();this.hits=0;}
 hit(unit,damage,part=null){
  if(unit?.kind!=='robot'||!(damage>0)||unit.health<=0||!unit.entity?.root)return;
  // Shield absorption owns its blue flash, including reduced hull damage.
  if(unit.entity.suppressDamageFlash||unit.entity.pulseCharging){const old=this.states.get(unit.id);if(old){this.restore(old);this.states.delete(unit.id);}return;}
  const walker=!!unit.entity.weapons,module=walker?unit.entity.weapons.forPart(part):null;if(walker&&(!module||module.destroyed))return;
  const id=unit.id+(walker?':'+part:''),root=walker?unit.entity.meshes[part]:unit.entity.root;
  let s=this.states.get(id);
  if(!s){
   if(this.states.size>=ENEMY_FLASH.maxTargets){const first=this.states.keys().next().value;this.restore(this.states.get(first));this.states.delete(first);}
   const materials=[],seen=new Set();root.traverse(mesh=>{for(const material of mesh.isMesh?[].concat(mesh.material):[])if(material.emissive&&!seen.has(material)){seen.add(material);materials.push({material,emissive:material.emissive.clone(),intensity:material.emissiveIntensity});}});
   s={unit,part:walker?part:null,materials,life:ENEMY_FLASH.seconds,age:0,painted:false};this.states.set(id,s);
  }else{if(s.age>=ENEMY_FLASH.retriggerSeconds-1e-8)s.age=0;s.life=ENEMY_FLASH.seconds;s.emphasis=1;}
  if(unit.entity.type==='mireguard'&&part==='head'){s.age=0;s.headshot=true;}this.hits++;
 }
 emphasize(unit,part){
  const state=this.states.get(unit.entity.weapons?unit.id+':'+part:unit.id);
  if(!state)return;
  state.age=0;state.life=.26;state.emphasis=1.55;
 }
 paint(s){const fade=Math.max(0,1-s.age/ENEMY_FLASH.seconds);for(const m of s.materials){m.emissive.copy(m.material.emissive);m.intensity=m.material.emissiveIntensity;m.material.emissive.copy(this.color);m.material.emissiveIntensity=ENEMY_FLASH.intensity*(s.headshot?1.6:1)*(s.emphasis??1)*fade*fade;}s.painted=true;}
 update(dt){for(const[id,s]of this.states){this.restore(s);s.life-=Math.max(0,dt);s.age+=Math.max(0,dt);if(s.life<=1e-8||!s.unit.alive||s.part&&s.unit.entity.isPartAvailable?.(s.part)===false)this.states.delete(id);else if(!s.unit.entity.suppressDamageFlash&&!s.unit.entity.pulseCharging)this.paint(s);}}
 diagnostics(){return{dashTargets:this.dashTargets,active:this.states.size,hits:this.hits,color:ENEMY_FLASH.color,seconds:ENEMY_FLASH.seconds,targets:[...this.states.values()].map(s=>({id:s.unit.id,part:s.part,remaining:s.life,age:s.age,materials:s.materials.length}))};}
}

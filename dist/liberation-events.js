// Run-local, synchronous dispatch. Records retain scalar counters only, never victims or meshes.
export class CombatEvents {
 constructor(){this.listeners=new Map();this.counts=new Map();this.depth=0;}
 on(type,handler){
  if(!this.listeners.has(type))this.listeners.set(type,new Set());
  this.listeners.get(type).add(handler);return ()=>this.listeners.get(type)?.delete(handler);
 }
 emit(type,event){
  if(this.depth>=12)return;
  this.counts.set(type,(this.counts.get(type)||0)+1);this.depth++;
  try{for(const handler of this.listeners.get(type)||[])handler(event);}
  finally{this.depth--;}
 }
}
export function abilityTags(kind){
 if(['electric','welding','laser-grind'].includes(kind))return ['sustained'];
 if(['kunai','shuriken','charged-shuriken','spray','comet','lance','ball-lightning'].includes(kind))
  return ['projectile',...(['lance','comet','ball-lightning'].includes(kind)?['heavy']:[])];
 if(['sky-strike','ninja-slash','laser-shuriken'].includes(kind))return ['area','heavy'];
 return ['melee'];
}

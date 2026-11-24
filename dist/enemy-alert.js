export const ELEVATED_ATTACK_ALERT=Object.freeze({height:8,radius:60,seconds:8});

// A hit alerts the victim. Elevated attacks also alert nearby active allies, even on a killing blow.
export function alertEnemiesToAttacker(victim,attacker,units,groundHeight){
 if(victim?.kind!=='robot'||!attacker?.root)return;
 victim.entity.noticeDamageFrom?.(attacker);
 const feet=attacker.root.position;
 if(feet.y-groundHeight(feet.x,feet.z)<ELEVATED_ATTACK_ALERT.height)return;
 const origin=victim.entity.root.position;
 for(const unit of units){
  const enemy=unit.entity;
  if(unit===victim||unit.kind!=='robot'||!unit.alive||enemy.spawned===false||!enemy.noticeDamageFrom)continue;
  if(origin.distanceToSquared(enemy.root.position)<=ELEVATED_ATTACK_ALERT.radius**2)enemy.noticeDamageFrom(attacker);
 }
}

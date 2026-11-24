export const ENEMY_ALERT=Object.freeze({radius:60,seconds:8});

// Horizontal 120-degree field of view. Use the chassis quaternion so drone banking
// does not turn a vertical offset into an apparent change of bearing.
export function inFrontOfEnemy(root,point){
 if(!point)return false;
 const dx=point.x-root.position.x,dz=point.z-root.position.z;
 const {x,y,z,w}=root.quaternion,fx=2*(x*z+w*y),fz=1-2*(x*x+y*y);
 const length=Math.hypot(dx,dz)*Math.hypot(fx,fz);
 return length>1e-8 && dx*fx+dz*fz>=.5*length;
}
export function alertEnemiesToAttacker(victim,attacker,units){
 if(victim?.kind!=='robot'||!attacker?.root)return;
 victim.entity.noticeDamageFrom?.(attacker);
 const origin=victim.entity.root.position;
 for(const unit of units){
  const enemy=unit.entity;
  if(unit===victim||unit.kind!=='robot'||!unit.alive||enemy.spawned===false||!enemy.noticeDamageFrom)continue;
  if(origin.distanceToSquared(enemy.root.position)<=ENEMY_ALERT.radius**2)enemy.noticeDamageFrom(attacker);
 }
}

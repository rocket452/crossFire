// Stop voluntary locomotion immediately; keep gravity and external impacts physical.
export function stepAttackMovement(motion,input,dt,sections,locked){
 if(locked){motion.velocity.x=motion.velocity.z=0;motion.speed=0;motion.jumpBuffer=0;input={player:input.player};}
 motion.step(input,dt,sections);
}

const BEAM_GROUND_DRAG=15;
const BEAM_AIR_DRAG=12;
const STOP_SPEED=.08;

// Clear movement input while firing. The beam can coast through the usual collision solver.
export function stepAttackMovement(motion,input,dt,sections,locked,coast=false){
 if(locked){
  if(!coast||Math.hypot(motion.velocity.x,motion.velocity.z)<STOP_SPEED){
   motion.velocity.x=motion.velocity.z=0;
   motion.speed=0;
  }
  motion.jumpBuffer=0;
  input={player:input.player};
  if(coast){
   input.groundDrag=BEAM_GROUND_DRAG;
   input.airDrag=BEAM_AIR_DRAG;
  }
 }
 motion.step(input,dt,sections);
}

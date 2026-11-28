// Assault Sentinel: tracked basic enemy with an armoured front and a reactor core that opens while it
// attacks. Simulation seconds, metres and damage. Tuning only; no scene state.
export const ASSAULT_SENTINEL=Object.freeze({
 health:600,
 height:2.7,
 moveSpeed:3.1,reverseSpeed:1.4,chassisTurn:Math.PI*.75,torsoTurn:Math.PI*.85,
 heroRange:60,weaponRange:34,
 // Holds between these distances while shooting; closer than slam.trigger it slams.
 preferredMin:8,preferredMax:15,
 armor:{
  frontArc:55,rearArc:125,            // degrees from the torso's facing
  front:.35,side:.85,rear:1.4,        // hull damage by hit direction
  plate:.3,                           // the front armour plates themselves
  core:1.75,exposedCore:2.4,          // rear reactor; any core hit while it is exposed
  exposedFront:.85                    // opened chest: frontal hull hits are no longer heavily reduced
 },
 burst:{windup:.8,shots:4,interval:.18,speed:34,radius:.5,damage:11,cooldown:3.4,range:34,modes:['direct','lead','direct','lead'],
  vent:1.25},                         // core stays exposed this long after the last shot
 slam:{trigger:5.5,windup:.95,radius:6.2,damage:22,knock:11,lift:7,recover:1.6,cooldown:5.2,height:2.6},
 stunScale:.75,
 dying:.55,
 dashFraction:null                    // City Liberation sets the Kage dash share on spawned units
});

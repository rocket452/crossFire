// Metres, kilograms, Newtons and simulation seconds.
export const COMBAT_DRONE = {
 mass: 720,
 centerOfMass: [0,-.22,0],
 hullHealth: 440,
 hullSize: [2.7,1.45,3.5],
 engineHealth: 105,
 engineSize: [1.46,.95,1.55],
 engines: [
  {id:'front-left', position:[-2.38,.08,1.62], spin:1},
  {id:'front-right',position:[2.38,.08,1.62], spin:-1},
  {id:'rear-left', position:[-2.38,.08,-1.62],spin:-1},
  {id:'rear-right',position:[2.38,.08,-1.62],spin:1}
 ],
 flight: {
  altitude: 16, maxThrust: 3200, failedThrust: .92, reactionArm: .58,
  linearDamping: .18, angularDamping: .32, altitudeGain: 2.4, climbDamping: 2.6,
  approachGain: .9, speedDamping: 1.65, maxSpeed: 5, maxAcceleration: 3.8,
  attitudeGain: 13, angularGain: 5.6, yawGain: 3.5, yawDamping: 2.2,
  patrolRadius: 8, patrolPeriod: 19, engagementSpacing: 18, aerialClimbFraction: .4,
  obstacleScanHeight: 72, yawReserve: .22
 },
 crash: {
  smokeAt: .64, debrisLifetime: 17, wreckLifetime: 23,
  scrapeSpeed: 1.5, crashSpeed: 3.4, explosionSpeed: 10.5,
  contactCooldown: .17, fragmentCount: 3
 },
 gun: {
  acquisition: .5, spinUp: 1, fire: 10, cooldown: 1.5,
  acquisitionDegrees:120, firingDegrees:35, roundsPerSecond:12,
  speed:65, spreadDegrees:6, range:60, yawLimit:105, minDown:8, maxDown:78,
  damage:8, bulletRadius:.09, bulletVisualScale:2, bulletLifetime:1.2, tracerEvery:3, projectileLimit:32
 }
};

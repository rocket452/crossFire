# Escort outer boulevard and drone squad — revision 65

The Civilian evacuation scene extends the original 120 × 120 m ground by 48 m on the positive-Z side, beside the Chinook approach. The escort map spans X −60…60 and Z −60…108 (120 × 168 m). The original city battle retains its map, army, scenery and cameras.

An open boulevard joins the existing Z=48 street to the new edge. It has sidewalks, lane/edge markings, open concrete lots and an orange edge stripe. No buildings obstruct the squad's lanes. Subway entrances and 12-person civilian groups alternating every 30 seconds are unchanged. The landing zone remains at (0,24).

Three tracked drones replace the former single landing-zone raider. They spawn together at 30 simulation seconds, when the second civilian wave emerges, at X −4/0/4, Z=102. After the existing three-second arrival grace, each follows its lane toward a staging point at Z=36 at 3.2 m/s. They stop about 13 m from the pad, keeping rotor/boarding clearance. The lanes keep their tracks separated and avoid intact buildings. A swept scenery check stops movement at major debris rather than passing through it. The squad spawns once per rebuild; later civilian waves do not create extra squads.

Drones prioritize the Chinook when it is alive and below 12 m altitude, otherwise visible civilians. They continue advancing to their landing-zone objective even while the aircraft is absent. They retain 1,000 HP each, a 34 m weapon range, a one-second wind-up, 12 m/s visible energy bolts, 14 damage and 2.5-second shot recovery. Starting cooldowns differ by 0.35 s across the three units. The giant's existing occasional high-altitude helicopter targeting rule remains unchanged.

Each drone has its own health, collision, stun, tread animation, projectile owner and projectile IDs. Hero targeting switches to a surviving squad member and returns to the Siege Walker when all three are defeated. Killing a drone does not count as a civilian loss or kill/interrupt the giant. The squad manager retains the existing evacuation spawn/update/reset hook, so civilian and encounter systems are extended in place. Rift threat prediction and projectile redirection receive all three drones' bolts and their owners; scenery, bubble barriers and existing damage/carry immunity remain in the shared paths.

Volt's run boundary extends to Z=104 and electric-wave boundary to Z=103 only in the escort scene, allowing player interception in the new area. Default movement/dash limits remain unchanged in City battle. The evacuation helicopter approaches and escapes at Z=132, beyond the enlarged map, so passengers count as rescued only after leaving it. Boarding, replacement and rescue/loss accounting continue automatically. The flight leg is 2.5 seconds longer each way than before.

## Locations for tuning

- `dist/evac-approach.js`: map extents, three lane offsets, spawn Z, staging Z, movement speed and boulevard meshes.
- `dist/evac-raider-squad.js`: squad assembly, per-drone IDs/cooldown offsets and low-altitude helicopter preference.
- `dist/evac-raider.js`: existing drone health/weapon timings and collision/tread behavior; supports per-instance spawn, objective, movement speed and scenery clearance.
- `dist/evacuation-config.js`: helicopter escape point and existing flight/boarding/health values; spawn interval remains 30 seconds.
- `dist/battle.js`: escort-only ground size, camera/shadows, player movement limits, squad combat adapters and threat ownership.

The drone movement is intentionally a simple, predictable three-lane approach. Major debris can halt a lane until cleared; no full pathfinding or destructible new buildings were added to the extension.

## Drone torso tracking and hero targets — revision 79

Tracked raiders now prioritize visible, enabled heroes within 30 m, including the player and flying heroes. Each selects independently and retains its current hero unless another is at least 5 m closer, avoiding constant target flicker. Disabled, phased or occluded heroes are excluded. With no nearby visible hero, the previous low-altitude Chinook/civilian targeting order remains.

The upper body turns independently of the chassis, and the right cannon pitches toward elevated targets. Treads continue along their existing landing-zone lanes. `RAIDER_COMBAT` in `dist/evac-raider.js` configures 120°/s waist and cannon tracking, 7° firing alignment, 30 m hero range, 34 m weapon range, 1 s aligned windup, 2.5 s recovery and 5 m target-switch margin. Cannon pitch spans 85° upward to 75° downward. A target change restarts the windup; cover, stun or misalignment prevents firing. Existing three-second arrival grace, per-drone initial cooldowns, 12 m/s bolts, squad size and wave-two spawn remain.

Upper-body collision rotates with the torso while tread collision follows the chassis. `EvacuationScene.heroUnits()` supplies shared hero proxies in their actual support orientation. Raider projectile sweeps include those proxies, keep portal redirection and Mochi bubbles, and can hit Violet's existing barrier. Volt's active electric wave is excluded from both targeting and collision.

Hero impacts use the prototype's existing feedback (Volt's hit reaction and contact sparks/flashes). Heroes still have no health/death system; hero proxies are deliberately never passed into `UnitDamage.hurt`. No new hero abilities or escort requirements are added.

## Exploding robot wrecks — revision 80

Small raiders now explode at their reactor and split into five physical pieces: head, both arms, torso/reactor and the tracked chassis. The original meshes stay intact inside the pieces and keep their death pose as they detach. The pieces receive outward/upward velocity and angular motion, collide through the existing Cannon world and settle. Their armor darkens, their powered lights go out and smoke rises from each moving wreck.

The Siege Walker keeps its existing collapse and eighteen-part breakup, with a large reactor blast on death, a second explosion during breakup and stronger outward motion. Each of its eighteen real wreck bodies also emits smoke. Smoke follows the bodies while new puffs drift upward; emitted puffs stay in the world.

`ROBOT_DEATH` in `dist/robot-death-effects.js` controls 24 seconds of emission, 3.2-second puffs, roughly 0.55–0.65 s between puffs per part, 48 emitter slots and 240 puff slots. All three raiders plus the Walker create 33 physics pieces. The visual layer adds at most three pooled effect draws and no lights or textures. Death blasts reuse the existing explosion renderer in a separate pool and do not change missile statistics or add collateral damage. Actor/city reset restores original hierarchy, materials and poses, removes wreck physics and clears smoke/explosions.


## Seven-drone energy wave — revision 86

The second civilian wave still triggers exactly one squad per rebuild at 30 seconds. `ESCORT_APPROACH.squadSize=7` uses the existing three boulevard lanes in rows of 3/3/1, separated by `rowSpacing=6` m. Front/middle/rear spawn at Z=90/96/102 and stage at Z=36/42/48; the final single robot uses the center lane. Followers hold at least 3.6m behind a stopped or stunned robot in the same lane, preventing track stacking. No map or subway changes are needed. Each robot retains 1,000 HP, independent combat and staggered firing cooldowns. Squad HUD/diagnostic totals derive from actual member count (7,000 maximum HP).

Bolts now have a 1.32m core/hit radius, double revision 85’s 0.66m radius, and retain 18m/s speed, four-second life and existing damage. The radius reaches scenery, units, barriers and threat prediction. `RaiderEnergyEffects` adds pulsing orange halos, two rotating energy rings, bright spark wakes and an expanding spark/ring impact discharge. One shared squad pool uses at most three extra instanced draws, 384 sparks, 96 rings and 64 halos; no lights, textures, dependencies or additional damage. Reset clears live shots and all effects; gateway travel starts its wake at the exit instead of drawing a line across the map.

Smoke remains capped at 48 emitters and 240 puffs, so seven drones plus the Walker remain within the existing bounded visual budget even though their total possible physical wreck pieces rise to 53.


## Faster small-robot projectiles — revision 87 (current)

`RAIDER_COMBAT.projectileSpeed` is now 36m/s, double the previous 18m/s. Actual movement and incoming-threat prediction read the same per-shot speed. The seven-robot formation, 1.32m hit radius, energy effects, damage, firing cadence and four-second lifetime are unchanged. Maximum unobstructed flight distance consequently doubles to 144m; acquisition/firing range remains 30m/34m.

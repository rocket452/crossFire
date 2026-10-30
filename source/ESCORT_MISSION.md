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

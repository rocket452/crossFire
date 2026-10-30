# Landing-zone raider — revision 50

The evacuation scene spawns one approximately 4.6m low-poly robot at (17, .1, 48), beside the Chinook landing zone, exactly when the second eight-person subway group spawns (30 simulation seconds). It has 1,000 HP, a pulsing arrival ring, articulated walking legs and a cannon arm. Arrival movement begins after three seconds; the first bolt cannot fire before five seconds. It advances toward visible civilians, winds up for one second, then fires slow 12m/s energy bolts with a 2.5-second recovery. Bolts deal 14 damage to civilians and have the same through-building silhouette effect as other hostile projectiles. They collide with scenery, can pass through Rift's transport portals and expire after four seconds. The raider does not target the boarding Chinook.

All four heroes prioritize the live raider. Damage callbacks and aim assistance support both robots; Volt's stun consumes the same charge/cooldown but stuns the struck raider without interrupting the giant. Once defeated, the smaller robot topples, loses collision and stops firing, and heroes resume attacking the giant. Its defeat does not increase civilian casualties. Later waves do not respawn it. City rebuild removes its unit/projectiles and rearms the wave-two trigger. The original city battle has no raider.

Verification:

- `QA/evac-raider-test.mjs`: one spawn, health, grace period, movement/actual civilian damage, stun, death/no further firing, projectile expiry and reset.
- `QA/evac-raider-browser.cjs`: desktop and 390px touch viewport; no spawn at 29.9s, one spawn at 30s, position near Chinook, all four hero target providers, damage through real lightning/orb/fireball/portal/beam callbacks, paid Volt stun on the correct robot, defeat/casualty accounting, no later-wave respawn, reset/retrigger and original-scene isolation. Also runs CPU heroes in natural combat and checks actual damage to the raider. Runtime/shader errors and horizontal overflow are checked.
- Screenshot inspected: smaller robot with cannon, glowing visor/reactor and arrival ring stands beside the Chinook.
- Existing evacuation targeting, hero power economy/interruption, and roster unit checks pass. Browser checks use software Chromium; physical phone performance was not measured.

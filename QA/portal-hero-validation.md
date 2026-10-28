# Rift Warden portal hero validation

- Direct Blender 4.3.2 authoring produces a 1,852-triangle, 16-part original jade/ivory/gold character; actual GLB triangle count and named articulation are checked. Native Blender source, GLB, JSON and reproducible script included.
- Own paired-portal travel, emergence/casting pose, fixed five-second attack/rescue/travel openings, eight physical projectiles per second and real robot/building damage. Effects use shared geometry and bounded instance pools.
- Real tank/infantry evacuation from homing or straight incoming projectiles, clear same-side exits at least 16 m away, unchanged unit health, visible/rendered transforms and collision history update together, homing lock loss. Both divisions are supported.

Passed:

- `portal-hero-test.mjs`: actual asset, portal expiry/stationarity and rapid damage at 30/60/120 Hz; self teleport/emergence, tank/soldier rescues, straight/homing threat detection, blocked-exit rejection, limits, ceasefire/reset and instance disposal.
- `portal-hero-browser.cjs`: 1100×1000 desktop and 390×844 touch layout; actual character, observer camera, stationary/expiry audit on every simulation step, rapid damage, natural rescues, rendered/collision agreement, no old-location sweep, pause, reset, ceasefire and no shader/page/layout errors.
- Natural encounter by 22 s: four hero teleports, 119 shots / 928 robot damage, two tank and two infantry evacuations. Rescue distances 23.2–40.8 m. Health remains 100/100 or 35/35; previous-center error is zero; infantry render position differs by at most 0.065 m due to animation. Each threatened homing missile loses lock.
- Additional deliberately aimed live rockets are spawned above a real tank and soldier; each unit actually relocates before impact, takes no damage, and has matching rendered/collision state. No fake immunity is used.
- Existing unit collision/damage, robot missiles, alternating arsenal, speedster charge/cooldown/trail and Violet inertia/shield lockout module checks pass.
- Screenshots: `/tmp/portal-hero-barrage.png`, `/tmp/portal-hero-barrage-phone.png`, `/tmp/portal-tank-rescue.png`, `/tmp/portal-tank-rescue-phone.png`.

Browser rendering uses software WebGL; physical phone FPS and thermal performance are unmeasured.

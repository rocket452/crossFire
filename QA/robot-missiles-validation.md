# Shoulder launcher and superhero missile defense

Implemented with Blender 4.3.2, Three.js and the existing Cannon-es destruction.

- Robot: 3,744 triangles / 17 rigid parts, including six-cell `rocket_pod`; original 21 m character, articulation and energy cannon retained. Updated native `.blend`, `.glb`, articulation JSON and reproducible build script. Separate 246-triangle / 25,348-byte missile GLB.
- Salvo: six staggered launches at 0.43 s intervals, 8.5 m/s flight, 5.2 s initial delay / 19 s repeat; six animated shoulder muzzle transforms, exhaust, smoke trails and 22 s lifespan. At most 12 live missiles.
- Missile: 18 HP; shared swept shot queries and real city/unit/terrain collision. Unopposed hits use existing rocket blast damage and per-panel scorch. Intercepted warheads have effects only and cannot trigger a damaging blast.
- Violet: prioritizes threats, charges in 0.48 s, aims her right arm and launches physical 42 m/s purple orbs. Target claims reduce duplicate attacks. Beam barrier/left-arm defense can continue at the same time.
- CPU Volt: selects visible missiles for electricity and moves toward occluded threats using his existing ground/wall movement. Two 0.08 s electrical ticks destroy a missile. Player takeover suspends automatic fire; returning him to CPU restores missile defense.
- Pause freezes flight. Robot defeat cancels queued launches; heroes continue clearing airborne missiles. Rebuild clears missiles, claims, charges, counters and restores the pod with the robot. Pod becomes the seventeenth real wreck body.

Validation:

- `robot-missiles-test.mjs`: 30/60/120 Hz salvo timing, speed, flight, threat reservations and LOS filtering, swept targeting, partial damage, exact single kill credit, harmless interceptions, real building/unit damage, reset and launch cancellation.
- `robot-missiles-browser.cjs`: 1100×1000 desktop and 390×844 touch layout. First two salvos launch 12 missiles and intercept all 12; first salvo includes five Violet and one Volt kill. Later split varies with path/collision timing. Concurrent beam is physically blocked. The deliberately unopposed covered-target fixture produces six real impacts with GPU instance-color scorching. Also checks player control, pause, reset, 17 wrecks, defeat cleanup, finite state, bounded missile count, page/shader errors and overflow.
- Existing robot battle browser regression: both armies deal real damage, actual manually piloted missile damages robot, 17 physical wrecks fall, ceasefire/reset and phone pilot controls pass.
- Existing core gait, hero/barrier, runner motion/animation/CPU, energy beam, building durability and reserved player damage tests pass.
- Screenshots: `/tmp/missile-salvo.png`, `/tmp/missile-salvo-phone.png`; inspected shoulder model, visible cells/flight and defense effects.

Chromium uses software WebGL in this workspace; these are functional/responsive checks, not physical-phone FPS or thermal measurements. All interceptions use actual shot collision and can fail if cover or player intervention prevents a defense.

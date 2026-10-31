# Shared enemy hit flash — revision 78

All current hostile units (Siege Walker and the three tracked drones) share a brief warm-white armor flash. Positive `UnitDamage.hurt` notifications cover every direct/splash weapon; the existing weak-point damage authority notifies the same visual layer. Core-only damage still does not reduce body health. Zero, blocked, phased, dead and protected final-core hits cannot start a flash. Friendlies are filtered out.

`EnemyDamageFlash` owns transient armor emission. The lightning contact effect now retains its sparks/arcs/rings without separately saving or overwriting the same materials. Existing reactor, visor, shoulder-warning and weak-point materials remain under their own controllers. Repeated damage visibly retriggers with a 0.12 s minimum interval, and a final hit fades within 0.18 s. Rebuild restores/clears all states. No geometry, lights or draw calls are added.

Verification:

- `enemy-damage-flash-test.mjs`: passes at 30/60/120 Hz for all four enemies, direct/splash notifications, sustained pulses, death/phase/zero/friendly handling, exact material restoration, warning preservation and lightning cleanup compatibility.
- `enemy-damage-flash-browser.cjs`: passes on 1100×1000 desktop and emulated 390×844 phone. Invokes seven existing impact callbacks in the rendered evacuation scene (shell, infantry, Violet orb, Solara fireball, portal bolt, force beam and helicopter rocket) against the actual Walker and all three drones. Verifies all four simultaneous flashes, preserved lights, expiry, core-only HP, blocked CPU final core, friendly rejection, killing hit and city reset.
- `runner-hit-effect-browser.cjs`: actual held mouse/touch lightning still damages boss, drones and weak points with contact effects and the shared body flash; unchanged 150 DPS and current 17.5 charge/s. Cover/miss rejection and cleanup pass.
- `combat-collision-test.mjs`, `weak-points-test.mjs`, and `runner-hit-effect-test.mjs` pass. The core test also checks positive damage notifications and rejection of blocked AI hits.
- Changed JS syntax and `git diff --check` pass. No browser errors.

Inspected `/tmp/enemy-flash78-drones-desktop.png`; boss/drone captures also exist for phone and boss desktop. Generic weapon browser cases exercise real impact callbacks rather than waiting for every projectile's flight; actual player lightning uses normal input. Physical handset FPS was not measured. Health, attack strength, targeting, stun timing, evacuation and destruction rules are unchanged.

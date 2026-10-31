# Tracked raider hero targeting — revision 79

Nearby visible heroes now take priority over evacuation targets. The original chassis objective stays in place while the upper body yaws and cannon elevates to aim. Shots require actual barrel alignment and clear muzzle-to-target scenery, with a fresh one-second windup after retargeting. Actual hero proxy collision invokes hit feedback; no hero health model is introduced.

`raider-hero-aim-test.mjs` passes at 30/60/120 Hz and 75 ms frames: hero priority, 30 m range/cover/phase filtering, five-metre switching hysteresis, independent waist/pitch and tread travel, aligned shot vectors, physical swept hero hits, upper/lower collision orientation, stun freeze, retarget windup, death and reset. The original `evac-raider-test.mjs` still passes arrival grace, HP, civilian fire, stun and cleanup.

`raider-hero-aim-browser.cjs` passes at 1100×1000 desktop and emulated 390×844 phone:

- Entered real Volt control and ran full combat/physics while the three drones aimed and fired; real projectile contacts reached Volt's hit feedback.
- Each of the five existing hero models was enabled in turn in the outer boulevard. All three drones independently tracked and shot it, including elevated Violet/Mochi poses. Other-hero positions were held for repeatable targeting checks while the drone simulation continued.
- Waist rotation, cannon elevation, alignment and hero hit counters were verified; treads maintained their original landing-zone heading. No hero proxy gained an invalid health field.
- A real building panel blocked hero acquisition. The squad switched to the helicopter and reduced its HP, preserving the evacuation threat when heroes were unavailable.
- Violet's existing barrier intercepted the projectile trace and absorbed the correct 14 power. Volt's wave excluded his proxy from both acquisition and collision.
- City reset cleared squad/aim/hit state, and the first simulation tick retained one civilian group with the next wave at 30 seconds. No browser errors.

Inspected `/tmp/drone-hero79-desktop.png`; matching phone capture shows the real upper-body/weapon pose. Physical-phone FPS/thermals were not measured.

Existing `combat-collision-test.mjs`, `enemy-damage-flash-test.mjs`, `evacuation-lifecycle-test.mjs` and `evacuation-policy-test.mjs` pass. Changed JS syntax and `git diff --check` pass. Models, HP, bolt damage/speed, hero weapon costs, civilian routes/intervals, Siege Walker arsenal and building destruction are unchanged. The prototype still uses hero hit feedback rather than hero HP/death.

# Building collapse completion — revision 147

The 75% destroyed-section rule previously cancelled all remaining detachment work and froze active fragments at their current transforms. This could preserve an unsupported, collisionless shell or suspend debris well above the ground.

`DestructionWorld.disableBuildingCollision` now releases the remaining structure into a separate non-colliding ballistic-debris set. Existing moving pieces retain velocity; intact/previously settled elevated pieces receive a small outward tumble. Gravity and rotated-box terrain landing tests complete the fall, with `onMove`/`onFreeze` synchronizing the actual instanced render meshes. The released fragments do not occupy the capped Cannon rigid-body pool or obstruct heroes, civilians, projectiles, or other debris. Grounded fragments already made collisionless remain where they landed. Flat ground and existing pyramid terrain are supported. City reset clears in-flight debris and restores all sections/colliders/tints.

Before the 75% threshold, existing Cannon contacts, support failure, weapon damage/scorch, player activation reservation, and grounded-rubble collision release are unchanged. The +30% durability and 90% non-Walker damage reduction remain unchanged.

## Verification

- `node QA/building-collapse-test.mjs`: actual 12-storey/348-section geometry; threshold boundary, preserved motion, render callbacks, complete landing, no airborne remnants, neighbor isolation, body budget, reset during/after collapse; 60 Hz and 75 ms steps. Rotated debris also lands on existing pyramid terrain.
- `node QA/building-collapse-browser.cjs`: Chromium desktop and touch layouts in the combat arena, evacuation city, and battle city. Arena uses real damage impacts on two ground-floor supports and 51.5 seconds of physics simulation; all upper sections eventually settle below 3 m with no residual queue, within the existing active-body cap. City cases exercise the 75% health-damage trigger. All six scenarios verify instance matrices agree with body positions, no page errors, and complete city rebuild. Screenshots in `/tmp/building147-{intact,falling,settled-*}-{desktop,phone}.png`; visually reviewed the falling tower and final ground rubble.
- Existing physics/damage/collision/beam Node checks pass. Their isolated-panel fixtures now include undamaged sections so they test local rigid-body behavior below the whole-building release threshold, rather than treating one panel as an entire building. These fixtures already failed on the previous code because the 75% rule froze/released their only section.
- The existing weapon browser suite uses the current electric damage expectation (1.5 per 0.1 s after armor, matching `12 * seconds / .08 * .1`); it previously still expected 1.2. No weapon balance was changed by this fix.

## Limits

After whole-building collision release, rubble uses inexpensive visual ballistic motion and terrain landing rather than fragment-to-fragment stacking. This is intentional: released buildings and landed rubble remain non-blocking. Browser touch emulation does not measure physical phone FPS or thermal behavior.

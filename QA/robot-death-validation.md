# Robot death explosions and smoking wreckage — revision 80

Both robot sizes now have reactor explosions and smoking physical parts. The Walker retains its 1.5-second collapse and eighteen-piece physics breakup with an initial and secondary blast. Raiders separate immediately into five original mesh groups with outward/upward velocity and spin. Each physical body supplies the moving smoke origin. Armor chars, glow powers down, and smoke emission fades after 24 simulation seconds.

## Physics and lifecycle verification

`node QA/robot-death-test.mjs` passes at 30/60/120 Hz with the real Walker GLB, real raider parts and Cannon world:

- One death blast per drone; two timed Walker stages. Repeated destroy/break calls cannot duplicate effects/bodies.
- Five drone bodies and eighteen Walker bodies. World poses are preserved when raider parts reparent, and rendered wreck groups match physical bodies.
- Pieces fly/fall/rotate under physics; charred materials and smoke emitters remain attached to actual parts.
- Death visuals do not damage a nearby civilian or alter the separate missile explosion statistics.
- Smoke/explosions expire; actor reset restores mesh parents, transforms, colors/lights and original physics-body count. A second spawn/death works.
- A stress fixture respects 48 emitters, 240 puffs and three active effect draws.

## Actual gameplay verification

`node QA/robot-death-browser.cjs` passes on 1100×1000 desktop and emulated 390×844 phone. Real held mouse/touch lightning delivers lethal hits to a staged low-health drone and Walker. The normal combat, collision, death, physics and rendering callbacks run.

It verifies first-frame death explosions, five/eighteen pieces, moving smoke, timed Walker breakup, dark wrecks, all three drones plus Walker together (33 bodies/emitters), finite transforms, bounded puff/draw counts, no additional civilian losses, unchanged missile counters, city rebuild cleanup and another actual weapon kill after rebuilding. No page, shader or console errors.

Inspected `/tmp/robot-death80-drone-blast-desktop.png`, `/tmp/robot-death80-drone-blast-phone.png`, `/tmp/robot-death80-drone-smoke-desktop.png` and `/tmp/robot-death80-boss-smoke-desktop.png`; matching boss blast and phone smoke views are also captured. Physical-handset FPS/thermals were not measured. Existing city geometry can occlude wreckage/smoke from a particular camera angle.

Existing `evac-raider-test.mjs`, `raider-hero-aim-test.mjs`, `weak-points-test.mjs`, `combat-collision-test.mjs` and `evacuation-lifecycle-test.mjs` pass. Changed JS syntax and `git diff --check` pass. Existing attack behavior, health, damage, hero controls and civilian spawning are preserved. The death explosions are visual feedback rather than an added area-damage mechanic.

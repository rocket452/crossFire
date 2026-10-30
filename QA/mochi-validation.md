# Mochi Pink / Sakura “Koko” Tanaka — revision 56

Mochi is the fifth selectable hero, CPU-controlled, absent from the default Volt/Violet/Rift team. Existing saved teams and the maximum-three rule remain. Her roster card, tracking camera and readout expose her optional deployment and shield/daze counters.

The original game accessories give the supplied weighted humanoid pastel pink twin-tails, smiling strawberry clips/leaves, round mint HUD glasses, a three-tier lavender skirt with instanced tulle frills, neon candy-striped armor, mismatched badge-covered arm warmers, holographic platform boots with glitter jets, and a gold star wand. No licensed geometry or animations are added to public GitHub. Accessories attach to real bones and follow the 53-bone source rig.

Abilities:

- Platform Propulsion: CPU air skating at up to 16m/s above the skyline, with animated hair/boots, two glowing light tracks (three-second lifetime, maximum 160 segments) and bounded glitter (160 particles).
- Decora Bubble Shield: spherical bubblegum clusters around threatened allies or landing zones. Each is impenetrable for six seconds, has a ten-second deployment cooldown, and maximum two bubbles. Beam, missile, plasma, eye-bolt and raider collision paths support bubbles; protected allies also reject hostile blast damage. Friendly shots pass through. Shields are finite-duration, not health-based.
- Kawaii Cataclysm: .7-second wand wind-up, expanding sparkling projectile wave, seven-second cooldown, 140 robot damage and 1.4-second daze. Robot preparation is interrupted, with orbiting pink hearts. Joy dazes use the stun clock without the lightning visual. Both the giant and evacuation raider are supported. Rift portals can redirect the wave.

Validation:

- `QA/mochi-test.mjs`: default exclusion, max-three and persistence; plain-object/vector swept sphere collision, protected ally filtering and tuning bounds.
- `QA/mochi-browser.cjs`: desktop and 390px touch viewport; fifth roster option/default exclusion, selecting/deploying/persisting Mochi, weighted character and attached original accessories, animated light/glitter trails, actual damaging/dazing wand hit, real beam/missile/plasma/eye shielding preserving ally HP, cleanup/reset and reversion to defaults. Screenshot inspected.
- `QA/mochi-combat-browser.cjs`: 65-second natural CPU simulations in both scenes with Mochi alone. City: nine waves/nine robot dazes, three shields and 13 blocked hits. Evacuation: nine waves/seven dazes, five shields and 47 blocked hits. Also checks direct raider daze, empty evacuation army, bounded effects, reset and runtime errors.
- Existing hero power browser regression passes Volt cost/cooldown/interruption, Violet shield-powered beam, evacuation rules and reset on desktop/phone viewports. Roster, arsenal, hero economy, missile, eye and plasma unit checks pass, as does licensed asset rig/weight validation.
- Tests run in software Chromium, not on physical phone GPUs/thermal conditions.

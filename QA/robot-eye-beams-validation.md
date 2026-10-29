# Robot eye projectiles — revision 33

Added a secondary precision attack against Volt Rush in player or CPU control. It starts only in a heavy-weapon recovery window with at least 2.2 seconds left; it will not charge/fire alongside an active cannon charge/beam, plasma volley or rocket launch. Plasma → beam → pod and their existing five-second recovery remain intact.

The robot turns its torso/head toward a capped predictive aim point. Two red eye charge lights and thin sights build for 1.1s, lock the last 0.22s, then fire three paired bolts 0.22s apart. Bolts move straight at 52m/s, sweep a 0.20m radius, expire after 120m, and have a seven-second minimum cooldown after the burst. A direction change/dash after lock can evade them. No homing after launch. The pair origins come from the actual animated visor front.

Collision uses the existing world sweep plus relative segment/sphere sweeps against three points along the speedster's oriented body, including wall running and fast crossings. Nearest cover wins. Building impacts use full robot-source power 5/radius 1.1; nearby army units take power 18/radius 1.2. Speedster hits trigger sparks, a 0.32s red edge tint and diagnostics; heroes retain the prototype's existing invulnerability (no new health/death system). No hit-confirmation box was added.

All visuals are low-poly instancing: core/glow bolts, four eye charge instances and two sight instances, maximum four effect draw calls; at most 16 live bolts. No new assets, textures or per-shot lights. Death clears the attack; rebuild clears counters, lights, bolts and aim. An unselected speedster is never targeted.

## Validation

- `node QA/robot-eye-beams-test.mjs`: PASS 30/60/120Hz charge/burst/cooldown, lead/lock, phase cancellation, eye muzzle origins, moving hero sweep, cover priority, dodge, roster/death/reset and bounded instancing.
- `node QA/robot-eye-beams-browser.cjs`: PASS desktop 1280×1000 and touch 390×844. Actual robot head/visor, charging lights/sights, paired bolts, six stationary hero hits, late sideways dodge, real panel collision/full robot damage, deselection/death/rebuild, no page errors/overflow. Screenshots visually inspected.
- Natural 90-second deterministic city simulation: five bursts / 30 eye bolts / zero aborted charges. Plasma, cannon and pod each completed two turns. Robot health was raised in the fixture so the simulation could run to completion; other combat and physics ran normally.
- Regression PASS: head/telegraph, robot arsenal, building armor, speedster heading/charge/dash/collision and Solara female rig unit suites. Controls, camera-follow, and settings/aim/rescue browser suites passed desktop/portrait and applicable landscape sizes.

Chromium/SwiftShader software rendering validates behavior and layout. Physical phone FPS/thermals and subjective control comfort are not measured.

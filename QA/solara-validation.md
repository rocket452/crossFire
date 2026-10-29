# Solara Frost and three-hero roster — revision 28

Solara is a CPU defender, replacing Rift Warden in the default team alongside Volt Rush and Violet Sentinel. Heroes in the header opens the selection screen; choose exactly three of four heroes. Deploying a team restarts the encounter, persists locally, enables only its actors/effects/controls, and keeps Rift fully selectable. Cancel preserves the roster. Only Volt supports player control. The selection dialog pauses combat and restores the previous pause state on close.

## Character and travel

- Actual supplied weighted 1,256-triangle humanoid and 53 bones, with original Blender-authored 1,378-triangle elemental armor/hair across 13 articulated attachment groups (2,634 combined character triangles).
- Anatomical right / source negative X is fire; anatomical left / positive X is ice. A bind-space shader uses a hard step at X=0, including crossing torso/face triangles. Hair geometry is clipped to its own half. Right red eye and left blue eye follow the actual head bone. Original flame hair moves in the vertex shader; frozen hair stays angular.
- Bone-attached fitted molten/frost armor, asymmetric shoulders, forearm cuffs and crest. No raw licensed input is embedded in the new accessory files.
- Surf stance uses the actual weighted arms/legs/head. Gliding follows a growing 3D ice ribbon above intact roof height. Maximum 96 trailing panels plus one lead panel, 194 thin edge rails, 4.8-second trail life. Low-speed samples accumulate displacement, so the trail works at 30/60/120 Hz. Six flame wisps and bounded fire/ice particles show the two elements.
- Patrol speed cap 20 m/s, rescue approach 32 m/s. Fireballs charge 0.65 s in the actual right hand, then use 1.6 s recovery; 38 m/s projectiles deal 90 robot damage on a real hit. World/building/missile collision remains authoritative. Army units are excluded from her attack trace. Buildings retain 90% non-robot damage reduction.

## Plasma protection

- Warning forecasts identify living tanks/soldiers inside the locked blast zone. Solara casts from her ice hand and grows a canopy over 0.8 s. Up to three canopies, each 14.6×1.2×14.6 m at 5.6 m above its ground target, with frozen buttresses and roof crystals.
- Each analytic plasma substep checks its swept projectile sphere against the visible growing canopy's box. The closest building/unit/terrain or ice hit wins. Collider dimensions and broadphase radius update with growth/fade, and hit shake follows the actual visible position.
- A confirmed ice interception removes the shell/ground marker, emits ice/fire debris and records a block. It does **not** invoke the ground-damage callback or shockwave. Both army teams can benefit. Canopies track delayed launch ETAs and linger after impact; two hits crack a canopy out. Disabling/resetting removes colliders/effects immediately. Incoming shells remain dangerous without protection.
- Robot plasma→beam→pod rotation and its five-second rests are retained. Early interception naturally ends a plasma flight sooner. Violet's shield still handles the beam; Volt keeps the latest camera-follow controls; Rift retains portals when selected.

## Validation

- `hero-roster-test.mjs`: valid/default/exactly-three selection, persistence, invalid input and blocked storage fallback.
- `solara-test.mjs`: real GLBs/skin/accessories, correct hair halves; both plasma arcs intercepted at 30/60/120 Hz and 75 ms steps, zero ground-damage callbacks, tank 100 HP / soldier 35 HP retained, real fireballs hit the robot, bounded pools, nearest-cover precedence, reset/deactivation, eight-second aiming delay, exposed lethal control and collider removal mid-flight.
- `solara-browser.cjs`: desktop 1100×1000 and touch 390×844. Actual weighted bones/attachments, shader rendering, ice path, both natural plasma shots intercepted including robot aiming delay, fireballs hit robot, all roster combinations, Rift attacks/teleports, disabled Volt controls, defaults/cancel/persistence. Controlled actual rendered tank/soldier remain 100/35 HP behind ice; both fall to zero in the identical unprotected control. No page/shader errors or horizontal overflow.
- `explosive-characters-browser.cjs`: explicitly chooses the legacy Volt/Violet/Rift team and verifies its original 39 weighted actors, shared palettes, rifle grips, source movement/death, hand-attached electricity, reset and natural combat on desktop/phone.
- `runner-feel-browser.cjs`: missile assistance/manual aim, preferences and real dash rescue feedback. Its rescue fixture disables Solara to isolate dash attribution from plasma interception.
- `runner-camera-follow-browser.cjs`: keyboard/touch turn-follow, stable held movement, manual aim priority, collision and handoff.
- Existing plasma artillery, portal hero, source asset, Violet inertia/flight, runner movement/heading/dash/charge suites; JavaScript syntax and whitespace checks.

Visuals inspected at `/tmp/solara-model28.png`, `/tmp/solara-model28-phone.png`, `/tmp/solara-roster28.png`, `/tmp/solara-roster28-phone.png`. Tests use software-rendered Chromium; physical phone FPS/thermal performance has not been measured.

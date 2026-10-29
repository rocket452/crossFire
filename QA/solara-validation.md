# Solara Frost and three-hero roster — revision 31

Solara is a CPU defender, replacing Rift Warden in the default team alongside Volt Rush and Violet Sentinel. Heroes in the header opens the selection screen; choose exactly three of four heroes. Deploying a team restarts the encounter, persists locally, enables only its actors/effects/controls, and keeps Rift fully selectable. Cancel preserves the roster. Only Volt supports player control. The selection dialog pauses combat and restores the previous pause state on close.

## Character and travel

- Actual supplied weighted 1,256-triangle humanoid and 53 bones, with original Blender-authored 490-triangle elemental hair/eyes across 4 articulated head attachments (1,746 combined character triangles).
- Anatomical right / source negative X is fire; anatomical left / positive X is ice. A bind-space shader uses a hard step at X=0, including crossing torso/face triangles. Hair geometry is clipped to its own half. Right red eye and left blue eye follow the actual head bone. Original flame hair moves in the vertex shader; frozen hair stays angular.
- The body shares Volt Rush’s exact geometry, dimensions and skinning, with an independent elemental material and skeleton instance. Separate chest/hip/shoulder/cuff armor and crest have been removed. Only the elemental hair and eyes are added. No raw licensed input is embedded in the new accessory files.
- Surf stance uses the actual weighted arms/legs/head. Gliding follows a growing 3D ice ribbon above intact roof height. Maximum 96 trailing panels plus one lead panel, 194 thin edge rails, 4.8-second trail life. Low-speed samples accumulate displacement, so the trail works at 30/60/120 Hz. Six flame wisps and bounded fire/ice particles show the two elements.
- Patrol speed cap 20 m/s, rescue approach 32 m/s. Fireballs charge 0.65 s in the actual right hand, then use 1.6 s recovery; 38 m/s projectiles deal 90 robot damage on a real hit. World/building/missile collision remains authoritative. Army units are excluded from her attack trace. Buildings retain 90% non-robot damage reduction.

## Plasma protection

- Warning forecasts identify living tanks/soldiers inside the locked blast zone. Solara casts from her ice hand and grows a hollow ice dome from the ground up over 2.6 s. Up to three domes, each 16 m across and 6.4 m tall, with a glowing base ring, rising frost rim and faceted transparent shell.
- Each analytic plasma substep checks its swept projectile sphere against the formed elliptical dome surface and the growing rim. The unbuilt crown, interior and old box corners remain open. Conservative advancement uses distance to the partial curved shell with a 0.1 m ice skin. The closest building/unit/terrain or ice hit wins. Growth/fade/shake update the visible shell and collision together.
- A confirmed dome interception removes the shell/ground marker, emits ice/fire debris and records a block. It does **not** invoke the ground-damage callback or shockwave. Both army teams can benefit. Domes track delayed launch ETAs and linger after impact; two hits crack a canopy out. Disabling/resetting removes colliders/effects immediately. Incoming shells remain dangerous without protection.
- Robot plasma→beam→pod rotation and its five-second rests are retained. Early interception naturally ends a plasma flight sooner. Violet's shield still handles the beam; Volt keeps the latest camera-follow controls; Rift retains portals when selected.

## Validation

- `hero-roster-test.mjs`: valid/default/exactly-three selection, persistence, invalid input and blocked storage fallback.
- `solara-test.mjs`: real GLBs/skin/accessories, correct hair halves; both plasma arcs intercepted at 30/60/120 Hz and 75 ms steps, zero ground-damage callbacks, tank 100 HP / soldier 35 HP retained, real fireballs hit the robot, bounded pools, nearest-cover precedence, reset/deactivation, eight-second aiming delay, exposed lethal control and collider removal mid-flight.
- `solara-browser.cjs`: desktop 1100×1000 and touch 390×844. Exact geometry shared with Volt Rush, material isolation, four weighted head attachments, shader rendering, ice path, both natural plasma shots intercepted including robot aiming delay, fireballs hit robot, all roster combinations, Rift attacks/teleports, disabled Volt controls, defaults/cancel/persistence. Controlled actual rendered tank/soldier remain 100/35 HP inside the dome; both fall to zero in the identical unprotected control. No page/shader errors or horizontal overflow.
- `explosive-characters-browser.cjs`: explicitly chooses the legacy Volt/Violet/Rift team and verifies its original 39 weighted actors, shared palettes, rifle grips, source movement/death, hand-attached electricity, reset and natural combat on desktop/phone.
- `runner-feel-browser.cjs`: missile assistance/manual aim, preferences and real dash rescue feedback. Its rescue fixture disables Solara to isolate dash attribution from plasma interception.
- `runner-camera-follow-browser.cjs`: keyboard/touch turn-follow, stable held movement, manual aim priority, collision and handoff.
- Existing plasma artillery, portal hero, source asset, Violet inertia/flight, runner movement/heading/dash/charge suites; JavaScript syntax and whitespace checks.

Visuals inspected at `/tmp/solara-model28.png`, `/tmp/solara-model28-phone.png`, `/tmp/solara-roster28.png`, `/tmp/solara-roster28-phone.png`. Tests use software-rendered Chromium; physical phone FPS/thermal performance has not been measured.

Revision 29 changes only the presentation: the Speedster and Solara share the same 1,256-triangle geometry and scale, while separate materials preserve Volt’s cyan suit. Head attachments are reduced from 13 groups / 1,378 triangles to 4 groups / 490 triangles. `solara-test.mjs` verifies geometry identity, bone-name/scale parity and material isolation. `solara-browser.cjs` repeats those checks against the actual Speedster instance on desktop and phone. Her surf pose, fireballs, path, plasma protection and selection behavior are retained.

Revision 30: `QA/ice-dome-test.mjs` checks 25%/50%/100% growth, shader/rim/height parity, hollow interior/open bottom, incomplete crown, formed side walls, sphere/rim contact, rounded-corner misses, 80 dense surface-distance references, swept-contact references, shake/fade and collider removal. Browser snapshots at 0.65/1.3/2.6 s verify the actual dome on desktop and phone (`/tmp/ice-dome30-*.png`). Both natural plasma shots remain blocked and controlled tank/soldier health stays 100/35; exposed controls die.

## Uploaded female model — revision 31

The latest user request replaces the earlier shared Speedster body with the attached `female.blend`. Previous body-sharing assertions describe revisions 29–30 only. Current Solara preserves all 574 evaluated source triangles and uses a newly fitted 23-bone heat-weighted rig. None of the mesh vertices required fallback weights. Four-influence export discards at most 3.22% of a vertex's weight before renormalization. The original file has no armature and no bound animation; Solara uses a generated rest action plus the existing procedural surf/fire/ice IK. The original 490-triangle hair/eye set is fitted using per-model head offsets/scales. Total character geometry is 1,064 triangles.

- `solara-female-test.mjs`: exact source triangle count and normalized height, valid normalized weights, independent skeletons/materials, finite and bounded weighted deformation for surf/fire/ice targets at 30/60/120 Hz, feet at the requested surf stance, actual head attachments, actual hand-bound charge/fire and reset.
- `solara-test.mjs`: updated to load the uploaded female runtime. Actual fireball hits, dome interception, delayed launch, protected/exposed tank and soldier control, deactivation and bounded effects continue to pass.
- `solara-browser.cjs`: desktop and phone actual uploaded source/bone count, head fits, material isolation from Volt, dome growth, fireballs hitting the robot, protection, roster/cancel/persistence and reset.
- Original infantry/hero source-asset and character browser checks ensure the existing Unity-pack actors remain unchanged. Dome collision tests remain valid.

Runtime/private source separation: four private runtime files (the prior two Unity files plus the new female GLB/report); original upload retained outside both repositories. Screenshots `/tmp/solara-female-surf31.png`, `/tmp/solara-female-fire31.png`, `/tmp/solara-female-ice31.png` show the new source model under its live bone poses.

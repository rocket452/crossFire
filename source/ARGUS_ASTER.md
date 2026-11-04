# ARGUS / ASTER FRAME — visual revision 199

An original sleeker futuristic siege robot, distinct from Siege Walker: tapered pearl ceramic over a graphite titanium frame, teal photonic inlays, a compact sensor crown, swept-back weapon housings, reverse-knee legs and forked stabilizer feet. Amber joint targets retain the existing gameplay language.

## Assets and authoring

- `dist/city-assets/argus-aster.blend`: editable Blender rigid-part pivot hierarchy.
- `dist/city-assets/argus-aster.glb`: 15,084 triangles, 18 articulated components, 44 material surfaces; vertex-colored PBR with ceramic, metal and emissive materials. No texture downloads.
- `dist/city-assets/argus-aster.json`: hierarchy, pivots, palette and animation amplitudes.
- `source/build_argus.py`: reproducible original geometry generator. Run `blender --background --factory-startup --threads 2 --python source/build_argus.py` (Blender 4.3.2).

The GLB exports rigid component geometry; JSON defines the runtime pivots. The Blender source has the equivalent editable empty-parent rig. There are no baked animation clips or humanoid skin weights: the mechanical animation is procedural in the game. Source and model download links are available in the game menu. Assets contain no Walker geometry or licensed character-pack content.

## Runtime animation

`argus-frame.js` is independent of `SiegeWalker`. It shares pure IK/angle math from `walker-gait.js`, keeping the accepted destination-driven foot-placement controller. The legacy `.model.walker` property aliases the new frame solely for existing debris/repair callback compatibility.

Reverse-knee two-bone IK keeps planted soles on the street; swing feet pitch naturally. Waist counterrotation, contralateral arm swing and chest suspension respond to gait phase. Six telescoping hydraulic links follow actual articulated endpoints (two instanced draws). Damaged sides retain shorter strides and a visible limp. Idle breathing and damped sensor tracking add small movement without changing interception.

During lance targeting the torso smoothly swivels toward the target with a slight right-shoulder-forward stance. Side/rear targets make it turn before raising the cannon; the arm is kept in a forward cone and checked against the torso before firing. The swivel returns smoothly afterward without moving planted feet. Lance wind-up smoothly raises the arm over 1.6s while the entire cannon flashes orange at 4Hz. It holds aim until at least 2.2s and only fires when the rendered straight arm is aligned within 3 degrees of its intended target; blocked aim waits or cancels. Recovery blends back to locomotion. The hexagonal reactor shutter slides above the aperture when firing, exposing an animated energy core. The lance now reuses the Siege Walker blue-white energy effect and 10Hz building impacts; its separate visual instance preserves the arm-readiness gate. Pylon casting anticipates through the opposite arm. Stomp anticipation, foot lift/drop, landing compression, stun bracing/tremor and a staged collapse complete the animation set. Collapse produces 18 compound Cannon wrecks; rebuild restores the authored frame, materials and hydraulics.

A tiny 32px-per-face studio environment is assigned only to ARGUS materials for readable ceramic/metal highlights. Other actors and scene lighting are unchanged. Destroyed joint inlays go dark; accepted joint/core hit flashes are preserved.

## Gameplay compatibility

Existing part IDs, weak-point HP, permanent stride penalties, hull/core damage, phase logic, pylons, repairs, targeting and convoy rules remain. Closed-core hit geometry stays at its fixed aperture while the cosmetic shutter moves. Building breach bounds use the new articulated geometry. Flak muzzle offset changes from `[0,1,2.6]` to `[0,0.5,1.55]`; lance muzzle changes from `[0,-3.9,0]` to `[0,-4.02,0]`. These are geometry alignment changes; no balance values were retuned.

## Verification and limits

Run `node QA/argus-aster-test.mjs`, then the existing ARGUS body/attacks/pylons and convoy checks. With the local static server running, `node QA/argus-aster-browser.cjs` checks the real model on desktop and touch, captures walking/charge/lance/stomp/stun/wreck poses and verifies reset. `QA/argus-fixture.mjs` parses actual GLB primitives/materials rather than using the old Walker fixture. The wider Walker, Bastion, Chinook and hero regression results are recorded in `QA/argus-aster-validation-results.json`.

Manual test: open Convoy Defense, orbit ARGUS, watch foot plants and pistons while it turns, break a joint for the limp, then take Volt control and approach to provoke lance. Shoot the exposed reactor to stun it. Let it reach a bus for stomp, kill it for collapse, and rebuild. Original combat remains unchanged. Physical-phone performance is unmeasured; touch emulation verifies layout/behavior, not device FPS. This is an optimized stylized mechanical prototype rather than final cinematic art.

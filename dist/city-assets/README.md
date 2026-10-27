# Crossfire — city battle study

## What this is
A low-poly, autonomous battle observer. Two fictional armies use Blender-authored infantry, tanks, and helicopters. The battle runs autonomously, with optional first-person helicopter control. Click an aircraft or its PILOT tag to fly it and launch rockets. There are no campaign objectives or scores.

## Assets and source
- city.blend: editable Blender 4.3.2 city layout, reusable asset library, preview camera and sunlight.
- city-kit.glb: glTF 2.0 library of 14 reusable low-poly meshes, approximately 250 KB. Vertex-color PBR material; no external textures.
- city-layout.json: 16-building district layout and asset triangle counts.
- build_city.py: reproducible Blender Python generator. No Blender MCP. In the repository run `blender -b -t 4 --python source/build_city.py`. A standalone downloaded script writes to a sibling city-output directory.

Model triangle counts: tank hull + turret 948; helicopter body + rotors 556; infantry torso + legs + arms 644; façade module 60; slab 24; column 44. Building detail and troops are GPU-instanced. World dimensions are in meters.

## Runtime simulation
Three.js r170 renders the scene. Cannon-es 0.20.0 resolves actual rigid-body gravity, angular motion, contact, friction, and sleeping. The Blender file contains the modeled assets/layout; the autonomous battle and live destruction are implemented in the browser JavaScript.

2,668 separable building sections start static. Tank shells and helicopter rockets use swept segment-versus-building bounds to locate impacts. Blast damage detaches nearby sections. Losing at least two of a floor's four support columns queues that floor and everything above it for collapse. This is a simplified game support rule, not engineering structural analysis or stress-based fracture.

Detached sections use oriented box collision proxies. Gravity is 9.81 m/s²; friction 0.62; restitution 0.07; solver uses 8 iterations. Density approximations assign mass by volume. Geometry is pre-segmented; walls do not fracture at arbitrary points. Ground, intact sections, moving sections, and settled rubble collide. Glass is part of each façade section rather than individually simulated shards.

A static spatial hash narrows contact candidates; Cannon performs narrow-phase contact generation and constraint solving. Physics uses a fixed 1/60 second step with at most 4 catch-up substeps. At 2× speed or on slow devices, catch-up may not reproduce every elapsed wall-clock second.

Budget: 110 simultaneous moving debris bodies on narrow layouts; 160 on wider layouts. Further detachments wait in a queue rather than freezing airborne pieces. Sleeping/stable pieces become static colliders and remain visible. At most four sections activate per rendered frame, so large collapses are staged. Settled rubble persists until rebuild. Particles, projectiles, and tracers have bounded lifetimes; effect pools have fixed capacities.

Armies follow authored routes and target opposing-sector structures. Infantry use visual fire exchanges. This prototype does not include full tactics, troop casualties, vehicle armor penetration, aerodynamic flight, explosive fluid dynamics, or weapon-accurate ballistics. Tanks and unselected helicopters follow authored routes; a selected helicopter uses assisted kinematic hover flight. Buildings and debris use the rigid-body solver.

## Camera
Desktop: orbit drag, right-drag pan, scroll zoom; WASD move, Q/E altitude, Shift faster. Phone: one-finger orbit, pinch zoom, two-finger pan; on-screen arrows change altitude. Camera presets: district overview, street, tank follow, helicopter follow. Dragging leaves follow mode. Pause stops combat/physics while camera controls remain active. Rebuild restores all structures, debris, routes, and counters.

## Performance and testing limits
Pixel ratio reduces automatically on persistently low frame rates. These are mobile-friendly controls, not a claim of a verified FPS on a phone. Browser QA uses Chromium software WebGL; actual iOS/Android GPU, memory, and thermal testing is still required. Very large collapses can lower frame rate or delay queued fracture activation.

## Licenses
Three.js and Cannon-es are MIT licensed; license text is in vendor/. Fonts come from Google Fonts, with system fallbacks. The character/city geometry was authored here with Blender Python rather than downloaded asset packs.

## Infantry revision 2
The live scene now uses soldier-parts.glb + soldier-motion.json rather than the original block infantry in city-kit.glb. The original kit retains its first-pass infantry proxies for compatibility; its 644-triangle figure above refers to those proxies only.

Updated soldier: **2,288 triangles**, **17-bone Blender armature**, **one vertex-color PBR material**, **16 rigid-skinned segments**. Geometry includes a shaped helmet, goggles, ear protection, chin strap, tapered uniform, plate carrier, three magazine pouches, webbing, backpack, antenna, thigh pouches, elbow/knee protection, gloves, boot soles, and a rifle with stock, receiver, magazine, handguard, optic, barrel and muzzle.

Files:
- soldier.blend: editable geometry, armature, eight authored actions, studio camera and lights.
- soldier.glb: single skinned mesh, one material, 17 joints and eight animation clips.
- soldier-parts.glb: the same geometry split by deforming bone for runtime crowd instancing.
- soldier-motion.json: 30 fps Blender animation palettes and asset statistics.
- build_soldier.py: reproducible Blender Python generator.
- soldier-preview.png: Blender beauty render.

Clips: Idle (2 s), Walk (1 s), Run (0.7 s), Aim (2 s), Fire (0.4 s), CrouchFire (0.4 s), CrouchAim (2 s), Reload (2.2 s). Loop endpoints match. Two-bone limb solving preserves knee/elbow articulation and keeps hands coordinated with the rifle. Walk is calibrated to 1.05 m/s; run to 2.3 m/s, adjusted for each soldier's scale. On planted walk frames, ankle drift is below 5 mm in the exported motion check.

Squads alternate between moving bounds, standing aim, crouched aim, burst fire and reload. Timing and scale vary between soldiers. Tracer and flash origins follow the animated weapon muzzle. Crossfades interpolate translations and quaternions. No additional gameplay objectives or player weapons were added.

The browser shares 16 instanced mesh batches per division (32 base crowd draws total, plus applicable shadow passes). It applies baked rigid-bone transforms rather than reskinning every vertex on the CPU. The entire 36-soldier crowd contains 82,368 triangles. This is a deliberate increase over the block placeholders while remaining low polygon.

The soldier uses rigid segmented skinning, not continuous organic deformation, finger articulation, facial animation, or a validated Unity Humanoid avatar. Unity requires a suitable glTF importer; Blender and other glTF engines can import the animated GLB directly. The separate editable Blender source is included for further rigging work. Actual phone GPU/thermal measurements remain unverified.


## First-person helicopter pilot mode
Click/tap an actual helicopter or its PILOT tag. All four aircraft can be selected. Manual control replaces only that aircraft’s automatic flight and firing. Other units continue the battle. Exit cockpit, Escape, an observer preset, or Rebuild releases control; the aircraft returns smoothly to its patrol.

Desktop: W/S forward/back, A/D strafe, Q/E or left/right arrows turn, R/F climb/descend, up/down arrows or drag to aim, Shift faster, Space/left click/FIRE launches. Phone: movement joystick, altitude buttons, and hold FIRE to launch repeatedly; dragging FIRE also changes aim. Dragging the view changes aim without firing. Fullscreen remains optional. Entering pilot mode resumes the simulation at 1×; pause freezes aircraft and weapons.

A 304-triangle Blender-authored interior (cockpit.glb, cockpit.blend, build_cockpit.py) attaches to the first-person camera. The selected exterior is hidden from that camera view to avoid canopy occlusion. HUD shows altitude, horizontal airspeed, heading, clearance warnings, and rocket cooldown. Rockets alternate between two launch points, aim at the crosshair’s building/ground intersection, travel through the existing swept collision path, and trigger the same damage/support/debris system. They are unguided after launch; no lock-on is simulated.

Assisted-flight scope: acceleration and damping, automatic hover on input release, horizontal translation independent of aiming, vertical movement, yaw and a clamped aim pitch. Speeds approximately 14 m/s forward, 10 m/s lateral, 7 m/s vertical, with a Shift multiplier. A 1.2 m expanded-box clearance proxy checks intact and detached building sections; it does not model the full rotor disc, tail, crash damage, rotor aerodynamics, or rigid-body flight. Flight is bounded to the district and 1.3–72 m altitude. This is a playable helicopter prototype, not a flight simulator. Real mobile performance and device input compatibility still require hardware testing.

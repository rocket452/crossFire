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

2,668 separable building sections start static. Tank shells and helicopter rockets use swept, radius-expanded oriented-box queries against building sections and unit collision proxies to locate impacts. Blast damage detaches nearby sections. Losing at least two of a floor's four support columns queues that floor and everything above it for collapse. This is a simplified game support rule, not engineering structural analysis or stress-based fracture.

Detached sections use oriented box collision proxies. Gravity is 9.81 m/s²; friction 0.62; restitution 0.07; solver uses 8 iterations. Density approximations assign mass by volume. Geometry is pre-segmented; walls do not fracture at arbitrary points. Ground, intact sections, moving sections, and settled rubble collide. Glass is part of each façade section rather than individually simulated shards.

A static spatial hash narrows contact candidates; Cannon performs narrow-phase contact generation and constraint solving. Physics uses a fixed 1/60 second step with at most 4 catch-up substeps. At 2× speed or on slow devices, catch-up may not reproduce every elapsed wall-clock second.

Budget: 110 simultaneous moving debris bodies on narrow layouts; 160 on wider layouts. Further detachments wait in a queue rather than freezing airborne pieces. Sleeping/stable pieces become static colliders and remain visible. At most four normal queued sections activate per rendered frame, so large collapses are staged. Direct player hits use reserved capacity immediately. Settled rubble persists until rebuild. Particles, projectiles, and tracers have bounded lifetimes; effect pools have fixed capacities.

Armies follow authored routes and target opposing-sector structures. Infantry use visual fire exchanges. This prototype does not include full tactics, physical armor penetration, aerodynamic flight, explosive fluid dynamics, or weapon-accurate ballistics. Infantry tracer fire remains visual; shells and rockets now apply direct and area damage to units. Tanks and unselected helicopters follow authored routes; a selected helicopter uses assisted kinematic hover flight. Buildings and debris use the rigid-body solver.

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


## Missile impact correction
The reticle and projectile sweeps now share one collision query. It includes intact sections (even when queued for collapse), falling and settled rubble using current body position/orientation, tanks, helicopters, infantry, and terrain. Missile volume is included in the sweep; exact endpoint contacts and start-inside contacts count. Moving unit centers are interpolated across the simulation step to reduce tunneling. The firing unit is excluded, as is cockpit display geometry. A wall in front of a unit blocks the shot. Rockets travel at 55 m/s and expire after 6 seconds, beyond the 220 m aim-query range. These are gameplay values, not real weapon specifications.

Direct player structural hits detach the struck section immediately using reserved capacity; settled rubble can be reactivated, and moving debris receives the blast impulse. The active-debris budget still applies. The cockpit displays reticle target/range and target durability. The transient hit-confirmation box has been removed. Oversized smoke puffs were reduced so they do not hide the damage.

Units have simple game durability: tanks 100, helicopters 90, infantry 35. A direct rocket deals 68, with distance-based area damage to nearby units. Disabled tanks stop moving/firing and become smoking wrecks. Disabled helicopters stop AI movement/firing and fall as Cannon rigid bodies. Infantry stop moving/firing and use a non-graphic knockdown pose. Disabled aircraft cannot be selected for piloting. The actively piloted aircraft is excluded from blast damage in this prototype. Rebuild restores every unit, normal materials, all durability, the city, and player hit counters. No scores, objectives, armor penetration, full ragdolls, or aircraft breakup are modeled.


## Visible building damage correction
AI collapse debris can no longer occupy the entire player damage budget. Of the existing 110/160 moving-section slots, 20/28 are reserved for directly struck player sections. These hits are processed immediately, including pieces already in the collapse queue. Adjacent blast damage and unsupported floors continue through the normal staged queue; the total moving-section cap is unchanged. Airborne debris is not frozen to make room.

Detached collision proxies are inset by 3% so broken panels can separate from tightly touching neighboring sections. Mesh geometry is unchanged. Rebuild restores the original collision dimensions and structure.

Quick touch taps fire once on release. On a held touch trigger, the first launch briefly waits for aim input; drag-to-aim therefore has a chance to update before the first shot. Holding continues normal repeat fire. Desktop keyboard/mouse triggering is unchanged. The confirmation popup and its reticle flash were removed.

Validation now includes the actual rendered instance transform: a cockpit-fired missile displaced a previously intact roof slab and façade panel by more than 0.8 m, matched by the physical body position, with before/after screenshot review showing a hole. This is stronger than checking only the hit counter.

## Siege Walker — giant robot encounter

Blender-authored 21 m robot: `siege-walker.blend`, `siege-walker.glb`,
`siege-walker.json` and reproducible `build_robot.py` (run Blender in background).
3,068 triangles, 16 rigid articulated mesh components, vertex colors, no image
textures. Runtime articulation in `siege-walker.js`: slow stride, tracking head,
shoulder aiming, cannon fire, damage flash, critical reactor smoke, buckling and
16 independently falling Cannon rigid-body wreck components. This is procedural
animation, not a skinned FBX animation library.

Both divisions now share the robot as their target. All eight tanks, four AI
helicopters, and 36 riflemen use actual swept/segment collision against robot
components and city cover. Rifle fire deals 2.2 damage; shell direct hits 80;
rocket direct hits 68. Shared robot armor starts at 12,000. The robot fires a
24-damage cannon round every 2.6 s after aligning; splash falls off with distance.
AI army fire cannot damage allied units. Manually piloted rockets retain damage
to all enemy/scene targets; the occupied helicopter remains protected as before.
Once armor is depleted, allied AI hold fire while the robot breaks apart. Rebuild
restores armor, units, geometry, rigid bodies and combat counters. The dedicated
Siege Walker view opens by default and follows the robot along the open avenue.
A fixed armor bar replaces no existing controls; the removed hit popup stays absent.

Browser QA uses software WebGL; actual phone GPU, thermal behavior and frame
rate remain device-dependent. The new model adds 16 draws, no texture memory and
approximately 297 KB of GLB data. Wreck components add at most 16 physics bodies.

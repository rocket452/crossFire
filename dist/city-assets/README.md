# Crossfire — city battle study

## What this is
A low-poly, autonomous battle observer. Two fictional armies use Blender-authored infantry, tanks, and helicopters. The camera is the only user-controlled object. There are no player weapons, objectives, scores, or campaign mechanics.

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

Armies follow authored routes and target opposing-sector structures. Infantry use visual fire exchanges. This prototype does not include full tactics, troop casualties, vehicle armor penetration, aerodynamic flight, explosive fluid dynamics, or weapon-accurate ballistics. Tank and helicopter movement is animated; buildings and debris use the rigid-body solver.

## Camera
Desktop: orbit drag, right-drag pan, scroll zoom; WASD move, Q/E altitude, Shift faster. Phone: one-finger orbit, pinch zoom, two-finger pan; on-screen arrows change altitude. Camera presets: district overview, street, tank follow, helicopter follow. Dragging leaves follow mode. Pause stops combat/physics while camera controls remain active. Rebuild restores all structures, debris, routes, and counters.

## Performance and testing limits
Pixel ratio reduces automatically on persistently low frame rates. These are mobile-friendly controls, not a claim of a verified FPS on a phone. Browser QA uses Chromium software WebGL; actual iOS/Android GPU, memory, and thermal testing is still required. Very large collapses can lower frame rate or delay queued fracture activation.

## Licenses
Three.js and Cannon-es are MIT licensed; license text is in vendor/. Fonts come from Google Fonts, with system fallbacks. The character/city geometry was authored here with Blender Python rather than downloaded asset packs.

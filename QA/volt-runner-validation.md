# Volt Rush + translucent robot telegraph — 2026-10-28

Blender-created 1,760-triangle, 13-part original hero, native .blend / GLB / metadata
and source generator included. New third-person control mode, held electricity,
cyan speed trails, wall/roof movement, sloped terrain/debris support and touch HUD.

## Passing checks

`node QA/runner-motion-test.mjs`: acceleration to >40 m/s, release braking,
substepped facade capture, actual climb, roof crest, gravity after support moves,
terrain following, ballistic jump/landing, sloped settled debris support and fall
when it becomes dynamic. Added Cannon terrain pyramid also catches real debris.

Existing hero-defense, energy-beam, head/telegraph, walker, player-building damage
checks pass. `git diff --check` passes. New model uses the established rigid-part
Blender pipeline with no image textures.

`node QA/runner-browser.cjs`, Chromium software WebGL:

- Real Play button enters exclusive runner mode; helicopter remains inactive.
- Mouse aiming + actual F input applied 180 electricity damage to the robot over
  1.2 s (15 damage ticks). Rendered branching electricity was reviewed.
- Real mouse turn + W/Shift ran into an existing city facade. Runner reached
  y=5.92 m with a wall normal of +X and 64 active electrical trail segments in
  that run. Continued input crested onto the roof at >10 m. Reviewed wall camera.
- Pause freezes state; exit and rebuild restore ground mode, counters and VFX.
- Warning materials verified line opacity <=0.40 and fan <=0.04. Reviewed the
  less opaque warning and the final shorter, thinner sprint trail.
- 390px phone: entry, BOOST toggle, actual CDP joystick drag producing >5 m
  travel, electrical trail, FIRE tap, exit/reset and helicopter entry/exit pass.
  No horizontal overflow, browser page errors or shader errors.

Speedster movement is kinematic surface traversal with gravity and static-box
collision, not a general capsule rigid-body controller. It follows static city
sections and settled rubble; moving debris is not rideable. Hero health and
vehicle/body collision are not modeled. The two outer hill patches are static
and have matching convex rigid-body collision. Actual device GPU/thermal FPS is
unverified. The test simulation advances actual app modules through a test-only
intercepted response, with continuous software rendering suspended while paused.

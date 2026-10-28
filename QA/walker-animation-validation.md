# Walker walking animation — 2026-10-28

Replaced independent sine-wave legs with alternating world-space foot plants and
an analytic hip/knee/ankle solve. Existing Blender meshes and rigid joint pivots
are reused: 3,068 triangles / 16 components, no new textures or render batches.

- 3.2 s full gait, 1.0 s swing per foot, double-support intervals.
- 0.8 m swing lift; heel strike / toe push-off, sole held above the road.
- Pelvis weight shift, body landing compression, counter-motion through chest
  and head, and left-arm follow-through. Footfall dust reuses the particle pool.
- Lower body turns gradually while the upper body tracks targets independently.
- Reset restores planted anchors; death blends from the current walk pose.

`node QA/walker-gait-test.mjs` loads the actual GLB vertex positions and runs the
actual Three.js robot rig through 60 s of translation and repeated target turns:

- Worst rendered ankle target error below 1 mm (numeric noise).
- Minimum rendered foot vertex height 0.12 m; road surface 0.08 m.
- 4,118 tested consecutive flat-support frames with < 1 mm movement; at least one
  supporting foot at all times; 37 footfalls in 60 s.
- No large frame discontinuities; repeatable support/IK at 30, 60 and 120 steps/s.
- Death begins at the walking pose and reset reproduces initial foot targets.

Local Chromium software-WebGL preview: inspected swing apex and landing frames,
confirmed alternating steps and footfalls, pause freezes the gait, no page errors.
Initial concurrent screenshot QA exceeded the software-renderer timeout; reran
battle QA serially with screenshots disabled (pose screenshots were already
reviewed). Test interception suspends continuous rendering while paused, without
changing the production animation loop or exposing a production mutation API.

Full battle regression (`SKIP_SCREENSHOTS=1 node QA/robot-battle-browser.cjs`):
army shell / helicopter rocket / rifle hits, robot return fire, manual helicopter
rocket hit, natural robot defeat, 16 falling rendered wrecks, allied ceasefire,
full rebuild and touch pilot controls. Actual phone GPU performance is unverified.

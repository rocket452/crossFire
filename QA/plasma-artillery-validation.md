# Shoulder plasma artillery — validation 2026-10-28

- Blender 4.3.2 directly rebuilt `siege-walker.blend`, GLB, metadata and source
  copy. Actual GLB geometry: 4,452 triangles, 18 rigid parts; `plasma_cannon`
  right / `rocket_pod` left. Character remains below the 5,000-triangle budget.
- `node QA/plasma-artillery-test.mjs`: passed exact 45° launch angle and
  analytical landings at multiple ranges; fixed 7 m warning areas and timed
  impact at 30/60/120 Hz and 75 ms frames; actual tank/soldier blast damage;
  arc-cover rejection and live early interception; bounded resources; pending
  cancellation vs airborne continuation on death; reset disposal; portal
  prediction and safe exits; CPU approach and whole-group radial dash; a
  100-second non-overlapping plasma/beam/pod rotation.
- `node QA/plasma-artillery-browser.cjs`: passed the real scene at 1100×1000
  desktop and 390×844 touch layouts. Each natural first volley fired and
  impacted twice, with 88 detached city sections. Rift Warden evacuated two
  tanks and four soldiers through actual portals at unchanged health, to
  positions 23.1–34.7 m from the threatened center. Markers never drifted;
  the cannon held 45° while the robot walked. No overlapping weapons through
  29 simulated seconds, including actual beam and rocket-pod turns.
- In the isolated real-plasma CPU test, Volt Rush waited near a tank/rifleman,
  then dashed them 10 m clear of a live marked blast. They remained at 100/35
  health. With hero rescues disabled, that same blast reduced the tank to
  about 19.6 health and killed the soldier. Actual transforms and hit shapes
  drove damage; this was not a visual-only rescue.
- Verified pause, three-weapon coordination, 18 physical robot wrecks, full
  reset, touch camera selection, no horizontal page overflow, and no page or
  shader errors. Warnings/countdown text remain visible behind buildings.
- Inspected `/tmp/plasma-arc.png` and `/tmp/plasma-arc-phone.png` from the final
  browser pass, plus `/tmp/plasma-model.png` for the Blender-built cannon.
  Physical phone FPS and thermal performance have not been measured.
- Existing node checks passed: `runner-dash-test.mjs`, `portal-hero-test.mjs`,
  `robot-arsenal-test.mjs`, `robot-combat-test.mjs`. Historical robot browser
  assertions now use the new part/triangle/wreck counts.

## Forward mount and five-second weapon changes

- Plasma cannon horizontal direction now matches the torso’s forward axis;
  it retains 45° world elevation. Body/waist/head turn toward the pending
  plasma aim point. Actual launch waits for barrel alignment within 0.012 rad,
  keeping the shot from emerging sideways. Fixed ground markers remain locked.
- `RobotArsenal` now rests five simulation seconds at all three transitions,
  after the preceding shells/missiles clear. Next weapon charge/warning follows
  the rest. Diagnostics expose the next phase, remaining delay and transition
  timestamps; the robot readout displays the countdown.
- Node artillery/arsenal suites passed at 30/60/120 Hz and long frames, checking
  exact five-second rest/ready timestamps and the repeated three-weapon order.
- Updated actual-scene browser checks cover desktop and touch layouts, forward
  error below 0.0001°, launch mismatch below 0.7°, unchanged 45° elevation,
  five-second transitions within one 60 Hz frame, and no active attacks during
  rest. Real plasma, beam and pod turns are verified through 38 simulated seconds.
- Portal evacuations, CPU rescue dash, unrescued blast damage, physical robot
  wrecks and reset remain covered. Screenshots:
  `/tmp/forward-plasma-arc.png`, `/tmp/forward-plasma-arc-phone.png`.

# Head tracking and beam telegraph — 2026-10-28

- Added smooth chest-relative neck yaw/pitch tracking for intended ground and
  aerial targets. Neck speed limit 2.5 rad/s, yaw +/-1.15 rad and pitch
  -0.65..+0.90 rad. Target is locked for charge and follows the beam's sweep.
- Added a charge-only red aim line, translucent sweep corridor, width-padded
  outer rails, animated direction arrows and a target marker. It renders through
  cover and extends to range/ground because the beam may destroy intervening walls.
- Shared aim math supplies fired sweep and forecast rays. The forecast is updated
  live as the walking robot moves; it does not promise a frozen seven-second
  prediction of the future muzzle location.

Passing checks:

`node QA/head-telegraph-test.mjs`: actual GLB joint transforms; left/right, ground
and helicopter-height gaze within 2.5 degrees after settling; correct pitch sign,
neck motion limits; preview starts at the rendered cannon muzzle within 1 mm and
matches barrel direction; target and sweep lock; zero warning damage; aerial
range; red geometry endpoints and contact-radius padding; lifecycle cleanup.

`node QA/walker-gait-test.mjs` and `node QA/energy-beam-test.mjs`: planted gait,
30/60/120 Hz behavior, seven-second integrated damage, cover, protected pilot,
reserved player debris slots and reset remain passing. Diff whitespace check.

`node QA/energy-beam-browser.cjs`: reviewed red charge preview in robot and
390px phone views, plus overview. At 6.5 s the charging head tracked the intended
point with 1.17 degree world-space error, all three preview rays were present,
and beam damage ticks were zero. Warning disappeared on firing; seven-second
burst still completed 70 ticks, destroyed a tank and detached visible building
sections. Pause, reset and destruction cleanup passed with no shader/page errors.

Software WebGL preview; actual phone GPU performance is unverified. The warning
uses bounded simple geometry and adds no textures or post-processing passes.

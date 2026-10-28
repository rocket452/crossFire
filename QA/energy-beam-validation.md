# Charged energy cannon — 2026-10-28

## Changes

3.2 s energy charge, seven-second sustained burst, 7.5 s cooling. Layered white /
cyan / blue beam, radial glow, electrical arcs, collecting motes, spinning rings,
traveling plasma rings, impact flares, local lighting, scorched rigid sections.
The actual cannon axis is aimed from its shoulder, correcting the previous
approximate launch direction. The lower-body planted walking rig is retained.

## Checks

- `node QA/energy-beam-test.mjs`: charge deals zero damage, exactly seven seconds
  of integrated damage at 30 / 60 / 120 Hz and 150 ms steps; stop cancels future
  damage. Solid cover protects targets until detached; sustained damage disables
  units; protected pilot and half of the reserved player debris capacity survive.
- Existing walking IK, player building damage, city physics and collision tests
  pass. JS syntax / diff whitespace checks pass.
- `node QA/energy-beam-browser.cjs`: actual charge visible at 6.5 sim seconds,
  firing at 7.5 s; paused clock and damage stay frozen. Complete seven-second
  first burst generated 70 damage ticks, hit 17 building sections, dealt 100
  applied tank health and disabled it. Other AI weapons continued attacking.
- Observed a directly beam-hit building section move 3.71 m on screen. GPU
  instance position matched the Cannon body within 1 mm. The beam was not
  considered verified from counters alone.
- Visible energy buildup and sustained beam were reviewed in robot, overview and
  390 px phone captures. The first-target selection was revised after observing
  the original target hide the muzzle behind a foreground building.
- Reset clears the beam, lights, armor/damage state and counters. Defeating the
  robot through its normal damage callback immediately hides the beam; physical
  robot destruction still completes. No shader compilation or browser errors.
- Phone layout has no horizontal overflow; touch Rebuild clears the active beam.
- Full combat regression additionally checks manually piloted missile damage,
  army combat, destruction, ceasefire, complete reset and touch pilot controls.
  The test allows the stronger robot to win a natural battle and uses the normal
  damage callback to exercise its defeat lifecycle.

Software WebGL was used for browser QA; actual phone GPU / thermal performance
is unverified. Effects use bounded geometry, pooled particles, a generated 64px
halo texture and two unshadowed lights, without a fullscreen bloom pass.

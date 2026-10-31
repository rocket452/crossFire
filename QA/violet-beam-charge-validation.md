# Violet sustained beam charge-up — revision 90

`VIOLET_BEAM.chargeDuration=2` adds an explicit charge phase before the existing four-second, 420 DPS beam. Only absorbed shield damage fills the 1,200-point capacitor. Starting consumes it once; charge time does not reduce beam duration or deal damage. A frame crossing the charge boundary applies only its remaining firing time. The HUD displays the charge countdown.

Violet stays stationary, leans back slightly, bends his knees and elbows, gathers both hands and gradually extends toward release. The actual weighted arms use the existing hand IK; the glow/core follows the midpoint of the actual rigged hands. The existing beam effect supplies a growing purple orb/halo, three rotating rings, 56 inward-flowing motes and five converging force arcs (90 line vertices) during buildup. The firing beam appears only after two seconds. No extra textures, unbounded particles, dependencies or character assets were added.

Normal shots, missile-defense shots and shielding remain excluded while charging/firing. A boss beam targeting Violet still cancels the cast and raises his barrier; target death, deselection and rebuild clear it too. Cancellation retains the existing consumed-energy behavior.

Verification passed:

- `QA/hero-powers-test.mjs`: barrier-only resource, threshold/cap/consume, no damage time before two seconds, complete four-second firing time at 30/60/120Hz and 75ms steps, boundary-crossing time slices, cancellation/reset, unchanged Volt stun/arsenal interruption behavior. Its obsolete 25-point normal-attack assertion now reads the existing speedster tuning (17.5); no speedster balance changed.
- `QA/violet-beam-charge-test.mjs`: actual hero controller at those timesteps; anchored position/zero velocity, animated casting arms, no early beam/damage or new orb/shield, full 1,680 total damage, one firing event, and self-defense/target-death/deselection/reset cancellation.
- `QA/violet-beam-charge-browser.cjs`: Chromium desktop and phone emulation; actual BeamCombat barrier contacts provide 1,200 energy, real weighted arm/hand animation and finite bone matrices, hand-attached growing core, bounded charge geometry, no damage at 1.9s, beam activation at 2s, full stationary 4s/1,680 damage, countdown HUD, and cancellation paths. No page/console errors or horizontal overflow. Reviewed `/tmp/violet-charge90-desktop.png`, `/tmp/violet-charge90-phone.png` and `/tmp/violet-beam90-desktop.png`.
- Existing Violet inertia, flight-pose and hero-defense node suites pass. Updated the older hero-powers browser fixture to include charge time; the entire historical browser suite was not rerun.
- Syntax checks and `git diff --check` pass. Physical-device FPS/thermal performance was not measured.

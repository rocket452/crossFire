# Boosted airborne wall-run validation — revision 71

The assisted catch is player-only, requires a real swept collision with an intact building wall, boost, meaningful inward input and at least 3 m/s inward velocity. Ground and unboosted grabbing retain the normal intent gate. Following a catch, minimum upward climb and same-building torso contact make angled impacts and facade seams more forgiving. Jump, pull-away, idle expiry, missing support and a real roof crest still release the grip.

## Deterministic collision checks

`node QA/runner-air-wall-test.mjs` passes at 30/60/120 Hz and 75 ms frames:

- First-frame boosted catches on four cardinal/rotated wall orientations, forward/strafe input and rising/falling motion.
- A 75° oblique approach catches and gains useful height; an 85° near-parallel brush does not.
- Actual upper-body contact maintains grip when feet start below a panel seam.
- Jump and pull-away win immediately, with no immediate jump regrab; no-input grip expires.
- Dynamic destroyed walls release support; loose debris does not receive the assisted catch.
- A real roof crests cleanly, and reset clears assisted grip/counters.

Existing `runner-motion-test.mjs`, `runner-collision-control-test.mjs`, `runner-forgiveness-test.mjs` and `runner-dash-test.mjs` pass. These cover facade-to-roof movement, lost support, slopes/rubble, thin-wall collision, ground glances, overlap escape, ceilings, corners, coyote/buffered jumps, bounded ledge catches, and electric rescue-wave movement.

## Actual gameplay checks

`node QA/runner-air-wall-browser.cjs` uses installed Chromium with the existing weighted character, intact city B11 facade and actual browser keyboard/touch events. Rendering is paused between controlled 60 Hz simulation steps; no production QA hooks are added.

Passed on 1100×1000 desktop and emulated 390×844 phone:

- Shift+W / BOOST+forward stick catches a falling airborne character immediately.
- Shift+D / BOOST+sideways stick catches even while the camera faces along the facade.
- A real Space / JUMP running leap from the street catches the facade in the air.
- The segmented wall remains climbable to its actual rooftop.
- Climbing earns charge, plays the weighted Run clip and keeps camera up upright.
- Sustained primary lightning still fires during the wall run without an attack cooldown.
- A real jump input releases grip and does not immediately relatch.
- No page or console errors.

Screenshots: `/tmp/sticky-wall71-desktop.png`, `/tmp/sticky-wall71-phone.png`. Phone checks emulate touch input; physical-device frame rate and thermal performance were not measured. Syntax checks for changed runtime modules and `git diff --check` pass.

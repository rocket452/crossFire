# Volt upper-body look validation — revision 75

Player lower-body orientation now follows actual travel while firing as well as running. A separate, smoothed additive layer turns the supplied weighted spine/neck/head toward the view. It uses support-space yaw and bounded twists, restores the underlying animation each update, and precedes the existing arm IK. Legacy pose/accessory nodes receive the corresponding turn. No geometry, animation assets or other hero rigs are changed.

## Weighted rig checks

`node QA/runner-look-pose-test.mjs` passes at 30/60/120 Hz against the actual licensed 1,256-triangle, 53-bone character:

- Left/right/forward/rearward views produce the expected world-space upper-spine rotation despite imported bone axes.
- Pelvis, thighs and calves retain their authored Run transforms and world positions.
- Twist and skinned bounds remain finite and limited at ±90° and ±180°.
- Smooth onset, 300-frame non-accumulation, rear-angle side stability, neutral CPU fade and reset.
- Wall frames and looking parallel to support-up do not create invalid rotations.

`explosive-asset-test.mjs` passes existing mesh/weights, all 17 motions, bounded deformation and independent poses. `runner-heading-test.mjs` passes existing heading/reference behavior.

## Actual gameplay

`node QA/runner-look-pose-browser.cjs` passes at 1100×1000 desktop and emulated 390×844 phone using actual keyboard/touch input, Pointer Lock on desktop, the city and real weighted character. Both sideways running directions are checked with and without firing. The upper body visibly follows look while the lower body follows travel; the Run clip and leg motion continue. Sustained lightning starts at the actual right hand with bounded arm reach. Camera up remains upright. Idle settles to neutral; exiting returns to CPU and fades the overlay. No page errors.

Inspected screenshots `/tmp/torso75-desktop-right.png` and `/tmp/torso75-phone-right.png`; matching `-left.png` captures both sides.

`runner-air-wall-browser.cjs` passes again on desktop/phone, including real facade seams, leap and strafe grabs, roof transitions, weighted animation, charge gain and firing while wall-running. `device-controls-browser.cjs` passes existing Pointer Lock, movement, primary fire, E dash, settings, release/resume and touch controls on four layouts. Changed JS syntax and `git diff --check` pass.

Physical handset performance was not measured. The torso deliberately caps at 85° and the head adds at most 25° rather than twisting the spine through a full backward turn. This is a look animation; it does not change camera aim, collisions or attack targeting.

# Kage ground dash — revision 97

Kage can launch his existing dash from the ground with E/right-click on desktop or DASH on touch devices. Ground launches use the horizontal direction toward the reticle; air launches retain full 3D aiming. Both share the existing 24m range, 64.4m/s speed, 320 damage, six-second cooldown and immediate kill/interception reset.

Ground dashes retain the shared swept character controller's floor/roof support, terrain following, steps, wall collision and map bounds. Movement and attack sweeps run in bounded substeps no longer than 8ms. Lower attack probes clear walkable surfaces, avoiding an immediate hit against the street. Landing on the ground finishes without an upward kick or slow-fall animation. Leaving an actual roof edge applies gravity; finishing in the air retains the existing two-second slow-fall opportunity. Enemy collision uses the existing dash-hit damage path, exactly once.

The touch button is enabled on ground when the shared cooldown is ready. HUD, button label, accessibility text, key reminder and guide now describe ground/air dashing. The existing weighted dash pose, blade, particles, trail, hit effects and camera remain in use. This does not add a separate ability, resource or cooldown. CPU target-selection policy is retained.

Validation:

- `node QA/ninja-ground-dash-test.mjs`: 30/60/120Hz and 75ms frames; exact flat-ground travel, no hop/hover, repeat-input rejection, cooldown/re-arm, supported roofs, roof-edge gravity, terrain ascent/descent, wall/bounds stop, physical swept drone kill, one damage event and immediate ground-chain reset.
- `node QA/ninja-motion-test.mjs` and `node QA/ninja-jump-feel-test.mjs`: existing lower jump, double/wall jumps, rooftop landings, air steering/inertia, ledge/input forgiveness, airborne dash distance, slow fall and kill reset pass.
- `node QA/ninja-browser.cjs`: desktop keyboard and emulated phone touch exercise the real DASH/E control while grounded, cooldown blocking, 24m street travel without hopping, actual drone kill/reset with the ground dash, plus the existing air-dash missile chains, shuriken hand origins, high/double/wall jumps, weighted deformation, CPU and combat checks. Ground-dash screenshots: `/tmp/kage97-ground-desktop.png` and `/tmp/kage97-ground-phone.png`.

Browser QA uses Chromium software WebGL with emulated touch input. Physical-phone performance is not measured.

## Revision 104 — double dash speed and distance

Ground and airborne dashes now use `NINJA.dashSpeed=128.8` m/s and `dashRange=48` m. Both doubled, so unobstructed duration remains about 0.373s. Damage (320), cooldown (6s), kill resets and airborne slow fall (2s) stay unchanged. Ground substeps are additionally bounded to 0.5m of travel to preserve terrain/step handling at the higher speed.

The motion and ground-dash suites pass at 30/60/120Hz and 75ms frames with the new exact 48m range, terrain, wall/roof/bounds behavior and swept kill resets. Browser fixtures use the open evacuation approach for the longer ground dash and expect a full 48m aerial dash. The long-roof and hill fixtures were resized/repositioned so they still test supported travel and sample the hill crest rather than accidentally testing a newly out-of-range roof or aliasing past the crest.

`ninja-browser.cjs` passes actual desktop and emulated phone controls, 48m ground/air travel at the new speed, drone kill/reset, missile interception chains, shuriken hits and CPU behavior.

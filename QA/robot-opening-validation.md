# Robot opening sequence — revision 42

Initial load and every city rebuild start a dedicated five-second startup phase. The first beam begins its existing 3.2-second charge only after startup ends; its seven-second firing duration is unchanged. The repeating heavy-weapon order is beam → missile pod → plasma artillery. Existing two-second pod warning, projectile clearance and five-second weapon-change recovery remain intact. Eye bolts require recovery phase, so they cannot start during the opening grace period.

The robot status displays the remaining opening delay. The countdown uses simulation time: pause freezes it and simulation speed scales it. Heroes, armies and movement remain active during startup. Rebuild cancels active projectiles and restarts the full delay.

Validation:

- `robot-arsenal-test.mjs`: startup gating and reset at 30/60/120Hz and 75ms steps; existing warning timing, recovery gaps and mutual exclusion pass.
- `plasma-artillery-test.mjs`: 100-second real-weapon simulation starts beam/pod/plasma and repeats correctly; no heavy-weapon overlap, with five-second recovery at each transition. Existing ballistics, blast, rescue and reset checks pass.
- `robot-eye-beams-test.mjs`: existing timing, gating, hit/cover, death/reset and bounds pass.
- `robot-opening-browser.cjs`: desktop 1100×1000 and touch 390×844 pass 90 seconds of actual city combat with durable robot health for observation. First completed beam at 15.2s, missile salvo at 22.22s, plasma turn at 33.67s; the next cycle repeats. Initial load, rebuild during combat, repeated rebuild, quiet first 4.95s, startup countdown, real beam fire after startup, eye suppression, heavy-weapon exclusion and five-second transition gaps pass with no page/shader errors or horizontal overflow.

Software Chromium validation does not measure physical phone FPS or thermals.

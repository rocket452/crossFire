# Instant moving lightning — revision 63

The primary attack has no wind-up. `RunnerCharge` retains its existing public name for controller/tool compatibility, but now transitions directly from idle to firing and spends charge immediately. The obsolete charging pose and HUD wording were removed. A quick mouse click, F press or touch FIRE queues a complete burst. Movement runs independently of primary firing; the existing weighted run/strafe animation continues while arm IK aims the beam.

## Preserved tuning

- Stored energy: 100 maximum, earned from actual surface movement; primary costs 25 immediately. An empty meter cannot fire.
- Beam duration: 0.4 seconds. Recovery after the beam: 1.5 seconds. Held-fire start interval: 1.9 seconds.
- Damage: existing 150/second, sampled every 0.08 seconds, five samples / 60 total damage per full burst.
- Existing weak-point routing, mobile aim preferences, CPU recharge behavior, overload stun and electric rescue wave are retained. The wave cannot fire during transit.

## Verification

Local Chromium/Playwright with the real private weighted character assets, desktop 1100×1000 and touch 390×844. Browser tests intercept only to expose deterministic simulation stepping and fixtures; input uses actual mouse/keyboard/CDP multitouch events and the existing gameplay controller, collision and damage paths.

- `node QA/instant-lightning-browser.cjs`: first 120 Hz update already shows the beam and pays 25, with no charging effect. Mouse/F/touch taps each produce a complete shot. Held fire and repeated clicks respect recovery; no unsolicited repeats after release. The beam damages the actual Siege Walker. Empty charge blocks firing.
- Moving-shot comparison with the same street and forward input: identical distance with/without firing (within 0.15 m tolerance), 14.0 m/s running and 46.0 m/s boosting. Steering continues during the beam. Actual weighted thigh rotations change while firing, and run/strafe clips remain active. Desktop and simultaneous touch move/FIRE/scene-aim pass. Five damage samples and 60 damage per full beam in both modes.
- `node QA/device-controls-browser.cjs`: desktop/narrow desktop and phone/tablet input layouts, mouse capture, held/click primary, simultaneous touch movement/fire, device switching and input cleanup pass.
- `node QA/runner-left-controls-browser.cjs`: phone 390×844, narrow phone 320×740, landscape 844×390 and desktop. Control placement, movement/fire/aim together, ability inputs, cancellation/blur/exit and keyboard controls pass. Dash and primary are tested separately because wave transit deliberately suppresses firing.
- `node QA/runner-energy-browser.cjs`: desktop and phone empty gating, real run/wall gain, full meter, no idle drain, immediate spending, four paid shots per full bar, jump/free dash, handoff, CPU running recharge and reset pass. CPU earns ~292 charge, spends 275 and deals 600 robot damage in the 45-second fixture.
- `node QA/runner-charge-test.mjs`: exact first-update firing, finite burst and recovery at 30/60/120 Hz and 75 ms frames; held/spammed input, cancellation/reset, no wind-up FX and bounded trail fade pass.
- `node QA/runner-energy-test.mjs`: frame-rate-independent earning, immediate payment, four bursts/100 charge, no teleport/fall/dash farming and reset pass.
- `node QA/weak-points-browser.cjs`: desktop and phone three instant shots destroy an articulated core without damaging main health; final-core hold/AI protection, all four heavy-weapon interrupts, exact 1152 burst, five-second stun, regeneration and repeated cycles/death/reset pass.
- `node QA/runner-dash-test.mjs`: electric wave pickup/phase/reform, safe landing, obstacles, rubble, roofs, immunity, CPU rescue and reset pass.

Screenshots were visually reviewed at `/tmp/instant-lightning63-desktop.png` and `/tmp/instant-lightning63-phone.png`. Both show the real running hero emitting lightning with a live speed/resource HUD. No browser runtime/shader errors or horizontal overflow occurred in the completed input suites. Physical phone performance/thermal behavior was not measured.

## Files

Runtime: `dist/runner-charge.js`, `dist/speedster.js`, `dist/battle.js` (cache version), `dist/index.html` (cache version/help/accessibility wording).

Documentation: `source/CONTROLS.md`, this report.

QA: new `instant-lightning-browser.cjs`; `runner-charge-browser.cjs` now invokes that suite; updated cadence/energy/input/weak-point fixtures in `runner-charge-test.mjs`, `runner-energy-test.mjs`, `runner-energy-browser.cjs`, `device-controls-browser.cjs`, `runner-left-controls-browser.cjs`, `weak-points-browser.cjs`. The weak-point held-primary fixture now lasts 4.2 seconds for three instant shots instead of the former 5.75-second charged cadence.

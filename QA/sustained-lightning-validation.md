# Sustained player lightning — revision 67

Manual primary starts immediately and continues while FIRE/left-click/F is held and stored charge remains. Drain is 25 charge/second, damage remains 150/second. Any positive reserve can fire: no 25-charge entry fee or 1.5-second shot cooldown. A full stationary bar lasts four seconds; real surface movement offsets the drain. Release stops the beam; after exhaustion, release/re-press rearms it without a timer. Input release is handled immediately, including when release and the next press occur between simulation updates. A quick tap buffers a paid 80ms hit rather than being missed between frames.

`RunnerBeam` implements the manual lifecycle; `RunnerEnergy.drainBeam` accounts for partial reserve/time without overdraw. Player damage is delivered each update, including the first; CPU retains its prior batched burst cadence, energy gate/cost and recovery. Building impact power now scales with firing duration, preserving rate-independent damage and the existing non-robot protection. HUD/help show sustained drain and exhaustion feedback. Controls, weighted movement/aiming, overload and electric wave remain integrated.

## Passed checks

- `node QA/runner-beam-test.mjs`: 30/60/120 Hz and 75ms frames. Exact four-second full-bar duration / 100 drain, first-frame fire, no gaps, partial reserve, stop/re-press, exhaustion/rearm, long-frame overdraw protection, approximately 12 seconds with steady boost recharge, reset.
- `node QA/sustained-lightning-browser.cjs` (also the instant-lightning entry point): actual desktop 1100×1000 and phone 390×844 inputs with real weighted models and game damage/collision routing. 480 consecutive 120Hz firing frames, 600 direct damage, exactly 100 charge spent and clean stop at exhaustion. An 80ms tap deals 12 damage for 2 charge; a one-charge reserve deals 6 damage over 40ms. Release/re-press has no recovery delay. Empty held input does not flicker-fire newly earned energy; a fresh press works with less than 25 charge.
- Same gameplay suite: unchanged 14 m/s run and 46 m/s boost, weighted legs keep animating, mobile movement/FIRE/scene drag and desktop LMB/RMB aiming work together, no gap at former burst boundary. E/DASH prevents firing during electric-wave transit; blur stops drain/effects. Keyboard F holds for a continuous two seconds and can restart immediately.
- Same suite: real wall-panel impact over 200ms removes 3 HP at each of 30/60/120 Hz, retaining existing building protection. No frame-rate damage multiplier.
- `node QA/device-controls-browser.cjs`: desktop/narrow desktop and phone/tablet; new sustain drain, E dash/cooldown, right-drag/release, both mouse chord orders, off-canvas look, free cursor, pause/blur/exit, mobile multitouch/device switching and pilot reminders.
- `node QA/runner-energy-browser.cjs`: real running/wall earning, full/empty meter, no idle loss, sustained spending, handoff, free jump/dash and reset. Autonomous Volt retains its 45-second baseline: ~292 earned, 275 spent in 11 bursts, 600 robot damage in both viewport fixtures.
- `node QA/weak-points-browser.cjs`: desktop/mobile real held primary tracks an articulated core and destroys it in 1.2 seconds with one beam activation, without damaging main health. Final-core hold/AI protection, all weapon interrupts, 8% burst, five-second stun and repeated cycles/death/reset pass.
- Existing `runner-charge-test.mjs` and `runner-energy-test.mjs` pass for unchanged autonomous burst/resource behavior. Syntax and Git whitespace checks pass.

Browser suites use deterministic simulation stepping and actual mouse/keyboard/CDP multitouch; instrumentation is injected only by QA interception and is absent from runtime files. No browser runtime/shader errors or horizontal overflow. Moving beam/HUD screenshots were visually reviewed at `/tmp/sustained67-desktop.png` and `/tmp/sustained67-phone.png`. Physical phone FPS/thermal behavior was not measured.

## Modified files

Runtime: `dist/runner-beam.js` (new), `dist/runner-energy.js`, `dist/speedster.js`, `dist/battle.js`, `dist/index.html`. Documentation: `source/CONTROLS.md`, this report. QA: `runner-beam-test.mjs`, `sustained-lightning-browser.cjs`, `instant-lightning-browser.cjs`, `device-controls-browser.cjs`, `runner-energy-browser.cjs`, `weak-points-browser.cjs`.

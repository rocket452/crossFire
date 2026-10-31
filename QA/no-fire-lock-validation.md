# No primary rearm lock — revision 68

The manual sustained beam already had zero timed cooldown, but exhausting the bar latched it off until trigger release. That latch and its input/HUD/help wiring are removed. FIRE, left-click or F can remain held: the beam resumes on the first update that has any positive charge, including charge just earned by actual running. No minimum reserve, timer or required release is involved. Resource drain, proportional damage, normal release-to-stop, the paid quick-tap buffer and E/dash/right-drag controls are unchanged. Special ability cooldowns and autonomous behavior are outside this manual-primary change.

A running player at zero reserve can spend new movement income immediately. Actual damage/beam time still derives strictly from energy consumed; held fire cannot create free full-strength damage. Ready sounds are suppressed while held fire immediately drains new charge, preventing a chime every frame.

Passed:

- `node QA/runner-beam-test.mjs`: at 30/60/120Hz and 75ms frames, a held empty trigger starts on the first recharge update without release, including a fractional reserve. Four-second full-bar duration, damage/energy conservation during continued running after depletion, zero cooldown, release/re-press and long-frame/reset behavior.
- `node QA/sustained-lightning-browser.cjs`: real desktop mouse/keyboard and phone touch. Empty a full bar while held, continue holding, then start running with actual W/joystick input: beam resumes immediately and spends only earned charge. No repeat ready chimes. Also passes unbroken 4s/600 damage, partial reserve/taps, run/boost/weighted animation, right-drag aiming, E/DASH interruption, blur, and equal real building damage at 30/60/120Hz.
- `node QA/device-controls-browser.cjs`: desktop/narrow desktop and phone/tablet; independent LMB/RMB press/release, right-drag stop/off-canvas handling, E cooldown, WASD/Space, pause/blur/exit, touch move/fire/look and device switching.
- Syntax/whitespace checks pass. No browser runtime/shader errors or horizontal overflow. Physical device performance was not measured.

Runtime files: `dist/runner-beam.js`, `dist/speedster.js`, `dist/battle.js`/`dist/index.html` (cache/help). Documentation: `source/CONTROLS.md`, this report. Updated regression suites: `QA/runner-beam-test.mjs`, `QA/sustained-lightning-browser.cjs`. Revision 67's exhaustion/rearm descriptions are superseded by this behavior.

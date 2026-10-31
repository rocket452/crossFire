# Desktop E dash / right-drag camera — revision 66

Volt Rush uses E for the electric rescue wave on desktop. Right-click no longer activates dash. Holding right-click and dragging changes yaw/pitch; release stops mouse rotation. Left-click fires the existing instant burst and leaves the cursor unlocked. Holding both buttons permits firing and aiming simultaneously in either press/release order. Automatic camera follow yields while the right-button look gesture is active. Touch scene drag, movement stick, FIRE and DASH retain their existing behavior.

The controller uses mouse button events to handle chords because Pointer Events send down/up only for the first/last pressed mouse button. Window move/up handlers and canvas pointer capture keep right drags working off the canvas. A tested browser capture-loss edge case when lifting one button preserves look while RMB remains held. Blur, pointer cancellation, input-device switch, menus and exit clear held state and release capture. No mouse lock is requested.

Runtime changes: `dist/speedster.js`; `dist/battle.js`/`dist/index.html` cache versions and desktop reminders/field guide. Current bindings are documented in `source/CONTROLS.md`.

Passed:

- `node QA/device-controls-browser.cjs`: desktop 1100×1000 and narrow desktop 390×844, real mouse/keyboard input. Free cursor and left drag do not turn the view. Right drag changes yaw/pitch without firing, spending charge or dashing; release stops rotation. Both mouse-button orders work, with independent release. Off-canvas dragging/release, E dash and cooldown, WASD/Space, quick/held primary, pause/blur/exit and unchanged helicopter reminders pass.
- Same suite, phone 390×844 and tablet 1180×900: multitouch move/fire, scene drag without attacks, correct control layout and keyboard/touch switching pass.
- `node QA/instant-lightning-browser.cjs`: desktop RMB aiming while holding LMB and moving/boosting, weighted run animations, unchanged movement speed, instant paid shot, real boss damage and cooldown all pass. Mobile firing/movement/scene-aim also passes.
- `node QA/runner-wave-browser.cjs`: actual desktop E and mobile DASH transform the hero and nearby/en-route soldiers/tanks/civilians, preserve phase protection, safe reformation and collision history, support twelve civilians, cancel/reset, zero-charge use and buffered landing.
- `node QA/runner-dash-test.mjs`, `node QA/runner-heading-test.mjs`: existing frame-rate/collision/carry and camera-follow/manual-priority checks pass.
- JavaScript syntax and Git whitespace checks pass. No browser runtime/shader errors or horizontal overflow in the completed suites.

Desktop screenshot visually reviewed at `/tmp/controls66-desktop.png`; new E / RMB reminders are visible. Phone/tablet use emulated touch input, not physical-device performance measurements. Test interception/instrumentation exists only in QA files.

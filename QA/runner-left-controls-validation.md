# Speedster controls — revision 32

The right look stick and its input state were removed. MOVE remains at the lower left. BOOST, JUMP, DASH and FIRE form a left-side 2×2 cluster; each action target is 52×52 CSS pixels. Portrait puts the cluster above MOVE, short landscape puts it alongside MOVE. Automatic camera follow and direct scene/FIRE dragging still aim normally. Keyboard/mouse controls remain available.

Passed `runner-left-controls-browser.cjs` in Chromium at 390×844, 320×740, fullscreen 844×390 and desktop 1100×1000: no right-stick nodes/state, all controls contained on left, no overlap, simultaneous movement/FIRE/abilities, separate scene drag, four directions, cancellation/blur/handoff. `twin-stick-browser.cjs` now forwards to this suite.

Passed `runner-control-browser.cjs` on desktop and portrait: actual segmented-wall climb, immediate back-off, jump separation, grazing slide, settled-panel escape, upright camera and collision during mixed movement. Touch fixtures wait for browser-delivered stick values before deterministic stepping and use independent contacts for scene/ability input.

Camera-follow and movement/charge/dash regressions are covered by the existing suites. Software Chromium emulates touch input; physical phone performance and comfort are not measured here.

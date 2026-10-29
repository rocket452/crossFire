# Speedster camera follows running turns — revision 27

Player movement now smoothly turns the view toward the character's running heading. Follow starts above 2 m/s with movement input on the ground, uses exponential response 6/s, and caps rotation at 180°/s. The camera remains upright and keeps its existing geometry/terrain obstruction checks.

A separate movement reference prevents automatic camera rotation from repeatedly rotating the movement vector: holding a left/right direction still runs straight while the camera catches up. A new deliberate input direction (>0.12 radians / 6.9 degrees) or a fresh movement gesture uses the current view. Smaller analog noise does not rebase the reference. Manual yaw input rotates the reference too.

Look stick, mouse drag and fire-drag take priority, including a 0.65-second grace after manual look. Charging, firing and held attack input suspend automatic follow. Airborne movement, wall running, rescue dashes, stopped movement and UI dialogs preserve their existing camera behavior. CPU behavior and the purple hero's flight pose are unchanged. Enter/exit/reset/blur clear follow state.

Passed:

- `node QA/runner-heading-test.mjs`: real RunnerMotion at 30/60/120 Hz; held lateral input stays straight, camera aligns within 0.01 radians after two seconds, bounded turn rate, new input reference, thumb noise, manual look/fire priority, wall/air/stopped stability and shortest angle across ±π.
- `node QA/runner-camera-follow-browser.cjs`: actual keyboard/mouse and CDP multi-touch, desktop 1100×1000 and phone 390×844. Both left/right turns move >18 m in 1.5 seconds with <0.05 m cross-track drift and camera horizontal direction >0.98 aligned to travel. Checks stop stability, manual look/grace, charge-and-strafe aim, obstruction, upright view, CPU handoff and clean reset.
- `node QA/runner-control-browser.cjs`: desktop/phone deliberate facade capture, tangent sliding, back and jump departure, overlap recovery, stable wall view, mixed steering and camera outside geometry.
- `node QA/twin-stick-browser.cjs`: phone, narrow phone, landscape and desktop; real simultaneous move/look/fire/abilities, directional movement, settings-independent turn timing, pointer release/cancel/blur and layout.
- `node QA/runner-feel-browser.cjs`: desktop/phone/landscape aim assistance, manual aim, sensitivity/persistence and actual rescue-dash feedback.
- `node QA/runner-dash-browser.cjs`: actual desktop/phone carry and ability integration.
- Motion, jump forgiveness, dash, charge, aim/rescue and CPU animation/navigation unit suites; syntax and whitespace checks.

Inspected phone render `/tmp/runner-camera-follow27-phone.png`; desktop counterpart `/tmp/runner-camera-follow27.png`. Browser tests use software rendering and do not measure physical phone FPS or subjective comfort.

# Desktop mouse lock — revision 73

Entering Volt control from a desktop Play button requests browser Pointer Lock on the game canvas. Relative `movementX/Y` drives the existing sensitivity-scaled yaw/pitch with no held mouse button. The cursor can turn continuously at screen edges; the camera does not automatically recenter during locked desktop strafing. Right-click has no hero-camera/ability binding. Observer and helicopter controls are unchanged.

Left-click/F remains the sustained primary, E the rescue wave, Space jump, Shift boost and Q stun. Escape unlocks and clears held controls; another Escape exits the hero. Tab opens the settings panel and unlocks; closing settings requests capture again. An unlocked prompt or canvas click captures without also firing. Gameplay keyboard input is suspended while the desktop cursor is free. Lock denial/unsupported capture displays a retry prompt and handles promise/event failures. Blur, hidden tabs, exit, hero settings and touch switching clean up capture/input. A late successful lock after exit or switching to touch is immediately released.

## Browser verification

`node QA/device-controls-browser.cjs` passes on 1100×1000 and 390×844 desktop, plus emulated 390×844 phone and 1180×900 tablet. It uses actual trusted Play/canvas clicks, real browser Pointer Lock, Playwright mouse movement, keyboard events and CDP touch contacts. Only simulation stepping/rendering is controlled by a test-local intercepted module; no production testing hooks are added.

Desktop checks:

- Play acquires real Pointer Lock; touch controls are hidden and reminders show MOUSE LOOK instead of RMB.
- Unheld mouse movement changes yaw/pitch by the reported relative deltas; repeated movement across viewport edges continues to turn.
- WASD movement, jumping, independent strafing/camera direction, looking while moving/firing and left/right button chords work.
- Right-click alone does not look, shoot, dash or change input mode. Right-drag while unlocked cannot turn the view or recapture.
- Quick primary taps pay 80 ms of charge; a 3.3-second held beam drains 82.5 charge, continuously fires and has no cooldown.
- E dashes and its cooldown remain intact.
- Tab releases held fire/movement, opens usable settings, and closing settings recaptures.
- Escape releases; resuming captures without an accidental shot; a second Escape exits the hero.
- Blur clears held controls and unlocks. A rejected capture promise shows a retry button and recovers on a subsequent real capture.
- Paused input cannot turn/fire/dash. Exit releases capture; cockpit reminders retain their desktop layout.

Touch checks: no lock request or desktop prompt; simultaneous move/fire, scene-drag aiming and keyboard/touch switching remain functional. No page errors or horizontal overflow in any layout.

`node QA/runner-air-wall-browser.cjs` passes again on desktop and phone: instant wall catches at eight actual facade seam heights, running leaps, strafing catches, charge gain, weighted animation, firing while wall-running, jump release and roof transitions.

Changed runtime syntax and `git diff --check` pass. Screenshots: `/tmp/controls73-desktop.png`, `/tmp/controls73-narrow-desktop.png`, `/tmp/controls73-phone.png`, `/tmp/controls73-tablet.png`.

Limit: browser capture requires a secure context and user gesture, and an embedding parent must permit Pointer Lock. Denial is handled visibly; no right-drag fallback is installed. Phone tests emulate touch rather than measuring a physical handset.

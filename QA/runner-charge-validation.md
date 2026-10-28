# Volt Rush charge animation and longer dash streak

- Shared RunnerCharge requires 0.5 s before a continuous activation can fire. Only the part of a frame after the boundary contributes to existing 0.08 s damage ticks; no early visual beam or damage. Keyboard release cancels incomplete charge. Tap FIRE queues charge plus a short pulse; held input sustains firing.
- Arm pull-back/extension, opposite-arm gathering pose, growing palm core/halo, two spinning rings, spiral forearm arcs, light buildup and charge-percent HUD work for player and CPU. Takeover/exit, blur and reset clear partial charge and effects; pause freezes progress.
- Dash trails use 0.72/0.62 s lifetimes, connected emission positions, wider cores and slower visual fade. Straight 46 m/s sprint retains about 34.5 m of movement history. Existing 350 stored segments / 500 rendered instances per pool remain bounded.

Passed:

- `runner-charge-test.mjs`: exact 0.5 s wind-up and partial-frame damage at 30/60/120 Hz and 75 ms frames; cancellation/reset, attached charge effects, >25 m real dash path, instance bounds, fade and cleanup.
- `runner-charge-browser.cjs`: actual desktop keyboard/mouse aiming, no damage through 0.483 s, charging animation then real robot damage (36 at 0.8 s); release cancellation; measured live dash extent 34.49 m; facade climb/roof crest, pause/exit/reset; CPU rooftop damage (252) and six missile interceptions; phone joystick/boost/charge/tap-to-fire and helicopter switching; no page/shader/overflow errors.
- Existing runner motion/animation/CPU, alternating arsenal and Violet inertia/shield-lockout module checks pass. Original manual browser expectations updated for the new charge delay.
- Screenshots inspected: `/tmp/runner-charge.png`, `/tmp/runner-charge-phone.png`, `/tmp/runner-long-trail.png`.

Software WebGL validates behavior/rendering; physical phone FPS and thermal performance are unmeasured.

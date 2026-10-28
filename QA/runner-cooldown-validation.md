# Speedster firing cadence

- Existing 0.5 s charge is followed by at most 0.4 s of lightning, then a mandatory 1.5 s cooldown before charging again. Held fire produces full bursts 2.4 s apart.
- Releasing a firing burst early also starts recovery. Cancelling an unfinished charge is allowed. Rapid taps, target changes, blur and player/CPU handoffs preserve cooldown; Rebuild resets it. Player HUD shows RECHARGING with remaining seconds.
- Existing charge animation, damage rate while firing, dash trail, motion and CPU behavior use the same shared weapon clock.

Passed validation:

- `runner-charge-test.mjs`: exact integration of charge/burst/cooldown at 30/60/120 Hz and 75 ms frames; held input, spam, early release, cancellation/handoff recovery, reset and existing trail/VFX bounds.
- `runner-cooldown-browser.cjs`: real keyboard/mouse aim and held fire produce starts at 0.50 and 2.90 s, 60 damage per full burst; rapid keys do no extra damage during cooldown, switching control retains remaining recovery. CPU rooftop attack deals 120 damage and obeys the same cadence. Pause/reset and recharge feedback verified.
- Phone layout 390×844 uses real touch taps, including repeated FIRE presses during recovery; tick count does not increase during lockout. No page/layout errors.
- Existing robot arsenal/beam sequencing and runner movement tests pass.
- Screenshots `/tmp/runner-recharging.png` and `/tmp/runner-recharging-phone.png`.

Browser checks use software WebGL, not a physical phone FPS benchmark.

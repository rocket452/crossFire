# Violet Sentinel movement and combat tuning

- Persistent velocity replaces fixed-speed position steps. Normal acceleration/braking are capped at 14/12 m/s², rescue at 32/26 m/s². Arrival steering slows near goals; reversals preserve momentum. Patrol/rescue/pursuit speed targets are 12/40/24 m/s.
- Regular charge/cooldown: 2.4/5.4 s, giving approximately 7.8 s between shots. Interception charge/cooldown: 1.0/1.4 s, giving approximately 2.4 s between shots. Shared cooldown prevents bypassing recovery by switching targets.
- Shielding clears partial charges and prevents both charging and new launches, including barrier fade. A 1.4 s recovery follows shield duty. Existing flying orbs remain valid.

Checks passed:

- `violet-inertia-test.mjs`: actual bounded acceleration, coasting/reversal and stable stopping at 30/60/120 Hz; slower launch intervals for both attack types; centralized shield launch guard, charge cancellation, fade lockout, post-shield recovery and reset.
- Regular fixture launch times: 3.50, 11.32, 19.13 s. Interception fixture spacing: approximately 2.38–2.40 s with fixed-step boundary rounding.
- `violet-inertia-browser.cjs`: 1100×1000 desktop and 390×844 touch layout. Actual initial acceleration, visible functional barrier, no charge or launch throughout shielding, subsequent delayed robot attack, pause/reset and no page/shader/layout errors.
- Live encounter: shots at 3.50 and 18.08 s; no launches during the intervening shield rescue. Barrier absorbed 2,100 damage and Volt intercepted six missiles.
- Existing actual-asset hero/barrier and energy beam module tests passed; asset test observation window extended to accommodate slower shots.
- Screenshots `/tmp/violet-shield-lockout.png` and `/tmp/violet-shield-lockout-phone.png`.

Browser QA uses software WebGL; physical phone performance is unmeasured.

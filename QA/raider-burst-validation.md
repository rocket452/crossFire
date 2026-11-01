# Three-robot burst wave — revision 92

`ESCORT_APPROACH.squadSize=3` restores one row at X=-4/0/4, Z=102. Each unit retains 1,000 HP; squad totals derive to 3,000. The second civilian wave still spawns the squad once at 30 seconds, with normal movement toward the landing zone.

`RAIDER_COMBAT.burstSize=3` and `burstInterval=0.5` fire three real projectiles per burst. The original aligned one-second windup precedes it; the original 2.5-second recovery starts after the last round. Every shot uses the current barrel position/aim and existing collision, 36m/s speed, 1.32m radius, damage, portal and energy-effect paths. Cover/range/aim loss, target changes, stun, death and reset cancel pending rounds. Already launched projectiles continue. Warning rings and targeted-civilian dots cover the gaps between burst shots.

Validation passed:

- `QA/raider-burst-test.mjs`: two complete bursts at 30/60/120Hz and irregular 75ms. Half-second intervals within one frame, correct recovery after the last shot, unique real projectiles and fresh tracking; cover/range/target-switch/stun/death/reset cancellation; airborne projectiles persist after stun.
- `QA/raider-burst-browser.cjs`: desktop and phone emulation. Natural 30-second second-wave spawn creates exactly three units in their lanes. All three fire nine actual rounds with exact 0.5s spacing at 60Hz, hitting the real player proxy. In a separate fixed-position shield fixture Violet intercepts nine rounds for 126 absorbed damage. Stun cancels the remaining two rounds after a first shot. Rebuild clears bolts, pending shots, counters and pooled effects and retains the 30-second civilian schedule. No page/console errors. Screenshots `/tmp/raider-burst92-desktop.png` and `/tmp/raider-burst92-phone.png`; desktop view reviewed.
- Existing raider hero aiming/physical impacts, enlarged-shot travel/low-target hits, single-raider lifecycle, squad/effect cleanup and civilian danger tests pass. Updated current squad QA expectations from seven to three.
- Syntax checks and `git diff --check` pass. The full historical browser suites were not rerun; physical-phone FPS/thermal performance was not measured.

## Revision 106 — double rate and projectile speed

Small robots now use 72m/s projectiles (previously 36), 0.25s burst intervals (previously 0.5), 0.5s windup (previously 1) and 1.25s recovery (previously 2.5). This halves the full sustained three-shot cycle from 4.5s to 2.25s; spawn arrival grace is unchanged. Burst size, damage, radius, acquisition/firing ranges and projectile lifetime remain unchanged. Shared tuning applies to escort and Combat Testing drones, with existing swept collision, projectile silhouettes, effects and hero threat predictions using the live shot speed.

The burst and hero-aim tests pass across 30/60/120Hz and 75ms frames, checking the 2.25s cycle, 0.25s spacing, 72m/s physical travel, target hits and cancellation. `combat-testing-browser.cjs` passes desktop/touch, selected enemies returning real fire, player hits, reset, all hero choices and preserved original missions. The escort burst browser's observation windows were shortened to isolate one burst with the new faster cycle rather than accidentally sampling a second burst.

`raider-burst-browser.cjs` also passes desktop and phone: exactly nine physical shots from the three escort drones at 0.25s spacing, 72m/s shots, player hits, Violet shield interception, stun cancellation and reset.

## Mixed four-shot bursts — revision 112 (current)

Basic tracked robots in both escort and Combat Testing now fire exactly four shots per completed burst: two `direct`, two `lead`, shuffled with Fisher–Yates for every burst (all six valid orders). Each round refreshes its aim; direct rounds use the current upper-body point, while predictive rounds solve projectile interception using recent smoothed target movement and the actual 72m/s bolt speed. Lead caps: 1 second / 24 metres, tracked speed 65m/s; abrupt teleport samples reset the motion estimate. Stationary targets naturally produce the same aim point for both modes.

The normal .25s spacing, .5s opening windup, 1.25s recovery, 14 damage and 1.32m bolt radius are retained. Turning keeps its 120°/s cap: switching aim mode can delay a shot until the barrel aligns, rather than snapping or cancelling the burst. Cover, range, target changes, stuns, death and reset still cancel pending shots. Moving targets can dodge by changing direction after discharge; projectiles remain non-homing.

Experimental Aegis retains its original three direct shots; Scythe and Breaker specials are unchanged. Shared base diagnostics expose shot mode counts, current/last burst order, target velocity and latest aim point.

Checks: updated burst tests at 30/60/120Hz and 75ms steps cover two complete four-shot bursts, exact 2+2 counts, direct/intercept geometry, visible barrel alignment, all six randomized orders, teleport/retarget/reset and cancellation. The escort browser suite checks three robots / twelve real rounds, live player hits, Violet barrier interception, manual keyboard/touch strafing against direct/lead rounds, and reset. Existing hero-aim, experimental mechanics and Combat Testing browser checks remain relevant.

## Half-speed basic projectiles — revision 115 (current)

Basic tracked-robot projectile speed is now 36m/s, down from 72m/s. The four-shot randomized direct/direct/lead/lead pattern, timing, damage and radius remain unchanged. Intercept calculations use each robot's actual shot speed; if a faster target has no exact intercept solution, leading rounds retain a bounded estimated-flight-time lead instead of collapsing to direct aim. Existing one-second / 24m prediction caps remain. Aegis explicitly retains 72m/s ordinary bolts, and Breaker retains its 22m/s cannon balls.

Updated burst/hero-aim checks verify 36m/s travel and intercept timing at several frame rates. Existing experimental mechanics checks pass. A direct calculation check confirms forward leading remains finite and bounded against a 46m/s target. The escort browser suite checks twelve real 36m/s shots, barriers, manual keyboard/touch movement and the exact two-direct/two-lead mix; its shield sample allows the extra flight time.

# Civilian minimap attack warnings — revision 83

Civilian group dots now alternate red/yellow every 0.55 seconds while threatened by a current enemy attack. The existing small four-unit SVG circle is unchanged. Targeting any member marks its whole current evacuation cohort; spatially merged markers preserve the warning if any included cohort is threatened. Safe dots remain yellow. Titles and the minimap's accessible description identify the warning. Reduced-motion users receive a steady red dot.

`dist/civilian-targeting.js` reads existing beam charge/fire targets, live missile locks/impact points, plasma warning/flight landing zones, and drone windups/projectiles. It neither selects targets nor advances gameplay. Stunned/destroyed beam weapons, intercepted missiles, cancelled/finished plasma, redirected/passed drone shots and dead/evacuated civilians do not leave stale warnings. Civilian rescues use the current cohort and position, including escape from a marked artillery zone. Already-fired threats remain active independently of their shooter.

Verification:

- `node QA/civilian-targeting-test.mjs`: beam phase/stun/destruction, live/lost/redirected/intercepted missile locks, aerial vs ground targets, artillery flight and escape, drone windup/live/expired/passed/redirected shots, current rescue groups, death/phasing, cluster flag propagation, and 100 read-only snapshots.
- `node QA/hero-minimap-test.mjs`: existing camera projection, edge clamping and group clustering pass.
- `node QA/civilian-warning-browser.cjs`: desktop and emulated phone. Real BeamCycle charge/fire, real RobotMissiles launch/interception, real plasma markers and portal civilian relocation, and drone attack data drive the displayed warning. Native CSS computed fill alternates between red and yellow while the safe group stays yellow. Whole twelve-person group, unchanged radius/no text/arrows, rim positioning, camera rotation, reduced motion, warning clearing, city rebuild, read-only state, no overflow or page errors all pass.

Captured `/tmp/civilian-warning83-desktop.png` and `/tmp/civilian-warning83-phone.png`. Screenshots may show either phase of the native animation; both colors are checked across a full cycle. No spawning intervals, movement, combat timing, damage, hero abilities or WebGL render assets change. Physical-phone FPS/thermals were not measured.

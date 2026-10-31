# Civilian plasma leading and minimap crosshairs — revision 91

Escort plasma volleys prefer visible civilian cohorts, with existing hero/eligible-helicopter selection as fallback. Each cohort supplies one candidate; at most two separated groups are targeted in a volley. A read-only forecast follows its current street waypoints through corners, waits at queue goals, handles escape routes and stops at blocked streets or paused dash-carried groups. It does not advance civilian movement or change the 30-second subway cadence.

The artillery solves for expected arrival using warning delay, the gun's current body-turn time and the existing 45-degree shell flight. `PLASMA.leadIterations=10` bounds the solver; `maxLeadSeconds=24` bounds its horizon. `WALKER_TURN_SPEED` exposes the existing unchanged 0.34 rad/s turn rate for the estimate. Each marked aim point remains fixed after creation, so hero rescues and route changes can cause a miss. Unexpected extra alignment delays or subsequent navigation/boarding changes can also affect accuracy. Existing City battle targets remain static and keep their original targeting behavior.

Every active warning/flying shell supplies its actual ground target to the existing rotating minimap. A dark-outlined red crosshair identifies the point, with ETA in its accessible title. It follows redirected shell targets and clears on impact, interception, interruption or reset through the existing shell lifecycle. Civilian dots also flash when their predicted route intersects the marked danger; a rescue onto a safe route clears that forecast warning. Existing area-based warnings remain intact.

Validation passed:

- `QA/plasma-civilian-lead-test.mjs`: 30/60/120Hz and irregular 75ms. Route-corner forecasts, immutable movement state, blocked/paused/queued/escaping groups, one target per cohort, two distinct cohort targets, fixed warnings, included alignment delay and hero-relocation counterplay. Uninterrupted moving groups reach the marked zone within 0.7m in the fixture; real blast damage registers civilian loss and clears the shot.
- `QA/plasma-lead-minimap-browser.cjs`: desktop and touch-phone emulation. Uses the real Walker/muzzle, live evacuation cohort, ballistic projectile, minimap and collision/damage pipeline. The shot marks (0, 33.593) ahead of a cohort at (0, 60), then physically hits that group at approximately (0.099, 32.777). Matching red SVG crosshair/ETA, camera rotation, read-only display, warning-to-flight persistence, impact/interruption/reset cleanup, initial 12-person/30-second spawn state and unchanged original City battle targeting pass. No page/console errors or horizontal overflow.
- Reviewed `/tmp/plasma-crosshair91-desktop.png`, `/tmp/plasma-lead91-desktop.png` and corresponding phone screenshots.
- Existing plasma ballistics/cover/barrier/arsenal tests, minimap projection/clustering, civilian danger detection, evacuation navigation/lifecycle/target policy, and Walker gait suites pass. Syntax and `git diff --check` pass.

The browser fixture isolates one unopposed artillery encounter; the entire historical browser suite was not rerun. Physical-phone performance was not measured.

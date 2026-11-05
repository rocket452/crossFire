# Civilian evacuation — open lane revision 208

This changes only the Chinook / Civilian evacuation scene. The single eastern corner subway is at `(48,48)`; the helicopter landing zone is directly west at `(-48,48)`. The remaining entrance spawns twelve civilians every thirty simulation seconds, following a five-second opening warning. Civilians use the existing street graph, formations, rescue relocation, boarding, passenger accounting and helicopter lifecycle. The route is 96m across the positive-Z outer street, with no intervening turns or buildings.

The evacuation-facing half's buildings are removed from this scene so the Siege Walker at the centre has clear lines of sight toward the full civilian lane. Six buildings remain behind the robot, respecting the earlier B06/B07 removal. Other scenes retain their own layouts. The one subway and moved pad appear on the existing minimap. The outer Bruiser road and three-unit squad are aligned to the moved Chinook's x coordinate; the original extended boulevard, spawn timing and count remain.

## Per-wave attacks

Every newly spawned wave gets an unfulfilled attack request, identified independently of its moving/teleported cohort. The oldest visible unfulfilled wave takes priority over heroes for the next weapon acquisition. Beam selection, missile target selection and plasma target selection all respect this request. A warned/committed beam or plasma shot, or an actual missile launch at that wave, records the request once. Heroes can interrupt or block it normally; surviving civilians do not force additional attacks indefinitely. The usual hero/civilian/eligible-aircraft target rotation resumes afterward. No forced simultaneous fire, instant damage or bypass of weapon telegraphs is added. Existing startup/recovery windows, weapon rotation, destroyed mounts and stuns remain authoritative.

A wave arriving while a weapon is already committed waits for the next normal opportunity. Dead/boarded/phased or hidden civilians cannot be illegally acquired, and a destroyed/disarmed/stunned Walker cannot be forced to attack. These are deliberate combat/rescue limits rather than scripted civilian deaths. Reset clears all wave requests and restores the single-entrance layout. `waveAttacks` diagnostics record spawn and first attack times/weapon for verification.

## Files and checks

`evacuation-config.js` owns the entrance, landing and scene building filter; `evacuation.js` owns formation spawn and per-wave targeting/accounting. `battle.js` wires acquisition invalidation and weapon commitment tracking only when this scene exists. `evac-approach.js` accepts a road x offset with a zero default; its off-ground decorative pieces are omitted at the shifted edge. Siege Walker/arsenal/projectile implementations and Convoy Defense/ARGUS are unchanged.

`QA/evacuation-open-lane-test.mjs` verifies the straight route, clear lines of fire, thirty-second waves, 150s autonomous rescue cycles and priority/commit/reset behavior. `QA/evacuation-open-lane-browser.cjs` checks actual city geometry, one rendered entrance and minimap marker, boarding/escape cycles, multiple live wave attacks, squad alignment, reset and scene isolation on desktop/touch. Its long combat trial holds boss HP constant solely to measure successive wave scheduling; the regular game retains normal damage. Existing lifecycle/navigation/policy, Walker weapons, minimap, Bruiser, convoy and ARGUS checks remain relevant. Phone emulation does not measure physical-phone performance.

## Spawn warning — revision 209

The subway flashes amber and displays a pulsing ground ring during the five seconds before each scheduled wave. This includes the opening wave: arrivals are at 5s, 35s, 65s and so on, still thirty seconds apart. `EVACUATION_CONFIG.spawnWarningSeconds` defaults to 5 and controls the warning/opening delay; `spawnWarningHz` defaults to 2.5. Warning timing uses simulation time, so pause freezes it. At spawn the ring hides and entrance materials return to their original colors. Reset immediately restarts the opening warning. A full civilian population suppresses a false warning until capacity is available. Transport, attack priorities and hero abilities are otherwise unchanged. Cache revision: `evac-warning-209`.

## Long approach — revision 211

The Civilian evacuation map is now 120m wide and 336m long, double its previous 168m length. Bounds are X `[-60,60]`, Z `[-60,276]`. The additional length extends the existing open boulevard along the positive-Z edge; no new entrances or buildings are added. The three Bruisers still spawn after the second civilian wave, now at Z `270`, six metres inside the far boundary, on the landing-aligned road at X `-48`. They physically advance to Z `36` at their existing 3.2m/s speed. The Siege Walker stays in the city centre near the unchanged civilian lane, subway and Chinook pad.

`ESCORT_APPROACH` in `dist/evac-approach.js` owns the scene bounds, squad spawn and road geometry. Ground, movement bounds, enemy separation, the minimap approach road, observer zoom, camera clipping, fog and shadow coverage follow the extension. Hero travel bounds inset the edge by 4m; rescue dash bounds use 5m. Other maps retain their existing bounds.

The Chinook escape waypoint moves from Z `132` to `300`, beyond the enlarged boundary. The scene-only cruise speed scales from 20 to 60m/s to preserve the original 4.2-second horizontal flight legs from the pad at Z `48`. Vertical landing speed, boarding, capacity, spawn warnings, 30-second civilian waves and rescue scoring are unchanged. Base transport defaults remain available to unrelated fixtures.

`QA/evacuation-long-map-test.mjs` verifies dimensions, road matrices, flight timing, boundaries and a complete three-Bruiser march. `QA/evacuation-long-map-browser.cjs` checks the live scene on desktop/touch, the second-wave far-edge spawn, autonomous rescue, full squad approach, actual Kage/Volt controls across the extended map, reset and original battle isolation. The existing evacuation-cycle browser suite covers boarding, escape-only scoring, destruction, replacement and repeated cycles on both input modes. Physical phone performance remains unmeasured.

## Slower civilian waves — revision 212

`CIVILIAN_SPAWN_INTERVAL` is now 60 simulation seconds (previously 30). The opening five-second warning and twelve-person groups are unchanged: waves arrive at 5s, 65s, 125s and so on. Reset restarts the same schedule. The three-Bruiser squad still follows the second wave, now at 65s. Helicopter timings, civilian movement and all other scenes are unchanged. This supersedes the 30-second interval documented in earlier revisions. Cache revision: `evac-cadence-212`.

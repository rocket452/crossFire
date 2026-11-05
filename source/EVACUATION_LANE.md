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

## Square city expansion — revision 213

The map keeps its 336m length (Z `[-60,276]`) and widens to 336m (X `[-168,168]`). `evac-city-map.js` adds 28 destructible two-to-five-storey buildings to the six retained central buildings, for 34 total. These use the existing wall/slab/column kit, damage, collapse, smoke and reset systems. A street grid connects the new outer districts; asphalt stays instanced. New district roads and building footprints appear on the hero minimap. Hero and enemy-separation bounds follow the square.

The existing east subway `(48,48)`, west Chinook `(-48,48)`, central Siege Walker and three-Bruiser far-edge spawn at Z `270` are unchanged. New blocks leave the exposed civilian crossing, Walker sight lines and helicopter/Bruiser boulevard clear. Waves still arrive at 5s, 65s, 125s, with five-second warnings. Other scene layouts are not mutated.

`QA/evacuation-square-map-test.mjs` checks square dimensions, unique building IDs, no road/building overlaps, civilian and aircraft clearance, hero bounds and original-layout isolation. `QA/evacuation-square-map-browser.cjs` verifies live district destruction, street markers, original-scene isolation, evacuation cycles, and keyboard/touch travel along both axes. Physical phone performance remains unmeasured; additional buildings increase static physics/render work while reusing the existing shared mesh batches and bounded debris budget.

## Staggered edge waves — revision 214

One three-Bruiser squad now enters from each map edge per city reset (12 enemies total). The second civilian wave still triggers the first squad at approximately 65s. Subsequent squads enter 20s apart: far/south boulevard at 65s, east at 85s, north at 105s, west at 125s. The sequence uses simulation time, pauses with the game and is fully cleared/rearmed by reset. It does not repeat indefinitely.

`EVAC_RAIDER_WAVES` in `evac-raider-waves.js` owns the 20-second spacing, edge labels and street routes. Squad size (3), formation offsets and move speed (3.2m/s) remain in `ESCORT_APPROACH`. The original far-edge squad still starts at Z 270. Other squads start six metres inside their edge, follow open streets, and hold different positions around the evacuation area. Existing visibility/obstacle checks stop robots at new obstructions; direction-aware formation checks and shared enemy separation keep them apart. Civilian timing, Siege Walker position, map geometry and other scenarios are unchanged.

The wave controller reuses `EvacRaiderSquad` and the existing Bruiser models, tread motion, targeting, four-shot bursts, hero/barrier/portal interactions, damage, explosions and wreck cleanup. It exposes a single combined enemy/projectile list to existing hero targeting, silhouettes, minimap and separation systems. Only spawned robots have live combat units. A short directional feed message identifies each incoming squad.

`QA/evac-raider-waves-test.mjs` checks exact stagger timing, unique IDs, all four street routes against current buildings, arrival, damage, reset cleanup and large-step scheduling. `QA/evac-raider-waves-browser.cjs` checks real civilian-triggered 65/85/105/125s spawns on desktop/touch, 12 radar markers, civilian rescue, combat/damage, reset/replay and original-scene isolation. Existing long/square-map browser checks now inspect the first squad separately when checking the preserved far-boulevard march. Physical-phone performance with all twelve enemies is unmeasured.

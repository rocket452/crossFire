# Civilian Evacuation: Bastion reinforcement

Civilian Evacuation alone now deploys Bastion once after the Siege Walker dies. Other maps retain their existing boss/spawn behavior. Walker defeat closes civilian evacuation immediately: pending civilian spawns stop, ground civilians disappear and the current Chinook withdraws without returning. Pending Bruiser edge waves are also cancelled until city rebuild; existing Bruisers remain active.

`dist/evacuation-bastion-reinforcement.js` owns the transport model and lifecycle. It captures the Walker's position at defeat, waits for its wreck fall, approaches above the skyline, hovers, opens its cargo clamps and drops the existing Bastion model at that X/Z on terrain. Cargo has no live damage shapes, attacks or traversal surfaces. Touchdown activates the existing Bastion combat adapter with full configured health, its regular attacks/weak points, hero collision and boss HUD. The transport flies out and disappears. Killing Bastion does not repeat the transport. Rebuild resets all stages, cargo, effects, health and the one-time trigger.

The transport is a cosmetic original procedural twin-boom carrier, about 90m across. It is not a damageable enemy. Landing effects are cosmetic. No additional damage, knockback or player abilities were added. It uses the existing open central boss footprint; no buildings were removed. The existing `BastionTesting` adapter accepts a mission option to retain normal movement UI and disable its test-only T slowdown key. Arena defaults are unchanged. Mission tracing excludes allied robot targets from enemy shots; hero shields retain their existing interception hooks.

All transport timings use simulation time (pause and simulation speed apply), configured in `dist/evacuation-reinforcement-config.json`:

| Value | Default | Meaning |
|---|---:|---|
| wreckDelay | 2.5s | Wait after Walker defeat |
| approachSeconds | 7s | Approach and deceleration |
| hoverSeconds | 1.2s | Hold before cargo release |
| dropSeconds | 2.8s | Accelerating cargo descent |
| departureSeconds | 6s | Carrier exit flight |
| approachDistance | 300m | Flight distance from/to the landing site |
| approachHeight | 125m | Initial altitude above landing ground |
| cruiseHeight | 76m | Hover altitude above landing ground |
| cargoHeight | 26m | Cargo base altitude before drop |
| departureHeight | 110m | Carrier exit altitude |

Bastion lands about 13.5 simulation seconds after defeat. Touchdown now starts the rescue cinematic below; the carrier continues departing during it while gameplay clocks pause. Its health/weapon values remain in `bastion-config.json`; the mission instance disables initial dilation/debug and adjusts its artillery targeting range for the expanded district. No changes are made to the shared config file. `battleDiagnostics().evacuationReinforcement` reports stage, elapsed time, captured destination and activation state.

## Verify

Run a local static server serving `dist` on port 8765, then `node QA/evacuation-dropship-browser.cjs`. This uses actual weapon destruction, the real game combat update and browser rendering on desktop and touch emulation. It checks inactive cargo, one boss instance, landing/activation, HUD handoff, civilian progress, carrier departure, Bastion defeat without mission reset, and city rebuild/replay. Screenshots are saved in `/tmp/dropship-*.png`.

Manually: select Civilian Evacuation, destroy all four Walker weapons, look upward for the carrier, then fight the delivered Bastion. Rebuild while it is approaching or dropping to check cancellation. Physical phone performance is not measured; the carrier adds roughly forty lightweight primitive meshes, removed from rendering after departure.

## Touchdown rescue cinematic (revision 230)

`dist/evacuation-bastion-cinematic.js` takes over the existing camera once at touchdown. It uses the real weighted player/Violet/Rift characters and Bastion's articulated cannon hierarchy. Shots use cosmetic pooled energy effects, stop at a cloned Violet shield, and never call gameplay damage. Camera cuts establish the boss, show the shielding intervention, then frame the allies and player as Rift steps through a glowing portal. Subtitle dialogue and optional charge/shot/portal tones provide feedback; there is no recorded voice acting.

The native modal overlay, disabled orbit controls, cleared held inputs, and main-loop guard suspend player input, combat, physics, civilian schedules and Bastion attack time. The dropship departure and visual effects continue on their own clock. Thus nobody loses civilians or takes damage during the sequence. Player control mode and world position are retained; a temporary pose stage uses the open street south of the boss, then restores the player's original position, camera, FOV and orientation. Desktop mouse lock is requested again; if the browser rejects automatic capture, the existing click-to-resume prompt remains available. Mobile controls return immediately.

Skip with the visible **Skip** button, Space, Enter or Escape. Skip still places both allies safely and resumes combat. A city rebuild cancels the sequence, restores selected heroes, removes any unselected mission guests, and permits a fresh showing on the next touchdown. Once complete, Violet and Rift remain CPU mission allies even if not selected: they reuse existing instances/abilities, do not duplicate heroes, and do not alter the saved three-hero roster. The normal scene's roster behavior is unchanged.

The `cinematic` object in `evacuation-reinforcement-config.json` contains:

| Value | Default | Purpose |
|---|---:|---|
| duration | 12s | Total sequence duration, unaffected by simulation speed |
| fireStart / fireEnd | 3.3 / 5.7s | Cosmetic dual-cannon barrage window |
| shotInterval | .14s | Interval between pairs of cannon rounds |
| shotSpeed / shotRadius | 65m/s / .7m | Cosmetic projectile travel and size |
| violetArrivalStart / violetArrivalEnd | 1.5 / 3.05s | Flying entrance and shield deployment |
| riftArrivalStart / riftArrivalEnd | 6.7 / 8.3s | Portal entrance window |
| stageDistance / stageHalfWidth | 32m / 3m | Street stage distance and ally spacing |
| violetLineAt / riftLineAt | 5.7 / 8.4s | Subtitle cue times |

`battleDiagnostics().evacuationCinematic` exposes playback, elapsed time, shot/impact counts, dialogue and guest allies. Run `node QA/evacuation-cinematic-browser.cjs` for desktop/touch checks with Volt; run `CINEMATIC_HERO=ninja node QA/evacuation-cinematic-browser.cjs` for Kage. Checks cover actual weapon death/touchdown, controller preservation, real animation frames with frozen gameplay clocks, shield impacts, dialogue, entry framing, completion/skip/cancellation/replay, and mission-only guest cleanup. Screenshots go to `/tmp/cinematic230-*.png`. Physical phone performance remains unmeasured.

## Evacuation shutdown on Walker defeat (revision 231)

`EvacuationScene.endEvacuation()` is an idempotent transition, called immediately from the Walker defeat handler and checked again by the gameplay update. It stops both scheduled and direct civilian spawns, disables subway warnings, removes all civilian damage shapes/unit records/instances and clears cohort/target records. Speedster carry and portal relocation callbacks ignore those retired civilians. Vanished civilians increase only the diagnostic `clearedCivilians` count: they do not count as casualties or rescues. Other enemies and the incoming Bastion are retained.

A visible live Chinook switches from inbound/landing/boarding to departure immediately; an already-departing Chinook continues its flight. Existing passengers are retained and count as rescued only upon actual exit. An absent or destroyed helicopter is not replaced; a destroyed one finishes its short fall before entering `complete`. A final-flight destruction still counts its passengers as lost once. Neither `complete` nor the `ended` flag ends the Bastion fight. The HUD reports evacuation closure/departure/completion and removes the next-group countdown. Rebuild clears shutdown and restores the normal 15s initial spawn / 60s interval and recurring helicopter cycles.

Checks: `node QA/evacuation-shutdown-test.mjs` covers all six possible transport phases, repeated shutdown, scoring, direct spawn/inbound guards, dead civilian relocation/carry, preservation of other boss units, final-flight loss and rebuild. `node QA/evacuation-shutdown-browser.cjs` uses actual Walker weapon kills on desktop/touch layouts and verifies visible crowd removal, passenger departure/exit scoring, no future cycles, unchanged Bastion landing cinematic and reset. `node QA/evac-wave-stop-browser.cjs` checks already-spawned Bruisers remain active while later waves and civilian spawns stop.

## Route-side skyline (revision 232)

Six additional destructible towers use the existing building kit at X -12 / 12 / 60, Z 60 / 84, with 10–14 floors (30–42m). They frame the south side of the civilian crossing at Z48 while retaining the open area around the Walker origin. Every footprint stays more than 50m from that origin. The map now has 56 buildings, including 22 tall towers. Civilian routes, Walker sight lines, street geometry, Chinook clearance and all four Bruiser approaches are unchanged. The layout remains exclusive to Civilian Evacuation.

`QA/evacuation-square-map-test.mjs` checks all building/street overlaps, route and sightline traces, helicopter/Bruiser corridors and unchanged source layout. `QA/evacuation-route-towers-browser.cjs` checks the real destructible sections, desktop/touch rendering, civilian movement, reset and normal-city isolation.

## Compact evacuation district (revision 237)

Civilian Evacuation is now 235.2m square: each side is 70% of its former 336m length (49% of the former area). The map remains centered on the Chinook pad at (-48,48), with X bounds [-165.6,69.6] and Z bounds [-69.6,165.6]. Outer blocks beyond a 6m border margin are trimmed rather than compressing buildings or narrowing streets. There are 28 buildings, including 12 tall towers; all six route-side towers remain. The subway, civilian crossing and Walker/Bastion locations stay unchanged.

Ground/road extents, minimap, hero/dash limits and edge enemy entrances use the compact bounds. South Bruisers enter at Z159.6; the east approach's intermediate waypoint is X48 so it stays inside the new east edge. The Chinook escapes at Z189.6 with adjusted cruise speed preserving its original 4.2s outbound horizontal leg. The first civilian spawn remains at 15s, with 60s between waves, and shutdown/cinematic rules remain unchanged.

Verified compact dimensions, 28 real destructible buildings, civilian movement, retained route towers, reset and normal-city isolation on desktop/touch emulation (`evacuation-route-towers-browser.cjs`). Layout trace checks cover streets, civilian and Walker sight lines, helicopter/Bruiser corridors and the Bastion cinematic camera. Bruiser wave, minimap alert, evacuation lifecycle and shutdown unit checks pass. This does not resize other scenes.


## Slower delivery (revision 244)

Approach, hover, lowering and departure durations increase by 30%: 9.1 s, 1.56 s, 3.64 s and 7.8 s respectively. The 2.5 s wreck delay is retained; touchdown occurs at about 16.8 s after defeat, instead of 13.5 s. Landing still enables Bastion and triggers the existing cinematic by callback; cinematic beats and combat tuning retain their current timing.

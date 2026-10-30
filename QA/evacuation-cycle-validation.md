# Autonomous helicopter evacuation — revision 57

Extends the existing Civilian evacuation scene, civilian instancing/formations, two subway entrances, Chinook mesh, unit damage, hero callbacks, and wave-two raider. The original City battle remains separate. No dependency or mission framework was added.

## Lifecycle and navigation

The existing opposite-corner subway entrances continue alternating twelve-person waves every 30 simulation seconds. The one landing zone moves from the outer edge to the open street intersection (0,24), away from the giant's feet. Street routes from the entrances are at most 120m and 72m before boarding approach. A permanent H, lit pad corners/ring, and one EVAC helicopter sprite identify the activity from above.

A 25-node graph follows existing street intersections. Route queries leave a 1.8m formation clearance from intact building footprints and check detached ground obstructions. Blocked streets trigger a detour/retry. If falling debris encloses a group, a short escape recovery moves it back to free ground. Groups queue separately at the zone, stand/sway while waiting, and automatically board together from the pickup perimeter. Ground height is sampled per civilian. No touching-geometry damage is introduced. Loose detached fragments in the immediate pad are shifted off its footprint; intact buildings are never cleared for the landing zone.

The helicopter starts inbound at altitude, flies along the clear central street, descends and lands. Its absolute boarding window expires even if empty. A loaded flight departs once a full twelve-person group is aboard and the minimum boarding time has elapsed, or when the window expires. Passengers are removed from the visible crowd, but are counted as rescued only after the aircraft reaches z=82, beyond the playable city. It then returns after a short delay. Destruction loses onboard passengers once, shows a brief wreck, and starts a replacement cycle; it does not stop spawning or require a city reset.

Civilians and the active helicopter use existing projectile/unit damage. Deliberate giant targeting remains restricted to a stable 25% roll per departure after reaching 15m altitude, plus line of sight. Boarding, inbound and low aircraft are not deliberately selected. Stray projectiles can still hit them.

## Configuration

`dist/evacuation-config.js` exports arrivalInterval=8s (off-map/replacement delay), boardingDuration=30s, minimumBoarding=2s, capacity=16 (minimum 12 to preserve whole waves), helicopterHealth=600, flightSpeed=20m/s, landingSpeed=5m/s, cruiseAltitude=26m, civilianSpeed=3.8m/s, landingX=0, landingZ=24, escapeZ=82, airThreatChance=.25, targetAltitude=15. The spawn interval is a separate fixed 30-second constant. The existing bounded 72-person crowd remains.

## Existing hero compatibility

Violet's existing beam interception accepts civilian targets as well as helicopters. The speedster's existing carry-dash accepts civilian root positions; carried civilians detach from their formation and resume a street route from the endpoint. The existing large Rift gateway continues moving civilians, whose resumed routes use the same graph. Dash range/cadence, barrier strength, and portal abilities were not redesigned. Mochi/Solara defenses and the wave-two raider continue using the same combat systems.

## HUD and notifications

The compact evacuation strip shows Rescued, Lost, Waiting and Onboard, plus flight phase/boarding time and next wave. Brief feed messages announce inbound aircraft, departures, successful occupied escapes and destruction/replacement. No individual civilian markers or interactions are needed.

## Verification

- `QA/evacuation-cycle-browser.cjs`: desktop and 390px touch viewport, original-scene isolation, 30s two-entrance alternation, no routine intact-building penetration, visible approach/landing, automatic whole-group boarding, no early rescue credit, escape beyond map, loaded-helicopter losses/replacement, multiple waves/cycles, finite empty boarding, actual civilian carry-dash without snapback, actual Violet shield collision preserving civilian health, pad debris clearance, stable high-altitude chance/low protection, full combat and city damage, reset/HUD and runtime errors. Screenshot inspected.
- `QA/evacuation-lifecycle-test.mjs`: real scene with accelerated configuration, automatic boarding, rescue timing, helicopter/civilian losses, replacements, empty departure and required notifications.
- `QA/evacuation-navigation-test.mjs`: both safe street routes, formation clearance, blocked-street detours, overlap escape and no-route waiting.
- Existing civilian formation and Rift browser suites pass, including natural civilian rescue and real guided missile/plasma redirection. Existing hero powers and raider browser suites pass after fixtures were updated for real arrival cycles/new landing coordinates. Mochi natural CPU combat passes both scenes.
- Existing dash/rescue, barrier defense, arsenal and evacuation targeting unit checks pass.

## Prototype limits

Navigation is a small street graph and lightweight formation recovery, not a general crowd/navmesh simulation. When all usable streets are blocked, civilians wait and retry. Flight and wreck descent are scripted rather than full rotor/crash physics. The crowd cap can defer new waves during prolonged congestion, preserving the existing bounded-rendering behavior. QA uses Chromium software graphics and emulated phone layouts; physical phone FPS/thermal performance has not been measured.

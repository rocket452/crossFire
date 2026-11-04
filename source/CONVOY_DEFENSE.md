# Convoy Defense — step 1 / revision 192

Select **Convoy Defense** from Scene, or use `?scene=convoy`. This is a separate scenario in the existing city renderer/physics, not a replacement for City Battle, the Chinook evacuation, Combat Testing or Shuriken Lab. No ARGUS actor/attacks, repair drones, joint weak points, hero health/death or playable flight are implemented in this step.

## Lifecycle and accounting

Four low-poly buses enter along the central eastbound boulevard, fourteen metres apart. After a five-second staging delay, they travel at 4m/s. The lead bus stops at X=0 and X=48 for exactly 35 simulation seconds each; the whole convoy waits together. At each stop, 24 civilians emerge outside two nearby residential facades in compact twelve-person groups. They follow the sidewalk and approach the parked bus doors, then board at one civilian per 0.22s per group. Boarded passengers disappear from the ground crowd. Existing instanced six-part civilian art/animation conventions are reproduced in the convoy module; `evacuation.js` and its navigation/config files are untouched.

Each bus starts with eight passengers, has 24 seats and 900 HP. Boarding assigns a permanent passenger manifest to that bus. No aboard passengers transfer, including after a bus dies. Ground civilians can approach another bus with spare seats if their destination is destroyed/full; this does not redistribute passengers. With four undamaged buses, the two stops add 48 civilians to the initial 32, giving 80 possible rescues.

Boarding ends when the 35-second window expires, even if people are still approaching. Those left behind remain visible, idle and damageable. They count as **LEFT BEHIND / unsaved**, not killed. If killed later, they move from unsaved to lost. They are not silently removed on departure or mission completion. A later existing rescue/portal interaction may bring a ground civilian to an available pickup without moving aboard passengers.

Each bus separately counts its passengers as saved only when its center passes X=116: its rear is then beyond the playable east edge at X=108. Escaped buses disappear from combat/visibility. The convoy continues until all remaining buses escape or are destroyed. At least one escaped bus yields success; failure occurs only when every bus was destroyed without any escape. Saving an empty bus can still win with zero rescued civilians. Score is saved civilians, not bus HP or kills. The mission outcome and saved passengers persist until City Rebuild; ground civilians remain in the world.

The map retains the existing sixteen destructible city buildings and adds open approach/exit road space. Bus routes never cross intact buildings. Movement is controlled/kinematic, not suspension-based vehicle physics. Wrecked buses remain charred/smoking and surviving buses bypass them on the south side of the boulevard. Settled loose building debris in the convoy corridor uses the existing collision-release method so it cannot permanently deadlock evacuation; intact structures are never erased. The new scene suppresses the original Walker and army pending ARGUS step 2.

## Files

- `dist/convoy-config.json`: all gameplay/map tuning.
- `dist/convoy-map-config.js`: route sampling and configuration validation.
- `dist/evac-bus.js`: bus model, door state, health shapes, manifest, wreck/escape state.
- `dist/convoy-mission.js`: mission lifecycle, civilian groups/boarding, loss/save accounting, rescue hooks, markers and diagnostics.
- `dist/convoy-hud.js`, `dist/convoy.css`: compact mission counters, per-bus health/seats and outcome.
- `dist/battle.js`: new scene branch, shared damage/physics/hero adapters, camera, resets and diagnostics.
- `dist/index.html`, `dist/game-entry.js`: menu, field guide, status panel, camera button and cache version.
- `dist/hero-minimap.js`: optional bus and pickup markers, leaving existing snapshots unchanged.
- `QA/convoy-test.mjs`, `QA/convoy-browser.cjs`: simulation and real-page verification.

## Tuning

`dist/convoy-config.json` exposes bus count (3–4), capacity (24), initial passengers (8 each), health (900), speed (4m/s), spacing (14m), startup delay (5s), pickup duration (35s), civilians per pickup (24), group size (12), civilian health (35), speed (3.8m/s), formation spacing/columns, boarding interval/radius, bus dimensions/door position, wreck bypass distances/offset, smoke cadence, map/player bounds, hero start, route, pickup distances/source positions/sidewalk and debris corridor/cadence. A reset is needed after reloading changed config. Timings use simulation time, respecting Pause and the existing speed controls.

## Manual testing

1. Choose Scene → Convoy Defense. Use **Watch convoy** to follow the lead bus; observe the initial four buses and 32 onboard passengers.
2. Observe the first stop at X=0: 24 civilians emerge at nearby buildings, follow the sidewalk and board. Saved remains zero; the timer expires at 35 seconds.
3. Observe the second stop at X=48. With no losses there are now 80 passengers across four buses, never exceeding individual capacity.
4. Watch each bus exit: saved rises per bus, never during boarding or ordinary driving. The final bus triggers EVACUATION COMPLETE. A normal run takes roughly 134 seconds at 1×.
5. City Rebuild restores the buses, initial manifests, stop state, score and civilians. Pause and simulation-speed buttons apply to the mission. Heroes remain selectable/controllable through existing menus.
6. In this enemy-free step, destruction/failure/late civilians are exercised by the automated damage/slow-walker scenarios; no test damage buttons are added to the game UI.

## Verification

- `node QA/convoy-test.mjs`: passes complete lifecycle at 30/60/120Hz, two full boarding windows, 80 rescues, whole-bus exit clearance, manifests/no transfer, 3 surviving buses filling available seats, all-bus failure, one escaped bus followed by remaining losses, live unsaved civilians, deaths after being left behind and repeatable reset.
- `node QA/convoy-browser.cjs`: desktop/touch full page with actual city geometry and shared gameplay updates, menu/camera, route/civilian clearance, enemy rocket collision/damage, boarding/scoring/HUD, bus failure/reset, unsaved-vs-killed accounting, radar markers, responsive layout and bounded corridor debris.
- Existing evacuation lifecycle, navigation and targeting-policy Node suites and minimap checks pass. Existing Chinook cycle browser suite passes desktop/touch, including 30-second alternating subway waves, multiple flight cycles, loaded helicopter loss, civilian dash/barrier interactions and actual combat/city damage.
- Physical-phone FPS/thermal performance is not measured. ARGUS threats and convoy-specific defensive balance will be tested in later steps.

## Locked rules for later ARGUS steps

- Aboard civilians stay with their bus; destroyed buses lose them. Unboarded survivors remain separate from deaths.
- No hero health/death and no playable flight in prototype scope.
- Lance contact ramps against each hero. At 33%, 66%, and 100% of maximum ramp, apply escalating knockback impulses. Breaking line of sight resets the ramp and stops further impulses. Expose thresholds/impulses in the future ARGUS JSON.
- Tether contact yanks toward the anchor and applies 40% movement slow for 1.5 seconds, followed by 3 seconds of tether immunity for that hero. No baseline hero movement changes in step 1.
- Drones restore armor only. Destroyed leg joints never regenerate and permanent stride-speed penalties never reverse.
- Killing ARGUS does not win; surviving buses must exit.
- Preserve the Chinook scenario without refactoring/extracting a shared civilian system in this pass.

Stop after step 1. Step 2 is moving ARGUS/interception, leg-joint damage and damaged gait; it has not started.

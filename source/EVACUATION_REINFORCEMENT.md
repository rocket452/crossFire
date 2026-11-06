# Civilian Evacuation: Bastion reinforcement

Civilian Evacuation alone now deploys Bastion once after the Siege Walker dies. Other maps retain their existing boss/spawn behavior. Subway spawning and Chinook cycles continue throughout the transition and second boss fight. Walker defeat permanently cancels all pending Bruiser edge waves until city rebuild; existing Bruisers remain active.

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

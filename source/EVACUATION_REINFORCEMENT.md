# Civilian Evacuation: Bastion reinforcement

Civilian Evacuation alone now deploys Bastion once after the Siege Walker dies. Other maps retain their existing boss/spawn behavior. Subway spawning, Chinook cycles and edge Bruiser waves continue independently throughout the transition and second boss fight.

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

Bastion lands about 13.5 simulation seconds after defeat; the carrier leaves about 19.5 seconds after defeat. Its health/weapon values remain in `bastion-config.json`; the mission instance disables initial dilation/debug and adjusts its artillery targeting range for the expanded district. No changes are made to the shared config file. `battleDiagnostics().evacuationReinforcement` reports stage, elapsed time, captured destination and activation state.

## Verify

Run a local static server serving `dist` on port 8765, then `node QA/evacuation-dropship-browser.cjs`. This uses actual weapon destruction, the real game combat update and browser rendering on desktop and touch emulation. It checks inactive cargo, one boss instance, landing/activation, HUD handoff, civilian progress, carrier departure, Bastion defeat without mission reset, and city rebuild/replay. Screenshots are saved in `/tmp/dropship-*.png`.

Manually: select Civilian Evacuation, destroy all four Walker weapons, look upward for the carrier, then fight the delivered Bastion. Rebuild while it is approaching or dropping to check cancellation. Physical phone performance is not measured; the carrier adds roughly forty lightweight primitive meshes, removed from rendering after departure.

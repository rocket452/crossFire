# Speedster lightning whip

R on desktop, WHIP in the left mobile ability cluster. Separate from the instant held primary beam. The player can move, jump and wall-run during a lash; rescue dash cancels it, and exiting control/settings/reset removes it. CPU retains its existing beam/rescue behavior.

`dist/runner-whip.js` exports `LIGHTNING_WHIP`: 8m reach from the real hand, 110° sweep, 180 damage once per robot/missile per swing, 15 charge paid once, 1.2s cooldown from activation, .08s windup / .3s sweep / .12s recovery, .3m trace radius. It uses fixed-angle subdivision for complete sweep collision on slower frames. Each curved segment uses existing world/terrain/missile/part collision, stopping at cover; no splash damage to civilians/allies. Shield reduction and Breaker capacitor interception route through existing UnitDamage. A shield graze is held until the sweep finishes, allowing a later clean hull hit to replace it; the unit still receives exactly one damage application. Building hits use existing non-Walker damage reduction. No new stun or auto-aim.

Visuals: articulated right-arm sweep applied to the existing weighted character via syncArms, tapered white lightning links, blue additive halo, jittering secondary arcs, bright tip and impact sparks. Instanced effect buffers are reused. Touch ability buttons form a two-column grid; desktop reminders display R and remaining cooldown.

Verification:
- `node QA/runner-whip-test.mjs`: 30/60/120Hz and 75ms steps, empty charge rejection, exact cost, multi-target one-hit damage, range/rear exclusion, cover, recovery, cooldown, cancellation/reset.
- `node QA/runner-whip-browser.cjs`: actual R and touch input; 180 damage / 15 cost without duplicate hits or beam drain, cooldown, simultaneous WASD/stick movement, real weighted mesh/arm attachment, frontal Aegis shield versus exposed rear, reset, desktop/mobile screenshots, no page errors.
- Existing beam, energy, rescue dash, animation/CPU, torso-look and experimental robot mechanics tests.
- Existing combat-testing browser suite: desktop/mobile scene and hero setup, old drone/Walker modes, player/enemy attacks, reset; original battle and evacuation loads.

Mobile verification uses browser emulation; physical-phone performance and ergonomics are not measured. CPU use of the new whip is not implemented. Public code remains separate from the four licensed private runtime assets.

# Volt Rush — Welding Beam (revision 261)

Replaces the lightning whip in the existing R/touch ability slot. Hold **R**, or hold **WELD** on touch; release to stop immediately. There is no cooldown or wind-up. The existing primary attack, Critical Mass, rescue dash, stun, Sky Strike and Ball Lightning retain their controls. No movement code or movement energy rules change.

## Tuning

`WELDING_BEAM` in `dist/runner-welder.js`:

| Value | Default | Meaning |
|---|---:|---|
| range | 6 m | Maximum ray length from the real right hand |
| damagePerSecond | 600 | Raw contact damage; existing armor/part modifiers still apply |
| drainPerSecond | 25 | Existing running-generated charge spent per second firing |
| stun | 0.2 s | Non-boss enemy stun refreshed on each successful damaging contact |
| radius | 0.16 m | Beam collision radius; no aim assistance or area sweep |
| pulseRate | 20 Hz | Visual welding flicker |

Damage and energy integrate simulation time, including a proportionately smaller final hit when energy runs out. A full stationary 100-charge bar provides four seconds of firing. Movement and energy generation continue normally. The beam stops at the nearest building, robot, missile or owned Ball Lightning; it cannot pierce enemies or cut through buildings. Boss traversal sections and existing part-hit shapes remain authoritative. Ball Lightning receives the existing 0.5-energy-per-raw-damage recharge conversion instead of hostile damage.

## Stun and damage integration

`weldingBeamHit` in `battle.js` calls the existing `damageRobotHit` adapter, preserving Siege Walker weapon-only damage, Bastion arm/back damage, ARGUS parts, shields, headshots and death effects. Successful hits refresh the ordinary robot's existing `stun()` method, canceling its attacks and holding movement while contact continues. This covers Bruisers, Mireguards, Aegis, Scythe and Breaker through their current inheritance. Stun expires after contact stops. No stun is applied through blocked/zero damage, to dead targets, or to allies.

The live Siege Walker, Bastion and ARGUS instances are explicitly excluded from welding stun. Their existing reactive damage/part mechanics remain in charge; this beam does not invoke their interrupt or stun methods. It damages only the first part actually hit, without destroying every nearby weapon at once.

## Rendering and lifecycle

A narrow white-hot core, blue halo, pulsing contact flare, 24 fixed spark instances and existing bounded electrical enemy-hit effects create the welding look. Existing synthesized sparks audio plays at a capped ten cues per second and respects the sound preference. The real weighted right arm follows the aimed point. Camera aiming is converted into a muzzle ray, with no target magnetism.

Primary fire is suppressed while welding; holding primary can resume its normal behavior once welding stops. Charging Critical Mass and rescue dashing take priority over welding. Critical Mass overload clears the weld input. Touch uses pointer capture with release/cancel/lost-capture handling; keyboard release, input-device changes, pause, settings, blur, switching heroes and scene reset clear the ability. CPU Volt continues using its existing attacks rather than automatically welding.

The previous `runner-whip.js` and its historical tests remain unused archives. Current gameplay imports `runner-welder.js`; the HUD and controls no longer expose the whip.

## Verification

- `QA/runner-welder-test.mjs`: 30/60/120 Hz damage/energy agreement; release, six-metre range, cover, partial final hit/depletion, bounded effects, reset, boss/ally/dead-target/no-damage stun exclusions.
- `QA/runner-welder-browser.cjs`: actual held R and touch inputs; real Bruiser and Mireguard damage and continuous stun, expiry after release, energy cost, no simultaneous primary drain, out-of-range immunity, movement while firing, settings cancellation, Bastion part damage without stun, reset and error-free rendering.
- Updated `QA/runner-storm-browser.cjs`: welding recharges the owned orb; all five primaries, delayed strike, energy cost, pause and reset still pass.
- Existing Critical Mass unit/browser and City Battle desktop/touch rescue-dash regression checks pass.

Physical phone performance has not been measured.

## Revision 266 — electrified stun feedback

Successful welding stuns now wrap the victim in bright blue-white crawling arcs and two travelling electrical bands. The effect follows the enemy's current rotated hit shapes, refreshes while welding applies stun, and fades over the existing 0.2-second stun tail when contact ends. Bosses, zero-damage contacts, friendly orbs and killed targets never receive it. Existing damage, energy and stun timings are unchanged.

`WeldElectrifyFX` uses two fixed instanced meshes with a 256-segment cap and at most four recent victims. Normal depth testing preserves building occlusion. Release preserves only the brief stun tail; reset, hero exit, pause cancellation and overload clear it. The real desktop/touch welding browser checks now assert live effect activation, segment bounds and complete expiry after release, in addition to existing damage, energy and boss behavior.

# Frostfin — ice axolotl

Choose **Frostfin** in the existing Heroes roster (maximum three active heroes), or choose **Frostfin — CPU** in Combat Testing. Defaults are unchanged. The Frostfin camera follows him; he is an autonomous ground ally, like Solara, rather than a new player controller.

Original low-poly geometry has four animated legs, six external gills, a broad head, jaw, eyes, and a swaying finned tail. The diagonal trot uses actual distance traveled. Ice travel reuses `SolaraIcePath` and `SolaraIceForming`, including the continuous trail and front ice-generation particles. The street waypoint graph reuses `EvacuationNavigation`; building traces validate movement and breath hits.

## Tuning

`AXO` in `dist/axolotl-hero.js` holds the initial values:

| Value | Default | Meaning |
|---|---:|---|
| speed | 14 | Ground speed, world units/second |
| range | 18 | Breath reach |
| coneDegrees | 28 | Cone half-angle |
| breathSeconds | 1.6 | Duration of each breath |
| cooldown | 2.4 | Rest after a breath ends |
| damagePerSecond | 30 | Breath damage, sampled at 0.1-second intervals |
| chillSeconds | 3 | Duration refreshed on a breath hit |
| slow | 0.35 | Ordinary enemy controller slowdown |
| bossSlow | 0.15 | Reduced boss controller slowdown |
| pathLife | 9.6 | Retained ice trail lifetime in seconds |
| maxPath | 192 | Maximum retained trail segments |

Breath uses the existing robot hit shapes, damage routing, armor, headshot and boss part rules. Intact building cover blocks hits. Chills do not stack: another hit refreshes the timer. Frost crystals mark chilled actors. Controller time is scaled temporarily, including movement and attack preparation; independent world projectile systems continue normally. Death, expiry, changing the roster, resetting the scene, or respawning test enemies removes controller wrappers. This changes no player movement, charge or stamina rules.

## Verification and limits

`node QA/axolotl-test.mjs` checks quadruped anatomy, breath hits, chill strength/expiry, ice trail reuse and reset cleanup. `node QA/axolotl-browser.cjs` exercises normal Combat Testing roster selection, live enemy damage/chilling, ice movement and switching back to Volt, at desktop and touch viewport sizes. Existing roster and Solara ice-path/forming tests also pass.

This is procedural prototype art and animation. There is no player controller or new hero health/death system. Street navigation is simple waypoint routing, rather than a new navmesh. Browser touch emulation is tested; physical phone FPS and thermal performance are unmeasured.

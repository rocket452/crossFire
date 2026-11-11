# Frostfin — ice axolotl

Choose **Frostfin** in the existing Heroes roster (maximum three active heroes), or choose **Frostfin — CPU** in Combat Testing. Defaults are unchanged. The Frostfin camera follows him; he is an autonomous aerial ally, rather than a new player controller.

Original low-poly geometry has four animated legs, six external gills, a broad head, jaw, eyes, and a swaying finned tail. The diagonal trot uses actual distance traveled. Movement reuses `SolaraSteering` unchanged: speed 20, minimum radius 8, maximum turn rate 0.65 rad/sec, turn acceleration 1.4 rad/sec², acceleration/braking limits 18/20, and body turn limit 0.8 rad/sec. Heading follows travel with a head look toward the target. Ice travel reuses `SolaraIcePath` and `SolaraIceForming`, including the continuous trail and front ice-generation particles. Frostfin flies on the ribbon, climbs over surviving buildings, and descends toward a clear airborne firing position. Three-dimensional building traces validate movement and breath hits. Trail history retains its actual height through climbs and descents; the model leans and banks while turning.

## Tuning

`AXO` in `dist/axolotl-hero.js` holds the initial values:

| Value | Default | Meaning |
|---|---:|---|
| speed | 20 | Air-slide speed, world units/second |
| hoverHeight | 6 | Minimum patrol/firing altitude above terrain |
| attackHeight | 4 | Preferred height above an enemy hit shape |
| orbitRadius | 10 | Preferred firing standoff |
| climbSpeed | 8 | Maximum vertical speed |
| roofClearance | 3 | Clearance over surviving buildings along the route |
| planSeconds | 0.4 | Obstacle-height replanning interval |
| breathParticles | 120 | Dense mist instance cap |
| breathWidth | 3.2 | Visual plume half-width at full reach |
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

Breath has 120 larger mist puffs, 48 bright snow crystals and a translucent cone, with its visible length stopped by the first centerline impact. These effects use fixed pools, regular depth testing and no additional lights. Breath uses the existing robot hit shapes, damage routing, armor, headshot and boss part rules. Intact building cover blocks hits. Chills do not stack: another hit refreshes the timer. Frost crystals mark chilled actors. Controller time is scaled temporarily, including movement and attack preparation; independent world projectile systems continue normally. Death, expiry, changing the roster, resetting the scene, or respawning test enemies removes controller wrappers. This changes no player movement, charge or stamina rules.

## Verification and limits

`node QA/axolotl-test.mjs` checks quadruped anatomy, breath hits, chill strength/expiry, ice trail reuse and reset cleanup. `node QA/axolotl-browser.cjs` exercises normal Combat Testing roster selection, live enemy damage/chilling, ice movement and switching back to Volt, at desktop and touch viewport sizes. Existing roster and Solara ice-path/forming tests also pass.

This is procedural prototype art and animation. There is no player controller or new hero health/death system. Air navigation uses direct checked paths with building-height clearance, rather than a new navmesh. Browser touch emulation is tested; physical phone FPS and thermal performance are unmeasured.

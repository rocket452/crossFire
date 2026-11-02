# The Bastion prototype

Select **Combat Testing**, choose **The Bastion — plasma Gatling** under **Enemy preset**, then press **Spawn / Reset enemies**. Pick a hero and choose **Play / Watch selected hero**. The Bastion is an opponent in the existing two-building city, not a separate map. Selecting it disables the Siege Walker checkbox and other enemy presets for that test. Old `?scene=bastion` links redirect to `?scene=testing&enemy=bastion`. The main mission roster is unchanged.

## Existing conventions retained

`CombatTesting` owns a `BastionTesting` adapter that shares the existing scene, renderer, heroes, UnitDamage, minimap, silhouette pass and boss HP bar. It supplies climbable sections to the controllers and routes their damage into the existing Bastion implementation. Hidden/inactive Bastion instances have no collision targets or attacks. Switching presets or resetting restores the selected encounter.

Crossfire is a static JavaScript ES-module game using Three.js and Cannon-es. The existing Speedster, RunnerMotion, RunnerHeading, weighted humanoid animations, weapon effects, hurt animation and controls are reused. The boss uses the existing `UnitDamage` and swept `traceImpact` OBB queries. There is no multiplayer layer in this prototype.

No shared player movement files were changed. Existing movement is 14 m/s running, 46 m/s boosted and 12/24 m/s wall-running, with unlimited duration and no movement stamina. Those existing speeds were preserved rather than adding a new cap or replacing the controller. The old speed readout is hidden in this arena. The existing weapon-charge system still powers attacks only; it does not tax movement. An arena adapter carries the player and viewing heading with articulated support transforms, without changing acceleration, jump, boost or wall-running rules.

The boss is stationary, with a limited-rate pivot and animated arms/legs. Six launchers inherit arm/torso transforms. The continuous limb/torso boxes have walkable caps so the unchanged controller can climb, crest and circle them. The boss briefly pauses its pivot at ground contact to allow the existing wall-grab intent check to complete at high frame rates; it pivots again once the player climbs. `arena.testingPosition` defaults to `[24, 0, -24]`, on the open boulevard clear of the two existing buildings. No buildings are moved. The cyan route starts 30 m away so it stays inside the existing arena bounds. A camera-clearance adapter keeps the camera outside the larger body.

## Updated model and plasma Gatling attack

The original low-poly model uses chamfered armour, separate breastplates, knee/shoulder hinges, a tracked visor head, arm/forearm segments, feet and power-bank vents. Static detail is instanced by parent/geometry/material, giving about 8,000 triangles across 95 render meshes before silhouette and shadow passes. There are no new textures or licensed assets. `bastion-art.js` owns the visual rig; `bastion-model.js` keeps stable climbable volumes and synchronizes their moving transforms.

Animation includes a subtle torso idle, head tracking, shoulder bracing, a bent Gatling forearm, accelerating/decelerating six-barrel rotation, per-shot barrel recoil and muzzle flashes. Core armour opens with two sliding shutters instead of simply disappearing. Gun aim follows its articulated forearm. Body traversal and player movement remain unchanged.

The old spiral/lattice/mine/curve orb-pattern barrage is replaced by a **plasma Gatling stream** and an alternating **plasma rain** attack. The gun uses the Bruiser's 36 m/s projectile speed and existing pooled `RaiderEnergyEffects` for energy rings, trailing sparks and impacts. Bolts have a 2.48 m radius and are slightly elongated. Their width, length, energy rings and collision radius are four times the original Gatling bolt size. There is no active projectile splitting, mine planting or mid-flight homing in the default encounter. Odd cycles use Gatling; even cycles use plasma rain. `barrage.attackSequence` controls that order.

Gatling spread is now 0.1404 per axis (30% wider than 0.108). Each bolt has a dark plum, depth-tested outline at 1.14× its core size, with a tighter 1.5× halo to keep neighboring shots distinct. Outline colour/scale and halo scale are configurable under `gatling`. This adds one instanced draw for all bolt outlines, without changing collision size or through-wall visibility. Projectile speed, firing cadence, attack duration, damage and plasma-rain sizes are unchanged.

Pulses now require an opponent within `pulse.triggerDistance` (12 m from a body part), or actively traversing the body. Distant targets skip the pulse phase and do not trigger overlap waves. Visible enemy projectile cores block actor x-ray overlays; projectiles themselves no longer receive through-cover overlays.

## Spherical pulse readability

The close-range pulse now has a translucent spherical energy front, a bright Fresnel edge, sweeping surface bands and latitude arcs, cyan edges around the existing safe gap, and an origin spark burst. The existing ground ring is stronger as well. The sphere expands at the body-wave speed and fades with the existing pulse lifetime. This is visual feedback: ground/body damage, safe-gap rules, movement and timings are unchanged.

`pulse.visual` configures warm/hot/gap colours, shell opacity, line opacity, fade time, sphere segments/rows and ground opacity. The shell uses one shared low-poly sphere, shared line geometry and disposable per-wave materials, with no extra textures, lights or physics colliders. Reset/defeat clears it with the existing waves. Browser verification captures desktop/touch screenshots and checks outward growth and shader compilation.

## Plasma rain

On alternate cycles the Bastion lifts/extends its weapon arm, points the rotating cannon vertically and launches up to 21 plasma shells 0.036 seconds apart. They rise straight upward for 0.8 seconds, fan out high above the city over 0.65 seconds, then descend over 1.4 seconds with long comet trails. The total warning per shell is about 2.85 seconds. Gatling fire does not run during this attack.

Each shell locks its landing point at launch. Orange/red ground circles, crosshairs and shrinking countdown rings appear immediately; they flash red during the final 0.65 seconds. Targets never follow the player after locking. Placement prefers open ground, rejects buildings with projectile clearance, keeps centres at least eight metres apart and inside the playable bounds. A cluttered edge uses a nearest-open-street grid fallback if random sampling cannot fit the full volley. The minimap reuses the existing red impact crosshairs.

Impacts produce expanding plasma bursts/sparks and damage within a 3.4-metre radius and four-metre vertical reach. Leaving a circle avoids damage. Defensive barriers can intercept descending shots or block the blast trace. Existing city damage handles the explosions; the player uses the existing hurt feedback/hit counter. No movement cost, speed limit or slowdown is added. World slowdown scales shells and warning countdowns together. Reset, preset switching and boss defeat clear every shell, warning marker and burst.

`rain` in `dist/bastion-config.json` exposes count, launch spacing, ascent speed/time, arc/apex height, descent time, projectile/trail size, blast radius/height/damage, target scatter/spacing/lead/limits, warning flash, burst lifetime and arm pose. Defaults: 21 shells; 0.036 s launch interval; 40 m scatter radius (previously 23 m); 58 m/s ascent; 100 m apex; 2.85 s total flight; 3.4 m blast radius; 65 damage.

## Encounter

1. **Reset, 3.2 seconds:** core shut, weapon modules vulnerable. Reposition or break a power bank or the cannon.
2. **Wind-up, 1 second:** the upcoming chest/back plate glows amber and vents sparks. A rising cue warns of the pulse.
3. **Pulse, 2.6 seconds:** ground/body rings sweep out with a narrow gap and 0.8-second lingering damage. Leaving the body or threading its gap remains valid. A successful body-gap crossing extends the next exposure by 40%. The Gatling starts spinning in the last 0.65 seconds of the pulse.
4. **Attack barrage:** Gatling lasts 7.2 seconds / 10.08 after a gap; plasma rain stays at 3.6 / 5.04 seconds. the core opens. On Gatling cycles the cannon fires the configured 72 / 88 / 104 nominal shots by escalation tier, paced across the window. Four-shot groups contain two direct and two leading shots in seeded random order, like the Bruiser. Small spread and limited-rate aiming make steering matter. Misaligned shots are skipped rather than queued into an instantaneous burst.
On plasma-rain cycles the cannon instead launches the telegraphed skyward cluster described above.
5. Repeat, rotating among four chest/back core positions. Cycle 3+ adds two overlapping pulses during the barrage. Defeat stops emissions and clears hazards; reset restores poses, spin, banks and cannon.

Six destructible modules are retained. Module 3 (zero-based) is the forearm Gatling cannon; destroying it disables later gun barrages. Other modules are power banks; breaking them removes their scheduled shots. All modules are armoured during the barrage, and core hits only damage main health during exposure. Power-bank damage never also reduces main HP.

Cyan remains a protected projectile corridor, including ascent to the current core. Bolts dissolve before their swept segment enters it. The cyan route does not negate pulse rings. Violet marks the risky shortcut. Repeated approach quadrants get a dull-red warning and extra shots next barrage. Grazes only count during core exposure, once per bolt, adding 10% up to +100% for the next attack activation. Neither grazes nor enemy hits change player movement. Optional orb/bolt deflection and the existing Q interrupt remain supported.

Combat Testing connects the stream to the existing city projectile trace: walls, ground and hero barriers can intercept it. Building impacts use the existing robot damage route. Existing hero damage callbacks still own attacks on the core and cannon.

Gatling duration is configured independently with `gatling.barrageSeconds` (7.2 seconds). Shot counts doubled with duration, preserving the original firing cadence. Gun tracking response doubled from 4 to 8; chassis pivot speed doubled from 0.24 to 0.48 rad/s. Rain timing and player movement are unchanged.

## Highest-value tuning

All values live in `dist/bastion-config.json`; reload after editing.

| Setting | Initial value | Purpose |
| --- | --- | --- |
| `timings.reset / windup / pulse / barrage` | 3.2 / 1 / 2.6 / 3.6 s (rain) | Positioning, warning and firing windows |
| `barrage.countByCycle` | 72 / 88 / 104 | About 10 / 12.2 / 14.4 shots per second |
| `gatling.speed / radius / spread` | 36 m/s / 2.48 m / 0.1404 | Bolt pacing, size and spread |
| `gatling.spinupSeconds / alignment` | 0.65 s / 0.32 rad | Spin warning and firing alignment |
| `gatling.directPerGroup / groupSize` | 2 / 4 | Direct versus leading shot mix |
| `gatling.leadSeconds / maxLeadDistance` | 0.65 s / 18 m | Bounded prediction |
| `gatling.aimResponse / yawLimit / pitchLimit` | 8 / 1.25 rad / 1.2 rad | Tracking and gun articulation |
| `gatling.gunModule / barrels` | 3 / 6 | Destructible weapon and barrel count |
| `animation.barrelSpin / spinResponse` | 32 rad/s / 7 | Rotor animation |
| `animation.recoilDistance / recoilRecovery` | 0.16 m / 18 | Per-shot recoil |
| `animation.armBrace / forearmBend / braceDrop` | 0.06 rad / 0.12 rad / 0.25 m | Heavy firing pose |
| `animation.headTurn / idleBob / plateOpen` | 0.55 rad / 0.1 m / 2.35 m | Head, idle and shutter motion |
| `core.health / damageMultiplier / radius` | 6000 / 3 / 1.15 m | Fight length and aim target |
| `launchers.health / positions / parents / sizes` | 360 / six attachment records | Cannon/power-bank health and colliders |
| `pulse.gapHalfAngle / linger` | 0.24 rad / 0.8 s | Gap and lingering hazard |
| `timings.gapExtension` | 0.4 | Extra core exposure after threading gap |
| `projectiles.speedScale / grazePerOrb / grazeCap` | 1 / 0.1 / 1 | Global travel scale and +100% graze cap |
| `dilation.scale` | 0.35 | World-only slowdown, player timing unchanged |
| `arena.testingPosition` | [24, 0, -24] | Spawn clear of the existing buildings |

Legacy pattern parameters remain in the data for compatibility, but the active pool contains `gatling` and `skyfall`; they do not generate the previous sphere patterns.

## Controls and milestone checks

Existing desktop controls: WASD, mouse look/pointer lock, Shift boost, Space jump, LMB primary, E held rescue dash, R whip and Q overload. Mobile retains the existing movement stick, camera drag and ability buttons. **T** toggles Bastion world slowdown; **F2** toggles debug. Encounter controls provide the same functions on touch, a 30–100% world-speed slider, seed input and reset. Escape releases the cursor, then exits the hero.

1. **Body/surfaces:** boost into a leg, steer into its current face, climb past 20 m and crest the torso. F2 draws limb, launcher and core boxes plus orb/player collision spheres. Turn/jump to leave; observe moving support carry.
2. **State loop:** watch reset → amber wind-up → red pulse → barrage → reset. The compact panel displays state and time remaining.
3. **Pulse:** stand on the body outside the angular gap and observe hurt feedback/hit count. Jump away to avoid surface damage. Thread the cyan gap on the body to see the +40% window.
4. **First pattern:** watch cycle 1 emit the Gatling stream; move along cyan without projectile hits, then take the violet approach for closer passes.
5. **Core:** hold primary on the selected bright core during barrage; boss HP falls. Fire at the same plate while closed; main HP stays unchanged.
6. **Launchers:** break one outside barrage; it disappears and next cycle has fewer planned shots. The main HP does not also lose launcher damage.
7. **Gatling:** watch six barrels accelerate, the arm brace and muzzle flashes. Change direction to dodge direct/leading bolts, or use a building as cover. Break the cannon during reset to disable its next barrage.
8. **Core rotation:** check different chest/back vent IDs each cycle; only the current plate opens.
9. **Routes:** use one quadrant repeatedly; watch it get a dull-red patch. Alternate quadrants to avoid dominance.
10. **Grazes/deflection:** make close passes while the core is open, watch NEXT STRIKE rise to its cap, then attack. Shoot an orb during exposure to redirect it.
11. **Slowdown/debug:** compare a sustained boost with T on/off. Player displacement per real second is unchanged; boss, rings and orbs slow together. F2 includes state, patterns, seed, route usage and live projectile counts.

## Verification

- `node QA/bastion-state-test.mjs`: Gatling-only encounter, regular 72-shot direct/lead cadence, bolt speed, protected corridor, six-barrel spin/recoil, animated muzzle, power-bank/cannon destruction, cover impacts, core armour, interrupt, graze cap, gap extension and reset.
- `node QA/bastion-rain-test.mjs`: alternating attacks, vertical muzzle/shot motion, 21 spaced locked warnings, including crowded map corners, delayed damage, dodging, single impact dispatch, shield interception and reset.
- `node QA/bastion-browser.cjs` against the local static server: desktop and touch preset selection, articulated traversal in the existing city, natural cycles, real primary/core damage, launcher removal, upward rain launch, visible warning zones and real city impacts, unchanged movement during slowdown, all six hero choices, switching back to Siege Walker/empty arena, and compatibility redirects. Screenshots are written under `/tmp/bastion-testing-*.png`.
- `node QA/combat-testing-browser.cjs`: desktop/touch combat arena, six existing hero choices, real player/enemy fire, plus preserved City Battle and escort layouts/roster/civilian wave size. Scene selector retains three maps.

## Prototype limits

This is a single-player combat-arena enemy with original procedural low-poly art and a simple oscillator cue. It shares the arena’s existing destructible city and hero selection. No ally squad or civilians are added; the main missions keep those systems. The existing player has hurt feedback but no health/death system, so hits and damage taken are training metrics. The unchanged wall-run controller still requires steering into the surface and deliberately releases with a jump; traversing a pivoting body needs practice. The new boss uses kinematic OBB surfaces rather than a skinned-mesh physics collider. Exiting the hero returns to the arena’s existing CPU combat behavior. Physical-phone FPS, thermal behaviour and balance with human players remain unmeasured.

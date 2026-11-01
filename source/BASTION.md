# The Bastion prototype

Select **Bastion Arena** from the existing scene selector, or open `?scene=bastion`. Choose **Play Volt Rush**. This fourth scene is isolated; City Battle, Civilian Escort and Combat Testing still use `battle.js`.

## Existing conventions retained

Crossfire is a static JavaScript ES-module game using Three.js and Cannon-es. The existing Speedster, RunnerMotion, RunnerHeading, weighted humanoid animations, weapon effects, hurt animation and controls are reused. The boss uses the existing `UnitDamage` and swept `traceImpact` OBB queries. There is no multiplayer layer in this prototype.

No shared player movement files were changed. Existing movement is 14 m/s running, 46 m/s boosted and 12/24 m/s wall-running, with unlimited duration and no movement stamina. Those existing speeds were preserved rather than adding a new cap or replacing the controller. The old speed readout is hidden in this arena. The existing weapon-charge system still powers attacks only; it does not tax movement. An arena adapter carries the player and viewing heading with articulated support transforms, without changing acceleration, jump, boost or wall-running rules.

The boss is stationary, with a limited-rate pivot and animated arms/legs. Six launchers inherit arm/torso transforms. The continuous limb/torso boxes have walkable caps so the unchanged controller can climb, crest and circle them. A camera-clearance adapter keeps the camera outside the larger body.

## Encounter

1. **Reset, 3.2 seconds:** core shut, launchers vulnerable. Reposition or break launchers.
2. **Wind-up, 1 second:** the upcoming chest/back plate glows amber and vents sparks; a rising oscillator signals the pulse. The cyan path previews the gap. Launchers remain vulnerable.
3. **Pulse, 2.6 seconds:** rings expand on the ground and sweep upward across body surfaces. The red bands linger for 0.8 seconds. Leaving the body and jumping above the ground band is safe. Body crossings inside the narrow angular gap award a single +40% exposure extension. The bands never modify player movement.
4. **Barrage, 3.6 seconds normally / 5.04 after a gap:** only the selected core opens and takes main-health damage. Launchers armour up. Six launcher slots emit a nominal 30/40/48 shots in cycles 1/2/3+. A destroyed launcher removes its slots rather than redistributing them. Remaining projectiles have bounded lifetimes.
5. Repeat, rotating among four chest/back core positions. Defeat stops emissions, pulses and collision targets; reset restores everything and the selected seed.

Cycle 1 uses spiral shots without curving. Cycle 2 combines two seeded patterns, including proximity curves. Cycle 3+ explicitly adds two surface/ground pulses during the barrage. The pool is a JSON list; remove a pattern to exclude it. Set `openingPattern` to test one first. The seeded generator drives pattern selection and shot phase.

Patterns:

- **Spiral:** three ordered radial arms with successive heights and angle offsets.
- **Lattice:** orbs form a grid and split once the player passes their forward plane nearby.
- **Mines:** orbs travel to anchors, arm, warn on proximity or fuse expiry, then burst outward.
- **Curve:** proximity captures a target position, flashes a warning, then turns for a bounded duration and accelerates. No permanent homing and no curves in cycle 1.

Cyan is the guaranteed barrage corridor, including the ascent to the current core. Enemy projectiles dissolve before their swept segment enters its clearance tube, including split children and curving shots. The cyan route does **not** negate pulse rings: read the gap or leave the body. Violet shows a shorter, unprotected approach. Both lines move with the body. Most-used approach quadrants are accumulated while supported by the boss; a dominant route gets a dull-red limb/face patch before extra pressure shots in the following barrage. The protected corridor remains safe even when that route is marked.

Grazes use relative swept segments against the existing hero's body centre. Each enemy orb can award one graze, only while the core is actually open. Each adds 10%, capped at +100%. The bonus is consumed on the next core attack activation; all ticks of that same held primary activation share its multiplier, rather than wasting the reward on a single tiny frame tick. New grazes can be banked for the next activation. Graze rewards never alter movement. Optional orb deflection uses the existing primary/whip hit: an orb struck while the core is open returns to the core through the same core damage path.

Normal ranged attacks remain valid: this prototype does not impose an extra melee-only core requirement. The hero's existing Q stun pauses the encounter and emissions for one second, closing the core during the interruption. Already-emitted pulse hazards can finish; no movement slowdown is applied.

## Highest-value tuning

All encounter tuning lives in `dist/bastion-config.json`; reload after editing.

| Setting | Initial value | Purpose |
| --- | --- | --- |
| `timings.reset / windup / pulse / barrage` | 3.2 / 1 / 2.6 / 3.6 s | Positioning, warning and attack windows |
| `timings.gapExtension` | 0.4 | Bonus exposure proportion |
| `body.height / turnRate` | 40 m / 0.24 rad/s | Scale and pivot pressure |
| `pulse.gapHalfAngle` | 0.24 rad | About 27.5° total gap |
| `pulse.groundSpeed / surfaceSpeed` | 30 / 24 m/s | Ring travel speeds |
| `pulse.groundWidth / surfaceWidth / linger` | 1.5 m / 1.25 m / 0.8 s | Hazard bands and lingering area |
| `barrage.countByCycle` | 30 / 40 / 48 | Nominal shots before destroyed-launcher reductions |
| `barrage.safeRadius / greedyRadius` | 1.45 / 0.45 m | Protected-line clearance and documented risky-line reference |
| `projectiles.speed / speedScale / life` | 16 m/s / 1 / 7 s | Global projectile pacing |
| `core.health / damageMultiplier / radius` | 6000 / 3 / 1.15 m | Fight length and aim target size |
| `core.locations` | Four chest/back positions | Rotating core attachment locations |
| `launchers.health / positions / parents` | 360 / six / arm and torso parents | Destruction tradeoff and attachments |
| `curve.triggerDistance / warningSeconds` | 12 m / 0.32 s | Reactive-shot readability |
| `curve.turnRate / turnSeconds / acceleration / maxSpeed` | 1.8 rad/s / 0.55 s / 18 m/s² / 32 m/s | Bounded steering and acceleration |
| `lattice.splitProximity / splitCount` | 10 m / 3 | Split pressure after passing |
| `mines.triggerDistance / triggerWindup / burstCount` | 5 m / 0.6 s / 6 | Mine warning and density |
| `routes.dominance / minimumSeconds / extraShots` | 45% / 1 s / 6 | Repetition threshold and pressure |
| `projectiles.grazeMargin / grazePerOrb / grazeCap` | 1.3 m / 0.1 / 1 | Risk/reward and +100% cap |
| `dilation.scale / minimum / maximum` | 0.35 / 0.3 / 1 | World-only slowdown; never a near-freeze |
| `seed` | 2718 | Repeatable encounters |

Additional JSON values expose pattern layout counts, heights, split angles/speeds, mine fuse/arming, collision sample count, radius/damage/cooldown, pulse tessellation, overlap count/timing, projectile/particle ceilings, audio envelope and debug colours. `greedyRadius` is a visual/debug reference, not immunity: only cyan has enforced protection. Arena floor size/camera/start, limb oscillation and feedback values are configurable as well.

## Controls and milestone checks

Existing desktop controls: WASD, mouse look/pointer lock, Shift boost, Space jump, LMB primary, E held rescue dash, R whip and Q overload. Mobile retains the existing movement stick, camera drag and ability buttons. **T** toggles world slowdown; **F2** toggles debug. Encounter controls provide the same functions on touch, a 30–100% world-speed slider, seed input and reset. Escape releases the cursor, then exits the hero.

1. **Body/surfaces:** boost into a leg, steer into its current face, climb past 20 m and crest the torso. F2 draws limb, launcher and core boxes plus orb/player collision spheres. Turn/jump to leave; observe moving support carry.
2. **State loop:** watch reset → amber wind-up → red pulse → barrage → reset. The compact panel displays state and time remaining.
3. **Pulse:** stand on the body outside the angular gap and observe hurt feedback/hit count. Jump away to avoid surface damage. Thread the cyan gap on the body to see the +40% window.
4. **First pattern:** watch cycle 1 emit the three-arm spiral; move along cyan without projectile hits, then take the violet approach for closer passes.
5. **Core:** hold primary on the selected bright core during barrage; boss HP falls. Fire at the same plate while closed; main HP stays unchanged.
6. **Launchers:** break one outside barrage; it disappears and next cycle has fewer planned shots. The main HP does not also lose launcher damage.
7. **Patterns:** change `openingPattern` for isolated spiral/lattice/mines tests; for curves let cycle 2 begin. Pass a lattice plane, approach a mine, and approach a pink curve shot to see its warning before steering.
8. **Core rotation:** check different chest/back vent IDs each cycle; only the current plate opens.
9. **Routes:** use one quadrant repeatedly; watch it get a dull-red patch. Alternate quadrants to avoid dominance.
10. **Grazes/deflection:** make close passes while the core is open, watch NEXT STRIKE rise to its cap, then attack. Shoot an orb during exposure to redirect it.
11. **Slowdown/debug:** compare a sustained boost with T on/off. Player displacement per real second is unchanged; boss, rings and orbs slow together. F2 includes state, patterns, seed, route usage and live projectile counts.

## Verification

- `node QA/bastion-state-test.mjs`: deterministic escalation, core rotation, gap extension once per cycle, graze uniqueness/cap/consumption, launcher/main-health separation, interrupt, all four safe corridors, relative swept hits, triggered lattice splits, mine warnings/bursts, curve warning/acceleration, deflected core damage and reset.
- `node QA/bastion-browser.cjs` against the local static server: desktop and touch layouts, keyboard/touch movement with steering across articulated surfaces, complete natural encounter cycles, actual held primary/core damage, closed armour, launcher removal, escalation, identical movement with/without world slowdown, debug rendering and no browser exceptions. Screenshots are written under `/tmp/bastion-*.png`.
- `node QA/combat-testing-browser.cjs`: desktop/touch combat arena, six existing hero choices, real player/enemy fire, plus preserved City Battle and escort layouts/roster/civilian wave size. Scene-selector assertion updated from three to four.

## Prototype limits

This is an isolated, single-player boss arena with placeholder primitive art and a simple oscillator cue. No ally squad, civilians or city destruction are duplicated into it; the existing missions keep those systems. The existing player has hurt feedback but no health/death system, so hits and damage taken are training metrics. The unchanged wall-run controller still requires steering into the surface and deliberately releases with a jump; traversing a pivoting body needs practice. The new boss uses kinematic OBB surfaces rather than a skinned-mesh physics collider. CPU combat in this arena is paused when the player exits. Physical-phone FPS, thermal behaviour and balance with human players remain unmeasured.

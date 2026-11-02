# The Bastion prototype

Select **Combat Testing**, choose **The Bastion — plasma Gatling** under **Enemy preset**, then press **Spawn / Reset enemies**. Pick a hero and choose **Play / Watch selected hero**. The Bastion is an opponent in the existing two-building city, not a separate map. Selecting it disables the Siege Walker checkbox and other enemy presets for that test. Old `?scene=bastion` links redirect to `?scene=testing&enemy=bastion`. The main mission roster is unchanged.

## Existing conventions retained

`CombatTesting` owns a `BastionTesting` adapter that shares the existing scene, renderer, heroes, UnitDamage, minimap, silhouette pass and boss HP bar. It supplies climbable sections to the controllers and routes their damage into the existing Bastion implementation. Hidden/inactive Bastion instances have no collision targets or attacks. Switching presets or resetting restores the selected encounter.

Crossfire is a static JavaScript ES-module game using Three.js and Cannon-es. The existing Speedster, RunnerMotion, RunnerHeading, weighted humanoid animations, weapon effects, hurt animation and controls are reused. The boss uses the existing `UnitDamage` and swept `traceImpact` OBB queries. There is no multiplayer layer in this prototype.

No shared player movement files were changed. Existing movement is 14 m/s running, 46 m/s boosted and 12/24 m/s wall-running, with unlimited duration and no movement stamina. Those existing speeds were preserved rather than adding a new cap or replacing the controller. The old speed readout is hidden in this arena. The existing weapon-charge system still powers attacks only; it does not tax movement. An arena adapter carries the player and viewing heading with articulated support transforms, without changing acceleration, jump, boost or wall-running rules.

The boss is a stationary heavy weapons platform: broad feet and legs remain planted while the waist/weapon deck pivots with limited speed and acceleration. Six launchers inherit arm/torso transforms. The continuous limb/torso boxes have walkable caps so the unchanged controller can climb, crest and circle them. The boss briefly pauses its pivot at ground contact to allow the existing wall-grab intent check to complete at high frame rates; it pivots again once the player climbs. `arena.testingPosition` defaults to `[58.8, 0, -58.8]`, in the enlarged arena’s northeast quarter (30% closer to centre than the former corner spawn), clear of the two existing buildings. No buildings are moved. The cyan route starts 30 m away; player movement and artillery targeting use the enlarged arena bounds. A camera-clearance adapter keeps the camera outside the larger body.

## Updated model and plasma Gatling attack

The original low-poly model uses chamfered armour, separate breastplates, knee/shoulder hinges, a tracked visor head, arm/forearm segments, feet and power-bank vents. Static detail is instanced by parent/geometry/material, giving about 8,000 triangles across 95 render meshes before silhouette and shadow passes. There are no new textures or licensed assets. `bastion-art.js` owns the visual rig; `bastion-model.js` keeps stable climbable volumes and synchronizes their moving transforms.

Animation includes a subtle torso idle, head tracking, shoulder bracing, a bent Gatling forearm, accelerating/decelerating six-barrel rotation, per-shot barrel recoil and muzzle flashes. Core armour opens with two sliding shutters instead of simply disappearing. Gun aim follows its articulated forearm. Body traversal and player movement remain unchanged.

The old spiral/lattice/mine/curve orb-pattern barrage is replaced by a **plasma Gatling stream** and an alternating **plasma rain** attack. The gun fires at 72 m/s (twice its previous 36 m/s speed) and uses existing pooled `RaiderEnergyEffects` for energy rings, trailing sparks and impacts. Bolts have a 2.48 m radius and are slightly elongated. Their width, length, energy rings and collision radius are four times the original Gatling bolt size. There is no active projectile splitting, mine planting or mid-flight homing in the default encounter. Odd cycles use Gatling; even cycles use plasma rain. `barrage.attackSequence` controls that order.

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
4. **Attack barrage:** Gatling lasts 7.2 seconds / 10.08 after a gap; plasma rain stays at 3.6 / 5.04 seconds. the core opens. On Gatling cycles the cannon fires the configured 72 / 88 / 104 nominal shots by escalation tier, paced across the window. Each shot independently has a seeded one-in-three chance to lead the target using its recent velocity; otherwise it aims at the target’s current position. Small spread and limited-rate aiming make steering matter. Misaligned shots are skipped rather than queued into an instantaneous burst.
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
| `gatling.speed / radius / spread` | 72 m/s / 2.48 m / 0.1404 | Bolt pacing, size and spread |
| `gatling.spinupSeconds / alignment` | 0.65 s / 0.32 rad | Spin warning and firing alignment |
| `gatling.leadChance` | 0.3333333333333333 | Independent lead probability per shot; otherwise direct aim |
| `gatling.leadSeconds / maxLeadDistance` | 5 s / 360 m | Intercept prediction bounded by projectile lifetime |
| `gatling.aimResponse / yawLimit / pitchLimit` | 12 / 1.25 rad / 1.2 rad | Stabilized weapon tracking and gun articulation |
| `gatling.gunModule / barrels` | 3 / 6 | Destructible weapon and barrel count |
| `animation.barrelSpin / spinResponse` | 32 rad/s / 3.8 | Heavy rotor acceleration and coast-down |
| `animation.recoilDistance / recoilRecovery` | 0.22 m / 9 | Per-shot recoil and slower mechanical recovery |
| `animation.armBrace / forearmBend / braceDrop` | 0.045 rad / 0.065 rad / 0.18 m | Heavy firing pose |
| `animation.headTurn / idleBob / plateOpen` | 0.38 rad / 0.015 m / 2.35 m | Head, idle and shutter motion |
| `core.health / damageMultiplier / radius` | 6000 / 3 / 1.15 m | Fight length and aim target |
| `launchers.health / positions / parents / sizes` | 360 / six attachment records | Cannon/power-bank health and colliders |
| `pulse.gapHalfAngle / linger` | 0.24 rad / 0.8 s | Gap and lingering hazard |
| `timings.gapExtension` | 0.4 | Extra core exposure after threading gap |
| `projectiles.speedScale / grazePerOrb / grazeCap` | 1 / 0.1 / 1 | Global travel scale and +100% graze cap |
| `dilation.scale` | 0.35 | World-only slowdown, player timing unchanged |
| `arena.testingPosition` | [58.8, 0, -58.8] | Spawn clear of the existing buildings |

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

Gatling plasma shots cannot be destroyed or deflected by hero attacks. Offensive collision traces pass through them, so they do not absorb attacks aimed at the boss. Defensive barriers and environmental cover still stop the shots; normal player-hit, graze, lifetime and safe-corridor behavior remains active. Other projectile types retain their existing interception rules.

The floating Bastion status/control panel is hidden during normal combat. The top boss-health bar remains visible. F2 explicitly enables the developer overlay and its controls; disabling debug or resetting the arena hides it again.

## Heavy chassis model and animation (revision 140)

Bastion has a broader 15.2m chest, 5.2m-wide armoured legs, 6.4×9.4m planted feet and 7.2m-wide shoulder housings. Layered skirts, exposed leg hydraulics, guarded sensor head, rear reactor/exhaust towers, cooling louvers, hazard panels and muted industrial armour make it read as a fortified gun platform. Extra static pieces are batched by material and parent. The complete dressed model is 13,548 triangles / 158 render meshes before silhouettes; six-barrel gun, modules and cores retain their existing hierarchy.

The lower chassis counter-transforms the weapon deck’s yaw so feet and leg colliders never skate around. Body turning is limited to 0.28rad/s with 0.5rad/s² acceleration. Walking sway is removed. Firing braces over a slower hydraulic response, with 1.5cm idle settling, 22cm barrel recoil, rotor inertia, opening cooling flaps and a restrained head look. Stun/death poses settle instead of flailing. Support carry uses the actual supporting section’s yaw, so a hero on a planted foot stays steady while one on the upper deck follows its turn. Repetition tracking uses the fixed chassis approach quadrants.

Feet and shoulder volumes have matching climbable collision caps. Exposed-core locations, gun aiming, attack order/durations, damage, destructible modules, projectiles and the arena are retained. Reset closes the core visuals immediately. Hero movement settings are unchanged.

Tune `body.turnRate`, `animation.turnAcceleration`, `poseResponse`, `headResponse`, `idleBob`, `braceDrop`, `armBrace`, `forearmBend`, `spinResponse`, `recoilDistance` and `recoilRecovery` in `bastion-config.json`. Model proportions and armour dressing are in `bastion-model.js` and `bastion-art.js`.

`QA/bastion-heavy-test.mjs` verifies planted feet during a pivot, turn limits, planted versus rotating support carry, reset and the low-poly budget. Existing state/rain/proximity suites and the desktop/touch Bastion gameplay suite verify traversal, core/weapon damage, pulse, both ranged attacks, cycles and hero switching.

## Twin treads and corrected predictive fire (revision 145)

Bastion’s old boot/leg presentation is replaced by a Johnny 5-inspired twin-tread undercarriage and shorter mechanical support pylons. It reuses the low-poly `DroneTracks` belt, shoe and wheel meshes at a fivefold chassis scale: two continuous tracks, 48 tread plates and eight road wheels. New 6.8m-high tread collision/cap volumes and the central chassis keep the base climbable. The upper 40m weapons-platform silhouette is retained. The stationary base does not falsely scroll its belts when the upper deck turns. Total model budget is 13,548 triangles / 158 meshes, including the reused instanced undercarriage.

Gatling prediction now solves constant-velocity projectile interception using the actual barrel origin and current target velocity. This replaces the old 0.65s / 18m capped estimate. Crucially, the emitted shot uses the calculated direction instead of merely following the visual barrel’s previous direction; the existing alignment check still prevents firing outside the gun’s aiming cone. There is no projectile homing. A teleport invalidates stale velocity, and prediction accounts for the existing world slowdown/speed scale without changing player movement.

The one-in-three lead probability is unchanged. Direct shots retain the 0.1404 spread. Leading shots use `gatling.leadSpreadScale = 0.25` (0.0351 per axis) so prediction produces a meaningful threat while the direct stream remains wide. `leadSeconds=5` is bounded by the five-second projectile life, `maxLeadDistance=360`, `maxTrackedSpeed=512`, `velocityResponse=20`, and stabilized weapon `aimResponse=12`. Projectile speed, radius, damage, indestructibility, attack cadence and the slow heavy body pivot are unchanged.

The arena’s enemy spawns also move 30% toward the map centre: boss position is now (58.8, -58.8), and all small-robot formation coordinates scale to 70% of their former distance. Map size and original mission spawns remain unchanged.

Verification: `QA/bastion-leading-test.mjs` checks exact intercepts at 14/32.2/46m/s across 30/60/120m, high-speed approaches, impossible-intercept fallback, emitted direction despite barrel lag, world-speed scaling and teleport history reset. `QA/bastion-moving-target-browser.cjs` drives a real boosted player straight at 46m/s in desktop/touch views: the normal mixed stream hits, and an isolated predictive stream lands three hits in two seconds in the test seed. It also checks planted tread behavior. Existing Bastion browser tests pass traversal, core/weapon damage, both attacks, repeated cycles and all hero choices with the new base.

## Segmented arms (revision 146)

Both shoulder pivots now sit at the actual shoulder height. Each arm has separate upper-arm armour, an articulated elbow axle, a child forearm casing and wrist cuff, with independent climbable volumes/caps. The previous invisible full-length arm block is removed. The forearm weapon sockets retain their original rest-world positions; their hierarchy now follows the elbow and wrist assembly naturally during Gatling bracing and the artillery lift.

Exposed axle rings, stepped armour, contrasting wrist bands, vent slats and four telescoping shoulder-to-elbow hydraulic struts separate the silhouettes. The rods track live joint endpoints. `animation.elbowBrace` (0.055rad) adds a restrained elbow bend alongside the existing slow shoulder/forearm poses; no walking sway or tread movement is introduced. The dressed model is 13,548 triangles and 158 render meshes before silhouette passes. Static dressing remains batched; the validation budget is now under 14k triangles / 165 meshes to accommodate the extra articulated surfaces.

`QA/bastion-arms-test.mjs` verifies the segment hierarchy, matching collision nodes, weapon movement with elbow articulation, hydraulic extension, rider carry on a forearm cap and reset of all weapon mounts. Existing state/rain/leading/heavy suites and the desktop/touch Bastion gameplay and moving-player aiming suites pass with the new arms.

## Stocky Heavyarms-inspired armour (revision 152)

The current appearance uses ivory limb/shoulder armour, orange chest and knee plates, a darker mechanical torso, gold vents, and green optical sensors. A new helmet has a V-fin, brow/cheek armour, paired eyes, forehead sensor and orange chin. The widened-looking chest rails, broad shoulder caps, short neck guard, chunky articulated forearms and shortened rear exhaust housings keep the silhouette stockier than a slender humanoid mecha. Paired recessed chest rotary ports, four-aperture launcher faces, and a side ammunition drum/belt on the existing Gatling gun reinforce the heavy-weapons design. Decorative chest ports do not introduce new attacks.

The articulated skeleton, physical climbable surfaces, launcher rest positions, exposed-core locations, planted twin treads and all combat tunables are retained. Core doors match the orange body palette and remain clear of decorative chest ports. The existing slow bracing, elbow flex, live hydraulics, head tracking, spinning gun/recoil, vertical artillery pose and opening core plates still drive the real model.

The new current budget is **15,056 triangles / 175 render meshes** before silhouette passes, superseding the earlier appearance counts above. Static dressing still batches by geometry/material/parent; shared low-poly primitives and the existing instanced tracks are reused. QA limits are under 16k triangles / 180 meshes to account for the helmet, chest ports and launcher apertures (about 1.5k extra triangles).

Validation: `bastion-arms-test`, `bastion-heavy-test`, `bastion-state-test`, `bastion-rain-test` and `bastion-leading-test` pass. Desktop and touch `bastion-browser.cjs` pass actual traversal, primary/core damage, destructible modules, attack cycles, world slowdown, hero/preset switching and legacy arena routing. Front/rear screenshots at `/tmp/heavy-bastion152-{front,back}-{desktop,phone}.png` were reviewed; previews confirm zero tread/foot drift during the upper-body pivot and no render errors. Physical phone FPS/thermal performance is not measured.

## Original heavy frame and recoil rig (revision 153)

Replaces the literal helmet/colour treatment with a recessed, wide three-sensor turret, asymmetric instrument blocks and grey/green armour. The frame now has wider, shorter support pylons, a solid shoulder bridge, and a separate recoil-cradle parent for the torso, head and both weapon arms. Upper-frame rest geometry is 18% wider, 14% shorter and 12% deeper. Rest transforms and collider dimensions are baked into the articulated hierarchy instead of leaving nonuniform scale on animated joints; this avoids sheared collision volumes and preserves riders on moving arm caps. The shorter pylons retain the original tread contact height.

The cradle pitches under sustained fire, stun and defeat, with slow settling. Torso compression increases to .38m, shoulder brace to .07rad, elbow flex to .09rad and forearm bend to .11rad, with pose response reduced to 1.8. Existing barrel recoil, hydraulics, vertical artillery aiming and planted-tread behavior remain integrated. Gameplay muzzle/core positions follow the re-proportioned rig. Current budget: 14,804 triangles / 173 render meshes before silhouettes.

Checks: articulated arm/cap carry, planted tread/deck carry, state/weapon/core damage, artillery and predictive fire Node checks passed. Desktop/touch integrated arena checks passed traversal, primary/core hits, module destruction, both attack cycles, all hero choices and preset switching. Front/rear visual previews passed with zero tread drift and no renderer errors. Physical phone performance is unmeasured.

## Full lower chassis and independent artillery (revision 154)

The lower half is now an enlarged twin-tread chassis; the old leg dressing is hidden and matching 18m-high side collision volumes/caps replace the pylons. The planted chassis remains fixed as the weapon deck pivots. Arms move outward from 8.2m to 12m rest mounts, with weapon sockets moved with them. An additional physical rotary coupler between elbow and forearm adds separation and independent bracing rotation.

Shoulder module 1 now carries its own vertical artillery barrel, muzzle and recoil. Plasma rain emits from that shoulder muzzle rather than the arm Gatling, which stays in its forward aiming pose. Each weapon can be destroyed separately; destroyed artillery cancels unlaunched shells while existing shells remain dangerous. City rebuild restores both. The same telegraph zones, 21-shell volley, damage and timing remain in use. State/rain tests now verify weapon independence and shoulder launch origin; arm and planted-chassis tests use the new hierarchy and dimensions. Dressed model remains below 16k triangles / 180 meshes. Desktop/touch combat and visual checks exercise the revised layout.

## Enlarged twin Gatlings (revision 156)

Both forearm modules (3 and 2) now carry six-barrel plasma Gatlings at 1.4× visual scale, with enlarged damage volumes. Both fire on each scheduled firing beat, producing 144 shots in the intact opening barrage instead of 72. Each muzzle computes its own target/intercept and spread, retaining the existing projectile speed, size, damage and lead chance. Guns have their own aim pivots, rotating barrels, recoil and muzzle flashes. Each can be destroyed independently; the other continues firing. Only destruction of both stops all Gatling fire. Shoulder artillery remains module 1.

Tunables: `gatling.visualScale`, `gatling.secondGunModule`, existing module sizes and doubled bounded projectile-pool capacity. Current model budget is 15,360 triangles / 180 meshes before silhouettes. Node state tests verify the paired shot total and independent module survival; predictive-fire, arm attachment, planted chassis and artillery tests pass. Desktop/touch arena checks cover actual combat, core hits, destruction, cycles and traversal. Front/rear visual previews show the enlarged pair without tread drift or render errors. Physical phone FPS is unmeasured.

## Sky beam / three sweeping beam walls (revision 157)

Attack rotation is now Gatling → skyfall artillery → beam-wall. The shoulder emitter fires a bright vertical sky beam for 1.8 seconds; three seeded rows of vertical energy beams then sweep along world Z across the entire combat arena. Each row has one locked 12m gap with cyan edge posts and an advance ground corridor. Subsequent gaps shift at most 18m, with waves 2.8 seconds apart, leaving time to reposition. Swept relative player/wall collision prevents fast characters tunnelling through; each wall deals at most one 95-damage hit. The safe corridor includes a .7m character margin. Walls are 70m tall and travel at 36m/s from -122 to +122, beyond playable edges.

All values are under `beamWalls` in `bastion-config.json`, including count, charge, interval, speed, extent, height, gap width/shift, beam spacing/radius, sky radius, damage and collision padding. State exposure duration covers all three passes. Close-range overlap pulses are suppressed during beam-wall barrages so the indicated gaps remain safe. The emitter's destruction, boss defeat or city reset removes the attack. Existing world slowdown and stun freeze its clock.

`bastion-beam-walls-test.mjs` passes at 30/120Hz and 75ms frames: three damaging passes vs three safe passes, high-speed crossing, emitter destruction and reset. `bastion-beam-walls-browser.cjs` passes desktop/touch: visible sky charge, three simultaneous sweeping rows with seeded gaps, completion and rebuild cleanup, no page errors. Screenshots `/tmp/beam-wall157-{sky,waves}-{false,true}.png` reviewed. Existing desktop/touch arena combat suite, state and artillery checks pass. Instanced beam geometry keeps the effect bounded; physical phone FPS is unmeasured.

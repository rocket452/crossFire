# ARGUS — convoy defense steps 2–3

Step 2 adds a moving siege boss to the existing Convoy Defense scene. The original City Battle Walker, Chinook scenario and combat arena are preserved. The step-2 foundation below contains locomotion, interception, leg-joint damage, a bus-only melee stomp and death. Step 3 now adds the attacks/phases/drones documented in its section below. No hero movement/health/control system is added or redesigned.

## Model, gait and joints

`argus-model.js` composes `SiegeWalker` with the existing 21m, 18-component Blender model and its articulated hierarchy. The existing two-bone leg solve and physical wreck builder are reused; the original patrol and ranged-weapon updates do not run on a living ARGUS. Its four orange targets attach to the left/right thigh/hip and shin/knee meshes. Each has a tagged part collision shape and 600 HP. A solid armored shutter covers the reactor; its hit part returns zero damage throughout step 2.

`argus-gait.js` owns destination-driven root translation, yaw and alternating world-space foot plants. A grounded ankle remains at its anchor while the pelvis travels/turns. Swing feet interpolate smoothly into predicted landing points. A reach guard can hold the root until the late foot lands instead of stretching the rig or dragging a planted foot. At least one foot supports the walking body. Damaged sides have shorter forward placement, longer swing time and a small body dip/lean. ARGUS finishes an in-flight step before starting its separate single-foot stomp.

Joints route through the existing `UnitDamage.hurt` → `entity.modifyDamage` convention. Only the struck joint loses local health, with 15% of that local damage also reaching the main HP pool. Destroying it extinguishes its glow, darkens the limb and emits recurring sparks. Each destroyed joint permanently reduces commanded stride speed by 15% of base speed, capped at 60% total. The defaults therefore yield multipliers **100%, 85%, 70%, 55%, 40%**. Hits on a stale destroyed target cannot apply repeated joint damage or another penalty. No regeneration/repair path exists; only City Rebuild resets joints. Normal body hits still damage the main hull normally. AI allies retain their normal torso aiming and do not acquire joints automatically.

## Interception

The lane graph is in `convoy-config.json` under `map.interceptionLanes`; routing/forecast helpers live in `convoy-map-config.js`. The north-east approach deliberately crosses a building block, then joins the existing street lanes and convoy boulevard. Virtual start/goal points project onto edges, so replanning partway along a lane does not require backing up to its starting node.

Every 3 simulation seconds ARGUS searches future times in 2-second increments, up to 130 seconds. For each surviving bus it forecasts the lead convoy's route progress, subtracts that bus's formation offset, then checks whether lane travel time at its current damaged stride speed plus a 3-second breach allowance can reach that future point. Forecasts include startup, the remaining time at the current pickup, both scheduled pickup waits and exits. It selects the earliest feasible intercept. Escaped buses and predictions beyond each bus's exit are excluded. If none is feasible, ARGUS heads for a final blocking point on the remaining exit route.

Replanning also happens immediately on pickup arrival/departure, bus loss/escape, and joint destruction. An extended current pickup timer changes the next periodic forecast; hero positions never enter movement planning. Travel-time estimates do not simulate every future building collapse or foot-support pause, so the next periodic plan corrects for actual delays.

## Building obstruction

Before accepting a walking pose, ARGUS sweeps conservative world bounds of its articulated hull, closed shutter and joint housings between the previous and trial poses. If those bounds intersect an intact, collidable city section, it rolls back the trial root/feet and damages the contacts using `physics.impact(...,{source:'argus'})`. It waits until the blocking sections detach or become non-colliding through existing destruction rules. This is a conservative collision gate, not a character rigid-body solver; it may breach a little extra space around a limb, but never commits a walking pose inside intact collidable geometry.

`destruction.js` recognizes `argus` alongside `siege-walker` and `bastion`: full boss building damage is applied. The existing 90% reduction for other sources remains. Intact geometry is not hidden/teleported/disabled to bypass this gate. Building damage, support collapse, debris activation and scorch use the original systems and budgets.

## Bus stomp, stun and death

A bus within 7.5m makes ARGUS stop advancing. With both feet planted and cooldown ready, it flashes yellow and marks the bus's locked ground position for a 0.8s windup. The right foot lifts and slams down, with dust/sparks and an expanding impact ring. A bus receives 120 damage only if it remains nearby, inside the marked impact radius, and unobstructed at impact. The attack has 0.45s recovery and 3.5s cooldown. It does not damage heroes or civilians directly. Existing hero stuns interrupt the windup and preserve all joint penalties; the existing electrical stun effect is wired to ARGUS.

At zero main HP it buckles using the original Walker death pose, breaks into 18 Cannon wreck bodies and emits the existing reactor explosion/smoke. Its core/joint lights shut off and combat hit shapes clear. The convoy continues; killing ARGUS cannot set mission success. City Rebuild removes wrecks and restores exactly one fresh ARGUS and the original convoy manifests. As in step 1's kinematic convoy, loose wrecks do not become permanent bus-route blockers.

## Files and tuning

- `dist/argus-config.json`: main HP 10,000; spawn `(96,54)`; base stride 1.15m/s; turn rate 0.48rad/s; gait reach/step/limp parameters; all four joint locations/HP/radius, permanent flag, speed penalties and hull transfer; closed-core/body damage scaling; replan/prediction parameters; breach power/cadence; melee range/windup/damage/recovery/cooldown; collapse duration.
- `dist/argus-model.js`, `dist/argus-gait.js`, `dist/argus.js`: art adapter, planted locomotion and encounter controller.
- `dist/convoy-config.json`, `dist/convoy-map-config.js`: lane data plus read-only route forecast/graph helpers. Existing bus/civilian tuning is unchanged.
- `dist/battle.js`: actor loading, hero targeting/damage/stun adapters, update/reset/wreck integration, ARGUS HP/joint status, silhouettes and radar.
- `dist/destruction.js`: boss damage-source recognition only.
- `dist/hero-minimap.js`: optional boss display name.
- `dist/convoy.css`, `dist/index.html`, `dist/game-entry.js`, convoy module import: boss HUD and cache updates.

The most useful first-playtest knobs are base speed, joint HP, replan interval/breach allowance, melee range/damage/cooldown and main hull HP. Leave the reach guard/ankle height alone unless changing the rig proportions.

## Testing

`node QA/argus-test.mjs` checks the real Walker mesh/rig at 30/60/120Hz, rendered planted-ankle stability/IK, predicted interception, bus damage, all four permanent joint penalties, no duplicate joint damage, core immunity, shorter damaged-side strides, stop-delay/departure replans, collision-gated building breaches, full boss building damage, interrupted melee, 18 physical death pieces, continuing mission victory, and reset cleanup. `QA/walker-fixture.mjs` supplies the original GLB geometry for these tests.

`node QA/argus-browser.cjs` checks desktop and touch against the real city: all four joint hits through shared weapon collision/damage routing, HP HUD, zero committed intact-section overlaps, actual destruction, delayed-stop replanning, bus slams, all joint losses, death with the mission still active, surviving buses subsequently exiting, wreck cleanup/reset, default CPU allies, Volt control entry/movement/exit and existing stun VFX. Screenshots show the moving model, stomp and wreck. Physical-phone FPS/thermal performance is unmeasured.

Existing convoy lifecycle tests, original Walker gait tests, evacuation lifecycle/target policy tests and minimap checks pass. The Chinook desktop/touch cycle regression is also run; its evacuation source files remain unchanged.

## Manual acceptance

1. Choose **Convoy Defense**; ARGUS starts at the north-east edge. **Watch convoy** follows the buses. Orbit toward the north-east block to watch its approach and building breach.
2. Choose Volt or Kage and aim at the four orange hip/knee targets. Each break permanently steps STRIDE down by 15%; inspect the damaged side's shorter step and dark/sparking target. The HUD reports disabled joints and current stride percentage.
3. Let it reach the convoy: it plants its feet, flashes yellow, raises a foot, then damages a bus after the warning. A bus that leaves the locked impact area can escape the hit.
4. Damage ordinary armor to kill ARGUS; the closed reactor shutter remains immune. Observe buckling, exploding physical wrecks and smoke. The mission must continue until surviving buses exit.
5. Rebuild to restore the boss/joints and convoy. The original step-2 baseline did not include ranged attacks; step 3 below now enables them.

Step 2 was accepted. The authorized step-3 implementation follows below.

## Step 3 — attacks, phases and repair drones / revision 194

The step-2 locomotion/joint system remains. `argus-attacks.js` adds the shared ranged cast scheduler, warnings, flak shells, tether anchors, lance/contact ramp and temporary hero statuses. `argus-repair-drones.js` adds independent damageable repair actors and bounded physical wrecks. All gameplay values are in `argus-config.json`. No additional dependencies, hero HP/death, playable flight, map replacement or general mission framework were added. Step 4 HUD/balance work has not started.

### Default attack values

| Attack | Warning and cadence | Effect |
| --- | --- | --- |
| Flak | 0.9s firing-part warning, 0.7s tracer flight, 7s cooldown (4.9s in phase 3); initial delay 4s | Four locked 5m-radius burst volumes; 24 damage per burst; height band 26–54m; horizontal acquisition range 48m. One volume marks the selected airborne hero's current location and three surround it with 10m offsets. Burst flashes last 0.5s. |
| Tethers | 0.9s warning, 0.35s anchor flight, 0.8s cable arming; 8s cooldown (5.6s in phase 3); initial delay 8s | At most 3 cables, each with two 140HP glowing anchors. Height 2.4m; active lifetime 30s. Crossing at >=6m/s deals 12 damage, yanks horizontally at 18m/s with 3m/s upward impulse, slows movement 40% for 1.5s, then grants 3 further seconds of tether immunity. |
| Lance | 0.9s warning, up to 4s firing, 3s cooldown (2.1s in phase 3) | Hero-only beam: 1.15rad/s tracking, 0.35 lead factor over 0.12s (2m maximum lead), 120m range, 0.9m collision radius. Damage ramps from 12 to 60 per second over 3s of contact. |
| Bus stomp | At least 0.8s warning; 3.5s cooldown (2.45s in phase 3), 0.45s recovery | Existing 120 bus damage within its locked impact area; unchanged bus-only targeting. |

A shared cast scheduler and 0.5s recovery can delay a ready ranged attack while another cast/stomp is busy. Cooldowns are configured base recovery values, not a guarantee of exact simultaneous firing periods. Pending flak shells and existing cables can coexist with a later cast. Every new cast has a hard minimum 0.8s telegraph, including if a lower windup is configured; phase 3 never speeds the warning. The firing part glows. `onCharge(kind,seconds)` connects to a rising WebAudio tone using the existing hero sound preference/unlocked audio context. Browser autoplay rules mean it stays silent until audio is unlocked by user interaction.

### Flak safety and defenses

Flak centers lock during the warning instead of chasing a hero at detonation. Tracer shells stop at scenery; blocked shells produce a harmless visual burst. A burst tests only enabled, non-phased airborne heroes, never buses/civilians/grounded or wall-running heroes. It also excludes a hero at or below the nearest intact neighborhood roof plus 2m (24m roof-search radius), and checks cover from the burst to the hero. Violet's active barrier protects his own blast exposure and receives the absorbed damage; physical barriers can also intercept blast rays to other heroes. These hits use existing hurt/contact feedback and an encounter damage tally, not a new hero health system.

### Cable placement and cleanup

Pairs of surviving nearby buildings on opposite sides of an existing street supply anchors. Each anchor retains its actual supporting `DestructionWorld` section and building ID. Placement requires clear firing paths; cables do not arm until after the warning and anchor flight. Each frame a cable is removed if either anchor dies, its supporting section is hidden/detached/dead/non-colliding, its building loses collision, or **any support floor of either building enters structural collapse**. Its configured lifetime also expires it. Removing a cable removes both anchor meshes, hit shapes and UnitDamage registrations; no invisible line remains.

Swept hero movement is checked against the cable, so sprinting/dashing across between frames cannot tunnel through it. A temporary controller multiplier implements the 40% slow, including normal/wall movement and Kage's dash; its default is exactly 1 in every other scene. The yank uses the existing swept knockback path. CPU flyers receive a bounded collision-tested drift. Electric phasing and real teleports skip cable sweep contact; a teleport's start/end are not treated as physical movement through the intervening street. Buses and civilians are not queried. Death/reset clears temporary movement statuses.

### Lance, open core and stun

The arm aims during the warning and retains its tracked pose between walking updates. Its beam stops at scenery/barriers and only queries hero hit shapes; it does not damage buses, civilians, ARGUS, anchors or repair drones. A miss/cover break longer than 0.5s ends the beam early and resets contact. On uninterrupted contact, thresholds at 33%, 66% and 100% of the 3s ramp each trigger once: horizontal impulses 10/18/28m/s with upward impulses 2/4/7m/s. Moving out of its path can prevent later thresholds. Existing swept knockback handles player collision; no stamina or permanent player speed cap is introduced.

While firing, the reactor shutter opens and the exposed core gets a tagged hit shape. Hits deal 2.5x hull damage and accumulate raw damage toward a core stun. The required raw damage is snapshotted per cast: `350 + 0.4 × currentCoreArmor`, initially **590**. Core armor starts at 600 and core hits wear it down. A successful overload cancels the lance, halts ARGUS for 3s and exposes the core/intact joint targets with the existing electric stun VFX. Destroyed joints remain destroyed. Existing hero stuns also interrupt casts and, by the configured `exposeCoreWhileStunned`, expose the core. Closed-core shots remain blocked.

Enemy-owner filtering in `battle.js` recognizes `argus` and `argus-*`; ARGUS-owned hits/explosions cannot hurt robot allies or itself. The new flak/lance damage paths use hero-only queries, independently of those generic filters. Existing player attacks still hit anchors, drones, joints and the open core normally.

### Drones and phases

Crossing below 66% HP enters phase 2 and spawns two 220HP repair drones, capped at two alive. They fly at 12m/s, route around city cover and the boss hull, then channel a visible beam for 10s to restore the target's initial missing HP. Further incoming damage can outpace that repair. A damaged surviving joint takes priority over core maintenance, including interrupting an ongoing core-maintenance channel. Different drones reserve different joint targets. With no damaged surviving joint, they re-armor the shutter; this restores core armor/stun resistance, not main hull HP.

A zero-HP/destroyed joint is excluded before and during every channel. No repair path clears its permanent flag or speed penalty. Killing a drone interrupts its beam and creates a smoking physical wreck (12s lifetime; at most four drone wrecks retained). If fewer than two remain, one replacement arrives after 30s, then another after a further 30s if still needed. Boss stuns do not freeze independent drones; stunning a drone itself interrupts its channel. Boss death destroys the remaining drones and clears all pending offensive hazards. Rebuild removes their units, beams, statuses and wreck bodies. No new actors respawn after the convoy resolves.

Phase 1 is above 66% HP: flak and tethers, with the existing lance available against a directly controlled hero (`playerMinimumPhase: 1`). CPU lance targets retain `minimumPhase: 2`. Phase 2 adds lance/drones. Below 33%, phase 3 multiplies stride speed by 1.25 and attack cooldowns by 0.7; destroyed-leg penalties still multiply that speed and are never refunded. Red visor overdrive and faster activity provide a world cue. The existing compact status line reports phase; Step 4 HUD, results and measured balance are complete; see `CONVOY_DEFENSE.md` for the authoritative full config reference and simulation results.

### Step-3 verification and limits

- `QA/argus-attacks-test.mjs`: warning floor; airborne flak, rooftop/ground/cover/shield safety; swept tether contact, yank/slow/immunity, teleport bypass, destroyed anchor/collapse cleanup; lance ramp/three impulses, LoS end, bonus-core stun; repairs, permanent joint loss, single-drone respawn cap; phase multipliers, death/reset cleanup and real movement-speed scaling including Kage dash.
- `QA/argus-attacks-browser.cjs`: desktop/touch real-city checks for those interactions through shared gameplay/damage/physics hooks, actual support collapse, actual building cover, open-core weapon collision, friendly-fire filters, repair flight and complete reset. Screenshots inspect firing-part warnings, flak zones and the beam/core.
- Existing ARGUS planted-gait/interception tests, speedster ground/wall movement tests, Kage motion/jump/dash/phasing tests and Chinook evacuation-cycle browser regression pass. Existing city/Chinook evacuation files are untouched.
- Flight acceptance is tested using the existing CPU flyer and automation; playable flight remains outside the approved scope. Physical-phone FPS/thermal performance is not measured. Drone navigation is intentionally simple obstacle avoidance, not a navmesh. Existing portal projectile redirection is unchanged; these new fused flak/anchor effects are not wired into gateway redirection in this pass.

Step 3 stops here. Step 4 requires separate authorization.

# ARGUS — model, locomotion and interception

The existing Convoy Defense boss reuses the Walker rig and the city’s damage/physics systems. This document records its model and locomotion foundation. Current combat, quake pylons, complete tuning and measured balance are documented in [CONVOY_DEFENSE.md](CONVOY_DEFENSE.md).

## Model, gait and joints

`argus-model.js` composes `SiegeWalker` with the existing 21m, 18-component Blender model and its articulated hierarchy. The existing two-bone leg solve and physical wreck builder are reused; the original patrol and ranged-weapon updates do not run on a living ARGUS. Its four orange targets attach to the left/right thigh/hip and shin/knee meshes. Each has a tagged part collision shape and 600 HP. A solid armored shutter covers the reactor; it is immune while closed, opening during lance fire and core stun.

`argus-gait.js` owns destination-driven root translation, yaw and alternating world-space foot plants. A grounded ankle remains at its anchor while the pelvis travels/turns. Swing feet interpolate smoothly into predicted landing points. A reach guard can hold the root until the late foot lands instead of stretching the rig or dragging a planted foot. At least one foot supports the walking body. Damaged sides have shorter forward placement, longer swing time and a small body dip/lean. ARGUS finishes an in-flight step before starting its separate single-foot stomp.

Joints route through the existing `UnitDamage.hurt` → `entity.modifyDamage` convention. Only the struck joint loses local health, with 15% of that local damage also reaching the main HP pool. Destroying it extinguishes its glow, darkens the limb and emits recurring sparks. Each destroyed joint permanently reduces commanded stride speed by 15% of base speed, capped at 60% total. The defaults therefore yield multipliers **100%, 85%, 70%, 55%, 40%**. Hits on a stale destroyed target cannot apply repeated joint damage or another penalty. Destroyed joints have no rebuild path; drones may re-armor only surviving joints. City Rebuild resets all joints. Normal body hits still damage the main hull normally. AI allies retain their normal torso aiming and do not acquire joints automatically.

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

The current desktop/touch ARGUS browser checks (`argus-pylons-browser.cjs`, `argus-attacks-browser.cjs`, `argus-solo-browser.cjs`, `argus-hit-flash-browser.cjs`) cover real city/controller/rendered combat integration. See the convoy validation report for this revision’s completed checks.

Existing convoy lifecycle tests, original Walker gait tests, evacuation lifecycle/target policy tests and minimap checks pass. The Chinook desktop/touch cycle regression is also run; its evacuation source files remain unchanged.

## Manual acceptance

1. Choose **Convoy Defense**; ARGUS starts at the north-east edge. **Watch convoy** follows the buses. Orbit toward the north-east block to watch its approach and building breach.
2. Choose Volt or Kage and aim at the four orange hip/knee targets. Each break permanently steps STRIDE down by 15%; inspect the damaged side's shorter step and dark/sparking target. The HUD reports disabled joints and current stride percentage.
3. Let it reach the convoy: it plants its feet, flashes yellow, raises a foot, then damages a bus after the warning. A bus that leaves the locked impact area can escape the hit.
4. Damage ordinary armor to kill ARGUS; the closed reactor shutter remains immune. Observe buckling, exploding physical wrecks and smoke. The mission must continue until surviving buses exit.
5. Rebuild to restore the boss/joints and convoy. Observe quake-pylon ground warnings and the lance counter when taking direct hero control.

The locomotion foundation is preserved by the current combat implementation.

## Current combat — quake-pylon revision 198

Quake pylons replace the former tether system. The retained `attacks.tether` JSON is inert; cable/anchor and hero slow/yank/immunity runtime code has been removed. See [CONVOY_DEFENSE.md](CONVOY_DEFENSE.md) for active placement/pulse tuning, current phase behavior, cleanup rules, before/after balance and test commands. Existing flak, manually controlled hero lance counterplay, core exposure/stun, repair limits and local weak-point hit flashes remain. Shared movement changes only remove the obsolete external slow multiplier.

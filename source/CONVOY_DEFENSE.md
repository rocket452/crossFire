# Convoy Defense — ARGUS and quake pylons

Choose **Scene → Convoy Defense** or `?scene=convoy`. This is the existing Three.js/Cannon-es game and destructible city. Quake pylons replace tether harpoons completely. The entire `attacks.tether` JSON object is retained unchanged for future repurposing, but no runtime code reads it. There are no cables, wall anchors, tether targeting, yank, movement slow or tether immunity states.

## Scenario flow and accounting

Four buses start with eight passengers each, 14m apart. After 5s they travel at 4m/s, stopping at route distances 76m and 124m (world X=0 and X=48) for 35s each. Each stop spawns 24 civilians in groups of twelve. They follow sidewalks and board automatically. Each bus has 24 seats and 1,680 HP. Ground people may select another available bus, but **aboard passengers never transfer**.

Passengers count as saved only when their own bus crosses the exit at X=116, its rear beyond playable X=108. A destroyed bus loses its passengers. Left-behind ground civilians remain vulnerable in the world; they are unsaved, not killed. Direct quake rings do not damage civilians. Losing a bus to a ring still loses its passengers.

The mission resolves when every bus is escaped or destroyed. At least one escaped bus wins; all buses destroyed without an escape fails. Destroying ARGUS never finishes the mission. The report freezes saved/killed/left-behind counts, buses escaped, simulation completion time, boss status and rank. All 80 planned civilians are the denominator, including unreached pickups (left behind, never killed). Ranks: S ≥90%, A ≥75%, B ≥50%, C below 50%. Keep observing and Results preserve the snapshot; Rebuild resets the mission. Pause/result-dialog behavior remains unchanged.

## ARGUS combat and preserved rules

ARGUS uses its own original 20.8m ASTER model and articulated frame, retaining world-space planted feet, lane forecasting and building-breach behavior. Its dedicated compound wreck adapter preserves the existing physics callback contract. See [ARGUS_ASTER.md](ARGUS_ASTER.md). Four 600-HP leg joints permanently remove 15% stride speed each, capped at 60%. Destroyed joints stay dark and are never rebuilt. Surviving-joint repair cannot reverse a recorded speed penalty. Accepted joint and exposed-core hits briefly flash red, independently of the hull.

Phase 1 has flak and quake-pylon placement. The existing lance can counter a directly controlled hero from phase 1; CPU lance targets unlock below 66% HP in phase 2, alongside two repair drones. Below 33%, phase 3 multiplies stride speed by 1.25 and attack cooldowns by 0.7. **No warning is shortened below 0.8s.** ARGUS still moves to intercept the convoy, not chase heroes.

Flak retains four airborne bursts, 0.9s warning + 0.7s flight, radius 5m, altitude band 26–54m, 24 feedback damage and 7s cooldown. Ground/wall-running heroes, roof-height/covered targets and active Violet barriers retain their protections. Flak never harms buses or ground civilians.

Lance uses a 2.2s flashing warning, up to 12s firing, 3s cooldown, tracking/lead and 12→60 feedback DPS over 3s contact. Impulses at 33/66/100% ramp are 10/18/28m/s horizontally and 2/4/7m/s upward. More than 0.5s without contact/line of sight ends the beam and resets the ramp. The exposed core applies 2.5× hull damage; 350 + 0.4 × current shutter armor incoming core damage triggers 3s stun. Full armor is 600, so the initial threshold is 590. The lance does not damage civilians or buses.

Two 220-HP drones arrive in phase 2; replacement is one every 30s below the cap of two. A beam repairs the HP missing from a surviving joint over 10s, or shutter armor if no damaged living joint is available. No hull healing, destroyed-joint rebuilding or permanent-penalty reversal exists. Bus stomp remains 120 damage, 0.8s warning, 0.45s recovery and 3.5s cooldown.

## Pylon placement and lifecycle

Placement uses the shared ranged scheduler: initial delay 8s, then an 8s cooldown after each landing/cast, competing normally with flak/lance and bus stomps. Phase 3 reduces placement cooldown to 5.6s. There are at most three reserved/deployed stakes. Pending placements count toward the cap. Destroyed stakes free a slot immediately; there is no automatic stake lifetime.

Candidates sample the convoy’s **remaining route**, including upcoming stops and the exit, every 8m. They sit 4m to either side of the route, outside the bus lane. Ranking prefers the position closest to forecast convoy progress 8s ahead, with a small distance-to-boss tie-breaker. Candidates must be within 65m of ARGUS, at least 8m from its root and 10m from another stake; inside map bounds; on supported open ground; and clear of building footprints and major collision geometry. If no remaining-route position is available, candidates come from the existing street/interception graph. No new streets or map layout were added.

A 3m ground marker brightens during the 0.9s placement warning. The stake descends through the final 30% of that warning, from 8m up, then lands with the existing spark/dust impact callback. It has a 140-HP hit shape and a glowing core. The existing ARGUS emitter glows and uses the charge sound hook during placement.

Each landed stake independently charges for 0.9s with rising core/ground glow and the shared sound hook, then emits a ring. The ring expands at 12m/s to 18m radius (1.5s travel), then fades for 0.35s without continuing to deal damage. Pulses repeat every 4s including the charge; phase 3 reduces this to 2.8s while charge stays at least 0.8s. Landed stakes remain autonomous during a boss stun; a stun cancels a still-pending placement.

A low/grounded hero touched by the swept ring takes 16 feedback damage plus an **outward** 14m/s horizontal, 4m/s upward impulse through the existing knockback API (0.45s duration, damping 2). Feet above 1.5m relative to local ground are safe. Wall-runners and heroes on roofs are safe. A low jump is only safe once it clears that height. Solid building cover blocks contact. Each hero can be hit once by each ring, with no global immunity window; other rings remain independent. Teleports bypass intervening ground, and the existing phased rescue dash remains phased.

A ring passing under the actual oriented bus footprint deals 60 HP once per ring per bus, moving or stopped. The swept intersection checks hero movement and bus motion, so fast crossings cannot tunnel through it. The system addresses only buses and heroes: civilians, ARGUS, its drones, other stakes and buildings receive no quake damage. Normal shared enemy-owner filtering remains in place for projectiles/explosions.

## Support validation and cleanup

The existing city uses a fixed physics ground plane, not destructible road tiles. The default support adapter validates that body remains in the physics world with collision enabled. Placement is rechecked on landing and support is checked each update. A `getPylonGround(point)` adapter can return `{height, body, section}` for destructible street support. A missing ground result, detached/hidden/collision-disabled/depleted section, removed/disabled body or a height change over 0.5m invalidates the stake.

Destroying or invalidating a stake immediately removes its unit/hit shapes, warning, charge and **all of its rings**. Its remaining mesh falls/tilts for 0.7s as a cosmetic effect, without blocking buses, then is disposed. Reset, boss death and mission completion clear stakes, rings, falling meshes and previous-position bookkeeping. A lethal ring that resolves the mission clears them before the result dialog pauses the game. Diagnostic counters survive completion until reset.

## HUD and shared-code removal

The existing boss bar now includes **PYLONS n/3**. The convoy HUD still shows route/stops/exit, pickup countdown and numeric per-bus HP/passengers. Its radar retains buses, stops, exit and ARGUS, without individual civilian dots. Stakes remain visible world threats and use the existing enemy through-cover silhouette registration.

Removal touched shared code in three places: `battle.js` no longer calls the tether pre-hero slow adapter; its ARGUS silhouette list now registers stakes rather than cable anchors; and the unused `externalSpeedScale` field/multipliers were removed from `runner-motion.js` and Kage’s ground/air dash code in `ninja-motion.js`. Their normal movement speeds, jumps, steering and other knockback behavior are preserved. Entry/dependency cache versions were bumped to `quake-pylons-198`. No collision, damage, city-destruction, Walker or Chinook implementation was rewritten.

## Measured before/after balance

Reports: `QA/convoy-pylons-balance-results.json`. Reproduce with `node QA/convoy-balance.mjs` and `node QA/convoy-balance.mjs --baseline`. The baseline option extracts the accepted pre-pylon source `accd002` into an isolated temporary directory and runs its actual simulation, then removes that temporary snapshot. It does not emulate old attacks using the new code.

Both runs use 60Hz, the articulated model, sixteen-building city, real Cannon/destruction and bus damage, no hero attacks, and specified joints broken at time zero. Normal trials retain phase-1 hull HP. Extra stress trials start in phase 3. Bus routes/timings/health, boss movement/HP, joints and stomp damage were **not retuned** for this replacement.

| Early broken joints | Before: saved / buses escaped | Pylons: saved / killed / left behind | Pylons: buses escaped | First bus damage | Finish |
| --- | --- | --- | --- | --- | --- |
| 0 | 80 / 4 | 40 / 40 / 0 | 2 | 61.083s | 133.583s |
| 2 | 80 / 4 | 60 / 20 / 0 | 3 | 64.133s | 133.583s |
| 3 | 80 / 4 | 80 / 0 / 0 | 4 | 67.083s | 133.583s |
| 4 | 80 / 4 | 80 / 0 / 0 | 4 | 67.083s | 133.583s |

The healthy unattended run deploys three stakes, emits 87 pulses, records 80 bus-ring hits and **4,800 ring damage** across the convoy. Its bus HP at resolution is `[0,0,540,1020]`; the first two buses and their 40 passengers are lost. Original first bus damage was 103.833s. Current first body/stomp-range contact with a bus is 107.783s; ARGUS is within stomp range of the final route segment at 102.583s. Stomp-range arrival remains 31s before the final exit, but pylons threaten remotely much earlier.

With phase 3 active from the start, three broken joints yield **40 saved / 40 killed / 2 escaped buses**, 5,520 ring damage; four broken joints yield **60 saved / 20 killed / 3 escaped buses**, 4,680 ring damage. ARGUS itself never reaches a bus in those damaged-joint trials. Breaking joints slows the boss permanently, but does not neutralize already-deployed remote hazards. Players must also destroy stakes or otherwise protect the evacuation. Rings never directly reduce ground civilian HP in these trials; losses are aboard destroyed buses.

Stomp-only survivability is unchanged: 1,680 HP requires 14 impacts of 120. A parked bus survives 61.75s after the first hit in phase 1, 48.1s at phase-3 cadence (impact intervals 4.75s/3.7s). These isolated stomp numbers exclude pylons. The result is a scripted prototype benchmark, not measured human difficulty or physical-phone performance.

## Complete configuration reference

Reload changed JSON and rebuild. Distances use metres; durations/intervals/cooldowns use simulation seconds; speeds use m/s; angular speeds use rad/s. Map positions are `[x,z]`, local model offsets `[x,y,z]`, graph links zero-based node indices and fractions 0–1. The original convoy and ARGUS fields remain below. Every `attacks.tether.*` row is intentionally retained **unused**. Active pylon values have their own table.

### `dist/convoy-config.json`

| Setting | Final value | Controls |
| --- | --- | --- |
| `busCount` | `4` | Number of buses (validated 3–4). |
| `capacity` | `24` | Maximum permanent passenger manifest per bus. |
| `initialPassengers` | `8` | Passengers already aboard each bus at reset. |
| `busHealth` | `1680` | Maximum bus HP. |
| `busSpeed` | `4` | Convoy route speed. |
| `busSpacing` | `14` | Distance between bus centers on route. |
| `startupDelay` | `5` | Staging time before driving. |
| `pickupDuration` | `35` | Fixed boarding window at each stop. |
| `civiliansPerPickup` | `24` | Civilians spawned per pickup. |
| `civilianGroupSize` | `12` | People per recognizable moving group. |
| `civilianHealth` | `35` | HP per ground civilian. |
| `civilianSpeed` | `3.8` | Group route speed. |
| `civilianSpacing` | `0.6` | Spacing between formation members. |
| `civilianColumns` | `3` | Formation column count. |
| `civilianPathRadius` | `1.15` | Ground navigation clearance sweep radius. |
| `boardingInterval` | `0.22` | Time between boarding people per group. |
| `boardingRadius` | `0.8` | Maximum door distance for boarding. |
| `busWidth` | `3.2` | Bus body width. |
| `busLength` | `10` | Bus body length. |
| `busHeight` | `3.4` | Bus body height. |
| `doorOffset` | `[2.6,0,1.7]` | Local approach point at bus door. |
| `wreckAvoidOffset` | `3.8` | Lateral route offset around a bus wreck. |
| `wreckAvoidInner` | `12` | Full bypass offset within this route distance of a wreck. |
| `wreckAvoidOuter` | `24` | Blend-to-bypass distance around a wreck. |
| `smokeInterval` | `0.45` | Bus wreck smoke emission interval. |
| `map.bounds.minX` | `-132` | City/playable bounds on this axis. |
| `map.bounds.maxX` | `108` | City/playable bounds on this axis. |
| `map.bounds.minZ` | `-60` | City/playable bounds on this axis. |
| `map.bounds.maxZ` | `60` | City/playable bounds on this axis. |
| `map.movementBounds.minX` | `-128` | Hero movement clamp on this axis. |
| `map.movementBounds.maxX` | `104` | Hero movement clamp on this axis. |
| `map.movementBounds.minZ` | `-56` | Hero movement clamp on this axis. |
| `map.movementBounds.maxZ` | `56` | Hero movement clamp on this axis. |
| `map.heroStart.x` | `-42` | Initial player hero position component. |
| `map.heroStart.y` | `0.08` | Initial player hero position component. |
| `map.heroStart.z` | `8` | Initial player hero position component. |
| `map.route` | `[[-76,0],[116,0]]` | Ordered city-space route vertices; final vertex is the exit. |
| `map.pickupSidewalkZ` | `-5.3` | Shared civilian sidewalk Z coordinate. |
| `map.pickups[0].name` | `"West residences"` | HUD pickup label. |
| `map.pickups[0].distance` | `76` | Stop position measured along the route from its first vertex. |
| `map.pickups[0].sources` | `[[-36,-5.3],[-12,-5.3]]` | Civilian emergence positions on nearby building sidewalks. |
| `map.pickups[1].name` | `"East residences"` | HUD pickup label. |
| `map.pickups[1].distance` | `124` | Stop position measured along the route from its first vertex. |
| `map.pickups[1].sources` | `[[12,-5.3],[36,-5.3]]` | Civilian emergence positions on nearby building sidewalks. |
| `map.roadHalfWidth` | `6` | Half-width of the convoy debris-clearance corridor. |
| `map.debrisClearInterval` | `0.5` | Settled road-debris collision-release check interval. |
| `map.interceptionLanes.nodes` | `[[-120,0],[-96,0],[-72,0],[-48,0],[-24,0],[0,0],[24,0],[48,0],[72,0],[96,0],[116,0],[-48,24],[-24,24],[0,24],[24,24],[48,24],[-48,48],[-24,48],[0,48],[24,48],[48,48],[36,54],[36,24],[96,54]]` | ARGUS interception-lane node positions, indexed from zero. |
| `map.interceptionLanes.links` | `[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,7],[7,8],[8,9],[9,10],[11,12],[12,13],[13,14],[14,15],[16,17],[17,18],[18,19],[19,20],[3,11],[11,16],[4,12],[12,17],[5,13],[13,18],[6,14],[14,19],[7,15],[15,20],[21,22],[22,14],[22,15],[23,21]]` | Undirected traversable graph edges as node-index pairs. |
| `results.rankThresholds.S` | `0.9` | Minimum saved/planned-total fraction for this grade. |
| `results.rankThresholds.A` | `0.75` | Minimum saved/planned-total fraction for this grade. |
| `results.rankThresholds.B` | `0.5` | Minimum saved/planned-total fraction for this grade. |
| `results.rankThresholds.C` | `0` | Minimum saved/planned-total fraction for this grade. |

### `dist/argus-config.json`

| Setting | Final value | Controls |
| --- | --- | --- |
| `weakPointFlash.seconds` | `0.18` | Duration of a local weak-point hit flash. |
| `weakPointFlash.retriggerSeconds` | `0.1` | Minimum age before sustained hits restart the flash pulse. |
| `weakPointFlash.color` | `"#ff304a"` | Red hit-flash color on the damaged target only. |
| `weakPointFlash.intensity` | `5` | Added emissive intensity at peak flash. |
| `health` | `10000` | ARGUS main hull HP. |
| `spawn.x` | `96` | Initial ARGUS world-space coordinate. |
| `spawn.z` | `54` | Initial ARGUS world-space coordinate. |
| `spawn.yaw` | `3.141592653589793` | Initial facing in radians. |
| `movement.speed` | `1.15` | ARGUS base stride speed before permanent joint/phase multipliers. |
| `movement.turnSpeed` | `0.48` | Maximum root yaw rate. |
| `movement.waypointRadius` | `0.18` | Distance to consume an interception-lane waypoint. |
| `movement.arrivalRadius` | `0.7` | Arrival tolerance at the intercept endpoint. |
| `interception.replanInterval` | `3` | Regular intercept forecast refresh interval. |
| `interception.predictionStep` | `2` | Future convoy sampling increment. |
| `interception.maximumPrediction` | `130` | Maximum forecast horizon. |
| `interception.minimumLead` | `2` | Minimum look-ahead when choosing an intercept. |
| `interception.breachAllowance` | `3` | Estimated extra seconds for obstruction when scoring an intercept. |
| `gait.lateral` | `1.75` | Half-width of left/right foot attachment stance. |
| `gait.ankleHeight` | `1.62` | World planted ankle height. |
| `gait.pelvisHeight` | `-0.65` | Root/pelvis base vertical offset. |
| `gait.stepTrigger` | `0.95` | Foot placement error before starting a swing. |
| `gait.stepLead` | `0.25` | Extra forward foot placement lead distance. |
| `gait.swingDuration` | `0.65` | Undamaged foot swing time. |
| `gait.stepLift` | `0.8` | Peak foot lift. |
| `gait.maxSupportReach` | `2.55` | Maximum planted support reach before root waits. |
| `gait.damagedStrideScale` | `0.22` | Per broken joint on that side, reduce stride fraction (clamped internally). |
| `gait.damagedSwingExtra` | `0.18` | Extra swing-time fraction per broken joint on that side. |
| `gait.limpDrop` | `0.1` | Pelvis drop amplitude per damaged-side swing. |
| `gait.sway` | `0.12` | Swing-dependent lateral body sway amplitude. |
| `joints.health` | `600` | Maximum HP per leg-joint target. |
| `joints.permanentDestruction` | `true` | Retain permanent joint destruction; keep true under locked design. |
| `joints.speedPenalty` | `0.15` | Stacking speed fraction lost per destroyed joint. |
| `joints.maximumSpeedPenalty` | `0.6` | Cap on total permanent stride reduction. |
| `joints.hullDamageScale` | `0.15` | Joint-hit damage fraction also applied to hull. |
| `joints.radius` | `0.72` | Joint target hit/visual radius. |
| `joints.sparkInterval` | `0.45` | Destroyed-joint spark emission interval. |
| `joints.locations[0].id` | `"argus-hip-l"` | Stable part-hit routing ID. |
| `joints.locations[0].node` | `"thigh_l"` | Articulated parent; target follows this limb. |
| `joints.locations[0].side` | `"l"` | Damaged-side gait assignment (l/r). |
| `joints.locations[0].offset` | `[-0.6,-0.15,1.15]` | Local target offset outside parent geometry. |
| `joints.locations[1].id` | `"argus-knee-l"` | Stable part-hit routing ID. |
| `joints.locations[1].node` | `"shin_l"` | Articulated parent; target follows this limb. |
| `joints.locations[1].side` | `"l"` | Damaged-side gait assignment (l/r). |
| `joints.locations[1].offset` | `[-0.35,0,1.1]` | Local target offset outside parent geometry. |
| `joints.locations[2].id` | `"argus-hip-r"` | Stable part-hit routing ID. |
| `joints.locations[2].node` | `"thigh_r"` | Articulated parent; target follows this limb. |
| `joints.locations[2].side` | `"r"` | Damaged-side gait assignment (l/r). |
| `joints.locations[2].offset` | `[0.6,-0.15,1.15]` | Local target offset outside parent geometry. |
| `joints.locations[3].id` | `"argus-knee-r"` | Stable part-hit routing ID. |
| `joints.locations[3].node` | `"shin_r"` | Articulated parent; target follows this limb. |
| `joints.locations[3].side` | `"r"` | Damaged-side gait assignment (l/r). |
| `joints.locations[3].offset` | `[0.35,0,1.1]` | Local target offset outside parent geometry. |
| `armor.bodyDamageScale` | `1` | Hull multiplier for ordinary body hits. |
| `armor.coreDamageScale` | `0` | Closed-core damage multiplier; zero means not damageable. |
| `breach.interval` | `0.3` | Building breach damage tick interval. |
| `breach.power` | `24` | Damage power per boss breach tick/contact. |
| `breach.radius` | `3.2` | Building damage/push radius around breach contacts. |
| `breach.contactsPerTick` | `4` | Maximum obstructing sections damaged per tick. |
| `breach.skin` | `0.02` | Hull clearance expansion used for physical pose gating. |
| `melee.range` | `7.5` | Bus center distance that permits a melee stomp. |
| `melee.windup` | `0.8` | Warning before melee impact (also clamped to ≥0.8s). |
| `melee.recovery` | `0.45` | Post-stomp recovery time before cooldown. |
| `melee.cooldown` | `3.5` | Delay after stomp recovery before another wind-up. |
| `melee.busDamage` | `120` | HP removed from target bus on impact. |
| `melee.impactRadius` | `5` | World explosion/building-impact effect radius at stomp. |
| `melee.footLift` | `1.7` | Lift of the stomping foot. |
| `melee.telegraphRadius` | `4.5` | Ground warning ring radius. |
| `melee.flashHz` | `5` | Warning pulse frequency. |
| `death.collapseSeconds` | `1.5` | Duration of collapse animation before physical wreck release. |
| `phases.phase2Health` | `0.66` | Phase-2 hull HP fraction boundary. |
| `phases.phase3Health` | `0.33` | Phase-3 hull HP fraction boundary. |
| `phases.phase3SpeedMultiplier` | `1.25` | Stride multiplier in phase 3. |
| `phases.phase3CooldownMultiplier` | `0.7` | Attack cooldown multiplier in phase 3; warnings unaffected. |
| `attacks.minimumTelegraph` | `0.8` | Configured minimum attack warning; hard lower bound remains 0.8s. |
| `attacks.recovery` | `0.5` | Shared ranged-attack recovery after a cast. |
| `attacks.audio.enabled` | `true` | Enable charge audio hook. |
| `attacks.audio.startHz` | `130` | Charge oscillator starting frequency (Hz). |
| `attacks.audio.endHz` | `650` | Charge oscillator ending frequency (Hz). |
| `attacks.audio.gain` | `0.035` | Charge audio volume/gain. |
| `attacks.flak.enabled` | `true` | Enable flak attack. |
| `attacks.flak.initialDelay` | `4` | Initial reset cooldown for this attack. |
| `attacks.flak.cooldown` | `7` | Base cooldown after finishing this attack; phase 3 multiplies by 0.7. |
| `attacks.flak.windup` | `0.9` | Flak charge warning before launching tracers. |
| `attacks.flak.node` | `"rocket_pod"` | Articulated model node used as firing origin. |
| `attacks.flak.shellCount` | `4` | Number of flak burst volumes per cast. |
| `attacks.flak.flightTime` | `0.7` | Time from shell launch to burst. |
| `attacks.flak.radius` | `5` | Flak burst radius. |
| `attacks.flak.heightBand` | `[26,54]` | Eligible open-air altitude interval. |
| `attacks.flak.maximumDistance` | `48` | Maximum horizontal flak targeting distance. |
| `attacks.flak.damage` | `24` | Feedback damage per burst on eligible heroes. |
| `attacks.flak.roofClearance` | `2` | Minimum height above nearby roofs before flak can hit. |
| `attacks.flak.rooftopSearchRadius` | `24` | Radius used to find nearby protective rooftop height. |
| `attacks.flak.burstFlash` | `0.5` | Visible burst lifetime. |
| `attacks.flak.shellRadius` | `0.18` | Flak tracer collision/visual radius. |
| `attacks.flak.warningOpacity` | `0.16` | Warning volume transparency. |
| `attacks.flak.patternRadius` | `10` | Spacing radius for additional burst centers around target. |
| `attacks.flak.muzzleOffset` | `[0,0.5,1.55]` | Local launch offset relative to selected node. |
| `attacks.tether.enabled` | `true` | Retained, unused: Enable tether attack. |
| `attacks.tether.initialDelay` | `8` | Retained, unused: Initial reset cooldown for this attack. |
| `attacks.tether.cooldown` | `8` | Retained, unused: Base cooldown after finishing this attack; phase 3 multiplies by 0.7. |
| `attacks.tether.windup` | `0.9` | Retained, unused: Tether charge warning before harpoon launch. |
| `attacks.tether.node` | `"plasma_cannon"` | Retained, unused: Articulated model node used as firing origin. |
| `attacks.tether.maximumLines` | `3` | Retained, unused: Maximum simultaneous tether cables. |
| `attacks.tether.lifetime` | `30` | Retained, unused: Active cable lifetime, excluding warning/arming. |
| `attacks.tether.armingTime` | `0.8` | Retained, unused: Additional delay after flight before cable collision. |
| `attacks.tether.flightTime` | `0.35` | Retained, unused: Harpoon tracer travel time before extra arming delay. |
| `attacks.tether.height` | `2.4` | Retained, unused: Cable anchor height. |
| `attacks.tether.anchorHealth` | `140` | Retained, unused: HP of each independently shootable tether anchor. |
| `attacks.tether.anchorRadius` | `0.48` | Retained, unused: Anchor target radius. |
| `attacks.tether.attachmentOffset` | `0.35` | Retained, unused: Anchor offset beyond building facade. |
| `attacks.tether.maximumRange` | `65` | Retained, unused: Maximum building-pair center distance from boss. |
| `attacks.tether.maximumPairDistance` | `30` | Retained, unused: Maximum span between building centers for anchor placement. |
| `attacks.tether.contactRadius` | `1.3` | Retained, unused: Swept hero/cable collision tolerance. |
| `attacks.tether.minimumCrossingSpeed` | `6` | Retained, unused: Minimum motion speed to trigger a tether. |
| `attacks.tether.maximumSweepDistance` | `35` | Retained, unused: Longer frame displacements skip cable crossing (teleport safeguard). |
| `attacks.tether.yankSpeed` | `18` | Retained, unused: Horizontal impulse toward nearer anchor. |
| `attacks.tether.yankUpward` | `3` | Retained, unused: Vertical yank impulse speed. |
| `attacks.tether.impulseDuration` | `0.35` | Retained, unused: External impulse duration. |
| `attacks.tether.impulseDrag` | `3` | Retained, unused: Exponential impulse velocity damping rate. |
| `attacks.tether.slowFraction` | `0.4` | Retained, unused: Movement reduction fraction on tether hit. |
| `attacks.tether.slowDuration` | `1.5` | Retained, unused: Duration of slow. |
| `attacks.tether.immunityAfterSlow` | `3` | Retained, unused: Additional immunity after slow ends. |
| `attacks.tether.damage` | `12` | Retained, unused: Feedback damage on cable crossing. |
| `attacks.tether.lineRadius` | `0.055` | Retained, unused: Active cable cylinder radius. |
| `attacks.tether.warningRadius` | `0.14` | Retained, unused: Warning cable cylinder radius. |
| `attacks.tether.muzzleOffset` | `[0,1.4,3.35]` | Retained, unused: Local launch offset relative to selected node. |
| `attacks.lance.minimumPhase` | `2` | Phase that unlocks lance targeting against CPU heroes. |
| `attacks.lance.playerMinimumPhase` | `1` | Phase that unlocks lance targeting against a directly controlled hero; prevents a harmless opening against a solo grounded speedster. |
| `attacks.lance.enabled` | `true` | Enable lance attack (target eligibility follows the two minimum-phase settings). |
| `attacks.lance.initialDelay` | `2` | Initial reset cooldown for this attack. |
| `attacks.lance.cooldown` | `3` | Base cooldown after finishing this attack; phase 3 multiplies by 0.7. |
| `attacks.lance.windup` | `2.2` | Lance charge warning before damaging beam. |
| `attacks.lance.armRaiseSeconds` | `1.6` | Smooth arm extension duration, followed by an aimed charge hold. |
| `attacks.lance.torsoTurnSpeed` | `1.6` | Upper-body swivel aiming speed in rad/s. Legs and intercept root remain unchanged. |
| `attacks.lance.torsoReturnSpeed` | `1.2` | Smooth return speed to the walking torso pose in rad/s. |
| `attacks.lance.torsoAimOffsetDegrees` | `12` | Slight shoulder-forward stance keeps the right cannon outboard of the chest. |
| `attacks.lance.armForwardLimitDegrees` | `55` | Maximum sideways arm aim before the torso must catch up. |
| `attacks.lance.armRaiseStartDegrees` | `20` | Begin the smooth arm raise once the torso is within this target yaw. |
| `attacks.lance.armClearance` | `0.12` | Extra metres around arm segment proxies for torso clearance checks. |
| `attacks.lance.fireAlignmentDegrees` | `3` | Maximum muzzle-axis, elbow and target direction error before firing. |
| `attacks.lance.aimTimeout` | `2.5` | Extra aiming time after minimum windup; cancel safely if blocked or unable to align. |
| `attacks.lance.chargeFlashHz` | `4` | Cannon charge flashes per simulation second. |
| `attacks.lance.node` | `"forearm_r"` | Articulated model node used as firing origin. |
| `attacks.lance.duration` | `12` | Maximum continuous lance firing time. |
| `attacks.lance.range` | `120` | Maximum lance range. |
| `attacks.lance.radius` | `0.9` | Lance collision/halo radius. |
| `attacks.lance.trackingSpeed` | `1.15` | Maximum lance tracking angle speed. |
| `attacks.lance.firingTracking.reactionSeconds` | `0.18` | Motion observation delay while firing; direction changes take time to register. |
| `attacks.lance.firingTracking.turnAcceleration` | `3.2` | Maximum angular motor acceleration in rad/s²; prevents instant steering reversals. |
| `attacks.lance.firingTracking.responseRate` | `14` | Aim-error response gain per second before the existing 1.15rad/s turn cap. |
| `attacks.lance.firingTracking.maximumPredictionDistance` | `12` | Maximum metres of motion extrapolation from the delayed observation. |
| `attacks.lance.leadFactor` | `0.35` | Scale on target velocity lead. |
| `attacks.lance.leadSeconds` | `0.12` | Target velocity prediction horizon before scaling. |
| `attacks.lance.maximumLead` | `2` | Clamp on predicted positional lead. |
| `attacks.lance.lostContactGrace` | `0.5` | Miss/cover duration before early beam end and ramp reset. |
| `attacks.lance.baseDamagePerSecond` | `12` | Initial feedback damage rate. |
| `attacks.lance.maximumDamagePerSecond` | `60` | Damage rate at full contact ramp. |
| `attacks.lance.rampSeconds` | `3` | Continuous hold time to maximum ramp. |
| `attacks.lance.impulseThresholds` | `[0.33,0.66,1]` | Normalized ramp thresholds; each triggers once per continuous beam. |
| `attacks.lance.impulseSpeeds` | `[10,18,28]` | Horizontal kick speed at matching ramp threshold. |
| `attacks.lance.impulseUpward` | `[2,4,7]` | Vertical kick speed at matching ramp threshold. |
| `attacks.lance.impulseDuration` | `0.6` | External impulse duration. |
| `attacks.lance.impulseDrag` | `2` | Exponential impulse velocity damping rate. |
| `attacks.lance.coreMultiplier` | `2.5` | Open-core hit multiplier to main hull damage. |
| `attacks.lance.coreStunDamage` | `350` | Base incoming core damage required to stun. |
| `attacks.lance.armorStunScale` | `0.4` | Additional stun requirement per remaining core armor HP. |
| `attacks.lance.stunDuration` | `3` | Core-break stun duration. |
| `attacks.lance.coreRadius` | `0.9` | Open-core target radius. |
| `attacks.lance.armorHealth` | `600` | Maximum repairable shutter armor; affects stun threshold, not destroyed joints. |
| `attacks.lance.exposeCoreWhileStunned` | `true` | Keep bonus core target open during stun. |
| `attacks.lance.haltMovement` | `true` | Hold movement while lance winds up/fires. |
| `attacks.lance.muzzleOffset` | `[0,-4.02,0]` | Local launch offset relative to selected node. |
| `attacks.lance.warningOpacity` | `0.2` | Legacy cylinder-effect opacity, retained but unused by the shared Walker effect. |
| `repairDrones.enabled` | `true` | Enable phase-2 repair drones. |
| `repairDrones.initialCount` | `2` | Drones spawned once upon entering phase 2. |
| `repairDrones.maximumAlive` | `2` | Simultaneous live drone cap. |
| `repairDrones.respawnSeconds` | `30` | Replacement interval while below cap. |
| `repairDrones.health` | `220` | Maximum HP per drone. |
| `repairDrones.speed` | `12` | Drone flight speed. |
| `repairDrones.channelSeconds` | `10` | Time to repair HP missing at channel start. |
| `repairDrones.channelRange` | `1` | Arrival tolerance at repair hovering goal. |
| `repairDrones.offsetX` | `3` | Radial standoff from target repair point. |
| `repairDrones.offsetY` | `2.5` | Hover height above repair point. |
| `repairDrones.collisionRadius` | `0.4` | Drone navigation sweep radius. |
| `repairDrones.roofClearance` | `4` | Vertical detour clearance above roof or boss hull. |
| `repairDrones.wreckSeconds` | `12` | Drone physical wreck lifetime. |
| `repairDrones.maximumWrecks` | `4` | Cap on retained drone wrecks. |
| `repairDrones.bodySize` | `[1.4,0.8,1.6]` | Visual drone body dimensions. |
| `repairDrones.orbitSpreadRadians` | `0.6` | Alternate radial hover angles for drones. |
| `repairDrones.spawnRadius` | `8` | Lateral distance from boss for drone spawn. |
| `repairDrones.spawnHeight` | `22` | Drone spawn height above boss root. |
| `repairDrones.avoidanceRadius` | `10` | Radial detour around own boss hull. |
| `repairDrones.avoidanceAngles` | `[0,0.35,-0.35,0.7,-0.7]` | Candidate detour yaw offsets in radians. |


### Active quake-pylon tuning — `dist/argus-config.json`

| Setting | Final value | Controls |
| --- | --- | --- |
| `attacks.pylons.enabled` | `true` | Enable new pylon placement; existing deployed stakes are autonomous. |
| `attacks.pylons.initialDelay` | `8` | Initial placement cooldown after reset. |
| `attacks.pylons.cooldown` | `8` | Placement cooldown after landing/cancelled cast; phase 3 multiplies by 0.7. |
| `attacks.pylons.windup` | `0.9` | Ground aim warning before the stake lands; clamped to at least 0.8s. |
| `attacks.pylons.node` | `"plasma_cannon"` | Articulated emitter that glows during placement. |
| `attacks.pylons.maximumActive` | `3` | Cap including pending placements; falling destroyed stakes do not reserve a slot. |
| `attacks.pylons.health` | `140` | HP per shootable stake. |
| `attacks.pylons.maximumRange` | `65` | Maximum horizontal placement distance from ARGUS. |
| `attacks.pylons.minimumBossDistance` | `8` | Keep a stake outside the boss footprint. |
| `attacks.pylons.minimumSpacing` | `10` | Minimum distance between reserved/deployed stakes. |
| `attacks.pylons.sampleSpacing` | `8` | Distance between sampled route/graph candidates. |
| `attacks.pylons.predictionSeconds` | `8` | How far ahead to forecast convoy progress when ranking candidate positions. |
| `attacks.pylons.routeOffset` | `4` | Lateral distance from the convoy centerline; keeps stakes beside the bus lane. |
| `attacks.pylons.radius` | `0.6` | Stake hit-shape half-width and placement clearance. |
| `attacks.pylons.height` | `2.2` | Stake visual/hit-shape height. |
| `attacks.pylons.warningRadius` | `3` | Ground placement/charge warning ring radius. |
| `attacks.pylons.dropHeight` | `8` | Height from which the visible stake descends. |
| `attacks.pylons.dropFraction` | `0.3` | Final fraction of placement warning used for the descent animation. |
| `attacks.pylons.charge` | `0.9` | Per-stake rising-glow/audio charge before emitting a ring; clamped to ≥0.8s. |
| `attacks.pylons.pulseInterval` | `4` | Time between repeating charge/pulse starts; includes charge, phase 3 ×0.7. |
| `attacks.pylons.pulseSpeed` | `12` | Ground ring radial expansion speed. |
| `attacks.pylons.pulseRadius` | `18` | Maximum ring radius. |
| `attacks.pylons.ringWidth` | `0.6` | Physical and visible ground-ring band width, contained inside the configured outer radius. |
| `attacks.pylons.fadeSeconds` | `0.35` | Cosmetic fade after expansion reaches maximum radius; no extra damage while fading. |
| `attacks.pylons.heroDamage` | `16` | Feedback damage to a low/grounded hero once per ring. |
| `attacks.pylons.heroRadius` | `0.45` | Ground hero contact radius added to the ring padding. |
| `attacks.pylons.heroHeight` | `1.5` | Maximum feet height above local ground for quake contact; walls/roofs are safe. |
| `attacks.pylons.busDamage` | `60` | Bus HP loss once per ring per bus. |
| `attacks.pylons.knockbackSpeed` | `14` | Horizontal impulse away from the stake. |
| `attacks.pylons.knockbackUpward` | `4` | Upward impulse speed. |
| `attacks.pylons.impulseDuration` | `0.45` | Duration of the existing additive knockback effect. |
| `attacks.pylons.impulseDrag` | `2` | Exponential velocity damping for knockback. |
| `attacks.pylons.supportTolerance` | `0.5` | Maximum vertical ground change before placement becomes invalid. |
| `attacks.pylons.fallSeconds` | `0.7` | Lifetime of a destroyed/unsupported stake’s cosmetic fall. |
| `attacks.pylons.fallGravity` | `9.81` | Downward acceleration of the cosmetic falling stake. |

## Modules and validation

`argus-pylons.js` owns placement candidates, support, stake models/hit shapes, autonomous charges/rings, swept hits and cleanup. `argus-attacks.js` schedules placement beside existing flak/lance and routes stake damage/hero knockback. `argus.js` retains gait/interception/joint/core/phase/repair/death orchestration. Convoy bus/civilian transport and results modules remain unchanged.

```sh
node QA/argus-pylons-test.mjs
node QA/argus-attacks-test.mjs
node QA/argus-test.mjs
node QA/convoy-balance.mjs > /tmp/convoy-pylons.json
node QA/convoy-balance.mjs --baseline > /tmp/convoy-before-pylons.json
python -m http.server 8765 --bind 0.0.0.0 --directory dist
# Second terminal, server running:
node QA/argus-pylons-browser.cjs
node QA/argus-attacks-browser.cjs
node QA/argus-solo-browser.cjs
node QA/argus-hit-flash-browser.cjs
```

The pylon Node suite covers 30/60/120Hz warnings, repeat cadence, ground/air/wall/roof safety, outward impulses, no movement tax/immunity, moving and stopped bus hits once per ring, civilian/owner safety, high-speed sweeps, teleport relocation, real traced stake damage, missing/removed/failed support, cap/range/spacing/route preference, phase-3 timing, stun/death/reset and completion cleanup. The browser suite exercises actual city/controller/rendering on desktop and touch, including natural placement, warnings, impacts, growing rings, HP/feedback, stake shooting, missing-ground falls, HUD and reset. Screenshots were inspected. `QA/convoy-pylons-validation-results.json` lists completed scene regressions and byte comparisons.

For manual play: select Convoy Defense, watch for ground aim glows, then the rising light in each stake. Jump high enough or leave the ring path; shoot a stake’s glowing body to stop its pulses. Observe buses lose HP only when a ring reaches them; boarding civilians retain their HP. Destroying a stake removes its already-moving rings. Broken ARGUS joints still delay interception, but remote stakes need attention. Rebuild restores the scenario.

## Prototype limits

Hero damage remains feedback-only, with no new health/death system. Playable flight is outside this prototype; existing CPU fliers still exercise flak. Rift gateways do not redirect flak or quake rings. Roads are backed by the existing fixed ground plane, so no new player-facing road-cratering mechanic was added; support loss is validated through adapter/physics removal tests. Pylons use simple primitive art and a cosmetic non-colliding fall. Bus driving remains kinematic and civilian formations simple. The original ARGUS ASTER model is about 20.8m tall; its animations use runtime procedural rigid-part IK rather than baked skeletal clips. Physical-phone FPS, memory and thermal performance are unmeasured; touch emulation checks controls/layout only. Licensed character runtime assets remain private and out of public GitHub.

Completed regression: 31 gameplay Node suites and 13 desktop/touch browser suites pass. Walker/Chinook/destruction/convoy transport source hashes match pre-pylon `accd002`. The focused gait browser fixture disables remote hazards only for its locomotion assertions, then re-enables pylons when exercising live CPU allies and player entry. Pylon tests also assert actual elapsed minimum charge time at 30/60/120Hz and that no damage extends beyond the visible 18m outer boundary (apart from the target footprint).

## ASTER visual revision 199

The entry-module cache revision is now `argus-aster-199`. Dedicated GLB/JSON assets load only for Convoy Defense. All combat and convoy tuning is retained; only flak and lance local muzzle offsets changed to match the new emitters. The historical pylon measurements above remain a record of revision 198. Current model verification and fresh balance measurements are recorded in `QA/argus-aster-validation-results.json` and `QA/argus-aster-balance-results.json`. Original Walker, Bastion, Chinook, hero movement and destruction sources/assets remain unchanged by this visual revision.

## Beam readiness revision 200

ARGUS now raises its cannon over 1.6s while every cannon material flashes orange at 4Hz, then holds the fully extended arm until at least 2.2s have elapsed. Charge tracking follows the current intended target at the existing 1.15rad/s turn limit. Firing also requires the rendered muzzle axis, straight elbow and target direction to agree within 3 degrees, with clear line of sight and an unobstructed arm pose. If that condition fails, the charge waits up to 2.5 additional seconds, then cancels into its normal cooldown. It never fires solely because the timer elapsed. Stun/death/reset cancel normally. Core exposure still begins only on actual firing; damage, firing duration and cooldown are unchanged. Phase 3 does not shorten this windup. Entry/dependency cache revision: `argus-beam-200`.

Validation: `QA/argus-beam-windup-test.mjs` checks the real articulated frame at 30/60/120Hz, moving-target tracking, whole-cannon flashing, extension before damage, late readiness, obstructed-aim timeout and stun cancellation. Existing model, attack, pylon, convoy and desktop/touch browser checks cover integration.

## Walker beam effect and building damage — revision 201

ARGUS now instantiates the same `EnergyBeamEffect` as Siege Walker: blue-white layered shader tubes, charge orb/motes, moving rings, electrical arcs, muzzle lighting and impact glow. Its shared red tracking telegraph runs only during charge. The original Walker renderer and combat controller remain unchanged; ARGUS owns a separate effect instance, cleared on finish, blocked aiming, stun, death and reset. The deprecated cylinder `warningOpacity` value is retained but no longer drives this effect.

ARGUS still requires the revision-200 2.2s windup and fully extended, aligned arm. It retains 4s firing, original hero damage ramp/impulses and core exposure. During firing only, `attacks.lance.buildingDamage` adds configurable `power: 35`, `radius: 3.4m`, `tickSeconds: 0.1s` impacts. These match the Walker's building strike strength/radius/cadence and use `{beam:true, source:'argus'}` for existing boss damage scaling and bounded beam-priority debris activation. Scorch/support collapse are handled by the existing destruction system. The beam stops at intact cover; once a section detaches it can continue through the breach. Durable cover still resets/ends hero contact after 0.5s, while flimsy cover can break before that grace expires. Barriers stop the ray and prevent downstream building damage. No bus/civilian damage or enemy friendly fire was added. Entry cache revision: `argus-walker-beam-201`.

Validation: `QA/argus-walker-beam-test.mjs` verifies the shared effect, no charge damage, exact 10Hz building damage at 30/60/120Hz, scorch/breach, debris passthrough, durable cover, barrier protection, stun/reset and boss safety. `QA/argus-beam-buildings-browser.cjs` covers actual WebGL charge/firing shaders plus real Cannon wall damage and reset on desktop/touch. Existing Walker beam, ARGUS charge/arm/attacks/pylons and convoy regressions also run. Physical-phone performance remains unmeasured.

## Torso aiming — revision 202

The upper body now swivels at up to 1.6rad/s toward the tracked lance direction, independently of the interception root and planted leg IK. A subtle 12-degree offset puts the right cannon shoulder forward. When targeting someone behind ARGUS, he turns first: the separate 1.6s arm raise begins only when the target is within 20 degrees of the upper body's facing. The existing 2.2s minimum windup and up-to-2.5s extra alignment wait remain; far-side targets can therefore take longer to charge. The arm yaw is constrained to a 55-degree forward cone while the torso catches up. Upper-arm and cannon segment checks against oriented chest, waist, pelvis and reactor bounds reject cross-body aiming, and firing readiness also requires body clearance. If a firing target moves beyond a safe arm pose, the beam is suppressed while the torso catches up; the existing contact grace can end the attack. No shot is projected through ARGUS's own torso.

When firing stops, torso swivel eases back at 1.2rad/s; rebuild restores neutral yaw. Shared Walker beam visuals/building damage, target tracking speed, core exposure and all convoy/phase rules remain. Cache revision: `argus-torso-202`. `QA/argus-torso-aim-test.mjs` checks seven target bearings at 30/60/120Hz, side/rear acquisition, moving orbital tracking, clearance, planted feet, smooth neutral return and reset. `QA/argus-torso-browser.cjs` captures real city desktop/touch left/right/rear charge and firing poses.

## Jukeable lance tracking — revision 203

While firing, ARGUS now follows delayed target observations with a finite-acceleration cannon motor (`argus-lance-tracking.js`). A 0.18s reaction lag and 3.2rad/s² turning acceleration make sharp reversals leave the beam sweeping toward the previous motion estimate. Predictable movement is extrapolated from the observed velocity so ordinary straight running does not receive the same tracking penalty. Prediction is capped at 12m, and the existing future lead remains capped at 2m. The original 1.15rad/s maximum tracking speed is retained. Observation history is per cast and discarded on finish/reset, so it cannot carry a stale target or angular velocity into another shot.

No juke immunity or scripted miss is applied: hits still use the rendered beam direction and normal collision. A sufficiently good dodge can break continuous contact for the existing 0.5s grace and end the beam. The charge/arm-readiness gate still tracks the actual target with its existing rules; delayed tracking begins only during firing. Torso safety, barriers, core exposure, damage ramp, building damage and player movement are unchanged. Cache revision: `argus-jukes-203`.

`QA/argus-juke-tracking-test.mjs` compares identical 12m/s straight runs and reversals at 45m distance at 30/60/120Hz. Measured steady miss is 0.05–0.25m; peak reversal miss is 5.48–5.67m, with approximately 0.48–0.51s outside a 1.45m hit corridor. These are fixture measurements, not guaranteed invulnerability durations. The tracker can reacquire predictable motion afterward. `QA/argus-juke-browser.cjs` uses scripted straight/reversal trajectories of the actual speedster model against the live articulated boss/beam on desktop and touch. Physical-phone performance remains unmeasured.

## Longer beam — revision 204

`attacks.lance.duration` increases from 4 to 12 seconds. Charge-up, cooldown, hero damage per second, jukeable tracking, torso/arm readiness and building damage remain unchanged. Cover, loss of contact, barriers, stun, death and reset can still interrupt the burst early. Entry/config cache revision: `argus-beam-duration-204`.

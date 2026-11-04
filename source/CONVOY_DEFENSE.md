# Convoy Defense — completed prototype

Choose **Scene → Convoy Defense**, or open `?scene=convoy`. This extends the existing Three.js/Cannon-es game. City Battle, Chinook Evacuation, Combat Testing and Shuriken Lab keep their existing systems. Step 4 completes presentation, results, measured config-only balance tuning and regression; it adds no combat mechanics.

## Scenario flow and scoring

Four buses start with eight passengers each, 14m apart. After 5s they drive the central eastbound boulevard at 4m/s. The lead bus stops at route distances 76m and 124m (world X=0 and X=48), for 35s each. Each pickup produces 24 civilians in twelve-person groups. Civilians follow the sidewalk and board automatically; players need not escort or interact with them. Ground civilians may choose another available bus; **aboard passengers never transfer**. Each bus has 24 seats and 1,680 HP.

Aboard passengers are counted saved only when their own bus crosses the exit at X=116, with its rear beyond the playable edge X=108. Destroying a bus kills its passengers. Left-behind ground civilians stay visible and vulnerable; they count as unsaved, not dead. Ground deaths move from unsaved to killed while the mission is active. Geometry contact never kills a civilian. Loose settled debris in the road uses existing collision release; intact structures are not erased. Buses use controlled route movement, door boarding and wreck bypass, not suspension physics.

When every bus is escaped or destroyed, at least one escaped bus wins; losing all buses without an escape fails. Killing ARGUS does **not** finish the mission. Results freeze at that moment: saved / killed / left behind, buses escaped, simulation completion time, ARGUS destroyed yes/no and rank. The denominator is all **80 planned civilians**, including pickups never reached. Unreached civilians count as left behind, with an explanatory note, never as killed. Continued observation cannot change the completed report. City Rebuild clears it and starts again.

Ranks use saved / planned total: **S ≥90%, A ≥75%, B ≥50%, C below 50%**. Winning with an empty bus is possible and scores C. Results offer Keep observing and Rebuild & retry; the HUD Results button reopens the same report. Opening results releases pointer lock and pauses simulation; closing restores the prior pause setting. Time is simulation time, excluding pauses, displayed rounded to whole seconds.

## ARGUS and locked rules

ARGUS reuses the articulated Walker model (approximately 21m in the existing scene), world-space planted feet and existing wreck/destruction adapters. It spawns in the northeast and follows the interception graph, forecasting the convoy's **remaining** route and stop delays. It replans every 3s, on stop/departure changes and bus-roster changes. Heroes do not steer its movement. Physical hull tests gate each candidate pose: blocking intact building sections must be damaged/pushed aside before it advances. Damaged-side shorter/slower steps produce a limp. Reaching a bus starts a warned stomp.

- Four leg joints have 600 HP each. A destroyed joint permanently removes 15% stride speed, stacking to 60%. Dead joints do not glow and cannot be repaired. Surviving-joint HP repair never reverses a recorded destruction penalty.
- Phase 1: flak and tether attacks, plus the existing lance as a counter to a directly controlled hero. CPU heroes remain eligible for lance only in phase 2. Below 66% HP, phase 2 adds general lance targeting and two repair drones. Below 33%, phase 3 multiplies speed by 1.25 and cooldowns by 0.7; warning time never drops below 0.8s.
- Every attack has a firing-part glow and charge sound hook. Flak warns for 0.9s, then travels for 0.7s before bursting. Ground/wall-running heroes, heroes below the configured roof/altitude safety limits, and covered heroes are safe. Violet's active barrier blocks bursts. Flak never hits ground civilians or buses.
- Tether warns for 0.9s, flies for 0.35s and arms for 0.8s. Fast crossings yank toward the nearer anchor, apply 12 feedback damage and **40% movement slow for 1.5s**, then **3s immunity after the slow**. Teleports bypass the intervening line. Buses and civilians do not trigger cables.
- Every tether update validates both anchors and their actual attached building sections. Killing either anchor, section detachment, hiding, collision release, depleted section HP, a failed building floor or building collision shutdown removes the whole cable, both hit shapes and any tracer meshes. Lifetime expiry, reset, boss death and mission completion also clean it up. No separate destruction-event listener can miss collapse paths.
- Lance warns for 0.9s, lasts at most 4s, then has a 3s cooldown. It predicts slightly and ramps 12→60 feedback damage/sec over 3s continuous contact. At 33% / 66% / 100%, horizontal impulses are 10 / 18 / 28m/s, with upward impulses 2 / 4 / 7m/s. More than 0.5s without contact/line of sight ends the beam and resets the ramp. It targets heroes only; shields and buildings interrupt contact.
- The core opens during lance fire (and stun). Core hits apply 2.5× hull damage; the stun threshold is 350 + 0.4 × current shutter armor (590 with full 600 armor). This accumulator uses the core hit's incoming damage before the hull multiplier. Stun interrupts the attack and halts ARGUS for 3s.
- Two 220-HP repair drones arrive in phase 2; one replacement every 30s if below the cap of two. A beam restores the missing HP of a surviving joint over 10s, or repairs core-shutter armor if no damaged joint is available. No hull healing, destroyed-joint rebuilding or penalty reversal exists.
- Enemy-owner filters prevent ARGUS attacks hitting ARGUS, its anchors or drones. Hero abilities, Chinook evacuation and existing city destruction are retained. No hero ability redesign or shared civilian refactor was added.

## HUD and readability

The existing ARGUS boss bar remains. The convoy panel shows lead route percentage, four bus markers, numbered pickup positions and an exit flag; numeric current/max HP and aboard/capacity for each bus; pickup seconds remaining; and separate saved/killed/left-behind/onboard totals. Lead progress reaching 100% does not mean the trailing buses have escaped: the safe-bus count records actual exits. The hero radar draws the route, buses, two stops, exit and ARGUS. Convoy civilians have **no individual radar dots**; its civilian count remains available. Other scenes retain their previous radar snapshots.

## Measured balance

Reproduce with `node QA/convoy-balance.mjs` (final) or add `--baseline` (accepted step-3 commit `ce52b5b`). The committed report is `QA/convoy-balance-results.json`. Runs use 60Hz, the actual articulated boss, full sixteen-building city, destruction/Cannon physics, real bus damage, no hero attacks, and specified joints destroyed at time zero. Normal approach trials keep hull HP in phase 1; extra trials begin in phase 3. They stop at mission resolution, rather than extrapolating a boss arrival after the game has ended.

**Final-leg threat** means the boss center comes within its configured 7.5m stomp range of the route segment from pickup 2 to exit. This is the usable danger threshold. Literal arrival-radius/centerline entry is also recorded: healthy ARGUS reaches it at 121.367s, later because it stops to stomp beforehand. First actual bus damage occurs at 103.833s.

| Early destroyed joints | Baseline first bus contact | Final first bus contact | Final final-leg threat | Last bus exit | Threat time before exit |
| --- | ---: | ---: | ---: | ---: | ---: |
| 0 | 37.933s | 102.583s | 102.583s | 133.583s | 31.000s |
| 2 | 54.983s | None before exit | None before exit | 133.583s | — |
| 3 | 62.867s | None before exit | None before exit | 133.583s | — |
| 4 | 69.567s | None before exit | None before exit | 133.583s | — |

With three joints destroyed and phase 3 active from the start, nearest bus distance is 32.611m; with four it is 48.045m. Neither contacts a bus. Phase-1 stride speeds for 0/1/2/3/4 destroyed joints are 1.15 / 0.9775 / 0.805 / 0.6325 / 0.46m/s. Phase 3 multiplies these by 1.25.

| Parked bus / uninterrupted stomps | Baseline 900 HP | Final 1,680 HP |
| --- | ---: | ---: |
| 120-damage hits to destroy | 8 | 14 |
| Phase 1: first impact to destruction | 33.25s | 61.75s |
| Phase 3: first impact to destruction | 25.90s | 48.10s |
| Phase 1 / 3 impact interval | 4.75s / 3.70s | 4.75s / 3.70s |

Final phase-3 survival exceeds the requested 45s intervention budget. Including the initial 0.8s wind-up, destruction occurs at 48.9s. Arrival and survival targets are met, but **all final unattended approach runs save 80/80 civilians**. This is a forgiving prototype: bus survival is longer than the remaining encounter window. No new attack or silent casualty mechanism was introduced to manufacture losses. More demanding balance needs a separately authorized design pass and human playtesting.

Every changed tuning/presentation value in step 4:

| File / path | Before | Final | Reason |
| --- | --- | --- | --- |
| `argus-config.json` `spawn.x` | 36 | 96 | Longer northeast intercept approach, inside existing bounds. |
| `argus-config.json` `movement.speed` | 2.2 | 1.15 | Healthy final-leg threat 31s before exit; damaged-joint runs miss convoy. Intermediate 1.2 trial gave 35.05s, so final lowered to 1.15. |
| `convoy-config.json` `busHealth` | 900 | 1680 | 14 stomps; 48.1s from first hit at phase-3 cadence. |
| `convoy-config.json` `map.interceptionLanes.nodes[23]` | Absent | `[96,54]` | Connect new spawn to the existing lane graph. |
| `convoy-config.json` `map.interceptionLanes.links[31]` | Absent | `[23,21]` | Links new node to existing north approach `[36,54]`; no city redesign. |
| `convoy-config.json` `results.rankThresholds` | Absent | `{S:0.9,A:0.75,B:0.5,C:0}` | Data-driven results grades. |

No route, bus speed, stop duration, seat counts, combat damage, warning, phase or permanent-penalty values changed. No balance constants were moved into JavaScript.

## Complete configuration reference

Reload after editing either JSON, then City Rebuild. Distances/positions use metres, duration/interval/cooldown use simulation seconds, speeds use m/s and angular speeds use radians/sec unless noted. Arrays of positions use `[x,z]` for the map and `[x,y,z]` for local model offsets; graph links are zero-based node indices. Fractions use 0–1. The tables below enumerate every scalar/array value in both JSONs; changing structural arrays requires maintaining their IDs/references.

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
| `attacks.flak.shellRadius` | `0.18` | Flak/anchor tracer collision/visual radius. |
| `attacks.flak.warningOpacity` | `0.16` | Warning volume transparency. |
| `attacks.flak.patternRadius` | `10` | Spacing radius for additional burst centers around target. |
| `attacks.flak.muzzleOffset` | `[0,1,2.6]` | Local launch offset relative to selected node. |
| `attacks.tether.enabled` | `true` | Enable tether attack. |
| `attacks.tether.initialDelay` | `8` | Initial reset cooldown for this attack. |
| `attacks.tether.cooldown` | `8` | Base cooldown after finishing this attack; phase 3 multiplies by 0.7. |
| `attacks.tether.windup` | `0.9` | Tether charge warning before harpoon launch. |
| `attacks.tether.node` | `"plasma_cannon"` | Articulated model node used as firing origin. |
| `attacks.tether.maximumLines` | `3` | Maximum simultaneous tether cables. |
| `attacks.tether.lifetime` | `30` | Active cable lifetime, excluding warning/arming. |
| `attacks.tether.armingTime` | `0.8` | Additional delay after flight before cable collision. |
| `attacks.tether.flightTime` | `0.35` | Harpoon tracer travel time before extra arming delay. |
| `attacks.tether.height` | `2.4` | Cable anchor height. |
| `attacks.tether.anchorHealth` | `140` | HP of each independently shootable tether anchor. |
| `attacks.tether.anchorRadius` | `0.48` | Anchor target radius. |
| `attacks.tether.attachmentOffset` | `0.35` | Anchor offset beyond building facade. |
| `attacks.tether.maximumRange` | `65` | Maximum building-pair center distance from boss. |
| `attacks.tether.maximumPairDistance` | `30` | Maximum span between building centers for anchor placement. |
| `attacks.tether.contactRadius` | `1.3` | Swept hero/cable collision tolerance. |
| `attacks.tether.minimumCrossingSpeed` | `6` | Minimum motion speed to trigger a tether. |
| `attacks.tether.maximumSweepDistance` | `35` | Longer frame displacements skip cable crossing (teleport safeguard). |
| `attacks.tether.yankSpeed` | `18` | Horizontal impulse toward nearer anchor. |
| `attacks.tether.yankUpward` | `3` | Vertical yank impulse speed. |
| `attacks.tether.impulseDuration` | `0.35` | External impulse duration. |
| `attacks.tether.impulseDrag` | `3` | Exponential impulse velocity damping rate. |
| `attacks.tether.slowFraction` | `0.4` | Movement reduction fraction on tether hit. |
| `attacks.tether.slowDuration` | `1.5` | Duration of slow. |
| `attacks.tether.immunityAfterSlow` | `3` | Additional immunity after slow ends. |
| `attacks.tether.damage` | `12` | Feedback damage on cable crossing. |
| `attacks.tether.lineRadius` | `0.055` | Active cable cylinder radius. |
| `attacks.tether.warningRadius` | `0.14` | Warning cable cylinder radius. |
| `attacks.tether.muzzleOffset` | `[0,1.4,3.35]` | Local launch offset relative to selected node. |
| `attacks.lance.minimumPhase` | `2` | Phase that unlocks lance targeting against CPU heroes. |
| `attacks.lance.playerMinimumPhase` | `1` | Phase that unlocks lance targeting against a directly controlled hero; prevents a harmless opening against a solo grounded speedster. |
| `attacks.lance.enabled` | `true` | Enable lance attack (target eligibility follows the two minimum-phase settings). |
| `attacks.lance.initialDelay` | `2` | Initial reset cooldown for this attack. |
| `attacks.lance.cooldown` | `3` | Base cooldown after finishing this attack; phase 3 multiplies by 0.7. |
| `attacks.lance.windup` | `0.9` | Lance charge warning before damaging beam. |
| `attacks.lance.node` | `"forearm_r"` | Articulated model node used as firing origin. |
| `attacks.lance.duration` | `4` | Maximum continuous lance firing time. |
| `attacks.lance.range` | `120` | Maximum lance range. |
| `attacks.lance.radius` | `0.9` | Lance collision/halo radius. |
| `attacks.lance.trackingSpeed` | `1.15` | Maximum lance tracking angle speed. |
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
| `attacks.lance.muzzleOffset` | `[0,-3.9,0]` | Local launch offset relative to selected node. |
| `attacks.lance.warningOpacity` | `0.2` | Lance telegraph beam opacity. |
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

## Modules and integration

- `convoy-config.json`, `convoy-map-config.js`: tuning, route interpolation/forecasting, graph pathfinding and validation.
- `evac-bus.js`, `convoy-mission.js`: bus meshes/collision/manifests, autonomous ground groups, lifecycle and results snapshot.
- `convoy-hud.js`, `convoy-results.js`, `convoy.css`: HUD, rank calculation and responsive accessible results dialog.
- `argus-config.json`, `argus-model.js`, `argus-gait.js`, `argus.js`: existing Walker hierarchy adapters, world-space foot IK, interception, joint routing, boss HUD and death/wreck state.
- `argus-attacks.js`, `argus-repair-drones.js`: shared ranged scheduler, flak, anchors/cable cleanup, lance/core/stun and re-armor-only drones.
- `battle.js`: scene/menu integration, owner filtering, abilities/impulses/barrier adapters, minimap snapshot and pause/reset wiring.
- `hero-minimap.js`: optional convoy route, stop/exit and bus marker presentation. Other scenes keep their snapshots.
- `index.html`, `game-entry.js`: existing scene selection and entry-module cache version `argus-hit-197`; changed module imports use this version too. No Site identity or hosting audience changes.

## Testing and reproduction

Automated commands run from the project root:

```sh
node QA/convoy-test.mjs
node QA/convoy-results-test.mjs
node QA/argus-test.mjs
node QA/argus-attacks-test.mjs
node QA/convoy-balance.mjs > /tmp/convoy-balance.json
python -m http.server 8765 --bind 0.0.0.0 --directory dist
# In a second terminal with the local server running:
node QA/convoy-hud-browser.cjs
node QA/argus-browser.cjs
node QA/argus-attacks-browser.cjs
```

`QA/convoy-validation-results.json` records the completed suite results. Balance output includes full measurements and conditions, not only assertions. Node regressions cover Walker locomotion/weapons, building damage/collision release, combat hit shapes, Bastion state/model/lead/artillery/walls/weak points/pulse, Chinook lifecycle/navigation/targeting, radar and speedster/Kage movement/charged attacks. Browser regressions exercise actual scenes on desktop/touch, including ARGUS attachment hit routing, delayed-stop replanning, bus stomps, collapse, hero control, enemy owner filtering, flak/roof/barrier safety, cable yank/anchor destruction/building collapse, lance cover break, core interrupt, drone repairs and permanent joints. HUD tests cover route/countdown/radar, loaded/all-bus losses, one-bus win, fixed completion time/ARGUS flag, grade boundaries, reopen and reset.

**Recorded outcome:** 30 Node suites and 10 current browser suites pass. The historical `bastion-browser.cjs` (superseded rotating-core assertion) and `combat-testing-browser.cjs` (old two-building/corner layout) fail on both the accepted step-3 build and this build. Their current permanent-weakpoint/wall/pulse and twelve-building arena replacements pass. The shuriken browser harness now derives early-release timing from JSON and uses the existing Shift dash binding. These are test-fixture updates, not gameplay changes. Chinook implementation/navigation/config and existing Walker/Bastion sources were byte-compared with accepted step 3 and are identical.

For manual playtest: select Convoy Defense, use Watch convoy or take a hero. Watch both 35s stops; verify passengers disappear aboard without increasing saved. Observe final-leg ARGUS contact, destroy joints to delay it, use buildings against lance and shoot the open core. Shoot anchors or collapse their buildings, and check dead joints remain dark despite nearby repair beams. Let buses exit; verify the report and reopen it. Rebuild and repeat; destroy loaded buses to verify killed versus left behind and the all-bus failure condition.

## Known prototype limits

Hero damage is feedback-only: no new health/death system. Flight threats currently target CPU fliers; no playable flight was introduced. Rift gateways do not redirect new flak/anchor tracer shots. Drone navigation is simple swept detouring rather than global pathfinding. Bus transport is kinematic, with simple civilian formations and roadside source points; no traffic simulation or complex escort mission system. The reused Walker is about 21m, not a new 40m model. Performance on a physical phone (FPS, memory, battery/thermal) is unmeasured; touch emulation verifies controls/layout only. Balance trials are scripted fixed-timestep scenarios, not broad human difficulty validation. The current no-intervention scenario saves all 80 civilians; the specified intervention window intentionally makes buses resilient. Ground survivors can still be attacked during continued observation, while the results screen preserves the completion-time score. Private licensed character assets remain out of the public GitHub repository.

## Solo hero counterattack correction

After step-4 playtesting, the player reported that full-health ARGUS did not engage a controlled ground speedster. Flak correctly excluded ground heroes, while the lance scheduler was globally locked until phase 2. The lance now has separate data-driven unlock phases for CPU heroes (2) and directly controlled heroes (1). It uses the existing 2s initial delay, 0.9s warning, range, cover checks, tracking, ramp impulses and open-core counterplay; no new weapon or movement penalty was added. It does not steer ARGUS away from convoy interception. CPU-only phase progression and the convoy balance trials are unchanged. `QA/argus-solo-browser.cjs` exercises automatic scheduling with the real player controller, including beam damage/impulses, moving input, cover break and control exit.

Verified: autonomous phase-1 targeting, full warning, real controller movement, lance hit feedback/knockback, real-building cover interruption and control-exit phase gate pass in desktop and touch-emulated Chromium. The four convoy/results/ARGUS Node suites and existing ARGUS attack browser suite also pass. No physical-phone performance claim is made.

ARGUS joint targets and its exposed core briefly flash red on accepted hits. Each target has an independent simulation-time flash, with retriggered pulses under sustained fire. The normal damaged glow returns afterward; destroyed joints stay dark, closed-core hits do not flash, and reset/death clear the effect. The hull remains excluded from whole-body damage flashing.

Visual verification: `node QA/argus-hit-flash-browser.cjs` passes desktop/touch with actual traced weapon hits, independent target colors, fade/retrigger, blocked closed core, dark destroyed joints and reset. Existing ARGUS body/attack Node suites pass.

# Astra Ronin
Original low-poly sword mini-boss, selected in Combat Testing → Astra Ronin.
Ivory bevelled armor, navy frame, cyan visor/blade, shield, independently articulated shoulders/elbows/hips/knees/feet and waist. Procedural travel gait, idle, sword anticipation, sweep/overhead follow-through and recoil use rigid joint pivots. Existing wreck system handles defeat.

Tuning is exported as RONIN in dist/astra-ronin.js: height 15m, HP 2400, movement 8m/s, turn 1.8rad/s, melee reach 12m, sweep 35 damage, overhead 55 damage, wind-up .95s, swing .32s, recovery 1.1s, cooldown 1.4s. Head hits multiply damage by 1.5. Existing hero feedback, stuns, navigation, enemy separation and damage/wreck handling are reused. The shield blocks hits only while Ronin raises it into his periodic guard (revision 301). No ranged attack or limb severing. Future polish: terrain foot IK, audio, bespoke animated collapse; currently uses existing physical wreck defeat. Phone performance not measured.

QA/astra-ronin-test.mjs checks melee, interruption, collision shapes and reset. QA/astra-ronin-browser.cjs checks desktop/touch arena selection and rendering.

## Art and animation revision 295

Rebuilt the original model with tapered beveled armor, swept layered shoulder plates, a split gold helmet crest, separate eye lenses/cheek guards, recessed chest vents, narrow articulated abdomen, moving hip skirts, knee/ankle armor, segmented fingers, a pointed shield and broad energy-edged blade. A dual-thruster backpack pulses during movement and strikes. Static pieces merge by material within each rigid joint. Approximately 4,688 triangles and 90 meshes including the bounded sword ribbon; no texture downloads.

`astra-ronin-animation.js` owns ready stance, movement, sweep, overhead, hit recoil, stun and defeat poses. Two-bone leg IK holds stance-foot targets in world space and lifts/repositions swing feet; movement uses distance-driven step timing. Feet assume the arena's flat ground plane, not arbitrary rubble heights. Hip armor and shoulders move to provide joint clearance. Sword phases use the existing .95s anticipation, .32s swing and 1.1s recovery with waist counter-rotation and weight transfer. The additive trail is limited to 12 segments and .13 seconds of history. Stuns/death clear the attack, and reset clears foot and trail state.

Defeat disables targeting immediately, plays a 1.05s buckle (`RONIN.collapseDuration`), then uses the existing physics wreck/explosion path. HP, damage, movement speed, range and cooldowns are unchanged. The prior note about a missing collapse is superseded; new custom audio remains future work.

`QA/astra-ronin-animation-test.mjs` verifies planted feet at 8m/s, reachable IK, distinct broad sword arcs, finite transforms, trail expiry and reset. Browser QA covers ready/walk/sweep/overhead/defeat poses and rebuild on desktop and touch. Actual phone FPS remains unmeasured.

## Proportions revision 296

Shoulder armor scales to 72% width and 80% height/depth, with its pivot drawn slightly inward. Upper-arm damage volumes shrink to match the slimmer armor. The forearm shield is 50% wider and 35% taller, mounted farther out and angled slightly forward so its face reads better. Rig animation, attack timings, damage and mesh budget are unchanged. Existing desktop/touch pose checks cover sword clearance, defeat and rebuild.

## Long sword dash revision 297

At 14–70m, Ronin enters a 1.1s crouched sword-back wind-up. An amber ground strip and rising energy pulse telegraph the attack. He follows the target during wind-up, then locks a straight ground trajectory at launch: 100m/s, up to 70m, stopping 4m short of the locked target position. Thrusters flare and three bounded speed streaks accompany a low gliding pose. At the destination he sweeps the sword over .32s, recovers for 1.2s, and begins a 3.2s cooldown. A late lateral dodge can make him miss.

Tuning lives in `RONIN`: `dashMinRange:14`, `dashRange:70`, `dashDistance:70`, `dashSpeed:100`, `dashStandOff:4`, `dashWindup:1.1`, `dashRecovery:1.2`, `dashCooldown:3.2`, `dashDamage:55`, `dashWarningWidth:3`. The finishing slash uses the existing 12m reach and wide forward arc. Each hero can be hit only once per attack. Close targets retain the existing sweep/overhead rotation.

Dash movement and all sword strikes pass through building geometry; they do not damage or destroy buildings. Initial target acquisition still requires sight, but entering cover after wind-up begins does not cancel the attack. The trajectory remains clamped to the arena boundary. Stuns, defeat, target deactivation and city resets cancel the attack safely; temporary player dash invulnerability avoids its hit. Ordinary approach movement still uses existing navigation. Ground dash does not pursue high airborne heroes vertically.

`QA/astra-ronin-dash-test.mjs` covers stationary wind-up, long dash through blocked paths, through-cover once-per-target damage, cooldown, launch commitment/late dodge, stun/reset and arena bounds at 30/60/120Hz. `QA/astra-ronin-dash-browser.cjs` moves the actual Volt Rush target behind an actual Combat Testing building during wind-up, then verifies crossing, hit feedback, effects, recovery and reset on desktop and touch.

## Flight pursuit revision 299

Ronin uses `astra-ronin-flight.js` to close distant gaps. Beyond 85m horizontally, he takes off and accelerates toward the active player, even when CPU heroes are closer or buildings block sight. Flight follows the player's current position. At 50m he chooses a clear street landing roughly 45m from the target, descends, settles for .4s and returns to normal sword combat. If the player retreats beyond 85m during landing he resumes pursuit. If no player is controlled he pursues his current/nearest hero instead. Flight itself deals no damage, and sword attacks remain disabled until landing.

`RONIN` tuning: `flightStartRange:85`, `flightStopRange:50`, `flightLandingRadius:45`, `flightSpeed:38` m/s, `flightAcceleration:60` m/s², `flightHeight:18`, `flightClearance:6`, `flightBuildingMargin:16`, `flightRiseSpeed:30`, `flightDescendSpeed:24`, `flightTurnRate:2.4` rad/s, `flightTakeoffTime:.6`, `flightLandingRecovery:.4`. Different start/stop ranges prevent rapid flight toggling at the threshold. Altitude clears the highest building along the current route before horizontal movement; landing samples existing navigation clearance and respects arena bounds. It uses layout building heights, so destroyed towers can still cause conservatively high approaches. Landings use the existing flat arena ground, not rooftops.

Animation adds a forward flight stance, tucked legs, a trailing sword, flared backpack jets and bounded speed streaks. World hit shapes move with the flying rig. Stuns hover-pause movement and resume safely; death cancels flight before the buckle/wreck sequence, and reset restores the grounded spawn and clears flight state. No shared hero movement or other enemy behavior changed.

`QA/astra-ronin-flight-test.mjs` covers 30/60/120Hz takeoff/pursuit/landing, player priority, obstacle altitude, moved targets, stun/resume, reset/death and the return to a sword dash. `QA/astra-ronin-flight-browser.cjs` uses the actual player-controlled Volt Rush and arena buildings on desktop and touch, including flight/landing screenshots and city rebuild.

## Segmented limbs revision 300

Arms now use a shoulder axle, split bicep armor, exposed elbow pin, floating elbow guard, rotating forearm shell with two armor sections, wrist joint and separate hand. Legs use an exposed hip axle, upper/lower thigh armor separated by a metal band, knee hinge and floating knee guard, split shin armor on a visible frame, a sliding lower shin cuff, independent ankle and articulated toe. Clear dark gaps and metal linkages make bends readable at gameplay distance. The smaller shoulders and enlarged shield retain revision 296 proportions.

Bicep/forearm plates share the arm's twist, elbow and knee guards counter-rotate during flexion, wrists follow sword strokes, and shin cuffs slide as the knees bend. Foot IK now counter-rotates the ankle, keeping planted feet stable. The weapon remains attached to the right hand through the wrist joint; hit regions and attack tuning are unchanged. The same hierarchy drives walking, sword wind-up/swing, dash, flight and defeat.

Budget: 5,966 triangles and 120 meshes including effects (up from 4,726/94). Static pieces remain batched by material within each joint. The animation QA budget is now <8,000 triangles and <130 meshes to account for the additional moving sections. Actual phone FPS remains unmeasured. Existing animation, melee, dash and flight tests verify hierarchy, finite transforms, foot planting, damage, stun, defeat and reset; desktop/touch browser checks cover rendered combat poses and flight.


## Periodic shield guard revision 301

Between sword attacks Ronin occasionally raises the forearm shield across his torso, holds guard for 2.2s, then lowers it. Raise takes .45s and lower .35s; the shield blocks only during the fully raised hold. He stays planted and turns toward his target while guarding. Guard becomes available after an initial 3.5s delay; subsequent intervals vary between 6–8s, and attacks take priority until their existing recovery completes. A .4s opening follows lowering before the next sword attack.

A `ronin-shield` oriented hit shape follows the actual raised shield. `modifyDamage` returns zero only for hits on that shape during the hold. This blocks projectile/stream hits intercepted by the shield, with a .18s blue flash on independent shield materials and no health-loss red flash. Shots reaching exposed legs or the back still damage Ronin. Area attacks whose contact does not hit the shield remain effective. Guard never gives whole-body invulnerability. The shield has no separate HP in this version.

Guard cancels immediately on stun, defeat, flight takeoff, target loss or reset. Sword attacks cannot begin during guard; flight can interrupt it to pursue a distant player. No hero controls or shared damage framework changed. Existing segmented limbs remain active in the new guard pose.

Config in `RONIN`: `guardInitialDelay:3.5`, `guardRaise:.45`, `guardHold:2.2`, `guardLower:.35`, `guardCooldown:7` (cycle variation ±1s), `guardFlashDuration:.18`. `QA/astra-ronin-guard-test.mjs` tests real collision traces, block/blue feedback, exposed-body damage, repeated cycles and interruption at 30/60/120Hz. `QA/astra-ronin-guard-browser.cjs` checks the actual Volt Rush stream against the guard, rear damage, pose rendering and city reset on desktop and touch.

## Athletic proportions and walking revision 302

Rebalanced Ronin toward Volt Rush's humanoid proportions. The pelvis rises from 4.45 to 5.1 model units and both leg links are now 2.4 units (previously 2.05/2.1). Chest meshes are 20% narrower, 17% shorter and 18% shallower; arm pivots move from ±1.93 to ±1.42 and arm cross-sections slim by 20%. Shoulder armor and backpack are reduced further. The large shield, blade, armor palette and combat timing retain their identities. Hit volumes follow the revised torso/limb dimensions. Geometry remains 5,966 triangles / 120 meshes.

Leg chains now attach to the actual pelvis. Distance-driven walking uses a 7.4m cycle, with alternating pelvis rotation, counter-rotation of the chest/head, stronger arm swing/elbow flex, lateral weight transfer and a small vertical bounce. Swing feet lift with a smooth arc, then land heel first and roll toward the toes. First steps begin from the current planted pose. Two-bone IK is solved in world space using the revised actual link lengths, so pelvis rotation and body sway do not drag the feet. Heel/toe roll compensates the ankle position around its contact point. Static ready, sword, dash, shield, flight and defeat poses use the same revised rig.

Animation QA now measures planted contact stability (rather than demanding a motionless ankle while the foot rolls), validates link reach, and checks shoulder-to-leg proportions and measurable pelvis/arm motion. Desktop/touch pose, shield-block and flight browser suites cover the changed model. Actual phone FPS remains unmeasured.

## Natural arm spacing revision 303

Shoulder hinges move outward from ±1.42 to ±1.65 model units while the lean chest, small shoulder plates and long legs remain. Ready/walking arms now angle outward at the elbows with a softer sword-arm bend and a lower, less tightly folded shield arm. Supporting-arm poses during sword attacks and flight also open away from the ribs. The active shield guard retains its deliberate across-body placement and physical blocking. No attack range, damage, movement speed or mesh budget changed.

Animation QA checks that both resting elbows clear the torso, alongside the existing proportions, planted-foot and attack-arc checks. Desktop/touch pose and flight browser checks cover the revised silhouette; guard, dash, flight and melee simulations continue to pass.

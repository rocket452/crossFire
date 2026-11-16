# Astra Ronin
Original low-poly sword mini-boss, selected in Combat Testing → Astra Ronin.
Ivory bevelled armor, navy frame, cyan visor/blade, shield, independently articulated shoulders/elbows/hips/knees/feet and waist. Procedural travel gait, idle, sword anticipation, sweep/overhead follow-through and recoil use rigid joint pivots. Existing wreck system handles defeat.

Tuning is exported as RONIN in dist/astra-ronin.js: height 15m, HP 2400, movement 8m/s, turn 1.8rad/s, melee reach 12m, sweep 35 damage, overhead 55 damage, wind-up .95s, swing .32s, recovery 1.1s, cooldown 1.4s. Head hits multiply damage by 1.5. Existing hero feedback, stuns, navigation, enemy separation and damage/wreck handling are reused. Shield is visual armor, not a separate blocking mechanic. No ranged attack or limb severing. Future polish: terrain foot IK, audio, bespoke animated collapse; currently uses existing physical wreck defeat. Phone performance not measured.

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

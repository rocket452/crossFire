# Astra Ronin
Original low-poly sword mini-boss, selected in Combat Testing → Astra Ronin.
Ivory bevelled armor, navy frame, cyan visor/blade, shield, independently articulated shoulders/elbows/hips/knees/feet and waist. Procedural travel gait, idle, sword anticipation, sweep/overhead follow-through and recoil use rigid joint pivots. Existing wreck system handles defeat.

Tuning is exported as RONIN in dist/astra-ronin.js: height 15m, HP 2400, movement 8m/s, turn 1.8rad/s, melee reach 12m, sweep 35 damage, overhead 55 damage, wind-up .95s, swing .32s, recovery 1.1s, cooldown 1.4s. Head hits multiply damage by 1.5. Existing hero feedback, stuns, navigation, enemy separation and damage/wreck handling are reused. Shield is visual armor, not a separate blocking mechanic. No ranged attack or limb severing. Future polish: terrain foot IK, audio, bespoke animated collapse; currently uses existing physical wreck defeat. Phone performance not measured.

QA/astra-ronin-test.mjs checks melee, interruption, collision shapes and reset. QA/astra-ronin-browser.cjs checks desktop/touch arena selection and rendering.

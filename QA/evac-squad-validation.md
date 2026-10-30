# Escort extension / three-drone squad verification — revision 65

Passed with local Chromium/Playwright using actual game models and deterministic stepping of the gameplay loop, desktop 1100×1000 and mobile touch 390×844. No runtime/console/shader errors or horizontal overflow in either viewport. Physical-device FPS/thermal behavior was not measured.

`node QA/evac-squad-browser.cjs` (also invoked by the current `evac-raider-browser.cjs` entry point):

- Actual ground mesh reaches Z=108; boulevard exists only in the escort scene. No friendly army in escort; original battle still has eight tanks/four helicopters/36 soldiers and the original Z=60 ground edge.
- One civilian wave at 29.9 seconds; three uniquely identified 1,000-HP tracked drones spawn at Z=102 exactly with wave two at 30 seconds. No duplicate units or later-wave reinforcements.
- All three advance >60 m, stay in separate lanes, avoid intact building footprints, and reach Z≈37. A major injected street obstacle stops the middle drone rather than letting it phase through. Tracks follow real motion.
- First autonomous flight rescues its passengers beyond the new escape point. Grounding the real Chinook lets each drone acquire/fire on it; actual bolts reduce helicopter health. Projectile IDs/owners remain distinct and visible to the existing threat adapters.
- Real lightning/orb/fireball/portal/force-beam callbacks deal the expected combined 375 damage to the selected drone without damaging the giant. Volt overload spends 50 charge and stuns only the selected drone. Defeating members switches hero target; defeating the squad returns it to the giant, without changing civilian losses/main-boss health.
- Rebuild clears all three unit/projectile states; the next second wave creates exactly three units again.
- Actual desktop W/Shift and mobile movement/BOOST inputs carry Volt past the old Z=56 boundary to the new boulevard. Actual E/touch DASH then travels >8 m in the extension.
- Full 85-second natural-combat fixtures in both viewports: all three drones defeated (3,000 damage received), six drone shots, nine civilians rescued and zero lost; robot combat and city physics continue. Civilian wave cadence remains 30 seconds.

`node QA/evacuation-cycle-browser.cjs`: desktop/mobile repeated inbound/landing/automatic boarding/escape/return, loaded helicopter destruction/replacement, finite empty boarding window, two subway routes, civilian dash and Violet barrier interaction, pad debris clearance and high-altitude boss targeting all passed with the longer flight route. The 65-second combat fixture rescued nine with zero lost in each layout.

Existing Node suites passed: `evac-raider-test.mjs`, `evacuation-lifecycle-test.mjs`, `evacuation-policy-test.mjs`, `evacuation-navigation-test.mjs`, `runner-motion-test.mjs`, `runner-collision-control-test.mjs`, `runner-forgiveness-test.mjs`, `runner-dash-test.mjs`, `runner-heading-test.mjs`, `runner-energy-test.mjs`. Syntax and Git whitespace checks passed.

Visually reviewed the extended-map overview, three-drone arrival and landing-zone approach screenshots at `/tmp/evac-squad65-map.png`, `/tmp/evac-squad65-spawn.png`, `/tmp/evac-squad65-spawn-phone.png`, and `/tmp/evac-squad65-approach.png`. Test instrumentation is intercepted only during QA; no debug controls or test globals ship in runtime files. See `source/ESCORT_MISSION.md` for tuning and the simple lane-navigation limitation.

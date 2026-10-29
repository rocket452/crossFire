# Speedster control and sticking investigation

The player report was reproduced against baseline public commit `ec274fa` (the code in private build `a6b59db`). Fixes address tangent motion being discarded at walls, accidental wall latching, trapped settled-panel overlaps, awkward wall exits and a camera/movement frame that rotated with the wall.

## Scripted human-like movement

`node QA/runner-human-input-sim.mjs --assert --save=/tmp/runner-human-after25.json`

The same harness was run against a saved baseline module and the updated controller. It contains 15 focused tests (five situations at 30/60/120Hz) and twelve seeded 35-second tours through all 2,668 city sections. Tours use partial analog values, frequent direction changes, varied frame intervals, boost toggles, jumps and delayed recovery attempts. These are automated human-like inputs, not human playtester results.

| Measure | Baseline | Updated |
| --- | ---: | ---: |
| Combined blocked time in three 1.4s glancing-wall runs | 3.383s | 0s |
| Unwanted climbs in glancing/diagonal tests | 3 | 0 |
| Escaped settled-panel overlaps | 0/3 | 3/3 |
| Back-off detached within 0.12s and moved clear | 0/3 | 3/3 |
| Long stalls (>1.5s) in twelve city tours | 0 | 0 |
| Longest brief stall in city tours | 1.078s | 0.531s |

All three actual segmented-building climb tests reach a supported roof. Updated back-off tests leave the wall on the first input frame; the baseline stays attached for the entire 0.4s attempt. Raw results are retained in `/tmp/runner-human-before25.json` and `/tmp/runner-human-after25.json`.

## Collision and movement safety

`node QA/runner-collision-control-test.mjs` passes at 30/60/120Hz and 0.075s frames:

- A 46m/s boosted strafe cannot tunnel through a thin tall wall.
- Reversing moves clear from a blocked direction and from a solid two-wall corner.
- Rotated walls permit tangent motion while blocking penetration.
- A real ceiling stops the head without ejecting the character sideways.
- Low settled rubble can be stepped over.
- A wall jump moves outward even when forward is still held.
- DASH stops before a low overhang the visible character cannot fit beneath.

Existing `runner-motion-test.mjs`, `runner-forgiveness-test.mjs`, `runner-dash-test.mjs`, `runner-charge-test.mjs`, `runner-assist-rescue-test.mjs`, `runner-rooftops-test.mjs` and `runner-animation-ai-test.mjs` pass. These include missing support/gravity, terrain/debris slopes, jump grace/buffer expiry, no double jump or ledge magnetism, real roof support, ally sweeps and CPU rooftop/attack/handoff behavior.

## Real browser input

`node QA/runner-control-browser.cjs` passes desktop 1100×1000 and touch 390×844 against the full combat scene. It uses actual keyboard/mouse and independent CDP touch contacts, with deterministic simulation stepping:

- Deliberate wall climb on actual segmented city geometry.
- Back input detaches immediately and moves away from the facade.
- Look input turns normally on a wall; the camera stays world-up.
- Wall jump moves clear with forward held and does not instantly reattach.
- Glancing input slides along a real facade without climbing.
- A real rendered settled panel overlap can be escaped.
- Mixed turning/partial stick inputs keep camera positions outside buildings.
- Finite rendered positions, no page errors and no horizontal overflow.

Screenshots: `/tmp/runner-control25.png` and `/tmp/runner-control25-phone.png`.

Additional full-scene suites pass:

- `runner-feel-browser.cjs`: assisted and manual electricity, settings persistence, confirmed plasma rescue, notice/rings/audio/mute and reset. Its isolated missile fixture now faces away from the robot and uses a vertical 4° offset so a nearby robot part or hand-to-camera parallax cannot confound the intended assistance test.
- `twin-stick-browser.cjs`: simultaneous movement/look/fire/abilities and four responsive layouts.
- `runner-dash-browser.cjs`: actual rendered tanks and supplied soldier meshes, continuous collider sweeps, cooldowns and CPU rescue.
- `explosive-characters-browser.cjs`: all 39 supplied weighted character rigs, rifle grips, hand-attached electricity, death/reset and a 22s natural encounter.

JavaScript syntax checks and `git diff --check` pass. Phone tests emulate browser layout/input; physical phone FPS, thermals and subjective feel have not been measured. Licensed character runtime files remain in the private Site branch and are not changed by this revision.

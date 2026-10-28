# Siege Walker encounter validation — 2026-10-28

## Asset and integration

- Created directly with Blender 4.3.2 via `source/build_robot.py`.
- 21 m nominal height; 3,068 triangles; 16 rigid articulated components.
- GLB approximately 297 KB, vertex colors, no image textures. Downloadable native
  Blender file and generator included. Procedural runtime articulation.
- Both divisions share one 12,000 armor enemy. Bullet, shell and missile collision
  respects the robot component boxes and existing city sections. AI allied units
  are protected from army fire; the robot's cannon damages units. Occupied pilot
  protection and player building damage remain intact.

## Passing checks

`node QA/robot-combat-test.mjs`, `node QA/combat-collision-test.mjs`,
`node QA/player-building-damage-test.mjs`, `node QA/helicopter-flight-test.mjs`,
`node QA/city-physics-test.mjs`, `python QA/soldier-assets-test.py`, JS syntax
checks and `git diff --check`.

Instrumented browser test (`QA/robot-battle-browser.cjs`) uses the actual app
modules with a test-only response hook to advance simulation; no test mutation
API is shipped in the game. Tested in Chromium with software WebGL:

- In 20 simulated seconds: shell hits 18, helicopter rocket hits 12, infantry hits
  520. Both factions dealt damage (1,711 / 1,689); armor fell to 8,600. Robot
  returned fire 6 times and damaged army units. Approximately 4.9 seconds CPU
  time for this 20-second simulation advance on the executor, excluding rendering;
  this is not a phone FPS benchmark.
- Entered a helicopter through its normal PILOT button, aimed by mouse drag and
  fired with Space. Missile hit `siege-walker`; live armor decreased. No hit popup.
- Continued the normal battle without overriding health/damage. Robot reached
  zero armor before 72 simulated seconds, with 62 shell, 43 rocket and 1,906
  infantry hits in that run. Actual timing varies with routes and damage.
- Robot buckled, split into 16 real Cannon wreck bodies; observed world-space
  falling and verified every rendered wreck transform matched its physics body.
- Armies ceased firing after robot death. Rebuild restored 12,000 armor, assembled
  robot geometry, every army unit and building, counters and pilot state, removing
  all robot wreck bodies. No browser page errors in the desktop checks.
- Visually inspected robot follow camera and destruction captures.

The first phone stage timed out waiting for the page `load` event (optional
remote font request). Updated the QA navigation to await DOM content and actual
app readiness, and close the heavy desktop scene before phone QA. The focused
phone rerun passed: 390px layout with no horizontal overflow, visible robot, touch
pilot entry, exactly one missile on a quick FIRE tap and cockpit exit; no page errors. Actual device GPU performance and thermal behavior remain unverified.

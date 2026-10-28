# Speedster animation + CPU control — 2026-10-28

## Changes

Regenerated native Blender model with separate foot/ankle joints, 15 components,
still 1,760 triangles. Added a continuous, speed-smoothed stride clock, two-bone
leg deformation, heel/toe motion, stronger knee recovery and arm pumping, sprint
lean, counter-rotation, turn bank and air/landing blends. The readable cadence is
stylized; local contact arcs are not a world-footplant guarantee at super speed.

CPU uses existing surface motion and real electricity hits: street patrol,
boosted movement, facade/roof crossings, gravity recovery and line-of-sight burst
attacks. AI fire protects allied units. Taking over suspends AI and preserves
position; exiting resumes it from there. Added a CPU escort observer camera and
status. The camera is never used as the NPC's weapon aim source.

## Verification

- `node QA/runner-animation-ai-test.mjs` parses the actual regenerated GLB: correct
  15-part hierarchy/triangle count, continuous phase through start/run/boost/stop,
  solved ankle errors <1 mm and minimum sole height 0.01 m relative to its local
  contact plane. Air and wall poses remain finite, and gait resets correctly.
- Same test drives the CPU through an actual city-layout collision fixture:
  ~595 m autonomous travel, three facade/roof crossings and eight attack bursts
  over 30 simulated seconds. Suspend/resume does not teleport or fire under
  player ownership; robot defeat stops fire.
- `node QA/runner-ai-browser.cjs` uses actual app modules: live battle CPU travel
  ~281 m, two climbs and two roof crossings, three bursts and 456 damage applied
  to the robot in that run. Reviewed wall/ground sprint/390px escort captures.
- Browser takeover preserved exact position, suspended CPU decisions, and gave
  manual input control. Exit preserved position and resumed CPU travel. Pause,
  robot-defeat ceasefire and complete gait/CPU reset passed. Phone tap takeover /
  return and no horizontal overflow passed, with no page/shader errors.
- Existing manual runner browser regression checks electricity damage, real
  wall-to-roof movement, touch joystick/boost/fire, reset and helicopter switching.
- Existing motion, hero-defense, energy-beam, head/telegraph checks and diff
  whitespace verification pass.

Browser rendering uses software WebGL; actual device GPU/thermal FPS is not
measured. No new textures or post-process effects were added; foot articulation
adds two draw sections, with the original triangle count retained.

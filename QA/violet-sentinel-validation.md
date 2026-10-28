# Violet Sentinel validation — 2026-10-28

## Asset and behavior

Blender-authored original hero: 1,620 triangles, 16 rigid components, vertex colors,
2.59 m, animated cape/hover/charging/block poses. GLB ~170 KB and native .blend,
generator and articulation metadata are included. AI patrols, charges purple
orbs for 1.6 s and fires at the robot, applying 220 damage on a direct collision.

Helicopter rescue response is 80% of distinct opportunities (four yes, one skip),
with finite travel speed, deployment and a physical 5.8 m radius barrier. The
beam must meet the shield before cover/units. Shield energy is 3,000, actual
beam absorption is 300/s and off-duty regeneration 250/s. Aerial robot targeting
tracks the selected helicopter, beginning with an air attack for visibility.

## Passing verification

- `node QA/hero-defense-test.mjs`: actual GLB/rig and asset budget; airborne
  charged-orb damage; interception travel and deployed shield transform/normal;
  full seven-second/2,100-damage absorption; repeatable 8/10 rescue policy;
  off-path and depleted barrier vulnerability; nearer solid cover ordering;
  no world damage through a shield; complete hero/reset cleanup.
- Existing energy-beam, walking, head/telegraph, player building damage, city
  physics and helicopter flight tests pass, plus diff whitespace checking.
- `node QA/hero-browser.cjs`: actual opening Hero escort view, visible charge and
  launch; first orb hit the robot and applied 220 damage. The hero moved into
  the first helicopter-directed beam and deployed the rendered barrier.
- At 8 sim seconds: 10 blocked beam ticks / 300 absorbed damage. Rendered beam
  endpoint lay within 2 cm of the rendered shield plane; defended helicopter
  retained all 90 health. At 13.8 s: 68 ticks / 2,040 damage absorbed, barrier
  energy 960, helicopter still at 90. Barrier strain increased while it held.
- Pause froze hero state; beam end disengaged the hero; reset restored energy,
  positions, counters, orbs, shield and robot hero-damage bookkeeping. No browser
  page errors or shader errors. Reviewed charging and barrier action captures.
- 390 px phone view: no horizontal overflow, visible hero/barrier encounter,
  touch reset, helicopter pilot entry, missile launch and cockpit exit passed.
- Existing combat regression accommodates a physically shielded first burst,
  rather than requiring army damage through a successful barrier.

Browser QA used software WebGL. Actual phone GPU/thermal performance has not
been measured. This is an autonomous hero; direct hero control and character
health are outside this addition. Body geometry is low poly and VFX are bounded.

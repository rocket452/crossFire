# Civilian Evacuation performance — revision 233

The expanded district has 11,339 destructible sections. Bruiser target scans and hero line-of-sight/projectile checks were repeatedly running exact intersection tests across the entire section array. The three Bruisers in the first wave each test many civilian/hero targets, multiplying that cost. Intact-scene physics was effectively idle in the measured case.

`SectionQueryGrid` indexes static sections into conservative 16m X/Z cells with 4m padding. A grid traversal visits cells along each swept segment, and conservative height bounds reject unrelated floors. The exact existing oriented-box solver still decides hits. Query results keep original tie priority without sorting the candidate list. Larger radii expand the visited cell neighborhood. Plain arrays and filtered lists retain their existing brute-force behavior.

DestructionWorld owns the index and exposes `chunks.querySegment`. Detached pieces enter a separate set and are always considered at their current body transforms, including after settling outside their original cell. Collision-disabled and hidden pieces are ignored. Rebuild clears that moved set after restoring the original architecture. No buildings, geometry, textures, shadows, projectile timing, target priorities or movement settings were removed/reduced.

## Measured comparison

Chromium, software ANGLE/SwiftShader, 1000×800 viewport. Scene is Civilian Evacuation with default heroes; advance evacuation to 75.1s, hold Walker stunned to isolate the first three-Bruiser wave, warm five updates and average thirty 1/60s simulation updates. These are CPU update timings, not device FPS.

| CPU work | Before | After |
|---|---:|---:|
| Combat update, inclusive | 51.11ms | 6.11ms |
| Evacuation/enemies, included above | 26.29ms | 2.65ms |
| Rift update, included above | 9.98ms | .67ms |

Combat CPU time fell about 88% in this case. Rendering remains a separate cost: software-renderer measurements are not physical phone GPU results. Geometry and draw counts in the sample stayed at 576,922 triangles / 261 render calls. Heavy destruction and later waves may have other costs; no claim of a specific phone FPS is made.

Run `node QA/evacuation-performance-browser.cjs` against a local server serving dist on port 8765 to repeat the CPU breakdown. Resource contention/JIT/browser versions affect absolute timings.

## Verification

- `section-query-grid-test.mjs`: 500 seeded traces against brute force with arbitrary rotation and radii up to 20m, hidden/disabled sections, moved/settled rubble, reset, and >98% local candidate reduction on a 5,000-section fixture.
- `combat-collision-test.mjs`, `building-collision-release-test.mjs`, `runner-collision-control-test.mjs`: cover occlusion, moving hits, collision release and player movement remain correct.
- Evacuation shutdown desktop/touch browser checks pass, including Bastion/cinematic preservation and rebuild. Bruiser wave and civilian shutdown unit suites pass.
- Historical `ground-rubble-test.mjs` fails its first single-section-building assertion under both baseline HEAD and this revision: destroying its one section already triggers the existing 75% whole-building collision release. It predates this change. The current building-collision-release suite verifies the intended ground-release behavior and passes.

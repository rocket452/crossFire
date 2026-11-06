# Crossfire performance pass — revision 238

This pass reduces city rendering and hero collision-query work without changing
movement tuning, damage, civilian schedules, the map layout, or enemy counts.
The previous evacuation ray-query optimization remains in place.

## Runtime changes

- `SpatialChunkBatch` keeps the original global section indices used by physics,
  scorching, hit feedback and rebuilding. Building sections are grouped into
  32 m districts for conservative camera-frustum tests. Visible districts are
  packed into one color draw per section type. The original complete matrices
  supply the shadow pass, so an off-screen building still casts its shadow.
- The visible buffer is uploaded only when district visibility or its data
  changes. Moving fragments expand their district bounds immediately; rebuilding
  recomputes compact bounds. Wide views with less than 30% culling use the
  original full buffer directly instead of repacking.
- Runner traversal queries the existing section grid before its original narrow
  collision tests. Candidates retain their original order, including moving
  rubble and Bastion surfaces. Section bounding radii are cached. Hero speed,
  jump, wall-running and dash parameters are unchanged.
- Bastion traversal reuses a composite section list instead of allocating a copy
  of the entire city for every query. Its section objects remain live references.
- Off-screen weighted soldiers/heroes use a conservative animation/IK bounding
  sphere. Animation still updates normally. The bound was checked against the
  real licensed weighted mesh, all 17 clips and rifle-arm IK.
- `render-budget.js` caps the drawing buffer at 2,000,000 pixels and pixel ratio
  1.35. Small viewports keep their requested ratio. Resize/fullscreen changes
  recalculate the cap, and the existing sustained-low-FPS reduction remains.
  HTML HUD/minimap/FPS text keeps its normal CSS resolution.

The budget and district settings are implementation tuning, not game rules:

| Setting | Value | Location |
| --- | ---: | --- |
| Maximum render pixels | 2,000,000 | `dist/render-budget.js` |
| Maximum pixel ratio | 1.35 | `dist/render-budget.js` |
| District size | 32 m | `dist/spatial-chunk-batch.js` |
| Minimum district culling saving | 0.30 | `dist/spatial-chunk-batch.js` |
| Animation sphere minimum radius | nominal height × 2.2 | `dist/humanoid-character.js` |

## Measurements

Baseline is public commit `39f378797325dd0d21d2127e44b24a1c9182112a`.
The JSON files in `QA/overall-performance-*.json` retain the raw samples.
Before and after ran sequentially on the same cloud executor using Chromium
with SwiftShader, the same private character assets and frozen render poses.
CPU samples cover 40 simulation frames after warmup; the rubble case destroys
four real support columns. These are software-browser measurements, not phone
FPS predictions or a guarantee of improvement at every camera angle.

| Workload | Before | After |
| --- | ---: | ---: |
| Evacuation runner update | 1.010 ms | 0.448 ms |
| Bastion arena runner update | 0.840 ms | 0.383 ms |
| Evacuation street submitted triangles | 330,798 | 142,870 |
| Evacuation street color draw calls | 197 | 197 |
| Arena street submitted triangles | 217,976 | 126,784 |
| Evacuation rubble simulation frame | 9.542 ms | 7.615 ms |
| Arena rubble simulation frame | 10.455 ms | 9.215 ms |
| Native fullscreen drawing buffer | 2,592 × 1,301 | 1,995 × 1,002 |

The fullscreen buffer uses about 41% fewer pixels in this test. A 430 × 932 CSS
touch viewport retains ratio 1.35. The maximum applies to the actual canvas,
which is smaller than the browser window when the control strip is present.

Rendering timings were mixed in independent browser runs: evacuation street
render submission measured 4.1 → 5.0 ms, arena side view 5.9 → 4.0 ms, and native
fullscreen 3.0 → 2.9 ms. The full evacuation CPU sample also varied from
5.190 → 6.813 ms despite the faster runner query. Reduced triangle/pixel work
and runner-query cost are the reliable measured gains; no fixed FPS gain is
claimed. `PERF_COMPARE_BATCH=1` alternates the original complete city draw and
the new district draw in the same frozen page to check rendering separately.
That paired check also showed variable submission times: overview legacy
10.8/3.8 ms versus culled 9.0/5.2 ms; street legacy 3.3/3.7 ms versus culled
3.4/4.2 ms. It confirms reduced geometry at the same draw-call count, not a
consistent render-submission speedup in SwiftShader. `gl.finish()` timings are
not hardware GPU timer queries and are not converted into an FPS claim.

## Verification

New focused checks:

```sh
node QA/spatial-chunk-batch-test.mjs
node QA/indexed-hero-movement-test.mjs
node QA/character-culling-test.mjs
node QA/overall-performance-regression-browser.cjs
```

The movement test compares indexed and plain-array simulation results exactly
at 30 Hz, 60 Hz and 75 ms frames. The skin test checks 386,478 weighted vertex
samples. The browser regression covers real scorching, rebuilding, a detached
fragment moved across districts, same-frame visibility, desktop/touch hero
movement, native fullscreen, the pixel cap and the visible fullscreen FPS HUD.

The existing collapse browser check used a fixed fragment-center cutoff of
3 m. Both the unchanged baseline and this revision produced the identical
settled height of 3.010398 m in the arena, on terrain at 1.781620 m. The check
now uses a conservative size-aware elevation ceiling above the actual terrain
(half the fragment's diagonal plus 0.1 m), while retaining complete collapse,
bounded active bodies, physics/render transform matching and rebuild checks.
The physics unit test still verifies exact rotated-box grounding on its flat
and terrain fixtures. No destruction behavior was changed to satisfy this test.

Passed 20 focused unit suites, including collision/query parity, weighted
assets, grounded dash, damage routing, building release/collapse, Walker weapon
defeat, Bastion permanent parts/proximity, civilian navigation and wave policy.
Browser checks passed for desktop and touch controls/fullscreen, collapse and
rebuild in all three city layouts, Walker defeat/Chinook shutdown/Bastion
arrival, and controlled-player Bastion pulse gating. Rendered fragment matrices
matched physics within 0.000004 m in those collapse cases.
The convoy HUD/results suite also passed on desktop and touch: both pickups,
boarding, per-bus passengers, loaded-bus/all-bus losses, one-bus success,
scoring, minimap markers, ARGUS death flag and restart.

Run browser scripts from the repo with `dist` served on port 8765. Installed
Chromium/Playwright and the private runtime character files are required.
To compare against the previous source without changing the checkout:

```sh
mkdir -p /tmp/crossfire-before
git archive 39f3787 dist | tar -x -C /tmp/crossfire-before
PERF_BASELINE=/tmp/crossfire-before PERF_OUTPUT=/tmp/before.json node QA/overall-performance-browser.cjs
PERF_OUTPUT=/tmp/after.json node QA/overall-performance-browser.cjs
PERF_COMPARE_BATCH=1 PERF_OUTPUT=/tmp/render-comparison.json node QA/overall-performance-browser.cjs
```

Do not run simultaneous browser benchmarks. `PERF_RENDER_ONLY=1` tests an
away-facing camera and native fullscreen; `PERF_SCENES` selects scenarios.
The harness waits for the fullscreen canvas resize before sampling.

Physical phone FPS, GPU timings and thermal behavior remain unmeasured.
Large simultaneous destruction still costs CPU physics time; this pass retains
the existing active-body budget and destruction behavior.

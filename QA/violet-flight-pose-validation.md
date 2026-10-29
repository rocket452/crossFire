# Violet hover and fast-flight poses — revision 26

The visible supplied weighted character uses a symmetric body pose instead of looping Fall. At rest, arms hang beside the hips with small breathing/drift motion and softly bent legs. Actual velocity blends the silhouette between 5 and 22 m/s. Fast flight leans up to 79 degrees, follows travel heading/elevation, extends the right arm ahead of the head, folds the other arm, stretches the legs and points the toes. The cape trails behind. Quaternion damping and speed/action damping avoid pose snaps. Charging and shielding override travel; combat movement, damage and cooldown tuning are unchanged.

A separate presentation pivot at torso height keeps the body/cape together without rotating gameplay coordinates. Source skin weights, 1,256 body triangles, geometry/material sharing and all other actors are retained. Procedural posing operates on the actual weighted arm/leg/head bones. The eye accessory rotates about the same head pivot; VFX/projectiles still originate from the actual supplied hand bones.

Passed:

- `node QA/violet-flight-pose-test.mjs`: 30/60/120 Hz transitions, diagonal/upward flight, bounded orientation changes, action priority, hover return and reset.
- `node QA/violet-inertia-test.mjs`: bounded acceleration/inertia, slower shots, shield lockout and recovery.
- `node QA/violet-flight-pose-browser.cjs`: desktop 1100×1000 and touch viewport 390×844. Tests actual weighted hand ahead of head, feet/toes behind pelvis, upright neutral hover, eye attachment, finite bone matrices, shared geometry, transition blending and power-pose priority. A 22-second encounter on both layouts produces 2 orb shots, 2 robot hits and 30 shield contacts. No page errors or horizontal overflow.
- `node QA/explosive-characters-browser.cjs`: all 39 real weighted characters, infantry rifle grips, source movement/death, actual hand-attached electricity, reset and natural combat. Passed desktop and phone layouts.
- `node QA/explosive-asset-test.mjs`: original skin/weights, bones, compatible clips and bounded source deformation.
- JavaScript syntax and `git diff --check`.

Inspected desktop hover/fast-flight renders. Screenshots in `/tmp/violet-hover26.png`, `/tmp/violet-super-flight26.png`, `/tmp/violet-power26.png` and corresponding `-phone` files. Software-rendered browser QA verifies appearance/behavior, not physical phone performance.

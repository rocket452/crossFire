# Uploaded character and animation integration

The supplied Explosive LLC character replaces the visible bodies of all 36 soldiers and three heroes. The original browser simulation still owns movement, collision, aiming, damage, hero abilities and controls.

## Conversion checks

`node QA/explosive-asset-test.mjs` passes against the generated private GLB:

- Exactly 1,256 source body triangles, 2,526 split render vertices and 53 weighted skeleton bones.
- Every vertex has valid joint indices and normalized weights; zero source influence weight is discarded.
- Canonical left/right hand nodes exist despite duplicate labels in the supplied Bones FBX.
- All 17 selected source clips contain real changing transforms; poses remain finite and within a 4m local extent.
- Two same-team characters share geometry/materials but have independent skeletons and poses.
- Hero height scaling remains bounded.
- Runtime GLB: 1,666,392 bytes. Raw FBXs, PSD, Unity demo scripts and archive are not deployed.

The source mesh is block styled. Compatible locomotion and knockdown clips are used directly; rifle, wall-running, flight, shield and energy poses need game-specific overlays. The pack does not include dedicated rifle or superhero power animations.

## Full-scene browser checks

`node QA/explosive-characters-browser.cjs` passes desktop 1100×1000 and emulated touch 390×844:

- All 39 characters use real weighted meshes with 53 bones and independent animation state.
- Shared team palette geometry/materials and distinct team colors.
- Source walk/run states, independent poses, real rifle fire, source death clip, revival and reset.
- Both rifle grips match the retargeted visible hands to below 0.001m in the sampled 36-soldier scene, including crouched and firing poses. The rifle muzzle uses the same adjusted matrix.
- Charged electricity's core coincides with the visible supplied rig's right hand to below 0.000001m.
- No non-finite transforms, page/shader errors or horizontal page overflow.
- A 22-second natural encounter produces two Violet orb hits on the robot, 58 Rift projectiles, four self teleports, and CPU runner locomotion/strafe/fall animation states.

Screenshots: `/tmp/explosive-soldiers.png`, `/tmp/explosive-heroes.png`, `/tmp/explosive-charge.png`, and their `-phone` variants. These are browser-emulated layouts; physical phone FPS/thermal performance is not measured.

## Regression coverage

The current character-enabled game also passes:

- `QA/runner-feel-browser.cjs`: mobile assisted missile interception, manual override, saved control preferences, real plasma rescue versus an unrescued control, safe ally health, actual save attribution, notices/rings/audio/mute and reset.
- `QA/twin-stick-browser.cjs`: four screen configurations, real simultaneous move/look/fire/ability contacts, correct directions, cancellation, blur, hold turning, pitch/deadzone and touch-target layout.
- `QA/runner-dash-browser.cjs`: actual input, rendered supplied soldier meshes and tanks moving continuously with their colliders, cooldowns, CPU avoidance and reset. The inspector now reads the visible skinned character root instead of the old hidden pelvis instance.
- `runner-forgiveness-test.mjs`, `runner-assist-rescue-test.mjs`, `runner-charge-test.mjs`, and `hero-defense-test.mjs`.

Changed JS modules pass syntax checks and `git diff --check` passes. Source licensing separation is checked before public GitHub push: no generated licensed character files are tracked on public `main`. The private Sites branch adds only the app-specific runtime GLB and manifest to the tested public code commit.

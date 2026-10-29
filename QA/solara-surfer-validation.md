# Solara surfer stance — revision 37

Changed her base slide silhouette to a low, side-on surfing stance instead of standing forward. Hips turn about 50° across travel, the chest counter-turns slightly and the head looks along the slide. Feet are staggered roughly 1m front-to-back with toes turned across the ice. Knee IK now uses the hip heading so the bent knees follow the stance rather than the board's forward axis.

Lowered the base pelvis to roughly 1.11m at rest / 1.05m in the usual 2.5m/s patrol, with a deeper speed crouch. Arms balance front/back with softer elbows. Subtle ongoing motion: up to 5cm side-to-side hip travel, 2.4cm rise/fall, small fore/aft shifts and shoulder/hand adjustments. Slowed the balance cycle to 1.15–1.8rad/s; feet stay anchored instead of stepping or sliding during the balance cycle. Existing casting blends, rotation smoothing and hand/head attachments remain active.

No changes to travel speed, attack timing/damage, fire trails, ice ribbon lifetime or dome growth. No model, texture or draw-call additions.

Validation:

- `solara-animation-test.mjs`: PASS 30/60/120Hz real weighted skin. New five-second slow-glide checks verify low hips, bent knees, small measurable balance motion, side-on hips and fixed feet; existing fast/carve/fire/release/ice transitions remain smooth and reset correctly.
- `solara-female-test.mjs`: PASS all source geometry/weights, deformation, planted feet, accessories and actual charge/throw hand checks. Stance bounds updated to the new front/back placement.
- `solara-animation-browser.cjs`: PASS desktop and portrait touch, six rendered states with finite bones, planted feet, fitted head parts and no shader/page errors. Close-up idle/fast/carve frames visually reviewed for the new silhouette and elbow softness.
- `solara-test.mjs` and `solara-browser.cjs`: PASS actual fireball damage, both plasma interceptions, protected/exposed allies, roster/persistence/reset and bounded effects.

Software browser checks do not measure physical phone FPS or thermal behavior.

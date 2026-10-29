# Solara dynamic animation — revision 34

Kept the uploaded female body, its 23-bone weighted skeleton, elemental materials and fitted head accessories. Added an animation layer driven by actual travel speed/turn rate and fire/ice casting progress. It replaces the single fixed surf pose.

- Idle breathing and shifting hips; a staggered, flexible surfing stance.
- Faster travel lowers the pelvis by up to an additional 0.16m, bends the knees and trails the arms. Even the usual 2–3m/s patrol has a visible glide pose. Opposite turns bank the torso/hips in opposite directions.
- Spine movement is distributed over all three spine joints, with opposing shoulders and head motion.
- Fireball: gather by the right shoulder, torso wind-up, extension during the final charge, 0.36s release/follow-through, then blend to gliding. The existing 0.65s gameplay charge and 1.6s shot cooldown remain unchanged.
- Ice dome: a separate left-arm sweep, torso twist and gradual settling over the existing 2.6s dome growth. Head follows the casting target with limited, smoothed neck motion.
- Feet stay on the ice at local Y=0.17m using two-bone IK. Ankle direction changes with the stance. Arm IK keeps anatomical elbow poles, continuous bend planes and the source rig's bind roll; arm rotation is capped at 10rad/s to prevent wind-up/release flips. Hand positions blend in character space.

The real weighted skin deforms; charge balls, fireballs, ice beams, hair and eyes follow the actual hand/head bones. Reset clears pose history. No new geometry, textures, draw calls or imported animation package. The body remains 574 triangles.

## Checks

`node QA/solara-animation-test.mjs` passes on the real female skin at 30/60/120Hz: slow/fast glide, articulated knees, opposing carving, fire wind-up/release, ice summon, bounded deformation, finite transforms, no bone snap, planted feet, head attachments and reset. Maximum per-frame arm rotation was about 19.1°/9.55°/4.78° respectively. Foot contact error stayed below 0.005m. Final poses agree across frame rates.

`node QA/solara-animation-browser.cjs` passes in Chromium desktop 1100×1000 and touch 390×844. Six rendered pose states, real weighted body/accessories, contact and shader checks, no browser errors or overflow. Close-up idle/glide/carve/fire/release/ice screenshots were visually reviewed.

`node QA/solara-female-test.mjs`, `node QA/solara-test.mjs`, and `node QA/ice-dome-test.mjs` pass. `node QA/solara-browser.cjs` passes desktop and portrait: fireballs damage the robot; both natural plasma arcs are blocked; protected tank/soldier survive; roster selection, persistence, cancellation and reset work. Software browser verification does not establish physical phone FPS/thermal performance.

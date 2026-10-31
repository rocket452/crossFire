# Kage jump feel — revision 93

Deadlock-inspired movement tuning for the existing hero, using the current weighted character and swept collision controller. This is not an exact reproduction of Deadlock's controller.

## Changes

- Preserve the roughly 18m high jump while shortening its normal airtime from 2.4s to approximately 2.0s. Faster takeoff, smoothly stronger gravity after the apex, no sudden apex velocity change.
- Airborne input uses a separate response from ground movement. Releasing movement retains momentum; opposite input steers gradually instead of stopping/reversing immediately. The existing 46m/s ground speed and 32.2m/s desired air speed remain.
- Add 100ms ledge grace and a 150ms landing jump buffer. Inputs still allow only one air jump; wall springs restore one air jump as before.
- Scrub the existing Jump/Fall clips through the actual flight phase rather than repeating the complete jump during ascent. Replace the forced 360-degree double-jump roll with a 340ms knee tuck. Add a 240ms impact-scaled landing compression; movement/attacks remain available.
- Camera follows once per render frame after movement (previously updated three times). Keep the horizon upright, smooth body tilt, and retain camera obstruction checks.
- Shared RunnerMotion options default to its previous values, so Volt retains his existing controls. Dash range, damage, cooldown, kill resets, slow fall and shurikens are unchanged.

## Configurable movement values

`NINJA` in `dist/ninja-motion.js`:

| Setting | Value |
| --- | --- |
| Jump / double jump / wall spring vertical speed | 34 / 30 / 40 m/s |
| Rising / fully falling gravity | 32 / 44 m/s² |
| Falling gravity transition | Blends over first 8 m/s of descending speed |
| Terminal falling speed | 52 m/s |
| Air steering / idle drag response | 5 / 0.15 per second |
| Ledge grace / input buffer | 0.10 / 0.15 seconds |

Presentation values live in `NinjaHero.pose` and `updateCamera`: 340ms double-jump tuck, 240ms landing recovery, 0.13m maximum visual landing offset; horizontal/vertical camera response 22/28 per second. Presentation offsets do not move the collision body. The supplied 1,256-triangle, 53-bone mesh, its source clips, and hand-based projectile origins remain in use.

## Verification

Passed:

- `node QA/ninja-jump-feel-test.mjs`: 30/60/120Hz plus 75ms frames. Apex 18.014–18.072m, time to apex 1.05–1.067s, airtime 2.000–2.025s. Momentum retention over 100ms of released input 98.51% (baseline 7.43%). Countersteering remains responsive. Ledge grace preserves the air jump, landing buffer fires once, expired input does not cause a later bounce, ceiling collision stops ascent.
- `node QA/ninja-motion-test.mjs`: high/double/no third jump, real roof landing, outward high wall spring, dash range/cooldown, slow fall, kill resets and scenery rejection across four frame timings. The air-speed settling fixture now waits 1.5s to accommodate intentional gradual acceleration.
- `node QA/ninja-jump-browser.cjs`: actual desktop keyboard/pointer-lock and phone touch controls in the evacuation map. Running takeoff, movement release, double jump, full flight and landing, a second jump with 75ms frames, upright camera, exactly one camera update per frame, no repeated ascent clip or 360-degree roll, finite weighted deformation, landing compression/recovery, then resumed combat/civilian activity. Screenshots inspected at `/tmp/kage93-tuck-phone.png`, `/tmp/kage93-tuck-desktop.png`, `/tmp/kage93-land-desktop.png`.
- `node QA/ninja-browser.cjs`: desktop and phone roster controls, high/double/wall jumps, two missile dash-kill chains, real hand-based shuriken hits, drone dash kill/reset, CPU hero behavior, weighted character, Violet self-shield and weapon-only robot feedback.
- `node QA/runner-motion-test.mjs`, `node QA/runner-air-wall-test.mjs`, `node QA/runner-forgiveness-test.mjs`, `node QA/runner-dash-test.mjs`: shared collision, wall/roof traversal, forgiveness and Volt rescue-dash regression checks.
- `node QA/explosive-asset-test.mjs`: supplied weighted mesh, clips, deformation and scaling remain valid.
- JavaScript syntax checks and `git diff --check`.

Browser verification uses headless Chromium with software WebGL and an emulated phone viewport/touch input. Physical-phone performance and subjective feel still require device playtesting. No multiplayer, stamina system, new animations/assets or new hero abilities were introduced.

## Revision 95 — lower initial jump

The first jump now uses `34 * Math.sqrt(0.7)` (approximately 28.446m/s) launch speed, reducing its height by 30% while retaining gravity, double-jump speed (30m/s), wall spring (40m/s), air steering and all dash behavior. The revision 93 measurements above describe the earlier jump.

Current `ninja-jump-feel-test.mjs` measurements across 30/60/120Hz and 75ms frames: apex 12.614–12.664m, time to apex 0.883–0.900s, airtime 1.675–1.725s. A comparison with the previous 34m/s jump using the same collision/gravity controller measured 30.055–30.112% lower height above takeoff; the small difference comes from discrete integration. Existing jump/landing-buffer fixtures and browser height expectations were adjusted for the requested height. `ninja-motion-test.mjs` still passes double jumps, wall springs, roof landings, dash/slow-fall/kill-reset behavior at all four timings.

`ninja-jump-browser.cjs` passes with actual desktop keyboard and emulated phone touch input: lower first jump, double jump, nonlooping weighted animation, upright camera, landing recovery, 75ms frames and resumed city combat. Physical-phone performance was not measured.

# Volt Rush control comfort and rescue feedback validation

Passed checks cover the full game plus deterministic physics and policy fixtures. Phone testing uses browser emulation, not physical-device FPS, thermal, haptic or speaker measurements.

## Movement

`node QA/runner-forgiveness-test.mjs` verifies at 30/60/120Hz:

- A jump shortly after walking off an edge succeeds within the 0.12s grace period; late jumps fail.
- A jump pressed within 0.15s of landing is buffered; an older request expires.
- Consumed grace cannot create a midair double jump.
- A descending foot within 0.28m catches an actual supported slab once; a more distant miss falls.
- Running off a roof remains possible and does not repeatedly snap back onto its edge.
- A clear rooftop lip can be mantled early; an intermediate floor behind a wall or a dynamic falling roof cannot.

Existing `runner-motion-test.mjs`, `runner-rooftops-test.mjs`, `runner-animation-ai-test.mjs`, `runner-charge-test.mjs` and `runner-dash-test.mjs` pass. The older city animation fixture now tags its generated walls/slabs with the same section types used in the production city. Roof patrol, support loss, slopes, animation, ally collision sweeps, charge/burst/cooldown and CPU takeover remain covered.

## Assistance and rescue attribution

`node QA/runner-assist-rescue-test.mjs` verifies small target acquisition cones, live targets, forward range, collision visibility, friendly/cover rejection and unchanged manual direction. It also verifies survival, actual carried movement, safe blast clearance, original-position danger, real matching impact, duplicate rejection, friendly-fire rejection, expiry, reset and rejection of movement performed later by a portal.

`node QA/runner-feel-browser.cjs` passes on 390×844 touch, 844×390 touch fullscreen and 1100×1000 desktop:

- The gear menu, range slider and assist/sound switches work; settings survive reloads.
- At 1.5× sensitivity, half a second of full look input turns 1.8 radians.
- On touch, a real missile 4 degrees off manual aim is acquired and intercepted by actual charged electricity. With assistance disabled, the same offset missile survives. Desktop aiming stays manual.
- A real plasma shell in its final 0.45s threatens a 100HP tank and a 35HP soldier. Actual E/DASH input carries them out. Both retain full health; one confirmed impact awards exactly 2 saves, one close-call notice, four ring instances and one audible chime.
- The notice expires while the saved count remains. Muting prevents another chime. Rebuild clears saves.
- Without a dash, the same impact reduces tank health to approximately 17.63 and kills the soldier; no rescue is credited.
- No page errors or horizontal document overflow.

`node QA/twin-stick-browser.cjs` also passes four layouts (390×844, 320×740, 844×390 fullscreen, 1100×1000). Real simultaneous move/look/fire/ability contacts, directions, release/cancel/blur, pitch clamp, deadzone and non-overlapping ≥44px controls remain covered. `node QA/runner-dash-browser.cjs` passes actual rendered ally carry, swept colliders, cooldown, CPU avoidance and reset.

## Combat regression

`plasma-artillery-test.mjs`, `hero-defense-test.mjs`, `building-armor-test.mjs` and `robot-arsenal-test.mjs` pass. Callback additions forward attack IDs for rescue attribution; damage, the 90% non-robot building resistance and robot weapon rotation are unchanged.

Syntax checks for changed modules and `git diff --check` pass. Screenshots: `/tmp/runner-feel-phone.png`, `/tmp/runner-feel-landscape.png`, `/tmp/runner-feel-desktop.png`.

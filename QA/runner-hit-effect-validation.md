# Lightning damage feedback — revision 76

`electricAttack` forwards actual positive enemy/weak-point damage to the speedster's existing FX update. `RunnerHitEffect` adds a bright local flash/halo, expanding ring, branching electrical contact arcs, flying sparks and reversible pulsed cyan armor emission. It follows the struck mesh/weak-point attachment and uses the existing beam light at the contact. Existing reactor, weapon-warning and core emissive colors are left alone. Damage, hit detection and resource logic remain authoritative and unchanged.

## Verification

`node QA/runner-hit-effect-test.mjs` passes at 30/60/120 Hz:

- Zero damage and non-enemies cannot start feedback.
- Sustained damage uses a timed burst cadence rather than spawning per frame.
- Contact follows a moving part; original emission/intensity restore on expiry or clear.
- Existing glowing reactor material is preserved.
- Rapid target switching stays within four targets, 72 sparks, 96 segments and six draws.

`node QA/runner-hit-effect-browser.cjs` passes on 1100×1000 desktop and emulated 390×844 phone, using actual held mouse/touch fire in the evacuation scene:

- Real drone, boss armor and weak-point damage all produce visible feedback.
- A stationary one-second drone hit still deals exactly 150 damage and consumes 25 charge.
- Sustained impacts show arcs/sparks with roughly ten bursts per second, not 60.
- Contact follows a moved drone; emission and all active draws expire after release.
- Misses and a real building panel blocking the ray cannot trigger enemy feedback.
- Rebuilding clears all effects/material changes; no browser errors.

Inspected `/tmp/lightning-hit76-boss-desktop.png` and `/tmp/lightning-hit76-drone-phone.png`; matching boss/drone captures exist for both layouts. Phone checks emulate input; physical-device FPS/thermal performance has not been measured. `runner-beam-test.mjs`, changed module syntax and `git diff --check` also pass.

The existing death explosions, missile interception effects and overload/weak-point stun discharge are unchanged. The contact layer restores existing materials rather than replacing them, creates no extra lights and never changes health or enemy behavior.

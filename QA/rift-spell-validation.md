# Rift portal-opening spell — revision 55

Rift uses a 0.65-second portal-placement gesture. Both hands trace mirrored circles in front of his chest, with a short lift and return. The supplied weighted character uses its balanced Idle body animation plus two-bone arm IK, rather than a held attack/lunge clip. The fallback rigid model also receives circular arm motion.

Glowing mint/ivory energy, spinning gold hand runes and short particle trails follow the actual rigged hand positions. The trail buffer is capped at 96 particles and avoids long streaks across teleports. Glows fade at the end of the gesture, remaining sparks expire within 0.22 seconds, and reset/deselection clears the effect. No additional lights or post-processing are used. Placed portals continue their autonomous fire independently of the casting gesture.

Verification:

- `QA/rift-spell-browser.cjs`: desktop and 390px touch viewport, both real weighted hands move substantially in two axes during their circles, hand effects match the real bones within 0.00001m, finite bone transforms, bounded particles, return to Idle, independent portal fire, fade and reset; shader/runtime checks and screenshot inspection.
- `QA/rift-autonomous-browser.cjs` updated for the 0.65-second placement gesture: portal keeps firing from its original location while Rift teleports and rescues civilians, then expires independently.
- Existing Rift integration regression and portal-policy tests pass. Supplied mesh/rig validation also passes. Browser QA uses software Chromium; physical phone performance was not measured.

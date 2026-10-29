# Solara ice-forming tip effect — revision 38

Added a restrained blue-white shimmer across the live slide's front edge, with soft frost wisps and a few crystalline sparkles. The emitter follows the actual final ribbon cross-section and tangent, including curves and slopes. Particles remain within a small local volume around that edge, even at rescue speed, so the effect reads as new ice forming rather than a second trail.

The effect blends in above 0.3m/s and fades when stopped. Wisps/sparkles last 0.38–0.62s, emitted at 24/s with a shared cap of 48. Two additional draw calls: a translucent edge band and procedural billboard particles (maximum 98 triangles total). No new textures, lights or external assets. Existing movement, surfer pose, connected 9.6s ice ribbon, attacks and dome behavior are unchanged. Rebuild/deselection clear the effect.

Validation:

- `solara-ice-forming-test.mjs`: PASS 30/60/120Hz actual tip attachment through turns/slopes, small local particle bounds, capped population, no stationary emission, fade/reset, missing-slide cleanup and fixed draw budget.
- `solara-ice-path-browser.cjs`: PASS desktop 1100×1000 and touch 390×844. Both new shaders render without errors, effect anchor matches the actual leading edge, particle count is bounded, reset clears it, connected long trail and natural fireball combat continue. Wide and close-up front-edge screenshots visually reviewed.
- `solara-test.mjs` and `solara-browser.cjs`: PASS real fireball damage, both natural plasma interceptions, protected/exposed tank/soldier controls, roster/persistence/reset and existing bounds.

Software browser checks do not measure physical phone FPS/thermal behavior.

## Revision 41 — doubled front effect

Doubled the shimmer band's width/depth, frost particle dimensions, and particle spread around the existing leading-edge anchor. Emission rate, lifetime, opacity, 48-particle cap, two draw calls and the ice slide/trail geometry remain unchanged.

Validation: existing ice-forming checks pass at 30/60/120Hz. Direct geometry/instance checks confirm the 2× band dimensions, particle size and spread. Ice-path browser checks pass at desktop 1100×1000 and touch 390×844 with no shader/runtime errors; attachment, reset and natural fireball combat pass. Front close-up screenshot reviewed.

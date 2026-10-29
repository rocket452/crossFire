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

## Revision 43 — stronger forming plume

Increased the current effect scale from 2 to 3, emission from 24 to 60 particles/s, mist base size from 0.24–0.39 to 0.32–0.50m before scale, crystalline sparkles from 0.075 to 0.10m, and lifetime from 0.38–0.62 to 0.50–0.74s. Frost rises faster; mist opacity rises from 0.12 to 0.42, front shimmer from 0.25 to 0.65, and crystals gain brighter cross-shaped glints. This produces a visible cyan-white leading plume at ordinary escort distance. The front anchor, two draw calls, 48-particle cap, slide geometry, steering and robot opening sequence remain unchanged.

Existing ice-forming checks pass at 30/60/120Hz with updated plume population/lifetime bounds. Ice-path browser checks pass desktop 1100×1000 and touch 390×844: attached curved trail, at least 30 active frost particles, fade/reset, natural fireball combat, no shader/runtime errors or page overflow. Front close-ups and actual natural escort camera screenshots visually reviewed at `/tmp/solara-forming43*.png`. Software checks do not measure physical phone FPS/thermals.

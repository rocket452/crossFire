# Solara connected ice path — revision 35

The live slide now blends its incoming trail tangent with Solara's travel direction, then curves forward. History, the turn and the front slide share the same indexed cross-sections, including the bright edge strips, so turning cannot separate adjoining rectangles. Corner widths are capped to avoid spikes; the ribbon follows changes in altitude and retains a stable heading at rest. Ends are capped and the old tail thins as it expires.

Doubled history lifetime from 4.8 to 9.6 seconds and sample capacity from 96 to 192, retaining the previous sample spacing. At a constant travel speed, the actual retained trail length is approximately twice the previous length. The two live front segments and optional foot connector bring the maximum to 195 rendered segments. Two preallocated meshes replace the separate slab/rail instances: still two draw calls, at most 2,344 triangles combined. No external assets or new textures. Reset/deactivation clear the geometry.

Validation:

- `solara-ice-path-test.mjs`: PASS 30/60/120Hz, measured new/old retained-length ratios 2.0000/1.9896/2.0105; shared real vertex indices across all joins, curved and sharp turns, changing height, bounded miter widths, stable stationary heading, finite data, geometry cap/reset.
- `solara-ice-path-browser.cjs`: PASS desktop 1100×1000 and touch 390×844. Rendered 194 connected segments / 35.40m total on the controlled curved route; real natural city update, fireball hits, 9.6s lifetime, reset, no page/shader errors/overflow. Screenshots visually reviewed.
- `solara-test.mjs`, `solara-female-test.mjs` and `solara-animation-test.mjs`: PASS combat/dome/rig/motion regressions. Existing path-cap assertions were updated from 97 to 195.
- `solara-browser.cjs`: PASS desktop and portrait for both natural plasma interceptions, protected/exposed tank and soldier controls, fireball hits, roster swaps, persistence, cancellation and reset.

Software Chromium checks verify rendering and behavior; physical phone FPS/thermal performance is not measured.

# Solara gentler turns — revision 39

Interpreted “turning too sharply” as a request for wider, smoother turns. Replaced direct velocity-vector blending with bounded heading steering, gradual speed changes and gentle braking into large direction changes. Flight turns at up to 0.65rad/s (~37°/s), using an 8m radius floor, with angular acceleration 1.4rad/s². Acceleration/braking caps are 18/20m/s²; existing 20/32m/s normal/rescue speed caps remain.

Body rotation follows the actual slide direction at up to 0.8rad/s (~46°/s), with slower settling. Removed the low-speed fallback that turned the entire body toward the robot; she holds her travel heading while idle. Head/arm aiming continues to handle casting. Reset clears steering history. No new graphics assets or draw calls.

Validation:

- `solara-steering-test.mjs`: PASS 30/60/120Hz. A 20m/s right-angle retarget follows a minimum measured ~16.97m arc, versus ~3.64–3.68m with the previous velocity blend. Heading changes ~29° in the first second, then completes the turn. Turn/body caps, reversals without flips, idle stability, pause/reset and frame-rate agreement pass.
- A 90-second moving-patrol simulation at all three rates stays within ~26m of city center and finishes ~1.5m from its moving goal; no runaway circles or non-finite positions.
- `solara-test.mjs` / `solara-female-test.mjs`: PASS real fireball damage, both plasma interceptions, surviving protected allies, rig/effect bounds and reset.
- `solara-ice-path-test.mjs` / `solara-animation-test.mjs`: PASS connected long ribbon and surfer/casting motion regressions.
- `solara-browser.cjs`: PASS desktop 1100×1000 and touch 390×844: real fireball hits, natural plasma/dome interceptions, protected/exposed allies, roster swaps, persistence/cancellation/reset, no page/shader errors.

Software tests do not measure physical phone FPS/thermal behavior.

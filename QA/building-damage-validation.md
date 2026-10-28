# Building durability / panel scorch validation

- Section health: wall 4 → 5.2, slab 6 → 7.8, column 10 → 13, exactly +30%.
- Direct low-power hits consume health once and survive when appropriate; splash keeps distance falloff. Surviving panels show immediate damage tint, increasing with damage.
- Shared scorch survives detach, settle and repeated hits. Rebuild resets health, color, debris and support state. Heavy weapons still breach panels; support propagation and bounded rigid-body activation remain functional.
- Node checks: `building-damage-test.mjs`, `player-building-damage-test.mjs`, `city-physics-test.mjs`, `energy-beam-test.mjs`, `combat-collision-test.mjs`, `hero-defense-test.mjs`.
- Browser check: `node QA/building-damage-browser.cjs` against the local HTTP server. Exercises actual shell/rocket sweeps, electrical/beam traces, orb hit and rifle shot callbacks. Asserts HP and actual GPU instance-color changes for all six paths, survival/progressive tint, reset, fixed draw calls, no page errors and no horizontal overflow at 1100px and 390px.
- Screenshots `/tmp/building-clean.png`, `/tmp/building-scorched.png` and corresponding `-phone` images. Headless Chromium uses software WebGL; this validates functionality and draw-call stability, not physical phone GPU throughput.

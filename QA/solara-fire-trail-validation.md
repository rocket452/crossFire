# Solara fireball particle trail — revision 36

Added a continuous, world-space flame trail to every fireball. A pulsing pale-hot projectile core and orange halo lead elongated, flickering golden/orange flame puffs. They spread and rise, cool toward deep red, shrink and fade independently. Small embers peel away and linger briefly. Existing launch and impact sparks remain.

Flames emit every 0.24m along the actual swept projectile segment, including the clipped endpoint on impact. This avoids frame-rate-dependent dotted trails and emission beyond the hit point. Flame lifetime is 0.36–0.56s; ember lifetime 0.55–0.9s. Surviving particles fade after impact or expiry. Rebuild/deselection clear the pools. The fireball's speed, homing, damage and attack cadence stay unchanged.

Two additional bounded instanced draws use low-poly icosahedra, per-instance heat colors and alpha. Caps: 384 flame puffs / 128 embers shared across all fireballs. No per-shot scene objects, lights, downloaded textures or shader dependencies. Alpha uses additive blending with depth testing and no depth writes.

Validation:

- `solara-fire-trail-test.mjs`: PASS at 30/60/120Hz. Identical 158 flame emissions over a 38m flight, 76 live flames / 39 embers at one second; continuous tail behind the head, independent fade, complete expiry/reset. A 24-shot stress fixture stays within both fixed budgets and two mesh draws.
- `solara-fire-trail-browser.cjs`: PASS desktop 1100×1000 / touch 390×844. A real launched Solara fireball renders 63 flames / 21 embers with varied per-instance heat/alpha; both particle shaders compile, trails expire, rebuild resets counters, no page/shader errors or horizontal overflow. Screenshots visually inspected.
- `solara-test.mjs`, `solara-female-test.mjs`, and `solara-browser.cjs`: PASS existing character and combat checks, real fireball damage, both natural plasma interceptions, protected/exposed allies, and roster/persistence/reset on desktop and portrait.

Software Chromium verifies behavior and rendering; physical phone FPS/thermal performance was not measured.

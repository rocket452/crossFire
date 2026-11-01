# Soft enemy separation — revision 121

`EnemySeparation` runs once per combat update before enemy movement/attacks, for live spawned Bruisers and experimental robots in both Combat Testing and escort missions. Nearby robot footprints gently repel on the horizontal plane. Coincident centres use a stable pair direction, avoiding random frame-to-frame jitter. Smaller robots yield around the Siege Walker; separation never displaces the Walker itself or changes its own gait. Dead/inactive units and distinct vertical levels do not repel each other. Player heroes, allies and civilians are excluded.

Tuning in `dist/enemy-separation.js`: 0.15m spacing gap, 0.03m resting tolerance, stiffness 12/s, maximum correction speed 3.2m/s, three solver passes, vertical tolerance 2.5m. Footprint radii (metres): Bruiser 2.1, Aegis 2.2, Scythe 2.35, Breaker 1.8, Walker 7. Each robot's collision shapes sync after corrections. World queries use the existing walking clearance, reject solid chunks, and try sliding on one axis when a diagonal correction is blocked. Map bounds are preserved. No vertical forces, damage, weapon timing or targeting changes are introduced.

This uses approximate ground footprints, not new rigid bodies or full mesh collision. Cosmetic weapons/energy shields may overlap. Very tight or obstructed spaces may retain small soft penetration instead of teleporting actors through walls. No new dependencies or model assets.

Verification:
- `enemy-separation-test.mjs`: 30/60/120Hz and 75ms steps; seven coincident robots settle apart, correction speed stays bounded, y never changes, Walker remains fixed, dead/inactive/elevated exclusions, bounds/obstacle sliding, reset.
- `enemy-separation-browser.cjs`: desktop and phone emulation; seven actual Bruisers separate from a shared spawn, live pursuit/firing remains functional, six mixed enemy types separate, real arena walls constrain correction, a crowded group spreads around the Walker without pushing it, no page errors. Screenshot visually inspected.
- `ninja-phase-browser.cjs` and `runner-wave-browser.cjs`: desktop/mobile ground/air Kage phasing and damage, speedster held/released dash, enemy contact damage, ally/civilian pickup/protection/reformation, CPU rescue and world obstruction continue to pass.
- Bruiser four-shot direct/lead burst tests pass.

Physical-phone FPS/thermal performance has not been measured. Pair checks are quadratic in active robot count; the current game uses at most seven small robots in a preset, or six mixed types, plus the Walker.

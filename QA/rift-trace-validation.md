# Rift Warden personal teleport trace — revision 60

The existing successful-teleport hook and two instanced trace pools are reused. Personal travel now sends a green-white streak up to six metres long from the captured departure position to the actual portal emergence position. Travel takes 0.22–0.38 seconds (160 m/s with clamps), then fades for 0.10 seconds. A 0.025 m radius translucent connection follows the head and remains faintly visible through city cover; the brighter 0.045 m radius moving core retains normal depth testing. Timing and dimensions are configurable in `PERSONAL_TELEPORT_TRACE` in `dist/portal-hero.js`.

The pool remains capped at eight traces with two instanced draw calls. Incoming civilian/projectile traces replace other non-personal traces before evicting the hero's active trace, so a twelve-civilian gateway event cannot hide his teleport. Allied/projectile trace travel timing and teleport gameplay are unchanged. Reset and hero deactivation clear both pools.

Verified:

- `node QA/rift-trace-browser.cjs`: PASS desktop 1100×1000 and phone 390×844 with the actual game, weighted character and personal `startTravel()` / `update()` path. No trace before transit; exactly one at transit, correct departure/emergence endpoints, advancing head, short duration/fade, depth policies, 30-civilian trace saturation preserves hero trace, eight-trace cap, expiry and disable/reset. At 30/60/120 Hz, the effect rendered for 12/25/51 frames and expired correctly. No renderer/page errors or horizontal overflow. Screenshots reviewed.
- `node QA/rift-autonomous-browser.cjs`: PASS desktop and phone. Brief casting, automatically firing stationary attack portals, shots continuing during personal travel and civilian rescue, independent five-second lifetimes, energy effects and disable/reset remain functional.
- `node QA/rift-pair-test.mjs`: PASS projectile crossing, direction transform, aperture miss, nearer cover, one-pass guard and expiry.

Changed runtime files: `dist/portal-hero.js`, import cache version in `dist/battle.js`, entry cache version in `dist/index.html`. No models, teleport destinations, cooldowns, combat values or civilian navigation changed. Browser phone emulation does not measure physical-device performance.

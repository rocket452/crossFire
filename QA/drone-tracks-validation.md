# Tracked robot drones — revision 64

The smaller evacuation raider now has two tank treads in place of walking legs. The upper robot, cannon arm, health, attack timing, targeting and wave-two spawn trigger remain the existing implementation. The giant Siege Walker keeps its legs.

`dist/drone-tracks.js` provides the undercarriage: two continuous rubber belts, 48 moving armored plates, eight octagonal road wheels/hubs, armored chassis, waist mount and bumper. Plates follow a closed capsule path; actual movement drives their travel and wheel rotation. Left/right travel differs when the drone turns. Idle, stun and death stop the animation. Rebuild resets both tracks and the original upper-body rest pose. Body bob is reduced from walking motion to a subtle chassis vibration.

The undercarriage uses four instanced draws plus three static chassis meshes. The belts, plates, road wheels and hubs total 1,376 triangles; chassis adds 36 (1,412 total), retaining the game's low-poly style. Geometry is generated with existing Three.js; no asset downloads or new dependencies. A lower collision box covers the wider tread noses and routes hits to the same robot health pool; the original upper-body target remains available.

Changed runtime files: `dist/drone-tracks.js`, `dist/evac-raider.js`, `dist/battle.js`, `dist/index.html`. Entry/import cache versions advance to `tracked-drones-64`.

Validation uses `QA/evac-raider-test.mjs` and the extended `QA/evac-raider-browser.cjs`: real evacuation scene on desktop and mobile, wave-two spawn timing, paired tracks/no old legs, bounded instance/triangle counts, rolling plates, normal weapon traces against treads, stun/idle/reset, existing hero damage and paid stun, death bookkeeping, natural CPU combat and original scene isolation. Close-up screenshots: `/tmp/raider64.png`, `/tmp/raider64-moving.png`, `/tmp/raider64-phone.png`, `/tmp/raider64-moving-phone.png`. Physical-phone FPS/thermal performance is not measured.

Results: both Node and desktop/phone browser suites passed. Normal traces hit the tread noses as `evac-raider`; rolling plate matrices change after approach movement and stay fixed through the stun. Natural 55-second combat produced three raider shots, one civilian hit, and CPU defenders defeated the 1,000-HP raider in both viewport fixtures. Rebuild restored zero track travel, and the original city battle contained no raider. Browser runtime/shader errors and horizontal overflow: none. Arrival and moving close-ups were visually reviewed in both layouts.

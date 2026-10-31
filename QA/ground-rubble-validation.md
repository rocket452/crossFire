# Grounded building fragments — revision 89

Detached building chunks become decorative when Cannon first reports a contact with the ground plane or either terrain pyramid. Contacts are queued during simulation and applied after the physics step. The chunk stays visible at its landing pose, becomes static, has collision mask zero/response disabled, and leaves the static collision index. `collisionDisabled` also excludes it from projectile/visibility/camera traces, character movement/overlap/support, rescue-dash checks, and civilian/drone navigation. Further blasts cannot reactivate it. `physics.stats().collisionlessFragments` reports the count.

Intact architecture, airborne pieces, pieces supported by elevated architecture, and vehicle/robot wrecks retain collision. A city rebuild clears the marker/count and restores each original building collider. Module cache versions are propagated through affected consumers so every query uses the same rule.

Validation passed:

- `QA/ground-rubble-test.mjs`: 30/60/120Hz and irregular 75ms; real ground contacts, rotated falling panels, stable visible landing, physical broadphase/AABB exclusion, projectile tracing, hero movement, 30m dash clearance, blast/reactivation guard, raised terrain, elevated support, unaffected wreck collision, rebuild and repeated collapse.
- `QA/ground-rubble-browser.cjs`: Chromium desktop and phone emulation. Three real city wall meshes fall onto the evacuation boulevard and become collisionless while remaining visible. Trusted WASD/Shift or touch-stick/BOOST input runs through them; E/mobile DASH completes the full 30m route. Projectile, civilian and drone clearance queries ignore the fragments. Rebuild restores masks, transforms and hittable original panels. No page/console errors. Screenshots `/tmp/ground-rubble89-desktop.png` and `/tmp/ground-rubble89-phone.png` visually reviewed.
- Existing city physics, combat collision, runner collision controls/movement, rescue dash, ninja movement, civilian targeting, raider lifecycle and raider aiming tests pass.
- JavaScript syntax checks and `git diff --check` pass.

The landing pose is frozen on first terrain contact; decorative rubble no longer tumbles or responds to later blasts. Physical-phone FPS/thermal behavior was not measured. Browser testing stages an isolated rubble crossing with boss attacks paused; the historical full-game suite was not rerun in its entirety.

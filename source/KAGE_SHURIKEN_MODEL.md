# Uploaded Kage shuriken (revision 283)

The supplied `Shuriken.blend` is the conversion source; `Shuriken.fbx` contains the same evaluated 6,016-triangle mesh and is retained privately as its companion. Blender runs with `--factory-startup --disable-autoexec`; only the evaluated mesh is exported, including its Array, Mirror and Subdivision modifiers. The 189,412-byte GLB preserves the four blades, central hole, thickness and authored normals without requiring textures.

`source/convert_kage_shuriken.py` centers and normalizes the source to the existing 1.2m projectile diameter, in the game's XY star plane with +Z spin axis. The runtime lives under ignored `dist/city-assets/licensed-weapons/`; raw source files stay in `/workspace/private-assets/kage-shuriken/`.

The battle loader supplies it to `NinjaHero`. Held star, CPU throws, charged/early projectiles and the aiming ghost all share the uploaded geometry. Existing hand scale, full-charge scale, tier tint, spin, projectile collision radii, damage, piercing, anchoring and teleport logic are unchanged. The thrown star now uses the existing metallic silver weapon material so the blade surfaces remain readable; the full-charge tint remains cyan. The preview uses a transparent solid silhouette instead of a dense wireframe. The procedural fallback supports isolated old callers; the hosted game's loader requires the uploaded runtime asset.

Run `node QA/kage-shuriken-model-test.mjs` for geometry/normal/axis validation; `node QA/kage-shuriken-model-browser.cjs` for desktop/touch held/preview/flight rendering, full charge/release, stationary anchoring and teleport. Existing charged-shuriken and Kage attack tests cover gameplay regression. Geometry is instanced using the existing projectile caps. Physical-phone GPU/thermal performance has not been measured.

## Larger, slower-spinning stars (revision 292)

`feedback.shurikenVisualScale=1.3` scales the shared runtime geometry by 30%, covering the held star, preview, early/full throws and CPU star visuals. The authored GLB remains unchanged at 1.2m diameter; runtime base diameter is 1.56m before the existing held/tier multipliers. `feedback.spinSpeed=24.5` replaces 35 rad/s (30% slower), including the CPU projectile renderer that previously used a literal spin rate. Collision radii, damage, flight speed, charge/teleport behavior and kunai size remain unchanged. The pending kunai-size edit was discarded following the user's clarification.

The existing uploaded-star browser checks now verify the actual 1.56m geometry bounds, the rendered projectile quaternion against 24.5 rad/s, and the unchanged 2.75x kunai scale, alongside charging, anchoring and teleport on desktop/touch. Charged-shuriken, Kage attack and source-model checks pass.

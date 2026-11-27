# Kage kunai — original model (revision 441)

The kunai is now an original model built from scratch by `source/build_kage_weapons.py` (no supplied geometry). It is public and lives at `dist/city-assets/kage-kunai.glb` with `kage-kunai.json`. It keeps the earlier runtime contract: 0.85m long, centered, blade toward glTF +Z, wrapped grip centered near z=-0.20, three opaque materials (edge steel, steel, red cord wrap) and no textures. Regenerate with `blender -b --factory-startup --python source/build_kage_weapons.py -- dist/city-assets` (or the `bpy` Python module). `QA/kage-kunai-model-test.mjs` validates it.

The section below documents the earlier uploaded kunai, which is no longer loaded.

# Uploaded Kage kunai (revision 284)

`kunai.zip` contains an FBX assembly and three color textures, inside a nested source archive. Extraction and conversion happen outside public GitHub under `/workspace/private-assets/kage-kunai/`. The three authored parts are preserved: blade (144 triangles), ring (1,152), and wrapped grip (1,484), totaling 2,780 triangles. The textures are embedded at 256px each in a 209,380-byte GLB; no external image downloads are needed.

Run `source/convert_kage_kunai.py` in Blender with `--factory-startup --disable-autoexec`, passing the extracted source root and private output directory. It normalizes the assembled weapon to the existing .85m mesh length, pointing +Z, with the grip aligned to Kage's right hand. Source meshes and UVs are retained. `kage-kunai-model.js` combines the three material primitives into grouped geometry shared by the held weapon, instanced volleys and dark outlines. The authored textures remain on the blade, grip and ring; flight uses a slight mint emissive accent with the existing trails.

Only visuals change. Existing 2.75x projectile display scale, 110m/s speed, 55 damage, first-hit stopping, one-second cooldown, .25-second stacking up to five, .075-second volley spacing and shadow charge indicators remain. The separate uploaded shuriken and aimed slash are retained. Texture/geometry are shared across instances; flight adds two material draw groups rather than creating individual projectile objects.

Checks: `QA/kage-kunai-model-test.mjs` validates source counts, dimensions, three embedded textures and opaque materials. `QA/kage-kunai-model-browser.cjs` tests desktop/touch hand/grip fitting, all three textures, shared instancing/outline geometry, five-stack hold and release, actual target damage and preserved uploaded shuriken, with held/flight screenshots. `QA/kage-attacks-test.mjs` and `QA/charged-shuriken-test.mjs` cover combat regression. Physical-phone GPU/thermal performance is unmeasured.

# Asset City Test — revision 313

Select **Asset City Test** in the scene menu, or use `?scene=city-test`.
It starts empty with Kage selected. Choose a hero/enemy preset, then use
**Spawn / Reset enemies** and **Play / Watch selected hero**. Volt and Kage
support direct control; the other heroes retain their existing CPU behavior.
The four existing scenes retain their layouts, combat rules and defaults.

## Imported assets and layout

The uploaded `Building_3.fbx`, `BuildingBlock_1.fbx` and `Advertising_5/6/7.fbx`
are converted with Blender into a private GLB and manifest. The original models
are used for the visible buildings and signs. No procedural tower is hidden
underneath them. The district has 36 buildings (27 towers and 9 shops), open
24m street blocks, a clear boss space and the established 240m arena bounds.

Tower modules are uniformly scaled 2.5× and placed back-to-back, forming a
10m-square, 40.5m-tall block. Storefront modules are scaled 1.667×, paired
back-to-back and stacked twice, forming a 10×8m block about 8.33m tall.
The geometry is clipped into four quadrants per vertical tier, with capped
cuts and a separate roof. Source UVs are retained. Sidewalks, roads, parked
cars and lighting reuse the existing game systems.

The private build loads the original Buildings_002 and Props color and emissive
atlases from Max Parata’s *Voxel Cyberpunk City — monogon* free sample at startup.
The five FBXs in the sample match the installed source models byte for byte.
The color images and sign glow are 2048×2048 WebP. The building glow is 1024×1024.
The four downloads total 804,230 bytes. The district uses blue dusk lighting and
fog, with an initial view into the street so the facades are visible.

**Load city textures** in Test setup still accepts a local ZIP or individually
named images. Saved device overrides take priority over the packaged textures.

## Integration

- `dist/asset-city-config.js`: separate scene id, asset URLs, building positions,
  tower/shop choice, rotation and tint. Original arena config is not mutated.
- `dist/asset-city.js`: imports the real mesh pieces into spatial instance batches,
  adds matching oriented box collision sections, and attaches the imported signs
  to their owning breakable section. Signs follow falling debris and reset.
- `dist/battle.js`: recognizes the new scene, reuses combat-test selectors and
  controllers, loads the city assets only in this scene, and selects a section's
  visual batch independently of its structural damage type.
- `source/convert_city_test.py`: reproducible Blender conversion; never executes
  embedded source instructions. Generated GLB and manifest stay private.

The same `DestructionWorld` handles hit tracing, 90% non-boss damage reduction,
scorch, support failure, smoke, rigid-body debris, collision release and reset.
There are 756 breakable collision sections. Collision and fracture are coarse
building sections rather than per-window triangles. The 34 building geometry
templates use at most 34 color draws plus shadow draws, before other gameplay
objects. All buildings together contain 197,568 triangles before culling.
The GLB is 619,976 bytes; no full-size source FBX is downloaded by the game.

## Regeneration and verification

```sh
blender --factory-startup --disable-autoexec -b --python source/convert_city_test.py -- /private/city-fbx /private/city-runtime
node QA/asset-city-test.mjs
```

Generate the four WebP maps with `python source/prepare_asset_city_textures.py /private/FreeSample.zip /private/city-runtime`.
Copy the four WebP maps, `city-test.glb` and `city-test.json` into the ignored
`dist/city-assets/licensed-city/` directory locally, then into the private
Sites build for publication. See `PRIVATE_ASSETS.md`.

Passed: actual GLB parsing, all five model/UV sets, clear streets and spawn
positions, matching collision/render transforms, 30/60/120Hz tower climbing
and roof transitions, damage/scorch, structural collapse, attached signs,
nonblocking rubble, neighbor isolation, rebuilding and spatial batching.
Existing building armor/collapse/smoke, collision, runner movement and Ronin
building-damage simulations also passed. Blender renders verify the imported
geometry and layout. In-browser visual QA and physical phone FPS are unmeasured:
the managed browser tool was unavailable in this session.

Manual playtest: explore as Kage/Volt, climb a tower, spawn a boss, damage a
building and rebuild, then return to the original Combat Testing or City Battle
scene to compare. Original maps do not request these private city files.

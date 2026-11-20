# User-licensed character build

The user supplied `ExplosiveLLC.zip` from the RPG Character Mecanim Animation Pack FREE. It contains a block-style humanoid mesh, weighted skeleton and animation FBXs. The private game uses this material under the user's asset license. The package's C# controllers are not run; the existing browser game remains the movement/combat authority.

Public GitHub repository: https://github.com/rocket452/crossFire . The pack and derived standalone geometry/animation are not included there. The Sites audience remains owner-private. Do not change either audience automatically.

## Assets and conversion

The retained source is in `/workspace/private-assets/explosive/ExplosiveLLC/` outside the public repository. Runtime files are generated into the ignored `dist/city-assets/licensed-characters/` directory for local QA and copied into the private build checkout. The deployed private runtime files are `humanoid.glb`, `manifest.json`, `solara-female.glb` and `solara-female.json`; the uploaded archive, FBXs, PSD, Unity scripts and demo scenes are not deployed.

Convert the supplied PSD palette to PNG with Pillow, keeping it in private storage:

```python
from PIL import Image
Image.open('/private/ExplosiveLLC/RPG Character Mecanim Animation Pack FREE/Textures/RPG-Character.psd').convert('RGB').save('/private/texture.png')
```

Then use Blender directly:

```sh
blender -b -t 2 --python source/convert_explosive.py -- --input /private/ExplosiveLLC --output dist/city-assets/licensed-characters --texture /private/texture.png
node QA/explosive-asset-test.mjs
```

The converter normalizes the supplied body to 1.86m, bakes the palette to vertex colors, retains all 1,256 source triangles and 53 bones, preserves all source skin weights, repairs duplicate hand/finger labels by bind-position matching, and converts 17 compatible clips. Gameplay owns root displacement/gravity; vertical jump/fall offsets are normalized to avoid applying movement twice. Heroes scale the same weighted body to their existing heights. Recoloring, rifle IK, energy poses, capes/coat/sigils are game-specific adaptations.

## Source and publication separation

Public code checkout: `/workspace/sites/wizard-atelier`, branch `main`, remote `origin` is GitHub.
Private build checkout: `/workspace/private-builds/crossfire`, branch `site-licensed-assets`.

For future code changes:

1. Fetch GitHub, implement and test public code in the public checkout using the ignored runtime files locally. Verify `git ls-files dist/city-assets/licensed-characters` produces no output before committing or pushing public `main`.
2. Commit/push only public code to GitHub.
3. Merge the new public code commit into `site-licensed-assets` in the private checkout, retaining its tracked licensed runtime files. If assets change, copy the rebuilt runtime there and commit them only on that private branch. Do not push this branch to GitHub.
4. Run the asset/character checks against the private checkout. Package `.openai` and `dist` from its exact commit.
5. Push that private commit to the Sites source remote using a fresh Sites credential, then save/deploy that same SHA and archive using the confirmed owner-private operation. Never print/persist credential tokens.

If the private checkout is absent, create an isolated worktree/branch from public `main`, copy the locally generated runtime folder there, and force-add only the four runtime files listed above to the private branch. It is intentionally possible for the private Sites source SHA to differ from the public GitHub SHA. Public source clones require the licensed input package and conversion step before launching this character-enabled version.

A future switch to a public game audience needs review of asset distribution/licensing; do not expose the raw package as downloadable game content. Original Blender-generated character download links in the page refer to the earlier in-house assets, not the uploaded pack.

## Uploaded Solara female model (revision 31)

The user supplied `/workspace/.codex-attachments/6a26f405-8016-4fd6-92cd-f5ef93496467/f74ad436-98e4-4af7-95a7-1cbeae91f7a7/female.blend`. Preserve that original outside GitHub. It contains one mirrored female mesh, no armature/weights, and orphan animation actions; those actions are not treated as usable animations. Inspection/conversion uses Blender `--disable-autoexec` and does not execute embedded instructions.

`source/convert_solara_female.py` applies the existing mirror modifier, keeps all 574 evaluated source triangles, fits a 23-bone anatomical rig, generates Blender heat weights, normalizes four influences per vertex, and creates a rest action for the game's procedural surf/cast IK. It exports only the supplied geometry/rig, not geometry or animations from the Unity pack. Run:

```sh
blender --factory-startup --disable-autoexec -b /private/female.blend -t 2 --python source/convert_solara_female.py -- --output /workspace/private-assets/solara-female/runtime
```

Copy `solara-female.glb` and `solara-female.json` into the ignored runtime directory for local QA, and commit them only on `site-licensed-assets`. The runtime GLB is 88,636 bytes; 574 source triangles, 23 bones, no unweighted vertices. The private asset folder now has four tracked files. Other soldiers/heroes continue using the earlier Unity-pack humanoid. Solara's original hair/eye accessory GLB remains public original artwork and is fitted to the new head in runtime code.

## Uploaded Breaker SpiderBot (revision 263)

`LowPoly_SpiderBot_Rzenn.blend` is stored at `/workspace/private-assets/breaker-spider/LowPoly_SpiderBot_Rzenn.blend`, outside public GitHub. Conversion uses `source/convert_breaker_spider.py` with Blender `--factory-startup --disable-autoexec`, preserving the supplied rigid 14-bone rig and all 2,944 evaluated triangles. There are no source animation clips; the game animates the actual joint hierarchy procedurally.

The two runtime files `dist/city-assets/licensed-robots/breaker-spider.glb` and `breaker-spider.json` are ignored publicly. Copy them from `/workspace/private-assets/breaker-spider/runtime/` into the private build and force-add only there. The private build now contains these two robot files **in addition to** the four character runtime files above. Never publish the `.blend`, or push either private runtime folder to public GitHub. See `source/SPIDER_BRUISER.md` and run `node QA/spider-bruiser-test.mjs` against the private checkout before publication.

Revision 272: the separate Breaker enemy has been removed. The same private GLB is now the Bruiser model in Combat Testing and civilian-evacuation waves. Runtime filenames retain their original conversion names for provenance; this does not register a Breaker enemy. The shared rig is in `dist/spider-robot-model.js` and Bruiser integration in `dist/spider-bruiser.js`.

## Uploaded Kage shuriken (revision 283)

Raw `Shuriken.blend` and `Shuriken.fbx` live in `/workspace/private-assets/kage-shuriken/`, outside public GitHub. Run Blender with `--factory-startup --disable-autoexec -b /private/Shuriken.blend --python source/convert_kage_shuriken.py -- /private/runtime`. Copy only `kage-shuriken.glb` and `kage-shuriken.json` into ignored `dist/city-assets/licensed-weapons/` for local QA and into the private build. Force-add those two files only on `site-licensed-assets`. The private runtime difference now comprises **eight** files: four character files, two robot files and these two weapon files. Never push the source files or generated weapon geometry to public GitHub. See `source/KAGE_SHURIKEN_MODEL.md` and run the uploaded-model asset/browser checks before publication.

## Uploaded Kage kunai (revision 284)

`kunai.zip` and its nested FBX/textures stay under `/workspace/private-assets/kage-kunai/`. `source/convert_kage_kunai.py` exports only `kage-kunai.glb` (with embedded textures) and `kage-kunai.json`; those two files belong in ignored `dist/city-assets/licensed-weapons/` locally and are force-added only to `site-licensed-assets`. The private runtime difference now has **ten** files: four character, two robot, and four weapon runtime files. Never push the archive, FBX, textures or GLB to public GitHub. See `source/KAGE_KUNAI_MODEL.md` for conversion and QA details.

## Uploaded axolotl A8-Lo-T (revision 309)

The supplied archive and source GLB/Blend stay in private storage at `/workspace/private-assets/axolotl/`. `source/convert_axolotl.py` imports the supplied GLB in Blender with auto-execution disabled, preserves all 3,480 triangles and original materials, separates mirrored parts, and builds rigid pivots for four legs, six gills, three tail links, head and jaw. No source animation clips or skin rig were present. The runtime animates these actual uploaded parts; the legacy procedural body is removed when the asset loads. Glass uses an inexpensive transparent standard material at runtime.

Copy only `/workspace/private-assets/axolotl/runtime/axolotl.glb` into `dist/city-assets/licensed-characters/axolotl.glb` in the private build. This increases the private/public runtime difference to eleven files. The archive, Blend, source GLB and derived GLB must not enter public GitHub. `QA/axolotl-model-test.mjs` needs this private runtime file and verifies geometry, scale, articulated mesh movement, mouth alignment and ice-slide movement at 30/60/120Hz. Existing breath/chill/cover/reset tests remain in `QA/axolotl-test.mjs`. Browser visual QA and physical phone performance were not measured for this change.

## Uploaded Shogun Ronin trial (revision 310)

`SHOGUN_asset.zip` and the source Blend/FBX remain in `/workspace/private-assets/shogun/`. The private runtime asset is `dist/city-assets/licensed-robots/ronin-shogun.glb`; public code contains the adapter, converter and tests only. Private/public runtime difference is now twelve files. Never push the source or generated model to public GitHub.

Regenerate by running `node source/export_ronin_bind.mjs /private/ronin-bind.json`, then `blender --factory-startup --disable-autoexec -b /private/SHOGUN_Lowpoly.blend --python source/convert_shogun.py -- /private/ronin-bind.json /private/runtime/shogun.glb`. Only the GLB is copied into the private deployment; the converter's intermediate Blend stays in private storage. Copy the same GLB into the public checkout's ignored runtime directory for `node QA/ronin-shogun-test.mjs`. See `source/ASTRA_RONIN.md` for model switching and rig-fit limits.

## Uploaded city test models (revision 311)

The five uploaded building/advertising FBXs remain under
`/workspace/private-assets/city-test/`. `source/convert_city_test.py` generates
only `city-test.glb` and `city-test.json` for deployment. These belong in ignored
`dist/city-assets/licensed-city/` locally and are force-added only to the private
`site-licensed-assets` branch. The private/public runtime difference is now
fourteen files. Never push the FBXs, generated meshes or any later supplied
city texture atlases to public GitHub. See `ASSET_CITY_TEST.md` for source scale,
temporary materials, destructible sections and testing.

Revision 313 adds the Buildings_002 and Props textures from Max Parata’s
FreeSample.zip. The four optimized WebP files belong alongside the city GLB
on the private build branch. Regenerate them using the instructions in
ASSET_CITY_TEST.md. Keep the source ZIP and original PNGs in private storage.

## Armored Kage (revision 323)

The reference FBX stays outside the public checkout. Run Blender with
`--factory-startup --disable-autoexec -b --python source/rig_kage_armor.py -- /private/kage_reference.fbx /private/humanoid.glb /private/kage-armored.glb`.
The output embeds the licensed humanoid animation data. Place it in
`dist/city-assets/licensed-characters/kage-armored.glb` for local testing
and force-add it only on `site-licensed-assets`. Run
`node QA/kage-armor-test.mjs` with both runtime models available.
Use `?kage=classic` to select the original model.

## Armored Volt Rush (revision 330)

Generate the model from the shared humanoid rig with
`blender -b --python-exit-code 1 --python source/build_volt_armor.py -- /private/humanoid.glb /private/volt-armored.glb`.
The model contains 2,276 triangles, the original 53 joints, and the 17 licensed animation clips.
Place the GLB in `dist/city-assets/licensed-characters/volt-armored.glb` for QA
and force-add it only on `site-licensed-assets`. Run
`node QA/volt-armor-test.mjs` to check the rig, clips, and lightning attachment points.

## Frog Ninja Kage (revision 356)

Generate from the private armored Kage asset with Python and NumPy using
`python source/build_kage_frog.py /private/kage-armored.glb /private/kage-frog.glb`.
Place the GLB alongside the armored model under `dist/city-assets/licensed-characters/`.
Keep the generated mesh and its embedded animation data on the private build branch.
Run `node QA/kage-armor-test.mjs --frog` to exercise the model with the Kage controller.
The model picker supports Frog Ninja, Armored, and Classic, with `?kage=frog`
as a direct override.

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

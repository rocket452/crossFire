# Moonkeeper — Blender character prototype

Built directly with Blender 4.3.2 Python (`bpy`), without Blender MCP.

## Files
- wizard.blend: editable character, 16-bone armature, eleven actions, preview studio.
- wizard.glb: skinned glTF 2.0 binary, PBR materials and eleven animation tracks.
- build_wizard.py: reproducible source. Run `blender -b --python build_wizard.py` ; a standalone downloaded script writes to a sibling `wizard-output/` folder. In the repository source/ layout it writes to dist/assets/.
- wizard-manifest.json: geometry counts, clip inventory, limitations.
- wizard-preview.png: Blender-rendered character preview.

## Character
Slate-blue wizard, ivory beard, bent pointed hat, brass trim, leather satchel and spellbook, wooden crystal staff. No downloaded character assets. Ten shared solid-color PBR materials. No texture downloads are required by the model.

## Animations
Idle, Walk, Run, Jump, Attack1, Attack2, HitReact, Death, EmoteWave, EmoteCelebrate, EmotePonder. Source timing 30 fps. Locomotion in place. Jump contains an authored body bounce; gameplay adds a world-space arc. Death holds its last pose until a new preview, movement, or reset.

## Import
glTF uses meters, Y-up. Load with Three.js GLTFLoader, Blender glTF import, Godot, or an appropriate Unity glTF importer. Unity does not import GLB with its FBX importer. This rig is a custom 16-bone rig, not a validated Unity Humanoid avatar. The staff is weighted to the right hand. All mesh parts are bound to one skin. Keep the Blender source for rig edits and other export formats.

## Honest scope
This is an animated stylized prototype, not the four finished production pipelines in the earlier specification. Procedural component modeling, simple deform weights and authored prototype motion. No facial blendshapes, finger rig, IK control rig, baked texture atlas, LOD chain, physics cloth, or production deformation QA yet. Ten material sections remain; atlas/material consolidation is a next optimization step. Desktop browser smoke tests do not establish actual phone GPU/thermal performance.

## Third-party runtime
Three.js r170, MIT license; vendor license included in vendor/LICENSE.three.txt. Fonts loaded from Google Fonts; system fonts remain available if the network is unavailable.

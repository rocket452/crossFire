# Moonkeeper validation — 2026-10-27

## Passed
- Blender 4.3.2 background script creates and saves the character and preview studio.
- Blender Cycles preview rendered and visually reviewed; beard/collar intersection corrected.
- Exported GLB: 11,296 triangles, 5,800 vertices, 16 skin joints, 10 materials, 11 clips, 631,464 bytes.
- Binary buffer bounds and animation target references verified.
- Actual browser loads the GLB and all eleven clips.
- All eleven animation preview buttons select the correct actions.
- Keyboard movement changes world-space position.
- Pointer joystick movement changes world-space position.
- Casting collects all five moonstones and changes the quest/portal state.
- Reset clears quest progress.
- 390px mobile layout has no horizontal overflow.
- Desktop and mobile browser screenshots reviewed.
- No JavaScript page errors during interaction smoke tests.
- JavaScript syntax and Blender Python compilation checks pass.

## Limits
Browser tests ran in Chromium with software-rendered WebGL. Frame-rate readings are not representative of a phone GPU. Real iOS/Android hardware performance, thermal stability, Safari compatibility, production deformation quality, facial rigging, LODs, and Unity import remain unverified. The 11 clips are prototype motions, not production-polished animation. This delivery implements one stylized 3D character, not all four proposed production pipelines.

# Infantry revision 2 — validation

## Delivered
- Blender 4.3.2 directly generated a 2,288-triangle soldier with 17 rig bones and one vertex-color PBR material.
- Eight animation clips: Idle, Walk, Run, Aim, Fire, CrouchFire, CrouchAim, Reload.
- Separate editable .blend, animated .glb, instanced mesh library, baked motion palette, build script, and preview render.
- Both divisions use the new model; 36 soldiers share 32 base instanced crowd draws plus applicable shadow passes.
- Infantry-follow camera added to the existing observer presets.
- Spawn rows are unique; soldiers stop behind concrete barricades rather than moving through them.

## Passed
- Blender script execution, GLB export and beauty render.
- Animated GLB: 8 clips, 17 joints, one material, valid animation node references and binary buffer bounds.
- Less than 2,500 triangles per soldier.
- All baked transforms finite; quaternion normalization and loop seam checks.
- Exported steady walk: planted left ankle drift and vertical contact error below 5 mm after adding calibrated controller travel.
- JavaScript syntax and Python compilation.
- Browser: both divisions load 36 soldiers, all 8 animation states observed naturally, firing events produced from animated weapon poses.
- Infantry camera, pause freezing motion, reset restoring units/ammunition/events/city, and mobile layout with no horizontal overflow.
- Desktop and 390px phone close-up screenshots reviewed. Barricade clipping found in the initial route and corrected; final review passes.
- No JavaScript page errors during interaction checks.
- Existing gravity, rigid-body contact, support loss, reset, and activation-budget physics tests pass.

## Limits
Rigid segmented skinning, with no continuous organic deformation, finger controls, or facial rig. Animations are authored prototype motions rather than motion capture or production-polished performance. No claim of a validated Unity Humanoid avatar. No real phone GPU/thermal benchmark; browser QA used Chromium software WebGL. The newer crowd has more geometry than the original placeholders: 82,368 total soldier triangles instead of 23,184, while retaining instancing and one shared vertex-color material.

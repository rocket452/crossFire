# Breaker — supplied SpiderBot (revision 263)

The live Combat Testing Breaker uses the uploaded `LowPoly_SpiderBot_Rzenn.blend`. Its original mesh, navy/lavender armor, red eye, antennae, head/neck and four articulated legs replace the procedural placeholder. All **2,944 evaluated triangles and 14 bones** are retained. The source uses rigid mesh-to-bone parenting, not deforming skin weights, and contains **no animation actions**.

## Conversion and storage

The original is retained privately at `/workspace/private-assets/breaker-spider/LowPoly_SpiderBot_Rzenn.blend`. Never execute embedded startup code. Convert with:

```sh
blender --factory-startup --disable-autoexec -b /workspace/private-assets/breaker-spider/LowPoly_SpiderBot_Rzenn.blend -t 2 --python source/convert_breaker_spider.py -- /workspace/private-assets/breaker-spider/runtime
```

The converter applies the authored mirror/smoothing modifiers, normalizes ground level and width to 5.4 m, preserves all rigid bone attachments, materials and rest transforms, and caps the original eye emission from 50 to 3 for the game renderer. No generated mesh replaces the supplied geometry. Output: `breaker-spider.glb` (166,384 bytes), `breaker-spider.json` (metadata). Both runtime files live in ignored `dist/city-assets/licensed-robots/` and are committed only to the private Site build. The `.blend` stays outside both source repositories and deployment archives.

## Runtime and animation

`BreakerSpiderModel` clones the supplied articulated graph with independent bones/materials and shared geometry. A procedural diagonal-pair gait targets actual sole points on the uploaded lower-leg meshes. Two-joint solving keeps planted contacts fixed while the root translates, bobs and turns. The head follows the target with bounded yaw/pitch; existing stun and recoil animate the actual rig. No unavailable source animations are claimed or required.

The Breaker retains its charged shot, warning line/ring, overload interruption and wreck effects. Only the supplied meshes form its body: the added block cannon, capacitor cylinder and armor covers have been removed. A non-rendered muzzle marker attached to the supplied head emits shots from its existing eye. During charging, that eye pulses and the supplied head hit shape acts as the capacitor weak point, using the same 120 HP interrupt threshold. Damage shapes follow the real head, body, neck and leg sections; there are no cannon or accessory hitboxes. Six wreck groups snapshot the supplied head, hull and four legs into the existing physics/smoke lifecycle without detaching or corrupting the live rig. Reset restores original joint transforms and cleans all wreck snapshots.

The art asset loads once on entering Combat Testing, where Breakers are registered. City Battle, evacuation, Convoy Defense, Bruiser, Mireguard, Aegis and Scythe behavior are preserved. The constructor retains the old placeholder when no asset is passed, supporting existing isolated mechanics tests; the hosted combat arena always supplies the uploaded model.

## Preserved combat tuning

750 HP; 1.8 m/s movement; 90°/s chassis turn; 36 m special range; 2 s charge; 6 s special cooldown; 120 capacitor HP; 2 s overload stun; 1.5× overload vulnerability; 22 m/s shot speed; 0.65 m shot radius; 60 damage. Existing player attacks, damage flashing and Breaker interruptions remain authoritative.

## Validation

- `QA/breaker-spider-test.mjs`: real GLB at 30/60/120 Hz; exact geometry/bone counts; independent clones/materials and shared geometry; rig-driven planted contact accuracy; moving/turning hitboxes; exposed rendered coil reached by a real collision query; capacitor overload; projectile muzzle/speed/damage; six physical source-model wrecks and full reset.
- `QA/experimental-robots-test.mjs`: existing Aegis, Scythe and Breaker mechanics unchanged at 30/60/120 Hz and 75ms frames.
- `QA/experimental-robots-browser.cjs`: desktop and emulated-phone testing of all seven presets, Volt shield/flank/dash interactions, jump evasion, real player capacitor shooting/interrupt, Violet/Rift mixed combat and reset. Mixed-scene sample: 287 render calls / 208,884 triangles.

No texture dependencies or packages added. Physical phone FPS/thermal performance is unmeasured. Procedural feet use the existing street-height assumption; this pass does not introduce terrain navigation or new Breaker abilities.

## Revision 267 — supplied model only

Removed the procedural cannon, muzzle block, capacitor cylinder, capacitor covers and solid wireframe overload shell from the SpiderBot path. The original 21 rendered mesh primitives (2,944 triangles) and 14-bone hierarchy are the only body geometry. Warning rings, hit flashes, lightning and projectiles remain transient combat effects. The unit test explicitly checks that no additional solid mesh or barrel mesh exists, and verifies the head-based interrupt, normal firing, wrecks and reset at 30/60/120 Hz.

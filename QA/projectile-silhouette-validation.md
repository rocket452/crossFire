# Enemy projectile silhouettes — revision 49

Robot pod missiles, plasma balls, eye bolts and generic rounds owned by the Siege Walker draw a flat, color-matched silhouette behind opaque scenery. Rocket geometry retains its actual fins/body shape; plasma uses a slightly expanded ball, and eye bolts use a thicker segment for readability. Friendly army and hero projectiles do not receive silhouettes. Continuous beams, trails and pre-launch effects keep their existing appearance.

The silhouette pass uses GreaterDepth, no depth writes and render order 100. The renderer enables stencil; visible projectile fragments write reference 1 and silhouettes reject those pixels. This prevents concave missile parts from painting themselves orange in open view. Materials and geometry are shared; eye bolts use one bounded instanced draw. There is no fullscreen post-processing pass or per-projectile raycast. Mesh silhouettes are children of projectiles, so impact, interception, portal travel and reset automatically follow the existing lifecycle.

Validation:

- `node QA/projectile-silhouette-browser.cjs`: actual missile/plasma/eye render geometry behind a solid wall, with framebuffer comparisons on desktop and 390px touch viewport. Every hidden projectile type changes hundreds of visible pixels; removing the wall yields zero pixels changed by the silhouette pass. Screenshot inspected. Checks removal/reset, 30 seconds of integrated combat, overflow and runtime/shader errors.
- Missile, plasma artillery and robot eye beam unit suites pass, including collision, interception, lifecycle and bounded rendering checks.
- Chromium uses software graphics; physical mobile GPU/thermal performance was not measured.

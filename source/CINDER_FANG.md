# Cinder Fang — CPU fire-cat shapeshifter

Optional hero ID `ember`, registered in the existing Heroes menu and Combat Testing dropdown. The default lineup and three-hero limit stay unchanged. The Cinder Fang camera follows her in either form.

The supplied drawings guide both original adaptations: a red/orange quadruped with charcoal markings, bright eyes, pointed ears, a golden chest and a long flame tail; a human heroine with asymmetrical black/red hair, dark jacket, red outfit, tall boots and gold earrings. The human form uses the existing licensed female weighted rig, with separate costume geometry/materials so other heroes are unchanged. Original cat geometry uses a lean, long-legged predator silhouette with four articulated legs, outward swept ears, sharp cheek tufts, slanted glowing eyes, fangs, jagged charcoal markings and a continuous 16-section flame tail. A continuous speed-blended bounding gait bends the lower legs/paws, gathers and extends the limbs, banks into turns and leans into climbs; the tail deforms continuously rather than using visible bead segments. `dist/fire-cat-model.js` owns this cosmetic model and animation. Transformation is a short flame-obscured scale transition between the two forms, rather than a vertex morph.

## Autonomous cycle

1. Run through the air above the city's roofs, leaving pooled flame/ember particles.
2. Pick a real surviving rooftop or an open ground position near a live enemy. Fly above the point before descending vertically. Building traces block flight and fireballs.
3. Land and transform into human form, gather a fireball in the actual right hand, then throw straight-moving fireballs using existing collision and robot-part damage routing.
4. After the casting window, transform back into the cat, ascend, and repeat.

Landing points include roof centers/corners and open positions around the enemy. Candidates need standing room, map bounds and a clear firing line. Support is rechecked every 0.25 seconds; a vanished roof aborts casting and triggers transformation/takeoff. No enemies still permits air patrol/landing but never fires at civilians or friendly units. Existing CPU targeting, smoke protection, minimap allies and cinematic fallback registries include this hero.

## Tuning

`EMBERCAT` in `dist/embercat-hero.js`:

| Setting | Default | Meaning |
|---|---:|---|
| speed | 33.8 | Air-running/takeoff speed, world units/sec |
| landingSpeed | 28.6 | Approach/descent speed |
| orbitRate | 0.312 | Patrol angular speed, radians/sec (30% faster) |
| flightTrailLifeScale | 2.5 | Lifetime multiplier for flight flames/embers only |
| cruiseClearance | 7 | Roof clearance used when the game constructs the hero |
| airSeconds | 6 | Patrol duration before selecting a landing |
| castSeconds | 7 | Human-form attack window |
| transformSeconds | 0.8 | Duration per transformation |
| chargeSeconds | 0.45 | Fireball gathering animation |
| shotCooldown | 1.1 | Rest between fireball charges |
| shotSpeed | 48 | Fireball speed |
| shotDamage | 65 | Raw damage before existing armor/part rules |
| shotLife | 4 | Maximum projectile lifetime |
| range | 160 | Maximum targeting distance |
| maxShots | 8 | Pooled active projectile cap |
| surfaceCheckSeconds | 0.25 | Landing support revalidation interval |

Flight bounds come from the active scene. Flight particles live 2.5 times longer (0.9–1.4 seconds for flame, 1.375–2.25 seconds for embers), while fireballs and transformation particles retain their previous lifetimes. Fire VFX reuse `SolaraFireTrail` (384 flame puffs + 128 embers maximum); projectiles and transformation/impact flashes use bounded instanced meshes. Reset or deselection clears all shots, particles, transitions and counters.

## Verification

Run `node QA/embercat-browser.cjs` with a static server on port 8765. It tests desktop and touch viewports, the full repeated lifecycle, real fireball damage, actual weighted female mesh deformation/hand muzzle, real roof support and destroyed-roof recovery, reset/deselect cleanup, optional roster selection/camera in City Battle, Civilian Evacuation and Convoy Defense, and absence of JavaScript/shader errors. `QA/hero-roster-test.mjs`, `QA/axolotl-test.mjs` and `QA/explosive-asset-test.mjs` cover shared roster, preceding hero and licensed character integrity.

Prototype limits: CPU-only; no new hero health/death system. Original procedural cat art and flame transitions are stylized approximations of the drawings. Air navigation is simple high-altitude travel with checked descent rather than a navmesh. Physical phone performance has not been measured.

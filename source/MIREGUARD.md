# Mireguard — robotic rifle infantry

Current behavior (revision 180): limb loss is permanent until scene reset. Headshots cause a .32s recoil/firing interruption with a .2s retrigger interval and a brighter, immediately retriggered red flash. Repair logic and repair-field visuals have been removed. The revision-175 notes below describe the original implementation.

Select **Combat Testing → Enemy preset → 1 Mireguard** or **3 Mireguards**, then **Spawn / Reset enemies**. Use **Play / Watch selected hero** to fight as Volt or Kage, or watch the other existing CPU heroes. The city battle, escort spawning and their default enemies are unchanged. A direct launch is `?scene=testing&enemy=mireguard-1` or `enemy=mireguard-3`.

## Reference and adaptation

Original procedural low-poly robot art takes its broad amphibian head, olive-green infantry silhouette, oversized rifle and combat role from the standard green EDF5 Colonist. No game models, textures, animation or audio were extracted. The [official EDF5 enemy description](https://www.d3p.co.jp/edf5/primer/index.html?id=primer14) describes rifle infantry and fighting with severed limbs that regenerate. The [community Colonist reference](https://theearthdefenseforce.fandom.com/wiki/Colonist) describes independent head/limb health, fatal head destruction, cover/rolling, and main health that does not regenerate. These are behavioral references; numeric values below are Crossfire prototype approximations, not measured EDF constants.

## Combat

- Approximately 10m tall, 2,400 main health; articulated torso, head, shoulders, elbows, hips and knees. About 3,560 triangles before existing through-cover overlays.
- The head has 1,440 health. Depleting it kills the robot even with main health left. Each upper/lower arm and leg section has 240 health. Damage to an intact part also damages main health once.
- Severing an upper section removes its lower section too. Removing either right-arm section takes the held rifle out of play. Losing the left support arm increases spread. Lost legs lower the torso into a kneeling/prone posture and reduce *enemy* movement to .8/.35m/s; the player movement system is untouched.
- Missing sections spark, leave charred rigid-body debris with smoke, and show rotating cyan repair fields. After six seconds, all missing sections rebuild over .85s. Limb health returns; main health never does. Dead robots do not repair. Wreck bodies and materials clean up after 12s or immediately on reset.
- The rifle fires 24 round bursts at .09s intervals, then reloads for 2.6s. Tracking is bounded, with a .65s aim windup, readable muzzle flashes, straight non-homing energy projectiles and modest prediction. Projectile defaults: 92m/s, .24m radius, 10 damage, 190m range. Shot lifetime enforces range.
- Large/accumulated hits cause a short flinch; periodically the intact robot can roll sideways. Damaged robots attempt to reposition behind existing buildings. Target sight and last-known-position memory use the existing visibility checks. Ordinary walking, slow crawling and rolls all query full-height building clearance.

## Integration

`dist/mireguard-config.js` exposes health, height, speeds, aiming, burst cadence, range, damage, spread, prediction, repair, flinch, roll and cover timings. `mireguard-model.js` contains original primitive geometry and procedural posing. `mireguard.js` reuses EvacRaider's swept projectile/portal/barrier callbacks, shared energy effects, UnitDamage, hero-hit feedback and physics wreck/smoke callbacks. Limb hit boxes follow the live hierarchy. Existing hero attacks, red damage flashes, minimap, through-cover silhouettes and horizontal enemy separation include this enemy automatically.

Navigation reuses `EvacuationNavigation` with the arena's street-grid waypoints and full-height clearance at three heights. Routes remain cached while valid so mid-block replanning cannot send the robot back to its previous waypoint. Trio formation starts 16m apart. AI is a lightweight prototype, without EDF's exact squad communication, biological regeneration visuals, item drops or climbing onto buildings. No additional maps, gameplay dependencies or player movement restrictions were added.

## Verification

`QA/mireguard-test.mjs` covers 30/60/120Hz and long frames: burst fire, independent part HP, rifle shutdown, repair without main-health healing, collapse after leg destruction, fatal head damage, stun, traceable articulated hit boxes, reset and model budget. `QA/mireguard-browser.cjs` runs desktop/touch gameplay: actual rifle hits on the selected hero, hero lightning damage, disarming/repair, physical smoking wrecks/expiry, head kill, single/trio presets, full reset and switching back to Bruisers. It also routes around a real arena building using the shared street graph without crossing collision geometry.

Existing experimental-robot desktop/touch browser checks also pass all seven presets, shield/flank/dash interactions, sweep evasion, capacitor interrupts, Violet/Rift combat and reset. The browser fixture’s readiness check now safely waits for the module-loaded diagnostics global. Existing experimental robot, enemy separation, Bruiser burst/lead, robot death, Bastion arm weak-point and damaging pulse Node suites pass. Desktop/touch screenshots were inspected for the full model, severed arm and crippled stance. Emulated phone input/layout is covered; physical-phone performance has not been measured.

## Revision 180 verification

Node checks pass permanent disarming and limb loss beyond the former repair window, reset restoration, light headshot recoil/fire cancellation, fatal head damage, and existing rifle/collision behavior at 30/60/120Hz and long frames. Desktop/touch gameplay checks pass actual hero headshot flinch/red flash, permanent severing, enemy fire, navigation, death debris, single/trio presets and full reset.

# SpiderBot Bruiser — revision 272

Bruisers in Combat Testing and every civilian-evacuation wave now use the supplied `LowPoly_SpiderBot_Rzenn.blend` geometry and rig, replacing the old tracked model. The separate Breaker enemy, charge-cannon/capacitor mechanics, weak-point bonus and menu presets have been removed. Mixed now contains two Aegis and two Scythe enemies (four total).

## Asset and animation

`dist/spider-robot-model.js` preserves all 2,944 triangles, 21 source mesh primitives and 14 bones. It is the same source-only model and procedural diagonal gait previously used by Breaker: planted sole contacts, real leg joints, body motion and articulated head. `dist/spider-bruiser.js` connects it to the existing Bruiser AI and weapon controller. Shots originate at the original eye; no old cannon, tracked chassis, armor covers or extra body geometry is rendered. Each instance has independent bones and materials with shared geometry. Head tracking follows the existing 120°/s weapon aiming rule, with small recoil and headshot flinch on the real head joint. Headshots brighten the eye and trigger the existing bounded hit effects.

Bruiser combat stays at 1,000 HP, four-shot bursts, 0.25s spacing, 33% independent lead chance, 36m/s projectile speed, existing projectile radius/damage/ranges and double headshot damage. Movement, target priorities, protective abilities, wave counts/timing/routes and scene outcomes stay with their existing systems. Soft separation radius is 2.7m to fit the wider model. Six physical wreck groups use the supplied head, hull and four legs and the existing smoke/explosion system. Reset restores all source transforms and cleans wreck snapshots.

## Private source/runtime

The uploaded `.blend` remains at `/workspace/private-assets/breaker-spider/LowPoly_SpiderBot_Rzenn.blend`. The existing converter is `source/convert_breaker_spider.py`, run with Blender `--factory-startup --disable-autoexec`. Its unchanged output files remain `dist/city-assets/licensed-robots/breaker-spider.glb` and `breaker-spider.json` for provenance. These filenames do not register the deleted enemy. Both are ignored on public main and retained only on the private Site branch alongside the four character assets. No model binary or original upload is committed to public GitHub.

The asset loads once in scenes that create Bruisers (Combat Testing and civilian evacuation), before any squads are constructed. City Battle/Convoy do not load it. All remaining experimental enemies continue using their existing model and behavior.

## Verification

- `QA/spider-bruiser-test.mjs`: real asset at 30/60/120 Hz; exact geometry/bones, independent instances/shared geometry, planted contacts, doubled head damage and feedback, stun, six wrecks/reset, preserved bursts/speed/lead.
- `QA/spider-bruiser-browser.cjs`: desktop/touch arena spawning, actual walking/firing/headshots/death/reset, no Breaker options, mixed count/composition, all twelve evacuation Bruisers using the uploaded rig with three in the first wave; no JavaScript errors.
- Remaining experimental unit/browser checks cover Aegis shields/turning, Scythe telegraphs/evasion, Violet/Rift mixed combat and reset.
- Shared separation, speedster basic attacks, welding and storm mechanics checks remain the regressions.

Physical phone FPS/thermal performance is unmeasured. The gait retains its existing street-height assumption; this pass does not introduce new terrain navigation.

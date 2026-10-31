# Destructible Siege Walker weapons — revision 81

The existing Walker has four shared, independent durability modules. `WALKER_WEAPONS` in `dist/walker-weapons.js` configures part bindings and initial HP: beam forearm 1,800; shoulder rocket pod 1,600; shoulder plasma cannon 1,800; eye emitters 700. All heroes/allied weapons use the existing damage system. Four compact meters appear below the boss health/weak-point display. Damaged armor darkens; a depleted module explodes, detaches as an original mesh with Cannon physics, chars, smokes and shows OFF until City Rebuild.

## Damage and attack integration

- Swept collision carries the first-hit part name through direct attacks and direct explosive hits. Normal hull damage still applies once; component destruction adds no bonus hull damage or collateral blast. Untagged splash only wears a module if its impact lies within 0.4m of that module's box. Global weak-core bursts have no impact point and never wear components.
- The recessed eye strip has a small forward collision allowance (0.32m) and 0.06m vertical padding, allowing aimed visor hits through the helmet's coarse collision box. The surrounding head remains normal armor.
- Breaking the beam immediately stops its cycle and removes beam/telegraph visuals. Breaking the pod cancels pending launches and warning. Breaking the plasma mount removes warning markers/unlaunched shells. Breaking the eyes cancels their charge/burst. Already airborne missiles, plasma and eye bolts continue normally.
- The original five-second startup/recovery and beam → missiles → plasma ordering skip unavailable main weapons. With no main mounts left, the arsenal enters `disarmed`; eyes can still fire until their own emitter is destroyed. The hull remains damageable.
- Active cores on a lost cannon relocate to the intact upper arm/shoulder with their identity, HP and final-core state preserved. New cycles exclude detached geometry. No core is automatically completed by breaking a weapon.
- Detached meshes stop contributing live boss hitboxes. Previous-frame collision centers match by part name, so removing a component does not create false sweeps across unrelated limbs. Final boss death produces eighteen total pieces, including previously detached weapons. Rebuild returns all meshes, HP, materials, warnings, state and physics-body counts.

## Verification

`node QA/walker-weapons-test.mjs`:

- Real GLB, part-tagged collisions and direct/blast damage; isolated component durability, unchanged hull accounting, invalid/repeated-hit guards.
- Immediate weapon cancellation, pending-shot removal and preservation of airborne ordnance.
- Final-core relocation with unchanged 93 HP/final state and no free stun; later sockets only on intact armor.
- Real four-part smoking physics detachment, all eighteen parts after death without duplicates, full hierarchy/body/health restoration.
- All eight surviving-main-arsenal combinations at 30/60/irregular timesteps; real physics/durability checks at 30/60/120 Hz.
- Disabled eye/plasma charges cannot fire, while existing projectiles keep moving.

`node QA/walker-weapons-browser.cjs`:

- Actual desktop mouse fire (city battle, 1100×1000) and actual touch fire (evacuation scene, 390×844).
- Exposed aim lines through existing geometry, four accurate primary hits at 150 damage/second, sustained lightning on the beam forearm, no damage to other modules, and normal hull damage once.
- Violet orb/force beam, Rift bolt, Solara fireball and player rocket adapters all contribute to the same component HP.
- Four real detachments, finite moving physics bodies, smoke, OFF states, disabled arsenal, and complete City Rebuild restoration. No page/console errors.
- To isolate damage accounting, the fixture disables ally firing and holds the Walker stunned while targeting. Components are lowered to 5 HP through ordinary damage before each final player shot. Full durability/timing and active-attack cancellation are also exercised by the real-model simulation tests.

Existing combat collision, arsenal, weak points, plasma artillery, eye beams, hit-flash, sustained-lightning and evacuation lifecycle/navigation simulation checks pass. Existing robot-death browser checks pass for both desktop and touch, including 33 simultaneous smoking robot pieces and repeat kills after rebuilding. The full weak-point browser suite also passes for desktop/touch: actual moving-core lightning hits, all hero damage adapters, a 45-second protected final-core hold, all four attack-interrupt phases, repeated cycles, death and rebuild.

The weak-point browser harness now releases desktop pointer lock before clicking UI and waits for a clear shot when a moving forearm briefly occludes a core; it does not bypass collision or award unearned hits.

Captured `/tmp/walker-weapons81-desktop.png` and `/tmp/walker-weapons81-phone.png`. Browser phone emulation verifies controls/layout, not physical-handset FPS or thermals. Long-term durability balance is a starting point; it has not undergone extended player playtesting. No assets, dependencies, hero abilities, spawning intervals, map identity or hosting audience are replaced.

# Siege Walker weak points — revision 58

The existing Walker, health pool, damage types, gait and three-weapon rotation remain authoritative. `dist/weak-points.js` owns one shared set of sockets/health/state for the local player and CPU allies. The game is single-player; this adds no network infrastructure.

## Tuning

Change `WEAK_POINTS` and `WEAK_POINT_LOCATIONS` in `dist/weak-points.js`, or pass a `config` override to `SiegeWeakPoints`.

| Setting | Initial value | Meaning |
| --- | --- | --- |
| count | 4 | Active cores per set |
| health | 180 | Individual core HP; three complete 60-damage ordinary Volt beams or three 68-damage pilot rockets. Heavy abilities can break a core faster. |
| radius | 0.62 m | Actual swept-sphere hit radius; existing projectile radii also apply |
| stunDuration | 5 seconds | Minimum completed-set stagger, using the existing shared stun clock |
| burstFraction | 0.08 | Fraction of maximum boss HP; 1,152 damage at the existing 14,400 maximum |
| cooldown | 12 seconds | Rearm delay after the shared stun has actually ended |
| minimumSpacing | 1.8 m | Minimum socket-center separation at generation |
| locations | 10 sockets | Upper/lower arms, chest/pelvis, thighs/shins; part, region and normalized local-box x/y are configurable |

Use positive health/radius, nonnegative durations, an integer count and locations that exist on the current rig. Selection tries unused body regions first and rejects overlapping sockets. Default sets contain one left-arm, right-arm, torso and leg point. All chosen surfaces face their part's local front; no mandatory rear-only socket is used. Cores are attached to the existing articulated pivots, outside their part's collision box, and follow gait/aim/stagger animation.

## Lifecycle and damage

1. Spawn a randomized set immediately on load/rebuild. Cyan core/rings are healthy. Damaged cores turn amber and flicker. Destroyed cores emit existing sparks/chimes and disappear until the next cycle.
2. Shared world traces compare a swept core sphere with the existing nearest armor, terrain, building, missile and unit hit. Cover still blocks attacks. `hit.weakPoint` tags a direct hit while retaining `hit.unit` for existing combat compatibility.
3. Every damage adapter routes direct core damage to its own HP. Core hits do not also apply full ordinary damage to the boss. Normal armor hits and ordinary blast damage elsewhere still work. Splash does not cleave adjacent cores: each trace selects one nearest core, consistently across rockets, electricity, force orbs/beams, fireballs, portal bolts and joy waves. Subsequent ticks may hit a different point after one breaks.
4. When one point remains it pulses bright pink at 2 Hz, with a rotating halo and compact STUN READY meter text. There is no expiry or forced trigger. CPU attacks do zero damage to this final point, including in-flight shots and sustained beams. The player's ordinary lightning or piloted helicopter rockets can finish it. CPU heroes retain their existing independent short interrupts.
5. Completion latches the phase before invoking damage/FX, so the burst runs once. The battle adapter interrupts `RobotArsenal`, cancels the eye-bolt preparation cycle, applies the burst through `UnitDamage` and calls `SiegeWalker.stun(5, 'weakpoint')`. Pending missiles and unlaunched plasma are cancelled; already-flying projectiles keep their normal trajectories. The continuous beam clears immediately.
6. The existing stun early return blocks gait, target tracking and attacks. A saved upper-body pose slumps, lowers the cannon and shakes, then blends back before recovery. Existing whole-body electric arcs plus translucent expanding rings make the window visible without an opaque flash. Later short hero stuns cannot shorten this stagger.
7. After the actual stun clock reaches zero, wait twelve unstunned seconds, then generate a new set. An unrelated stun during cooldown pauses rearming. The boss resumes its existing weapon recovery/rotation. Death hides all points/discharge immediately; rebuild resets the cycle, counters and stored pose.

Neither weak-point sockets nor their positions are added to aim assistance. Deliberate reticle hits on a core bypass the pre-existing armor assistance so mobile input is not pulled off a precise shot. All heroes contribute to the same point instances; only player-tagged damage can spend the final core. Other hero control modes, multiplayer replication and enemy projectile redirection rules are unchanged.

## Violet orb presentation

`dist/violet-orb-effects.js` adds small distance-spaced purple motes, followed by a white-violet flash and two expanding rings at a real collision. It is cosmetic: damage, homing, cadence, shielding and barrier-charge attacks retain their behavior. Defaults: 0.55 m spacing, 0.22–0.284 s trail lifetime, 0.55 s impact animation, 160 motes / 6 simultaneous impacts / 3 instanced draw calls. Existing impact spark particles add a brief outward spray. Teleport redirection does not draw a trail across the portal gap. Reset/deactivation clears all pools.

## Files

- `dist/weak-points.js`: configurable sockets, collision query, shared health/cycle, core and overload visuals.
- `dist/battle.js`: damage/arsenal integration, callbacks, reset, diagnostics and HUD text.
- `dist/siege-walker.js`: reversible stagger pose and shared stun handling.
- `dist/speedster.js`: preserve deliberate manual core aim.
- `dist/index.html`, `dist/battle.css`: counter/help, cache versions and HUD spacing.
- `dist/violet-hero.js`, `dist/violet-orb-effects.js`: orb visual integration and bounded effects.
- `QA/weak-points-test.mjs`, `QA/weak-points-browser.cjs`, `QA/violet-orbs-browser.cjs`: verification.
- `QA/combat-collision-test.mjs`: explicitly identify the destruction fixture as a robot strike, respecting the existing 90% non-robot building armor.

See `QA/weak-points-validation.md` for measured prototype verification. Physical phone frame rate, thermal behavior and longer-term combat balance still need device playtesting.

# Kage protective smoke — revision 219

Press **V** or the mobile **SMOKE** button to throw a smoke canister from Kage's right hand toward his aim. It follows the explosive bomb's ballistic arc and ricochets, then releases a stationary dome on the horizontal support surface beneath its detonation position after a 1.5-second fuse or on enemy/missile contact. A small canister, animated grey-violet haze, drifting soft puffs and a clear floor ring mark the protected area. Movement and attacks remain available. The existing C explosive bomb, kunai, teleport shuriken, slash, jumps and dash are retained.

## Tuning

`ninja-shuriken-config.json.smoke` contains all ability tuning:

| Value | Default | Meaning |
| --- | --- | --- |
| key | v | Desktop activation key. |
| radius | 8 | Hemisphere radius in metres. |
| duration | 8 | Smoke/protection lifetime in simulation seconds. |
| cooldown | 12 | Cooldown from the throw, in seconds. |
| projectileFuseSeconds | 1.5 | Canister fuse; enemy contact can release smoke sooner. |
| maxActive | 1 | Maximum simultaneously active domes. |
| growSeconds | 0.35 | Cosmetic smoke expansion time; full boundary ring/protection starts immediately. |
| fadeSeconds | 0.7 | Cosmetic fade before expiry; protection remains until lifetime ends. |
| groundTolerance | 0.3 | Lower-edge tolerance for feet/terrain rounding. |
| puffs | 18 | Soft sprite puff count. |
| aiInterval | 0.35 | CPU defensive decision interval. |

A thrown canister consumes cooldown immediately; invalid support at detonation produces no dome. Direct deployment fixtures still reject invalid support without consuming cooldown. Pause freezes the ability. City rebuild, hero removal and reset clear smoke/cooldowns. Exiting player control leaves deployed smoke active for its remaining life. CPU Kage throws a canister toward his feet when hit or when close to civilians currently threatened by enemy weapons; the same fuse applies.

## Protection rules and integration

Protection checks the ally's **current world body anchor** against the ground hemisphere at the moment damage is applied. Kage and other heroes use their root plus one metre along body-up; civilians, infantry and vehicles use root plus one metre, buses plus 1.5m. Units without a root fall back to their hit-shape centre. Entry, exit, rescue/portal relocation and jumping above the dome therefore update immediately without sticky invincibility flags. Targets remain movable, boardable, shootable and visible to enemy targeting. The dome neither blocks projectiles nor changes their trajectories. It grants damage immunity to eligible actors, rather than sheltering buildings or enemies. It does not heal or revive.

`UnitDamage` adds an optional default-allow damage predicate; the battle wires it to Kage's smoke. Direct and splash damage for civilians, soldiers, tanks, buses and helicopters pass through this gate before HP, damage callbacks or death. Enemy `robot` units are excluded from smoke protection. Live roots are used so relocated allies are not checked against stale collision shapes.

`guardHeroInSmoke` guards direct hero hurt feedback and exposes `isDamageProtected`. ARGUS checks it before damage, impulse and continuous lance-ramp accumulation. Bastion checks it before player damage statistics and its adapter checks before hurt/knockback. Existing hero damage is still feedback-only; this adds no new player HP system. All existing building physics/destruction and hero movement remain unchanged.

## Verification

`QA/kage-smoke-test.mjs` covers ally types, true hemispherical boundaries, live entry/exit, stale-shape relocation, direct/blast immunity, enemy vulnerability, hero feedback, expiry/cooldown/reset and invalid ground. `QA/kage-smoke-browser.cjs` uses desktop V and mobile SMOKE with real civilians and character models, a landed Chinook, enemy damage, Walker beam, rocket/plasma hits, movement across the boundary, expiry/redeployment/reset and actual shader rendering. Existing Kage bomb/loadout, movement, charged shuriken, damage routing, ARGUS, Bastion, evacuation and convoy tests remain relevant. Physical-phone performance is unmeasured.

The smoke uses a shader hemisphere and shared procedural sprite texture, with no external assets/dependencies. Its sphere/segment approximations and centre-based coverage intentionally keep the prototype simple; a vehicle partially outside is covered only while its body anchor is inside. A dome cast on a roof stays at its original location for its lifetime, even if the support is later destroyed. Entry-module/dependency cache revision: `kage-smoke-210`.

## Projectile implementation — revision 219

`KageBombs` remains the common ballistic implementation for both abilities. Its optional `canThrow`, `onDetonate`, `expireDetonates` and smoke visual variant let smoke reuse launch velocity (56m/s plus 10.605473m/s lift), gravity (26m/s²), radius (0.3m), restitution (0.7), tangent retention (0.85), inherited movement (0.5), swept substeps and existing gateway redirection. Explosive bombs retain their normal damage, target detonation, 12s unused expiry and one-second cooldown. Smoke has one canister in flight, a 1.5s fuse and no damaging explosion. `smokeProjectile` diagnostics expose its flight/bounce/throw counters separately from explosive bombs.

Protection begins only after a dome successfully deploys, and its full eight-second life starts then. Reserving the cast starts the twelve-second smoke cooldown without granting airborne immunity; detonation does not restart that timer. V/touch use the current aim while CPU defense aims down. The normal throw pose and sound play at launch; the smoke release sound plays at detonation. Reset/hero removal clears both in-flight canisters and domes. The HUD displays SMOKE IN FLIGHT while airborne.

`QA/kage-smoke-projectile-test.mjs` covers arc, floor/wall ricochet, fuse, enemy contact without damage, remote placement, independent timers, gateway transit and reset at 30/60/120Hz and irregular steps. `QA/kage-smoke-projectile-browser.cjs` verifies desktop V/mobile SMOKE, visible travel, distant placement, actual civilian immunity and entry/exit, expiry/cooldown, reset, CPU throws and shaders. The updated smoke-protection browser fixture aims at the caster's feet to retain its direct/rocket/plasma/beam/vehicle/hero protection checks. Existing bomb Node and desktop/touch browser checks verify C is unchanged.

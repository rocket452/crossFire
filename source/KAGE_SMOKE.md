# Kage protective smoke — revision 210

Press **V** or the mobile **SMOKE** button to deploy a stationary smoke dome on the horizontal ground/support surface beneath Kage. A small canister, animated grey-violet haze, drifting soft puffs and a clear floor ring mark the protected area. Movement and attacks remain available. The existing C explosive bomb, kunai, teleport shuriken, slash, jumps and dash are retained.

## Tuning

`ninja-shuriken-config.json.smoke` contains all ability tuning:

| Value | Default | Meaning |
| --- | --- | --- |
| key | v | Desktop activation key. |
| radius | 8 | Hemisphere radius in metres. |
| duration | 8 | Smoke/protection lifetime in simulation seconds. |
| cooldown | 12 | Cooldown from deployment, in seconds. |
| maxActive | 1 | Maximum simultaneously active domes. |
| growSeconds | 0.35 | Cosmetic smoke expansion time; full boundary ring/protection starts immediately. |
| fadeSeconds | 0.7 | Cosmetic fade before expiry; protection remains until lifetime ends. |
| groundTolerance | 0.3 | Lower-edge tolerance for feet/terrain rounding. |
| puffs | 18 | Soft sprite puff count. |
| aiInterval | 0.35 | CPU defensive decision interval. |

Invalid support does not consume cooldown. Pause freezes the ability. City rebuild, hero removal and reset clear smoke/cooldowns. Exiting player control leaves deployed smoke active for its remaining life. CPU Kage can deploy on ground when hit or when close to civilians currently threatened by enemy weapons.

## Protection rules and integration

Protection checks the ally's **current world body anchor** against the ground hemisphere at the moment damage is applied. Kage and other heroes use their root plus one metre along body-up; civilians, infantry and vehicles use root plus one metre, buses plus 1.5m. Units without a root fall back to their hit-shape centre. Entry, exit, rescue/portal relocation and jumping above the dome therefore update immediately without sticky invincibility flags. Targets remain movable, boardable, shootable and visible to enemy targeting. The dome neither blocks projectiles nor changes their trajectories. It grants damage immunity to eligible actors, rather than sheltering buildings or enemies. It does not heal or revive.

`UnitDamage` adds an optional default-allow damage predicate; the battle wires it to Kage's smoke. Direct and splash damage for civilians, soldiers, tanks, buses and helicopters pass through this gate before HP, damage callbacks or death. Enemy `robot` units are excluded from smoke protection. Live roots are used so relocated allies are not checked against stale collision shapes.

`guardHeroInSmoke` guards direct hero hurt feedback and exposes `isDamageProtected`. ARGUS checks it before damage, impulse and continuous lance-ramp accumulation. Bastion checks it before player damage statistics and its adapter checks before hurt/knockback. Existing hero damage is still feedback-only; this adds no new player HP system. All existing building physics/destruction and hero movement remain unchanged.

## Verification

`QA/kage-smoke-test.mjs` covers ally types, true hemispherical boundaries, live entry/exit, stale-shape relocation, direct/blast immunity, enemy vulnerability, hero feedback, expiry/cooldown/reset and invalid ground. `QA/kage-smoke-browser.cjs` uses desktop V and mobile SMOKE with real civilians and character models, a landed Chinook, enemy damage, Walker beam, rocket/plasma hits, movement across the boundary, expiry/redeployment/reset and actual shader rendering. Existing Kage bomb/loadout, movement, charged shuriken, damage routing, ARGUS, Bastion, evacuation and convoy tests remain relevant. Physical-phone performance is unmeasured.

The smoke uses a shader hemisphere and shared procedural sprite texture, with no external assets/dependencies. Its sphere/segment approximations and centre-based coverage intentionally keep the prototype simple; a vehicle partially outside is covered only while its body anchor is inside. A dome cast on a roof stays at its original location for its lifetime, even if the support is later destroyed. Entry-module/dependency cache revision: `kage-smoke-210`.

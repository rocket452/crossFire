# Kage — Charged Shuriken

Available whenever Kage is player controlled. Select **Shuriken Lab** in the Scene menu for the isolated test scene, or `?scene=shuriken`. City Battle, Civilian Evacuation and Combat Testing retain their existing scenes and roster behavior.

The implementation uses the existing Three.js JavaScript modules, `NinjaHero` aim ray/hand attachment, swept OBB collision queries and `UnitDamage` callbacks. `NinjaMotion` and `RunnerMotion` are unchanged. CPU Kage uses single kunai throws at the primary cooldown; charged teleport throws remain player controlled. Baseline running, air control, jump heights, dash distance/speed, wall jumps, kill resets and slow fall are unchanged.

## Controls

- **LMB / F / KUNAI:** tap for a fast kunai; hold to store up to five, release to throw a straight burst. One-second cooldown per release.
- Hold **RMB / G / SHURIKEN**, then release for the existing charged teleport shuriken.
- **R / SLASH:** short-range 180° melee sweep.
- **Q / TELEPORT:** teleport to the full star's current position, including in flight.
- **X / CANCEL:** dismiss the full star or cancel the current charge. Starting another charge also dismisses the previous full star.
- **E / DASH:** the existing dash. Charge persists by default; `charge.dashCancels` switches cancellation on. The lab exposes this as a checkbox.
- **Space / JUMP:** existing high jump, double jump and wall kick. Charge persists through them.
- **F3 / ◇:** landing debug points, chosen capsule location, space-check result and state.

Input loss, pause/dialog interactions and pointer-lock release cancel an unfinished charge without accidentally throwing. Exiting the hero removes player ability stars; cooldown continues normally. The camera and attack use existing aiming conventions, without aim assistance.

## Throw and arrival behavior

Early release throws a fast straight star that stops at the first enemy. Full charge produces one cyan teleport star, with a clear flash and two-tone chime. It travels straight without gravity, damages and pierces each enemy at most once, stops on city geometry, or hovers at max range. Climbable enemy-body sections (such as Bastion’s limbs) are excluded from piercing flight/preview collisions; they remain solid for movement and teleport clearance. Existing boss armour and exposed-core damage rules still apply. It remains available for teleport until its stationary timeout. The two tiers have independent `pierces` flags; setting full to non-piercing anchors it at its first enemy instead.

The charge preview extends from the current hand position along the existing aim direction to the predicted endpoint. It highlights intersected enemies and shows a ghost marker. The full tier previews enemies beyond the first target. Red marks an invalid/forbidden endpoint; a nearer in-flight teleport may still be usable.

The resolver checks the ninja's upright capsule against live enemy shapes, intact/settled solid sections, terrain, arena bounds and the optional hazard callback. It first tries the star's current position, prefers the nearest clear point forward along its path, then a short backup, then surface clearance. A separate wall prevents searching through it. Geometry that has moved around the star can be escaped along the same path. Positions inside forbidden geometry fail. A failed attempt keeps the star and spends no cooldown, so retrying later in flight is possible.

The star represents the character's centre (`arrival.anchorHeight`); landing points are feet positions. Solid-surface anchors get enough clearance for the whole body, including the head. Unsupported arrivals keep normal gravity and momentum. Nearby support returns the existing controller to its normal ground mode.

A successful teleport consumes that star, starts the 1.5-second full-throw cooldown and refreshes the existing dash and air double jump once. By default an airborne arrival grants one air jump (the double jump); grounded arrivals regain the normal two-jump sequence. `arrival.airJumps` can grant extra airborne jump credits for experiments. During cooldown, quick throws remain available; a hold can become fully charged once cooldown ends.

Only enemies pierced during that star's flight are eligible for the arrival strike. If one is within range and unobstructed, Kage turns toward it and strikes. Arriving in its rear cone applies the backstab multiplier. No extra strike occurs for an enemy the star never touched. Existing boss armour/module damage rules still apply.

Enemy missiles and interceptable energy bolts also use existing hit callbacks. They do not become arrival-strike targets.

## Tunables

All ability data is in `dist/ninja-shuriken-config.json`.

| Value | Default |
| --- | --- |
| Full-charge threshold | 0.75 s |
| Dash cancels charge | false |
| Early speed / range / damage | 100 m/s / 95 m / 40 |
| Early pierces | false |
| Full speed / range / pierce damage | 75 m/s / 95 m / 25 |
| Full pierces | true |
| Star collision radius | 0.24 m per tier |
| Stationary lifetime / flight timeout | 6 s / 5 s |
| Successful-teleport cooldown | 1.5 s |
| Arrival strike radius / damage | 3.2 m / 180 |
| Rear arc / backstab multiplier | 120° total / 2.5× |
| Dash / double-jump refresh | true / true |
| Air jumps granted on arrival | 1 |
| Arrival centre height | 1.1 m above feet |
| Momentum preservation | true |
| Capsule radius / height / clearance | 0.34 / 2.25 / 0.04 m |
| Resolver step / forward / backup / surface search | 0.2 / 6 / 1 / 2.4 m |
| Preview refresh interval | 0.05 s |

Config also contains preview/debug pool limits, colours, sound frequencies/volume/duration, fade/trace timing, input keys, early-star limits and lab settings. `full.damage` applies if that tier is set non-piercing; `full.pierceDamage` applies when piercing. The same convention applies to the early tier.

Tags: set `section.tags = ['unteleportable']`, `section.unteleportable = true`, or `section.teleportable = false` to reject surface anchors. A `NinjaHero.isTeleportHazard(foot)` callback rejects unsafe landing regions. The lab pit supplies one. Destruction fragments follow the game's existing `hidden`/`collisionDisabled` rules.

## Test scene and milestone checks

The lab uses raised platforms to provide real gaps above the unchanged terrain baseline. Falling into the marked lava pit resets the lab position; it does not change movement physics. Three orange dummies form a piercing lane. A thin barrier stops flight. A purple wall rejects teleport stars. A tight firing port, enemy and rear wall provide a genuinely blocked destination. Lane buttons reposition the player for inspection. Exit the hero to access them on mobile.

1. Tap/release: one quick throw, first dummy takes 40 damage, others untouched.
2. Hold until flash/chime: all three intersected dummies highlight; release pierces for 25 each, with no gravity.
3. Wait for the star to embed in the thin barrier; it remains lit and expires after six seconds.
4. Press Q just as it enters/passes a dummy: the resolver prefers a clear point behind it; an eligible rear strike deals 450 damage. Press later in flight to choose a different arrival.
5. Re-press charge or use X to dismiss without teleport. Expiry never starts cooldown.
6. At the wall-backed fixture, throw through the firing port and teleport near the enemy/rear wall. The marker turns red, the star stays and cooldown remains zero.
7. Throw into the purple wall: the star disappears with a red marker and failure cue.
8. Jump while holding charge, double jump, release across the gap, teleport, then dash/jump again. No charging root or movement multiplier is applied.
9. F3/◇ draws tested points in green/red and the chosen destination volume. Debug text reports the capsule result and ability state.

## Verification and limitations

- `QA/charged-shuriken-test.mjs`: tier damage, both pierce flags, uniqueness, previews, no-gravity flight, thin/forbidden surfaces, range/timeout, current-position teleport, backstab, blocked/moving geometry, hazards, cooldown and dash-charge switch.
- `QA/charged-shuriken-browser.cjs`: actual desktop and independent multi-touch inputs, charging through jumps, piercing highlights, in-flight rear strike, existing dash/double-jump chain, gap traversal, real failed destination, forbidden wall, timeout, cancellation and debug screenshots.
- Existing ninja motion/jump/ground-dash/phase tests cover 30/60/120 Hz and long frames. Combat Testing browser regression covers all six heroes, real attacks and the preserved city/escort layouts.

The visuals, oscillator audio, dummies and arrival strike pose are placeholders. The resolver deliberately uses conservative upright-capsule clearance against the project's OBB sections. There is no network layer or new movement system. Physical-phone thermal/FPS behavior remains unmeasured; touch browser simulation is not a physical-device benchmark.

Kage’s dash also ignores live enemies’ climbable body sections while active, while its separate swept hit checks still deal 320 damage once per enemy. Normal movement restores those colliders, and city walls still stop the dash. Dash speed/range and kill resets are unchanged.

## Kunai and slash loadout (revision 139)

The charged shuriken is now the secondary attack. Its piercing, anchoring, Q teleport, X cancel, backstab and dash/jump refresh remain unchanged. Right click no longer dashes; E retains dash.

The primary kunai loads one immediately on press, then one more per second while held (up to five after four seconds). Nothing fires while held. Release snapshots a straight aim line and fires the stored kunai 0.075s apart. A one-second cooldown starts on release; clicks during cooldown do not bypass it. Each kunai travels at 110m/s for up to 110m, deals 55 damage and stops at its first hit. Holding/charging never changes movement. CPU Kage also uses single kunai throws at the new cadence. Input loss cancels stored kunai and unlaunched burst shots without accidentally firing.

R / SLASH applies 160 damage once to each enemy inside a 4.5m forward 180° sweep, with a one-second cooldown. It also intercepts destructible missiles and strikes nearby city panels through existing damage callbacks. Solid cover blocks the sweep. Boss armour and Aegis shield rules still apply; Bastion Gatling shots remain indestructible. A cyan arc and sword-arm swing show the melee area.

Tune `kunai` and `slash` in `dist/ninja-shuriken-config.json`: cooldowns, store interval/cap, burst spacing, flight speed/range/damage/radius, pool cap, slash range/angle/vertical reach/damage and effect duration. `dist/kage-attacks.js` owns these attacks; `ninja-hero.js` handles their inputs and poses.

`QA/kage-attacks-test.mjs` verifies cooldowns, five-stack release, straight volleys, first-hit damage, cancellation, melee multi-target damage, rear/range exclusions and cover. `QA/kage-loadout-browser.cjs` exercises mouse/touch attack mappings, stored burst, right-click teleport shuriken and R/touch slash in the live lab.

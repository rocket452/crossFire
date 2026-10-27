# Missile impacts and unit damage correction

## Root causes
- Projectile queries skipped intact sections queued for collapse and all detached/settled building sections.
- Units had no collision/damage handling.
- Cockpit mode hid the observer impact feed without providing its own hit confirmation.

## Change
- Shared reticle and swept-projectile query against current oriented section bounds, all structural states, units, and terrain.
- Swept volume, endpoint/start-inside contact, moving-unit interpolation, nearest-hit cover occlusion, and firing-unit exclusion.
- Direct structural hits prioritize the struck piece; settled rubble can reactivate.
- Tank/helicopter/infantry durability and area damage, disabled AI, charred smoking vehicles, falling rigid-body helicopter wrecks, and infantry knockdown.
- Rebuild restores health, original materials, unit animation, wreck colliders, and counters.
- Cockpit target/range, hit confirmation, remaining durability and disabled messages.
- Reduced oversized smoke puffs so damage remains visible from the cockpit.

## Passed
- Combat collision regression checks: intact/queued/falling/settled sections, rotated debris, exact endpoints, starting inside, nearest-hit cover, self exclusion, and a target crossing between simulation frames.
- Tank/helicopter/infantry damage, disable callback and reset tests.
- Direct building-hit activation and helicopter wreck gravity/contact world integration.
- Existing city physics, pilot flight and soldier asset tests.
- Browser: actual cockpit entry; player-fired building hit with BUILDING HIT feedback and debris activation.
- Browser: direct helicopter hit reduces durability from 90 to 22.
- Browser: player missiles disable a tank, disable another helicopter, produce a falling helicopter wreck, and disable infantry.
- Browser: rebuild restores every unit's health, alive state, infantry animation, counters and observer mode.
- Emulated phone touch: PILOT selection, joystick motion, held/dragged FIRE, cockpit exit, rebuild and no horizontal overflow.
- No JavaScript page errors during final desktop/touch interaction runs.
- Syntax and whitespace checks.

## Limits
Simplified unit durability, collision proxies and infantry knockdown; no armor penetration, full ragdolls or aircraft fragmentation. Buildings remain modular rigid-body structures with staged activation. Tests used Chromium software WebGL and emulated touch; actual phone GPU/thermal performance remains unverified.

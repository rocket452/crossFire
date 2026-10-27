# Visible building damage and popup removal

## Reproduced before the change
Filled the moving-debris cap, fired at another wall, and stepped physics. Result: impacts=1 but the wall remained intact at its original position, queued behind active debris. The hit counter alone therefore did not prove visible damage.

## Corrected
- Reserve 20/28 of the existing narrow/wide moving-section slots for direct player impacts; AI collapse work uses the remainder.
- Direct player sections activate immediately and are removed from any existing normal queue, rather than waiting behind an entire collapse.
- Inset detached box proxies by 3% to allow separation from neighboring structural pieces; restore full dimensions on reset.
- No airborne debris is frozen to create capacity, and the overall moving-section budget is unchanged.
- Remove the hit-confirmation DOM element, popup styles, and reticle confirmation flash.
- Quick touch taps fire on release; held touch fire briefly allows aim input before the first launch.

## Passed
- Saturated-AI-budget regression: a player-hit wall becomes dynamic immediately, moves more than 0.8 m, and leaves existing airborne debris active.
- Rebuild restores collider dimensions, position and intact state.
- Live browser roof test: previously intact slab B16/index 822 moved 0.966 m in the actual GPU instance transform; the render position matched its physics body to below 1 mm.
- Live browser façade test: previously intact wall B16/index 1433 moved 0.912 m in the actual rendered instance; position again matched the body below 1 mm.
- Before/after screenshots visually reviewed for both tests: roof opening and missing façade panel.
- No #pilot-impact element exists before or after missile impacts.
- Emulated phone touch: quick tap launches exactly one missile, held/dragged FIRE launches and aims, joystick moves the aircraft, exit and rebuild work, and no horizontal overflow or JavaScript page errors.
- Existing collision/unit-damage, city physics, pilot flight, and soldier asset checks pass.

## Limits
Still a modular, budgeted rigid-body destruction prototype. Large area collapses remain staged, and extreme saturation of the reserved player slots can still defer further sections until capacity settles. Real phone GPU/thermal performance remains unverified; browser QA used Chromium software WebGL and emulated touch.

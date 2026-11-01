# Experimental robots — revision 108

Open Combat Testing in the scene menu, choose one hero and an Enemy preset, then Spawn / Reset and Play Hero. Presets include one or three of Aegis, Scythe or Breaker, and a mixed six-enemy group (two of each). Original basic-drone counts and optional Siege Walker remain available. Experimental spawns occupy open streets; mission waves are unchanged.

## Tuning

`dist/experimental-robots.js`, `ROBOT_EXPERIMENTS` uses metres, seconds and damage units:

| Type | HP / movement | Special |
| --- | --- | --- |
| Aegis | 900 / 1.5 m/s | 120° shield, 90% reduction, 90°/s maximum chassis turn; range 32m, 14 damage ordinary bolts, 1.25s burst recovery |
| Scythe | 650 / 1.4 m/s | 1.5s harmless warning, 120° sweep over 2s, 25m range, .22m beam radius, 90 damage/s, 5s recovery |
| Breaker | 750 / 1.8 m/s | 2s charge, 120 HP exposed capacitor, 2s overload stun with 1.5× hull damage, 6s recovery; cannon 36m range, 22m/s, .65m radius, 60 damage |

Scythe locks its sweep bearing and stops walking during warning/fire. Jumping over the low beam, retreating beyond range, moving behind it, or cover avoids damage. Breaker locks its aim point on charge; capacitor hits do not also damage its hull. Three 55-damage shurikens interrupt a full capacitor. Capacitor protection closes outside charging, and an overload cancels discharge immediately. Ordinary hero stun cancels specials without granting the capacitor vulnerability bonus. Aegis shield collision uses seven rotated panels matching its visible blue arc; flank/rear hull hits deal normal damage.

## Architecture

`ExperimentalRobot` subclasses the existing `EvacRaider`: shared UnitDamage registration, projectile tracing/portal redirects, LOS selection, hero-hit callbacks, death explosions, physical smoking wrecks and reset. A centralized optional entity damage modifier handles shield/capacitor rules. Nine experimental units are pooled in Combat Testing; only the chosen preset spawns. No dependencies, hero controller or mission systems added. Additional cache query changes ensure all importers use the same collision/base module version.

## Verification

- `experimental-robots-test.mjs`: 30/60/120Hz and 75ms steps; shield directions/turn cap; harmless warning, committed sweep, jump/rear/cover avoidance; capacitor targeting, three-hit interrupt, one overload, 2s stun, 1.5× damage, fresh charge and uninterrupted cannon; reset.
- `experimental-robots-browser.cjs`: actual DOM presets, Volt fire/dash/jump controls on desktop and touch-sized mobile; front/rear damage, flank, capacitor interrupt, Violet and Rift CPU damage against mixed groups, reset, screenshots and console errors. Simulation time advances deterministically through the live gameplay update, with rendering paused between samples.
- Existing basic-drone burst, hero-aim and roster tests; Siege Walker cannon tracking, head telegraph and destructible weapon tests.
- `combat-testing-browser.cjs`: desktop and phone-sized testing menus, all existing heroes/configurations, actual fire, death/reset; original battle and evacuation scenes load correctly.

Browser checks passed on both viewports: front 9 vs rear 90 damage; stationary sweep hit versus timed-jump zero hits; one capacitor overload with no cannon discharge. Mixed-group sampled rendering: 277 calls / 28,324 triangles. No browser page errors. Evacuation lifecycle/navigation regressions also pass.

## Limits

Experimental types are test presets, not newly inserted mission waves. Existing heroes retain their current control support (Volt/Kage direct; other heroes CPU). Enemy hits use existing hero feedback rather than introducing a new hero health/death system. No multiplayer added. Capacitors require deliberate aim; no new capacitor aim assistance. Simple obstacle rejection reuses the existing drones' movement instead of adding navigation infrastructure. Browser mobile emulation does not establish physical-phone FPS, thermals or touch ergonomics. Procedural models/poses and shared explosion audio are prototype assets.

Revision 111: shield contact brightens Aegis’s surface and local impact blue, suppresses/clears the red body flash for that hit, and retains 90% damage reduction. Subsequent exposed-hull damage still uses ordinary red feedback. Unit checks cover shield → hull → shield transitions; live desktop/touch fire checks confirm blue shield/no red body versus red rear-hit feedback.

# Seven-robot energy wave — revision 86

## Behavior

- Small robot bolts are twice revision 85's size: radius 0.66 → 1.32m (diameter 2.64m). Speed remains 18m/s, with the same 14 damage, four-second life, one-second windup and 2.5-second recovery. Swept collisions, barriers and threat predictions share that radius. Low targets are aimed at upper-body height so a large bolt does not hit the street prematurely.
- Exactly seven tracked robots spawn with civilian wave two at 30 seconds, once per rebuild. The existing three lanes carry staggered rows of 3/3/1 at Z=90/96/102, staging at Z=36/42/48. Followers stop behind blocked/stunned leaders. Existing map, entrances, civilian timing and combat are retained. Each robot has 1,000 HP; totals derive from the actual squad count.
- Bright cores, pulsing halos, rotating rings, trailing sparks and expanding impact discharges use one shared set of three instanced meshes (384 sparks, 96 rings, 64 halos). No lights, external textures, dependencies or additional damage. Effects expire and clear on reset. Tuning: `RAIDER_COMBAT`, `RAIDER_ENERGY`, `ESCORT_APPROACH`.

## Verification

- `QA/raider-energy-wave-test.mjs`: passes at 30/60/120Hz and irregular 75ms steps. Seven unique actors/7,000 total HP, shared visual pools, non-overlapping approach including a leader stopped for six seconds, complete reset/respawn, bounded/expiring trail and impact particles.
- `QA/raider-hero-aim-test.mjs`: passes at those same timesteps. Real doubled geometry and silhouette, matching collision radius, 1.8m movement per 100ms, unchanged physical hero damage, torso aim, cover, stun and cleanup. A real 31m shot strikes a low civilian for 14 damage before touching the ground and creates an energy impact.
- `QA/evac-raider-test.mjs`, `QA/civilian-targeting-test.mjs`, `QA/combat-collision-test.mjs`: pass.
- `QA/raider-hero-aim-browser.cjs`: passes desktop and touch-phone emulation with all seven robots targeting the five existing hero fixtures, actual hits, independent torso/gun aim, barrier interception, phased-speedster exclusion, cover/Chinook fallback, doubled radius and 18m/s threat metadata, effect rendering, reset and 30-second spawn schedule.
- Focused browser visual check on final projectile source: passes desktop and phone emulation. Real shots produce visible wakes and collision-triggered ring/spark discharges without page errors. Screenshots reviewed: `/tmp/drone-energy86-trail-desktop.png`, `/tmp/drone-energy86-impact-desktop.png`, `/tmp/drone-energy86-impact-phone.png`.
- `QA/evac-squad-browser.cjs`: desktop and phone emulation pass actual second-wave spawn, seven clear lanes/rows, existing autonomous rescue, real Chinook damage, hero damage/stun, seven independent deaths, no repeated squad on later waves, rebuild, keyboard/touch control fixtures, natural combat and original City battle. Both 85-second natural-combat runs produced 44 drone shots, 5,576 damage to the squad, nine rescues and one civilian lost; two drones survived.
- Syntax checks and `git diff --check` pass. Physical-phone FPS/thermal performance has not been measured. Historical unrelated portal-test limitations are documented in `QA/raider-projectile-validation.md`; this is not a claim that every historical suite passes.

The encounter fixture now shoots/stuns the front row from clear angles and runs the movement check alongside the formation: a second row correctly blocks attacks/dashes fired directly through it. The desktop fixture releases mouse lock before returning to menu controls. These are QA placement/input updates, not hero ability changes.


## Revision 87 speed follow-up

Small-robot projectile speed doubles from 18 to 36m/s; size, seven-unit formation, energy effects, damage, targeting and firing cadence are unchanged. Existing node aiming, low-civilian contact, energy-wave, civilian-targeting and combat-collision suites pass. Focused Chromium checks pass on desktop and touch-phone emulation: actual shot moves 3.6m in 100ms, threat velocity/speed matches 36m/s, real hero collision produces an energy burst, grazing contact uses radius 1.32m, Violet blocks a shot for 14 damage, and rebuild clears all effects while retaining the seven-robot wave and 30-second civilian schedule. Screenshots: `/tmp/drone-speed87-desktop.png`, `/tmp/drone-speed87-phone.png`. Physical-phone performance was not measured.

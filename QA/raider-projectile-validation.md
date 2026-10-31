# Tracked drone projectile tuning — revision 85

The small robots fire bolts with a 0.66m radius (previously 0.22m) at 18m/s (previously 12m/s): three times the diameter and 50% faster. `RAIDER_COMBAT` in `dist/evac-raider.js` owns both settings. Damage, firing cadence, targeting ranges, windup and four-second lifetime are unchanged. Swept collision, shield/bubble interception, occlusion silhouettes and incoming-threat predictions use the enlarged shot size; threat velocity matches actual movement.

## Verification

- `node QA/raider-hero-aim-test.mjs`: passes at 30/60/120Hz and irregular 75ms steps. Real launched geometry has radius 0.66m, moves 1.8m in 100ms, uses the same silhouette geometry and passes the correct radius into collision. Existing targeting, hero damage, independent torso/barrel aim, stun and reset checks pass.
- `node QA/evac-raider-test.mjs`, `node QA/civilian-targeting-test.mjs`, `node QA/combat-collision-test.mjs`: pass. Civilian danger prediction, structural collision, unit damage and drone lifecycle retain their behavior.
- `node QA/raider-hero-aim-browser.cjs`: actual game in Chromium, desktop and touch-phone emulation. Tests all five existing hero targets, three independent shooters, physical impacts, cover, helicopter fallback, Violet barrier, phased speedster immunity and reset/30-second subway schedule. A real shot has matching visible radius, hit radius, velocity and threat metadata; an enlarged grazing hit is detected. Screenshots: `/tmp/drone-bolts85-desktop.png`, `/tmp/drone-bolts85-phone.png`.
- `git diff --check` and JavaScript syntax checks pass.

Additional legacy-suite limitation: `QA/portal-hero-test.mjs` fails its pre-existing fixed scene-child count (expects seven; current portal effects create eight). Temporarily using the actual baseline exposes a second stale assertion that expects the deliberately short teleport trace to remain visible after 1.5s. No portal source module was changed for this tuning; the legacy test is left unchanged. This is not a claim that the entire historical test suite passes.

Phone checks use browser emulation; physical-device performance was not measured.

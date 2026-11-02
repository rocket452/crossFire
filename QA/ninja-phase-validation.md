# Kage enemy phasing — revision 119

Ground and airborne Kage dashes pass through robot enemy bodies, including shields and large boss geometry. Enemy intersections are collected separately from blocking world/missile traces; only contacts before an actual obstruction or actual movement endpoint are applied. A per-dash unit set prevents repeated damage across body parts or overlapping frames. Damage remains 320 per enemy contact through the existing part/damage system, preserving Aegis reduction, Breaker capacitor interception, Walker weapon durability and normal death effects. Kills still reset cooldown. Missile impacts retain their existing blocking/kill-reset behavior.

The 48m range, 128.8m/s speed, 6s normal cooldown, ground support, terrain/building collision, bounds and two-second airborne slow fall are unchanged. Shurikens keep normal enemy collision. Player and CPU Kage use the same dash implementation. This change does not add dash invulnerability or change hurt feedback.

Files: `ninja-hero.js` separates enemy contact collection; `ninja-motion.js` applies contacts without stopping; `battle.js` provides enemy targets and an optional trace filter; entry/import cache refresh in `index.html`/battle. No model assets, new controls or dependencies.

Verification:
- `ninja-phase-test.mjs`: real NinjaHero trace logic at 30/60/120Hz and 75ms steps, ground/air transit through three enemies, 320 once each, kill reset, full distance/slow fall, no hits through walls, prolonged overlap through a large boss.
- `ninja-phase-browser.cjs`: real keyboard E and mobile DASH in Combat Testing; ground/air dashes pass three Bruisers and travel 48m, health changes exactly once, one kill resets cooldown, airborne slow fall remains. A real arena building stops travel and protects a Bruiser beyond it. Both viewports have no page errors; screenshots inspected.
- Existing ninja motion, ground dash and jump-feel tests pass.

Physical-phone performance has not been measured. Some earlier isolated motion fixtures still deliberately provide blocking mock contacts to test generic obstacle handling; live robot contacts now use the nonblocking path.

## Revision 151 — Shift dash

Kage's desktop ground/air dash is now bound to Shift (either Shift key); E no longer activates it. The desktop HUD and shuriken-lab help show Shift. Touch DASH, Volt Rush's bindings and dash movement/damage/cooldown behavior are unchanged. The phase browser suite checks the real Shift keyboard input, updated HUD reminder, E rejection, touch input, ground/air enemy pass-through, kill reset and building obstruction.

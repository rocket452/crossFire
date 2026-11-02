# Combat Testing map — revision 105

The Scene menu now has a third entry, Combat Testing (`?scene=testing`), preserving the existing Site identity. It uses the current city kit, streets, terrain and destruction with two three-storey buildings (B06/B11). It has no friendly army, subways, civilians or evacuation helicopter.

Test setup selects exactly one hero, an optional Siege Walker and 0–7 tracked drones. Spawn / Reset rebuilds the field, clears projectiles/wrecks, restores hero state and respawns the selected enemies. Kage and Volt retain direct desktop/touch controls via Play / Watch; Violet, Rift, Solara and Mochi retain their CPU abilities and follow cameras. UI labels make this control limitation explicit. Test setup in the header exits hero control and returns to the panel; Play / Watch scrolls the viewport into view. The main missions' saved roster is never overwritten.

`combat-testing.js` reuses EvacRaider, its physical projectiles, shared energy effects, damage, death/wreck and hero-target APIs. A seven-member pool is reused across reset configurations. Boss selection controls visibility, live unit health, collision shapes and attack lifecycle; deselected bosses cannot leave invisible hitboxes. The main battle loop's raider provider also connects test drones to existing hero target selection, shields/portals, incoming threats, minimap and through-cover silhouettes. Initial drone grace/windup and five-second boss startup remain in use. No new hero ability or mission rules are introduced.

Validation passed:

- `node QA/combat-testing-browser.cjs`: desktop and emulated touch phone, actual three-entry Scene menu, two-building field, one selected hero, all six roster choices, isolated saved main roster, empty arena, seven drones plus boss, drone death/reset without boss death or duplicate units, standalone boss firing at the selected hero, real player shuriken damage and drone return fire, single-hero modal, responsive setup layout and controls, no browser errors.
- The browser suite also loads both existing missions and verifies 16 city buildings / 14 escort buildings, three-hero roster, preserved 12-person escort wave, and absence of testing systems there.
- `node QA/hero-roster-test.mjs`: normal three-hero validation/persistence plus isolated single-hero default, empty/multiple rejection and selection.
- JavaScript syntax / whitespace checks. Screenshots reviewed at `/tmp/testing105-desktop.png`, `/tmp/testing105-phone.png` and `/tmp/testing105-setup-phone.png`.

Physical-phone FPS/thermal performance remains unmeasured. Four heroes continue to be CPU-only because their existing game implementations have no player controller; this map does not add those controllers. Configuration resets the whole test rather than adding enemies to an ongoing encounter.

## Expanded arena (revision 137)

Combat Testing is now 240×240m (twice the former width and length). Movement bounds are ±116m; rescue-dash bounds are ±115m. The road grid extends across the new ground, the minimap uses the expanded bounds, and observer zoom/fog/shadows cover the larger field. The two existing 12-floor (36m) buildings stay at their existing central positions. Enemy presets spawn around the northeast corner (84, -84), with smaller robots spaced nearby. Reset preserves the same corner for Bastion and Siege Walker; the walker’s planted-foot animation translates with its spawn origin. Bastion rain can target the full field inside ±108m. Main city and evacuation dimensions/spawns are unchanged. Arena settings live in `dist/combat-arena-config.js`.

## Spawn contraction (revision 144)

All Combat Testing enemy spawns are scaled to 70% of their former X/Z distance from map centre. Bastion/Siege Walker move from (84, -84) to (58.8, -58.8). Small-enemy formation offsets scale by 0.7 as well, so each enemy moves exactly 30% closer, while 4.9m lateral / 5.6m row spacing avoids starting overlap. The 240m ground, buildings, movement bounds, counts and original mission spawns are unchanged.

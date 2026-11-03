# Prismwing — parrot-wing rainbow heroine (revision 177)

Prismwing is an optional CPU defender in the existing **Heroes** selection menu. The default Volt/Violet/Rift team and three-hero limit are preserved. She also appears in Combat Testing's single-hero dropdown; **Play / Watch selected hero** and the **Prismwing** camera button follow her autonomous flight. Direct player flight controls and additional defensive/ultimate abilities are outside this addition.

## Character and flight

Reuses the existing private, user-supplied female mesh with its real 23-bone weighted rig (574 source triangles), scaled to 2.4m. A separate `prism` palette keeps her blue/turquoise/gold suit independent of Solara. Original public procedural accessories add a dark-haired feather crest, facial eyes, a feather tail skirt, two chest-mounted articulated parrot wings with 34 wing feathers, and a rainbow-star wand attached to the actual right hand. Wings have shoulder/outer hinges, quicker hovering flaps and a smaller forward-flight stroke. Idle, torso lean, dangling knees and arm IK deform the real weighted body; there are no hidden pose proxies.

`prismwing-character.js` owns this art/animation. The wand is oriented independently within the hand attachment, and the beam starts at its actual tip, 1.03m along the wand from the grip. Watch cameras frame the full wingspan on desktop and portrait layouts.

Flight uses existing CPU-hero conventions: smooth velocity toward an orbit around the active enemy above the tallest intact-map roof. Defaults in `PRISMWING` (`dist/prismwing-hero.js`): 16m/s speed, 2.6 response, 23m orbit radius, .16rad/s orbit rate. Default starting lineups, city layouts, hero controls and player movement values do not change.

## Rainbow wand attack

Charge .45s, channel a seven-color rainbow for .8s, then cool down 1.4s. Damage is 120 per second (up to 96 for a fully connected burst), range 150m, trace radius .16m. Missed beams still expire and cycle normally. The world trace stops at the first building, robot, missile or supported enemy projectile. Existing `damageRobotHit`, missile damage and Bastion damage rules remain authoritative; a rainbow cannot bypass armour or make Bastion's Gatling shots destructible. Building damage uses the existing non-robot reduction.

`prismwing-effects.js` renders seven distinct colored strands with a slight animated bend, multicolored expanding impact rings and sparkling particles. Shared instanced pools cap the effect at 112 beam segments plus matching glow, 192 sparks and 28 rings (four active draw pools); no new lights, textures or dependencies. Reset, hero deselection and battle rebuild clear all effects and counters.

Battle integration includes roster/storage, watch cameras, hero target lists for the arena/escort, minimap allies, damage counters and diagnostics. The private female runtime assets remain on the owner-private build branch; no geometry or derived animation assets were added to public GitHub.

## Verification

`QA/prismwing-browser.cjs` passes desktop and emulated touch layouts: arena dropdown/watch; main-city hero menu replacing Rift within the existing three-hero limit; actual 574-triangle/23-bone weighted mesh with finite deformation bounds; two animated wings; hand/wand-tip separation; seven-color beam; real enemy damage; continuous flight; miss/cooldown cycles; bounded FX; rebuild and deselection cleanup. Front/side screenshots were inspected on both layouts. `hero-roster-test.mjs`, Kage motion, Mireguard and Bastion permanent weak-point checks also pass. Physical-phone FPS/thermal performance has not been measured.

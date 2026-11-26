# City Liberation (ROR)

Select City Liberation from the scene dropdown and deploy Volt Rush, Kage, or Luxmancer. Defeat the Siege Walker in the first district and Bastion in the second. The squad director keeps spawning ordinary enemies from street entrances during both battles.

## Progression and economy

Robots award both XP and credits. Bruisers grant 7 XP and 4 credits. Drones grant 10 XP and 6 credits on defeat, including disabling their flight. A district boss grants 60 credits. The first level costs 24 XP and each subsequent threshold increases by 12. Each level pauses the simulation for three distinct evolutions for the selected hero. Matching an owned synergy tag makes an eligible card 1.7 times as likely to be drawn. Sun consumers require Second Sun or Flashpoint. Late drafts offer the remaining eligible cards as the unique pool runs out.

The supply depot stands at the central street intersection. Follow its mint beacon and the distance on the HUD. Within 10 m press **B** or click the depot button. **I** opens inventory anywhere. Combat, projectiles, cooldowns and district timers pause while a menu is open. Leaving the menu restores play. Standing at the depot during combat gives ordinary damage protection only.

Five distinct items are drawn per shop. Common, rare and legendary items cost 25, 45 and 70 credits. A purchased slot stays sold out until the next refresh. A refresh costs 10 credits initially and each paid refresh raises that price by 5. The next district gets a fresh shop and the starting refresh price. Defeating the Walker also opens a three-relic draft. All holdings carry forward. Starting a new mission clears them.

## Builds and tuning

The complete card definitions, descriptions, prices, rarity and stacking formulas live in `dist/liberation-catalog.js`. The roster totals 12 Volt evolutions, 13 Kage evolutions, 14 Luxmancer evolutions, 25 items and 5 relics. Evolutions and relics are unique. For items, the card gives the total benefit at the next rank. Chance effects cap at certainty before applying their proc coefficient. All heroes start with 5% base critical chance. Critical hits deal double damage.

- **Living Power Grid.** Beam a robot within 26 m of an orb. Power Grid supplies energy, Mitosis splits a full recharge, and Orbital Current damages enemies between linked orbs. A Sky Strike can discharge the whole network. Feedback Circuit restores energy on critical hits.
- **Blade Factory.** Stop a Laser Star in a lane, then throw blades through it. Blade Foundry redirects copies. Grinding Singularity gathers small enemies. Dash through the star with Crosscut to send grinding fields in opposite directions. Projectile splitting, piercing and critical fragments extend the attack.
- **Solar Apocalypse.** Cast Sunlance from a Consecration field. An impact seeds a miniature sun. Thread a later lance through the sun for extra size and damage. Judgment and Overflow Reactor convert overkill into separate blasts. Volatile Core adds a max-health explosion. Secondary Amplifier increases the item damage.

`liberation-build.js` owns purchases, draft eligibility, XP and inventory. `liberation-events.js` defines run-local event dispatch and attack classification. `liberation-combat.js` routes tagged activations, native and generated hits, crits, kills, status events and movement into item mechanics. `liberation-evolutions.js` binds those events to hero-specific mechanics. The native hero controllers report casts and projectile contacts. The damage router still applies the existing boss component and armor rules. Area effects select at most one contact per boss. Chain effects may separately hit exposed weapons. Execution Engine applies to ordinary enemies.

## Initial balance and implementation limits

The Walker enters at 7:05 of district combat time. Bastion arrives 8:10 into the second district. Boss fights, menu time and travel make actual run length variable. Enemy pressure follows district time and squad caps. Hero damage output never adjusts enemy health. A scripted run with one kill opportunity every eight seconds reached its first evolution at 33 seconds and level 6 by five minutes.

Generated effects have a five-generation ancestry limit, a 160 generated-hit budget per simulation update, 64 homing projectiles, 24 persistent fields, and at most seven satellite orbs beside the original orb. A generated effect cannot re-enter its own ancestry. Repeated Luxmancer shots use the regular projectile controller. Echoed melee and sustained beams use a single spectral sweep. Echoed dashes leave the player in place. Stored kunai copies and fragments home toward visible targets. Miniature suns and satellite orbs use pooled lightweight visuals. Closed Circuit tests the enclosed horizontal polygon. The model does not simulate electrical conduction through terrain.

## Verification

- `node QA/liberation-synergy-test.mjs` exercises the three combined builds, resource feedback, relic triggers, recursion limits and boss damage routes for two loadouts per hero.
- `node QA/city-liberation-test.mjs` uses the actual enemy pools, drone physics, district director and Walker components to cover spawns, pacing, menus, boss transitions and reset.
- `node QA/luxmancer-test.mjs` covers native casts, Solar Blink, sustained inputs, repeated locks and Communion reserves.
- `node QA/liberation-browser.cjs` selects each hero in Chromium, opens the run inventory and depot, buys, refreshes and chooses an evolution. Serve the game locally and set `GAME_URL` if the server is elsewhere than port 8234.
- Wave Defense, kunai, Laser Star, Ball Lightning and boss suites remain independent regression checks.

Instrumented encounters verify damage routing. Human 15–25 minute runs, late-run handheld frame times, and the frequency of affordable shop visits need playtesting.

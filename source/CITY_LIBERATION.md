# City Liberation (ROR)

Select City Liberation from the scene dropdown and deploy Volt Rush, Kage, or Luxmancer. Defeat the Siege Walker in the first district and Bastion in the second. The squad director keeps spawning ordinary enemies, Bruisers and drones, from street entrances during both battles.

## District 1 stages (revision 474)

District 1 runs ten minutes of district time in two stages. `LIBERATION_STAGES` in `city-liberation.js` holds the tuning.

**Stage 1 — Build your foundation (0:00–5:00)**
1. **Small enemy introduction.** Packs `B`, `BD`, `BB` arrive every 15 s, with at most 5 enemies alive. Kills earn credits and XP. The first level-up is held: the XP bar fills and waits.
2. **First elite (1:25).** An *Elite Bruiser* enters from across the district. It is 1.45× larger and gold-lit, with 5× health (1,225). Kage's dash takes only 12% of its health. Basic spawns pause until it falls, and it is never recycled as a straggler.
3. **First power-up.** Killing the elite releases a guaranteed pick-one-of-three hero evolution ("First power-up"). It also pays 20 credits and 24 XP.
4. **Enemy surge.** Right after the pick, 12 basic enemies (`BBB`, `BDB`, `BBD`) arrive every 1.6 s, with up to 14 alive. After that, regular packs run until 5:00.

**Stage 2 — Build your identity (5:00–10:00)**
1. **Mini-boss (5:15).** The **Astra Ronin** enters at the far side of the district. In hunter mode he always tracks the hero and flies in over buildings. His health is 2,600, shown on the boss bar as "ASTRA RONIN · MINI-BOSS". His damage is scaled for 120 HP heroes:

   | Attack | Damage |
   |---|---|
   | Sword | 16 |
   | Overhead | 24 |
   | Dash | 22 |
   | Wave | 12 |

   His waves and heavy sword still damage buildings. Hero abilities target him through `nearby()`. A light trickle of `B`/`D` packs continues during the duel, with at most 3 alive.
2. **Mini-boss defeated.** The kill pays 40 credits and 20 XP, plus a guaranteed pick-one-of-three ("Mini-boss defeated"). Regular packs then resume.
3. **Siege Walker (10:00).** The Walker never enters while the Ronin lives.

Each beat shows a short centre-screen banner and a stage objective in the HUD title. District 2 (Bastion) is unchanged.

Reinforcements enter on the opposite side of the district from the hero:
- **Spawn points:** street-edge entrances that lie across the district centre from the hero. Edges that are only just past the centre are excluded: an edge must reach at least 35% of the deepest far-side edge's depth. If the hero stands within 12 m of the centre, any edge counts and the farthest come first.
- **Variety:** successive packs step around that far side, so they arrive from different streets.
- **Travel pace:** ground units cross town at 7 m/s and slow to their normal combat walk within about 50–85 m of the hero.
- **Recycling:** a far unit (over 100 m away and at least 30 s old) is recycled only after 10 unseen seconds in which it closes less than 8 m. Units that are still approaching are left alone.

From the hero start at (0, 96), packs enter 165–213 m away. In a measured run they open fire about 26 s into the district.

Assault Sentinels are no longer part of City Liberation; they remain available in Combat Testing.

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

The Walker enters at 10:00 of district combat time, after the Astra Ronin mini-boss. Bastion arrives 8:10 into the second district. Boss fights, menu time and travel make actual run length variable. Enemy pressure follows district time and squad caps. Hero damage output never adjusts enemy health. A scripted run with one kill opportunity every eight seconds reached its first power-up at 89 seconds (just after the elite) and level 5 by five minutes.

Generated effects have a five-generation ancestry limit, a 160 generated-hit budget per simulation update, 64 homing projectiles, 24 persistent fields, and at most seven satellite orbs beside the original orb. A generated effect cannot re-enter its own ancestry. Repeated Luxmancer shots use the regular projectile controller. Echoed melee and sustained beams use a single spectral sweep. Echoed dashes leave the player in place. Stored kunai copies and fragments home toward visible targets. Miniature suns and satellite orbs use pooled lightweight visuals. Closed Circuit tests the enclosed horizontal polygon. The model does not simulate electrical conduction through terrain.

## Verification

- `node QA/liberation-synergy-test.mjs` exercises the three combined builds, resource feedback, relic triggers, recursion limits and boss damage routes for two loadouts per hero.
- `node QA/city-liberation-test.mjs` uses the actual enemy pools, drone physics, district director and Walker components to cover spawns, pacing, menus, boss transitions and reset.
- `node QA/city-liberation-stages-test.mjs` plays District 1's stages: introduction cap and held level-up, elite size/health/tint/spawn pause, first power-up, surge size, Stage 2, the Ronin flying in from 165 m, scaled Ronin damage, trickle cap, the Walker waiting for the Ronin, the mini-boss reward and reset.
- `node QA/luxmancer-test.mjs` covers native casts, Solar Blink, sustained inputs, repeated locks and Communion reserves.
- `node QA/liberation-browser.cjs` selects each hero in Chromium, opens the run inventory and depot, buys, refreshes and chooses an evolution. Serve the game locally and set `GAME_URL` if the server is elsewhere than port 8234.
- Wave Defense, kunai, Laser Star, Ball Lightning and boss suites remain independent regression checks.

Instrumented encounters verify damage routing. Human 15–25 minute runs, late-run handheld frame times, and the frequency of affordable shop visits need playtesting.

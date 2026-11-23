# City Liberation

Select **City Liberation** from the map menu, choose Volt Rush or Kage, then start. Fight across the destructible cyberpunk city. Your hero starts with 120 HP. Volt carries 75 energy into the first engagement. The run ends when the hero falls or the Bastion is defeated.

## Encounters and rewards

The opening pair of Bruisers deploys after one second. Reinforcements enter on open streets 18–65 metres from the player, with preference for a visible approach about 30 metres away. The first stage cycles through two Bruisers, a Bruiser and a drone, then two Bruisers and a drone. The second stage fields larger mixed packs. The active-enemy cap rises from seven to twelve. Enemies continue arriving during a boss encounter at a slower cadence.

The Siege Walker enters at 1:55. Breaking all three heavy weapons advances the run, restores up to 35 HP, grants 35 credits and opens a draft with a guaranteed epic choice while one is available. The Bastion dropship arrives 2:15 into stage two. Both bosses use their existing telegraphs, hitboxes, armor and stun rules. Matching the final boss kill to its death sequence leaves five seconds before the result screen. Victory also awards 12 starting credits for the next run on this browser. The reward is consumed once.

Bruisers give 7 XP and 4 credits. Drones give 10 XP and 6 credits when their hull or an engine fails. Shooting the falling aircraft gives no second reward. The first level takes 14 XP. Each subsequent level costs 6 more XP than the previous level. At each level combat pauses for a choice of three distinct upgrades. During a draft, 8 credits buy a reroll and 12 buy 30 HP. Credits, XP and equipped upgrades are specific to the run.

## Upgrade pool

Values below are per rank. Numerical upgrades add together up to the rank cap. The listed percentage bonuses on direct attacks add before the target processes armor, headshots or weak points. The first draft includes a choice that changes the hero's actions or adds an attack. Later drafts weight common, rare and epic choices 5:3:1. Drafts exclude other heroes’ upgrades and capped ranks.

| Upgrade | Rarity | Max rank | Effect per rank |
| --- | --- | ---: | --- |
| Power amplifier | Common | 3 | +15% direct damage |
| Execution circuit | Rare | 3 | +40% damage against a target below half hull HP |
| Precision lens | Rare | 3 | +25% on head, engine and vulnerable boss-part hits |
| Breach rounds | Common | 3 | +30% damage within 12 m |
| Slipstream | Rare | 3 | +30% damage while moving faster than 12 m/s |
| Hot core | Rare | 2 | +35% damage for four seconds after taking damage |
| Arc relay | Epic | 3 | An attack arcs to another visible robot within 20 m for 48 damage, once per 1.2 s |
| Reactor cascade | Epic | 3 | Defeated robots deal 90 damage to nearby robots within 12 m |
| Field extender | Rare | 3 | +5 m to Arc relay, Reactor cascade and Shockstep. Offered after owning one of these |
| Shockstep | Rare | 3 | Dash activation deals 72 damage within 10 m |
| Emergency cell | Common | 3 | +25 maximum HP and immediately heal 25 |
| Impact weave | Common | 3 | Reduce incoming damage by 12% |
| Field medic | Common | 3 | Recover 5 HP per ordinary enemy defeated |
| Quiet current | Common | 3 | Recover 2 HP/s after five seconds without damage |
| Phase buffer | Epic | 1 | Block a hit, then recharge for 18 s |
| Dash recycler | Common | 3 | Dash cooldown recovers 30% faster |
| Afterimage | Rare | 2 | Finishing a dash protects the hero for 0.8 s |
| Bounty chip | Common | 3 | +3 credits per ordinary kill |
| Combat telemetry | Common | 3 | +25% XP per ordinary kill |
| Plasma cutter · Volt | Rare | 3 | +55% welding beam damage |
| Kinetic dynamo · Volt | Rare | 1 | Earn charge during lightning dash at 130% of the normal travel rate |
| Storm lens · Volt | Epic | 3 | +40% Sky Strike and Critical Mass damage |
| Air step · Kage | Rare | 1 | Gain a second midair jump |
| Crosscut reserve · Kage | Epic | 1 | A gold Crosscut backstab banks a dash |
| Honed edge · Kage | Rare | 3 | +40% slash, dash strike and arrival-strike damage |

For example, Shockstep can finish a damaged Bruiser and trigger Reactor cascade. Field extender widens both effects. Chain effects respect building cover, target ordinary enemies and credit each defeat once. The game renders expanding rings at the field radius and a tracer to the secondary arc target. Short-lived impact rings grow with the equipped build, with a fixed effect pool and throttled hit feedback.

## Implementation and verification

The mode reuses the Mission 1 district, hero briefing and controls, mission enemy pools, UnitDamage, Siege Walker arsenal, and the Bastion transport and combat adapter. The stage director and combat integration live in `dist/city-liberation.js`. The upgrade catalog, conditions, ranks, rarity weights and currency rules live in `dist/liberation-build.js`. The HUD and draft live in `dist/liberation-ui.js`. Balancing constants use simulation seconds.

Run `node QA/city-liberation-test.mjs` in the checkout with the private Bruiser runtime mesh. The test exercises real Bruiser and drone actors, Cannon physics, Walker weapon damage, upgrade conditions, draft eligibility, economy, both stage transitions and replay. A scripted five-minute pacing probe kills one ordinary enemy every eight seconds and defeats the Walker 50 seconds after it appears. It reached the first draft at 17 s and level 9 with nine upgrade picks by five minutes. This measures progression under a fixed kill rate. A human playthrough and on-device frame timing remain pending.

The slice contains two heroes and two stages on one map. Runs restart from hero selection. Mid-run saving, additional districts and additional hero upgrade pools remain outside the slice. Prioritize desktop and touch playtests of first-upgrade timing, boss pressure, and the readability of stacked arc and blast effects before expanding the pool.

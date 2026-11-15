# Volt Rush — Sky Strike and Ball Lightning

While controlling Volt Rush, **Z** calls Sky Strike at the aimed ground point and **V** launches Ball Lightning in the current aim direction. Matching touch buttons are in the new storm panel. Z marks ground immediately; V gathers Ball Lightning for one second before release. Neither delay limits player movement. Existing primary weapons, RMB Critical Mass, X cancel, E rescue dash, Q stun and R welding beam retain their bindings.

## Sky Strike

Aim at open ground and tap Z. A pulsing blue-white circle locks the impact point, and the HUD counts down **3 seconds**. A large descending lightning bolt and expanding impact arrive at that fixed point. The cast does not follow moving enemies. It damages robots in a **7 m** sphere with **320 base damage**, falling to 35% toward the edge. Cover, shields, body armor and existing boss-part rules remain authoritative; each robot gets at most one part hit. It does not hurt allies/civilians or damage buildings.

The ground query combines the existing flat city plane and terrain-height query. When aiming above the horizon it falls back to open ground 25 m ahead. Invalid/covered/off-map ground is rejected without consuming the cooldown. Initial cooldown is **8 seconds**, measured from marking the target. There is no additional run-energy cost.

## Ball Lightning

V spends **two-thirds of the full energy bar** (66.6667 of the current 100 capacity). It requires that amount, rather than taking a fraction of a nearly empty bar. A **2.5 m radius** electrical sphere launches ahead of the actual right hand and travels at **8 m/s**. It stops/parks at buildings and map boundaries, retaining its automatic attack and recharge behavior.

It starts with **100 orb energy** and has a floating, camera-facing energy bar plus a HUD readout. Every **0.45 seconds** it attacks up to **3** nearby robots within **32 m**, respecting building cover and the first armor/shield surface. Each zap costs **6 orb energy** and deals **65 base damage**. A passive drain of **1 energy/sec** prevents unattended orbs lingering forever. At zero energy it disperses. There is no forced lifetime while energy is maintained.

Shoot the orb to refill it: **0.5 orb energy per raw attack-damage point**, capped at 100. The original beam, Lightning Bolt, Rapid Sparks, Electric Needle, Lightning Sweep and R welding beam all recharge it; nearby successful Critical Mass bursts and Sky Strikes can also feed it. The orb flashes white when struck. Shooting it still pays the original weapon's normal energy cost and stops that shot/beam on the orb, trading direct enemy damage for sustained orb output. Needle does not receive its enemy weak-point multiplier against the friendly orb.

Only one orb exists at a time. After the **16 s ultimate cooldown**, V may replace a surviving orb for the full energy cost, allowing repositioning. The cooldown runs from launch. Blocked/underfunded/cooldown launches consume no energy. Orb zaps never recharge themselves, and enemy/CPU/allied-hero shots do not collide with or refill it. This keeps existing combat traces and enemy targeting unchanged. Recharge support is specifically for the player's Volt attacks.

## Configuration and implementation

`VOLT_STORM` in `dist/runner-storm.js` centralizes tuning:

| Setting | Default |
|---|---:|
| strikeDelay / strikeCooldown | 3 / 8 seconds |
| strikeDamage / strikeRadius / strikeEdge | 320 / 7 m / 0.35 |
| strikeRange | 100 m aim ray |
| ultimateCost / ultimateCooldown | RUNNER_ENERGY.capacity × 2/3 / 16 seconds |
| orbRadius / orbSpeed / orbEnergy | 2.5 m / 8 m/s / 100 |
| orbLife | 0: optional hard lifetime disabled |
| orbDrain | 1 energy/sec |
| zapRange / zapInterval | 32 m / 0.45 seconds |
| zapCost / zapDamage / zapTargets | 6 / 65 / 3 |
| rechargeFactor | 0.5 |

Damage uses existing rotated hit shapes, `damageRobotHit`, `UnitDamage.hurt` and boss `modifyDamage`/`applyHit`, with no extra damage system or new weak points. Recharge collision is opt-in for player Volt traces and uses swept sphere intersection, so fast projectiles can hit the slow orb. Whip gets a stable friendly-orb contact key to avoid charging it repeatedly within one swing. Sweep uses its existing arc/range/cover checks.

Already-committed strikes and orbs continue when the player releases control or is briefly stunned; CPU Volt does not cast new ones. Pausing freezes their simulation. Disabling the hero, resetting or changing scenes clears them and their effects. Neither ability changes locomotion or consumes charge just for moving.

`RunnerStormFX` uses one orb, halo/wire shell, a two-plane world bar, warning ring, impact sphere and a fixed **256-segment** lightning pool. Events are capped at 32; no additional lights, external assets or dependencies are introduced. The dedicated HUD panel keeps touch controls clear.

## Verification

- `QA/runner-storm-test.mjs`: exact delayed impact at 30/60/120 Hz; no duplicate strikes; cooldowns; exact 2/3 cost; slow movement; auto-zaps, energy drain/depletion, cover/parking, recharge collision, insufficient-energy rejection, replacement and reset.
- `QA/runner-storm-browser.cjs`: real Z/V inputs, warning and delayed damage to nearby enemies, distant target exclusion, floating energy bar, all five primary weapon recharges plus welding beam and Critical Mass, owned-only trace routing, one-orb cap, pause and reset, rendering without JavaScript/shader errors.
- `QA/runner-storm-touch-browser.cjs`: real touch buttons, timed strike, exact cost, world bar, readable HUD and cleanup.
- Existing basic-attack, Critical Mass, welding beam and City Battle rescue-dash checks remain the regression suite.

Known prototype limits: the orb parks when blocked rather than navigating around buildings; it does not redirect through portals or intercept missiles. Z targets ground, not roof surfaces. Physical phone FPS and thermal behavior are unmeasured.

Files: added `dist/runner-storm.js`, `dist/runner-storm-fx.js`, three storm QA scripts and this document. Updated `dist/speedster.js`, `dist/battle.js`, `dist/runner-basic-attacks.js`, `dist/runner-whip.js`, `dist/index.html`, `dist/battle.css` and `dist/game-entry.js`.

## Revision 264 — Sky Strike visual pass

Sky Strike now has a fixed outer radius marker, contracting inner warning rings, a bright gathering charge and orbiting electrical filaments. In the last 0.39 seconds, a thin descending leader warns of the incoming bolt. Impact creates a thick white core with blue glow and four branching bolts, a shallow expanding flash, three ground shock rings, radial electrical crawling and ballistic sparks. A synthesized filtered thunder crack replaces the original short strike beep and respects Volt's sound preference. The afterglow fades over 1.5 seconds, independently of the damage event's original 0.65-second lifetime.

`dist/sky-strike-fx.js` owns the rendering and sound. `SKY_STRIKE_ART` exposes the 1.5s visual lifetime, 65m bolt height, 320 pooled line segments and 64 pooled sparks. No new lights, textures, dependencies, post-processing or damage events are added. Ball Lightning rendering and energy behavior remain unchanged. Reset clears the local visual tails, and simulation pause freezes their age. The fixed outer warning ring now accurately marks the existing seven-metre radius instead of changing size during its pulse.

Validation: existing storm unit tests retain the exact three-second strike and all damage/energy behavior; desktop and emulated-touch gameplay checks pass. The desktop check also captures impact and afterglow frames, checks pool limits, verifies the tail survives expiry of the original strike event, and confirms it clears completely. Physical phone performance is unmeasured.

## Revision 265 — larger Ball Lightning and launch wind-up

Ball Lightning now has a 2.5m collision radius (5m diameter), twice its original size, and a 32m automatic targeting range, twice the original. The user clarified that the requested timing change is a launch wind-up, not slower zaps. Because the previous launch was instantaneous, a new configurable **`orbCastSeconds: 1`** supplies a one-second gathering animation; zap cadence remains 0.45s. V/touch reserves the existing 66.7 charge at cast start and releases from the current hand/aim after wind-up. Movement stays available. Cancellation, hero switching, reset or Critical Mass overload clears the cast and refunds its reservation; obstruction at release refunds it without consuming cooldown or replacing an existing orb. Pause freezes the timer. Cooldown begins on successful launch.

Graphics add an animated additive plasma sphere with flowing ribbons and a bright rim, three rotating energy rings, 36 pooled orbiting spark streaks, stronger internal lightning and brighter pooled zap impact flashes. A larger world energy bar remains visible above the released orb; the casting effect grows in front of the hands and the HUD shows the countdown. Effects use fixed geometry, no extra lights or textures, and preserve the existing 256 line-segment cap. Sky Strike graphics and damage are preserved.

Storm unit tests verify doubled radius/range, the one-second launch boundary, unchanged zap cadence and cancellation/blocked refunds. Desktop and emulated-touch gameplay tests verify real V/button casting, plasma/rings/spark activation, energy cost, automatic attacks, all original recharge attacks, pause/reset, and error-free shader rendering. Physical phone performance is unmeasured.

## Revision 268 — orb travel speed

Doubled `orbSpeed` from 4 to 8 m/s. Casting, damage, targeting range, energy and recharge behavior are unchanged. The storm movement/cover/parking and casting tests pass with the new speed.

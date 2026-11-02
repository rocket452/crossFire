# Violet Defender — charged ultimate overload

Only confirmed barrier absorption charges the ultimate and its overload risk. The first 1,200 damage fills the existing beam bank. Additional absorbed damage then accumulates toward a separate 600-damage overload threshold. A hit that crosses full charge contributes only its excess to overload. Holding a ready beam without further damage has no timer, automatic overload or passive drain.

Below the threshold, starting the ultimate consumes its stored charge and clears overload buildup. Its existing two-second charge, four-second stationary beam and 420 DPS are retained. There is no shield during that cast, so no additional absorption/overload can occur there.

At the overload threshold the triggering hit is absorbed normally, then the shield collapses, the stored ultimate is lost and a two-second recovery starts. During recovery the hero cannot redeploy the shield, recharge or cast the beam, or fire normal attacks. Flight continues using the existing movement. Shield durability recharges through its normal 250-per-second behavior; after recovery the hero can defend and build ultimate energy again. The overload burst is visual only and does not hurt civilians or allies.

The barrier flickers warm pink/red as excess damage accumulates, its impact shake intensifies, and the existing readout shows `FORCE BEAM READY · OVERLOAD …%`. At 50% risk the readout pulses (disabled for reduced-motion preferences). A ring/wireframe energy discharge, sparks, one event message and recovery countdown identify an overload. Effects use two reusable meshes and the existing bounded particle pool.

Tuning is centralized in `dist/hero-powers.js`:

- `VIOLET_BEAM.required`: 1,200 absorbed damage to become ready.
- `VIOLET_OVERLOAD.extraDamage`: 600 further damage to overload.
- `VIOLET_OVERLOAD.recoverySeconds`: 2 seconds.
- `VIOLET_OVERLOAD.burstSeconds`: 0.65 seconds of discharge visuals.

`BarrierCapacitor` owns excess damage, ready/overloaded states, recovery and counts. `violet-hero.js` connects real barrier damage, collapse, firing lockout and presentation. `battle.js` updates the existing HUD; no new popup or hero ability is introduced. Reset and hero deselection clear risk, recovery, counters and effects.

Verification:

- `QA/violet-overload-test.mjs`: charge threshold, excess-only accounting, oversized hits, exact trip, duplicate protection, invalid damage, indefinite ready state, spending before overload, casting exclusion, frame-rate-independent recovery, real hero barrier callbacks/collapse/effects and reset.
- `QA/violet-overload-browser.cjs`: desktop and touch viewports, actual BeamCombat shield collision/absorption, 50% warning/HUD, overload discharge/charge loss/barrier removal, recovery, spending before overload and city rebuild reset, with render-error checks and screenshots.
- Existing hero-powers, Violet inertia and beam-charge node tests pass. The desktop/touch beam-charge browser regression retains the full 1,680-damage ultimate and its cancellation paths.

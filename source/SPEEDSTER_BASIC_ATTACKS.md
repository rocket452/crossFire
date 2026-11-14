# Experimental speedster basic attacks

Use **1–4** while controlling Volt Rush, or the **BASIC ATTACK** dropdown on desktop/touch. **0** returns to the original sustained Lightning Beam, which remains the default. Hold **LMB**, the existing **F** alias, or touch **FIRE** for the selected basic attack. Only the selected weapon emits new shots. A projectile already in flight keeps its original weapon/damage and can finish after switching; switching preserves the existing shot cooldown, preventing instant-fire switch spam. The choice survives a city rebuild in the current session. CPU Volt continues using the original beam.

Critical Mass remains on **RMB / HOLD MASS**, with **X** cancel. Its module, tuning, charging, release, overload and self-stun behavior are unchanged. E rescue dash, Q stun, R whip, jumping, climbing, mouse look and movement retain their existing controls. No experimental attack changes movement speed or moves the player toward enemies. The four experiments never call the existing beam's aim assistance.

## Tuning

`BASIC_ATTACKS` in `dist/runner-basic-attacks.js`:

| Key | Weapon | Rate / sec | Speed m/s | Range m | Base damage | Spread | Collision radius m | Energy / shot |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | Lightning Bolt | 4 | 100 | 80 | 37.5 | 0° | 0.065 | 4.375 |
| 2 | Rapid Sparks | 15 | 110 | 60 | 10 | 3° cone half-angle | 0.035 | 17.5 / 15 |
| 3 | Lightning Sweep | 2.5 | Instant | 6 | 60 per enemy | 120° horizontal arc | — | 7 |
| 4 | Electric Needle | 3 | 180 | 100 | 35 | 0° | 0.025 | 17.5 / 3 |

The existing beam's **150 damage/sec** and **17.5 charge/sec** are the baseline. Bolt and Sparks deliver 150 base DPS if every shot lands. Sweep delivers 150 per enemy when held, with a **3 m vertical tolerance**. Needle delivers 105 base DPS, or 262.5 on recognized weak points before existing vulnerability multipliers. Energy costs target the same 17.5 charge/sec average when firing continuously, using the unchanged run-to-charge resource. There is no reload, new stamina cost or movement tax. Early releases of FIRE stop new firing; existing projectiles continue normally.

`BASIC_LIMITS` caps live projectiles at **128**, transient effects at **48**, and catch-up at **32 shots per simulation update**. Normal cadence is frame-rate independent, including 30/60/120 FPS and 75 ms steps; extremely long stalls are deliberately bounded.

## Collision, damage and weak points

Projectiles keep the direction sampled at launch, with no gravity, homing or off-axis assistance. Camera reticle aim uses the existing ray query; shots originate from the actual weighted right hand. Muzzle positions interpolate across the current movement step for consistent rapid fire at speed. Swept segment tests use current/previous enemy hit shapes, preventing high-speed tunneling. Shots stop at the first enemy, building, terrain or supported hostile projectile, or expire at maximum range.

Sweep projects the player's current aim onto the horizontal plane. It queries existing rotated enemy hit shapes within its range/arc/tolerance, then checks the target's own armor/shield and building cover. It damages each enemy once per swing, can hit several enemies, and does not lunge or cancel the rescue dash. No extra knockback mechanic was added.

All four use the existing `damageRobotHit`, `UnitDamage.hurt`, boss `applyHit`/`modifyDamage`, building impact, missile and enemy flash/armor systems. Physical shields remain authoritative. For example, Aegis retains its existing **90% damage reduction** and blue shield feedback; Needle gets no shield bonus.

Needle's **2.5×** multiplier applies only to a part actually hit and recognized by `recognizedElectricWeakPoint`:

- A surviving Siege Walker weapon mount.
- A surviving ARGUS joint, or its core while open.
- A surviving Bastion arm weak point, or its back reactor.
- Breaker's capacitor during its exposed charging phase.
- Existing Bruiser/Mireguard head hit shapes.

Existing vulnerability multipliers still apply afterward, including Bruiser's 2× headshot modifier. A 35-damage Needle therefore deals 87.5 raw damage to a Walker mount and 175 to an unarmored Bruiser head. Normal hull, closed/inactive weak points, destroyed parts, shields and ordinary geometry receive no Needle bonus. No new weak points or automatic boss stuns were introduced. Each boss hit follows its original part and stun/interrupt rules. Sweep applies one hit to the nearest intersected boss surface, rather than hitting every mount at once.

## Presentation and cleanup

`RunnerBasicFX` draws compact bolt/needle streaks, small short-lived Spark trails, a bright curved Sweep, muzzle flashes, impact sparks and stronger precise weak-point impacts. Short synthesized firing sounds use the existing audio context and sound preference. Effects use **at most three added draw calls**, fixed pools, cached colors and no additional lights. Large legacy beam hit effects are reserved for the original attacks.

The HUD names the active attack, shows selection keys and per-shot energy, and retains the original beam option. Phone meters and selector sit clear of the movement/ability buttons. Level reset or disabling the hero clears shots, counters and effects; losing input capture stops new fire; already-launched shots advance normally while paused simulation stays frozen or while the hero is stunned. Selection cannot bypass self-stun or attack cooldowns.

## Verification

- `QA/runner-basic-attacks-test.mjs`: 30/60/120 FPS and 75 ms cadence; exclusive selection; first collision, range expiry and no homing; once-per-enemy Sweep, groups, arc, cover and shields; Needle legitimacy and 2.5× bonus; bounded pools and switch cooldown.
- `QA/runner-basic-attacks-browser.cjs`: real number keys/LMB; each weapon against stationary and moving robots and groups; current Aegis shields; maximum-speed movement comparison; real headshot bonus; original beam; Critical Mass charging across switching and unchanged overload/recovery; no JavaScript/shader errors.
- `QA/runner-basic-walker-browser.cjs`: all four against the real Walker's mounts and armored hull; actual Needle mount damage 87.5; one mount per Sweep; no hull/false weak-point damage.
- `QA/runner-basic-touch-browser.cjs`: dropdown and held FIRE on touch, live hits with all four, effects cap, no overlapping HUD cards, original beam and reset.
- Existing Critical Mass desktop/touch and City Battle rescue-wave browser tests, plus beam/dash component tests, remain the regression checks.

Prototype limits: original beam is still the default; the experiments are player-selected, not new CPU combat behaviors. A quick Spark tap can emit two shots through the existing 0.08 s primary tap buffer. Physical phone FPS/thermal performance and subjective audio balance are unmeasured; touch emulation and effect budgets are verified. No new dependencies, art assets, movement mechanics or hosting identity were introduced.

## Files

Added `dist/runner-basic-attacks.js`, `dist/runner-basic-fx.js`, the four `QA/runner-basic-*` scripts and this document. Updated `dist/speedster.js`, `dist/battle.js`, `dist/index.html`, `dist/battle.css`, and `dist/game-entry.js`.

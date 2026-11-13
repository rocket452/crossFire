# Critical Mass — Volt Rush

Critical Mass is a player ability in the existing speedster controller. Hold **RMB** to charge, release to burst. **X** cancels. Desktop mouse look/pointer lock, LMB/F lightning, E rescue dash, Q robot overload and R whip retain their existing bindings. Touch uses the new **HOLD MASS** button; pointer cancellation safely discards the charge. Keyboard users can hold Space/Enter on that button. It uses its own cooldown, consumes no running charge and changes no movement speed, jumping, turning, climbing or aerial control while charging.

## Tuning

`CRITICAL_MASS` in `dist/critical-mass.js` is the central configuration:

| Setting | Default | Meaning |
|---|---:|---|
| maxCharge | 2.6 s | Normalized charge/damage scale and HUD maximum |
| minCharge | 0.3 s | Earliest damaging release; earlier releases fizzle |
| powerful | 1.8 s | Powerful effects and attack interruption begin |
| critical | 2.2 s | Violet-white unstable charge/warning and stronger stagger |
| overload | 2.6 s | Automatic backlash; offensive blast is canceled |
| radius | 4 m | 3D blast radius, tested against existing part shapes |
| selfStun | 1 s | Brief control lock after overload |
| cooldown | 3 s | Cooldown after a damaging release |
| overloadCooldown | 4 s | Cooldown from overload time, including the 1 s stun |
| cancelCooldown | 0.35 s | Recovery after X/capture loss/too-early release |
| minDamage | 60 | Base damage at minimum effective charge |
| maxDamage | 360 | Base damage approached just before overload |
| damageExponent | 1.35 | Charge-to-damage curve |
| edgeMultiplier | 0.25 | Falloff multiplier at the outer edge |
| powerfulStagger | 0.8 s | Ordinary robot stun/interruption on powerful release |
| criticalStagger | 1.2 s | Ordinary robot stun/interruption on critical release |
| bossStagger | 0.5 s | Powerful boss interruption |
| criticalBossStagger | 0.75 s | Critical boss interruption |

Damage is `60 + 300 × t^1.35`, where `t = clamp((charge - 0.3) / 2.3, 0, 1)`. Multiply by `1 - 0.75 × distance / 4` using distance to the closest point on the selected collider. Existing armor, shield, head/part and weak-point rules then apply. A release below 0.3 s does no damage and uses the short cancellation recovery; a release at 2.6 s is already too late.

## Combat integration

`massContacts` selects the nearest existing rotated box per living robot; each enemy receives at most one hit per burst. It does not snap the player toward enemies or select favorable weak points. Friendly units/civilians, out-of-range units and targets behind buildings are excluded. `criticalMassBurst` in `battle.js` calls the established `damageRobotHit`/`UnitDamage.hurt` routes, including Bastion's part routing. No building damage or enemy-projectile destruction is added.

The Walker's hull remains armored. To hurt a mount, approach that mount closely enough for it to be the blast's first/nearest body part. A single burst never hits several Walker mounts or ARGUS joints. Boss vulnerabilities and multipliers stay authoritative. Powerful hits that actually damage a surviving enemy use its existing stun/interrupt method; Walker interruption also cancels charging arsenal/eye attacks. Airborne ordnance already launched follows existing behavior. Early releases retain each enemy's normal hit/flash/flinch feedback, including Mireguard's existing flinch.

## Presentation and lifecycle

Charging shows arcs around the actual weighted hands, a growing energy sphere/halo, a gathering arm pose that preserves running legs, pulsing blue-white energy and increasingly rapid synthesized electrical sounds. At 2.2 s the effects/HUD turn violet-white and play a warning cue. LMB may fire simultaneously; its aiming arm takes precedence over the gathering pose.

Successful release creates an expanding spherical shockwave, ring/flash, lightning to damaged enemies, existing electrical hit effects and robot sparks. Backlash uses violet energy, a descending sound, the existing hurt animation/flash, recoil pose and brief camera shake. Geometry is pooled (160 lightning segments, one sphere, halo, ring and flash); no new point lights or dependencies.

The compact HUD marks the critical threshold, shows charge, imminent overload, self-stun and remaining cooldown. Touch controls show touch-specific instructions.

Overload emits no offensive damage. The prototype has feedback-only hero damage, so backlash does not invent a health system. Movement and attacks/abilities are suppressed for 1 second; held movement resumes as soon as it ends. Charge cancellation cannot cancel an already-triggered stun. Stun/cooldown advance in simulation time, so pausing freezes their timers. Pause, settings, blur/visibility loss, mouse capture loss and touch cancellation discard charge without detonating. Character exit/deselection and level reset clear the ability, VFX and captured touch input. CPU Volt does not use this ability.

## Validation

- `QA/critical-mass-test.mjs`: 30/60/120 Hz, early/critical damage, exact overload boundary, cancellation/cooldowns, reliable self-stun recovery/reset, radius/ally filters and one part per enemy.
- `QA/critical-mass-browser.cjs`: real pointer lock/RMB hold/release, early vs critical multi-robot damage and range, cooldown, unchanged movement speed, simultaneous LMB, critical HUD/VFX rendering, overload's no-offense/control lock, recovery, X/pause/character switching/reset, and actual single-mount Walker damage.
- `QA/critical-mass-touch-browser.cjs`: actual touch hold/release, overload/recovery, cancellation, reset while holding, responsive HUD and no JavaScript errors.
- Existing runner dash/rescue, sustained beam, energy and whip tests verify their existing mechanics.

Browser touch emulation is covered; physical phone FPS/thermal behavior and subjective sound balance have not been measured. The project is single-player and gains no networking or hero health/death system from this feature.

### Recorded results

Live fixture damage to the same nearby Bruiser was **54.65** on a 0.4 s release and **276.28** on a 2.4 s release, after distance falloff. The outside-range robot took **0**. Only **one** Walker weapon changed health in the adjacent-mount test. Charging and uncharged movement matched within 0.001 in the live input comparison. Overload suppressed movement/attacks through 0.9 s and control resumed at 1.01 s. Desktop and touch both passed the new Critical Mass suites.

`QA/critical-mass-rescue-regression.cjs` reuses the established City Battle rescue-wave browser assertions for desktop and touch. Existing dash/beam/energy/whip component tests pass. Two legacy complete browser scripts remain stale: `sustained-lightning-browser.cjs` assumes a resume click fires instead of capturing the mouse (and still expects the old 25/s drain); `runner-wave-browser.cjs` assumes civilians exist before the current 15 s initial spawn delay. Their failures were reproduced with the unmodified speedster from the pre-feature commit. Their old assumptions are not used to change current gameplay, and no full pass of those two legacy scripts is claimed.

### Files

- `dist/critical-mass.js`: configurable ability lifecycle, damage curve and nearest-part contact query.
- `dist/critical-mass-fx.js`: pooled charging/burst/backlash geometry and synthesized audio cues.
- `dist/speedster.js`: RMB/X/touch inputs, no-slow charge pose, temporary self-stun, lifecycle cleanup, diagnostics and HUD updates.
- `dist/battle.js`: existing damage/part routing and enemy interrupts.
- `dist/index.html`, `dist/battle.css`, `dist/game-entry.js`: compact HUD, touch button, binding reminders and entry cache versions.
- Four `QA/critical-mass-*` scripts and this document.

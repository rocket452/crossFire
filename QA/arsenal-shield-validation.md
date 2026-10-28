# Alternating robot arsenal, raised/flashing pod, forward shield and damage shake

- Live weapons share RobotArsenal: beam charge/fire → 2 s warning → six missiles → wait for airborne missiles to clear → 1.2 s recovery → next beam. Pod autonomous timer is disabled in the scene; beam startup and missile launches both have interlocks.
- Pod rest pitch is -π/4 on local X (45° upward relative to the torso). All six muzzle positions and launch directions follow the rotated geometry. Warning flashes use existing material emissive intensity 0.1/4.2; no additional draw calls.
- Shield forward offset is exactly 1.7 × 1.3 = 2.21 m from the existing chest reference. Damage adds bounded tangent shake and angular jolts with exponential decay. Actual collision uses the moved center and rotated normal of the visible shield. Reset clears shake/warnings/sequence.

Validation:

- `robot-arsenal-test.mjs`: BeamCycle + real RobotMissiles simulation at 30/60/120 Hz and 75 ms steps; strict alternation, warning duration/pulses, no beam/launch or beam/airborne overlap, death cancellation and reset. Exact 30% offset and bounded decaying shake tested separately.
- `arsenal-shield-browser.cjs`: desktop 1100×1000 and touch layout 390×844. Runs 38 s of the actual battle and records two complete beam/pod pairs, twelve launch directions aligned with real tubes, zero overlapping frames, warning bright/dim samples before launch, actual damage shake, physical/rendered plane agreement, exact forward offset, missile interceptions, pause/reset and death during warning.
- Desktop measured: twelve missiles intercepted; zero overlap or incorrect launch axes; shake tangent displacement sum reaches 0.365 m; maximum plane error 3.4e-16 and offset error 3.6e-15. Warning has both bright and dim frames.
- Existing actual-asset hero/barrier, missile damage/physics, energy beam and Violet inertia/attack-lockout module checks pass.
- Screenshots: `/tmp/pod-warning.png`, `/tmp/pod-warning-phone.png`, `/tmp/shield-impact-shake.png`, `/tmp/shield-impact-shake-phone.png`.

Browser QA uses software WebGL. No physical-phone FPS or thermal claim.

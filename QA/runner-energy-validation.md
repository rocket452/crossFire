# Volt Rush running energy — revision 40

Added a shared player/CPU 0–100 static-charge meter. Actual distance while actively running on ground/roofs or walls earns 100/(46×6) charge per metre: about six seconds of unobstructed full-speed running fills it. No idle drain. Standing/pushing, air time/falling, rescue-dash travel and implausible per-frame displacement do not earn energy. The meter starts empty on rebuild/roster reset, and survives control handoff or input cancellation.

Each lightning attack requires 25 charge to begin its existing 0.5s wind-up. Payment occurs when firing starts; canceling before release is free. Once paid, the existing 0.4s burst / 1.5s cooldown and damage tick rules remain. Holding or tapping FIRE cannot overdraw, bypass the empty gate or reset cooldown. A full meter pays for four bursts. BOOST, normal movement, jumping, wall running and rescue DASH stay free.

The player HUD shows charge, four 25-point segments, cost/readiness and a run-to-charge hint. Empty FIRE remains holdable so moving can earn enough to start an attack. Reaching 25 flashes the meter and plays a short ready ping when hero sounds are enabled. Stored charge adds body electricity using the existing bounded arc/light effects. No extra VFX meshes/lights or character assets. The CPU returns to movement instead of holding an unaffordable shot/rooftop attack; missile interception uses the same resource rules.

Validation:

- `runner-energy-test.mjs`: PASS 30/60/120Hz, exact six-second full-speed fill, empty lock, four paid attacks / 1.6s total beam, canceled wind-up, wall earning, no idle drain or fall/dash/teleport farming, reset and large-frame overdraw protection.
- `runner-energy-browser.cjs`: PASS desktop and portrait touch: real movement fills meter; no attack at zero; four paid beams damage the actual robot; canceled wind-up is free; jump/dash at zero; wall charge; handoff/reset; mobile FIRE gating and per-instance VFX rendering. A fresh 45s CPU fixture earned 215.22 and spent 200 on eight attacks, dealing 396 real damage. Both device profiles matched. Meter screenshots visually reviewed.
- `runner-left-controls-browser.cjs`: PASS 390×844, 320×740, fullscreen 844×390 and desktop. Left controls remain usable together; no overlap, clipping or overflow.
- Camera-follow and settings/aim-assist/real plasma rescue browser regressions pass. These isolated aiming/control fixtures explicitly start funded.
- Charge/cooldown browser fixtures now explicitly start funded. Cadence still enforces 1.5s recovery; missile interception uses a real missile fixture rather than assuming the rotating pod has launched within 20s.
- Existing charge/arc, movement animation/CPU and rescue dash unit suites pass. No browser/shader errors in the new resource suite.

Software touch/browser tests do not establish physical phone FPS, thermal performance or subjective feel.

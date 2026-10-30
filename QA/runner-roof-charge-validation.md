# Rooftop charge drain — revision 51

Reproduced an unintended attack during a boosted climb: dragging the desktop camera also set mouseFire and queued a .68-second attack pulse. At the rooftop transition the ordinary lightning attack consumed 25 charge. The movement and mantle code itself never spends charge. In the reproduction, movement alone raised charge from 60 to 68.317; the camera-drag case ended at 44.436 after one unintended 25-charge shot.

Canvas input now distinguishes look drags (>6px) from deliberate primary clicks and stationary holds. A drag cancels mouse firing and cannot queue a release attack. Short clicks fire on release; a stationary hold opts into firing after a .15-second gesture window. F and the mobile FIRE button retain their existing charge timing. Pointer cancel, capture loss, blur and control handoff do not queue a click.

Validation:

- `QA/runner-roof-charge-browser.cjs` failed before the fix with 25 unintended charge spent. After the fix it passes on desktop and a 390px touch viewport, climbing the actual city building and counting a real mantle. With camera dragging it finishes at 69.412 charge with zero spent; release also spends zero. Deliberate click, stationary hold, F and touch FIRE still consume 25. Touch look remains free.
- Existing runner energy and left-control browser regressions cover energy earning/spending, CPU recharge, wall gain, keyboard/touch inputs, simultaneous movement/fire, cancellation and layouts.
- Energy, charge cadence and movement unit tests pass, including boosted wall-to-roof transition. Browser tests use software Chromium; physical mobile performance has not been measured.

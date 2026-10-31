# Light lightning aim assistance — revision 70

The prior assistance was restricted to touch input. The existing checkbox now enables a modest correction on desktop and touch. Acquisition limits are 2.5° for robot armor, 3° for missiles, and 110 m range. Rotated armor bounds provide a point near the reticle just inside the silhouette; aiming does not jump to the center of a large robot. Line-of-sight and target identity must match. Direct robot/missile/weak-point hits bypass assistance, and weak-point hits are rejected as automatic armor targets. Neither camera nor player movement is changed. The existing small assistance marker and persisted checkbox are reused; the checkbox is relabeled Beam aim assistance.

Passed:

- `node QA/runner-assist-rescue-test.mjs`: small-cone/range/live-hostile/cover checks, large and rotated armor near-misses, no weak-point acquisition, no out-of-cone sticky lock, original direction preserved, and existing real-impact rescue safeguards.
- `node QA/lightning-aim-browser.cjs`: actual desktop 1100×1000 and touch 390×844 inputs, weighted hero muzzle, real tracked drone hitboxes, ordinary damage routing and a real spawned missile. A calibrated near-miss at a 2.6 m offset deals zero damage unassisted, then 5 damage in two 60 Hz frames with ~1.99° correction when enabled. Six small target movements continue dealing damage. Camera yaw/pitch stay unchanged and energy drains at the normal 25/s rate.
- Same suite: direct hits retain manual aiming, large target displacement exits the cone, real building collision blocks damage/assistance, a live missile is acquired within 3° and actually intercepted, and the settings toggle disables assistance and persists after reload. Both desktop and phone pass.
- `node QA/sustained-lightning-browser.cjs`: desktop/phone zero-cooldown sustained firing/recharge restart, exact damage/energy, proportional partial reserve/taps, 14 m/s run and 46 m/s boost, weighted movement and manual aiming, dash/blur, frame-rate-independent building damage.
- `node QA/weak-points-browser.cjs`: desktop/phone manual core shots still receive no aim assistance; 1.2 seconds of held lightning destroys a moving core without main-health double damage. Final-core protection, all heavy-weapon interrupts, five-second stagger, regeneration, repeated cycles, death/reset and HUD pass.
- JavaScript syntax and Git whitespace checks pass. No browser runtime/shader errors or horizontal overflow. Physical device performance was not measured.

Screenshots reviewed at `/tmp/light-aim70-desktop.png` and `/tmp/light-aim70-phone.png`. The beam correction/marker is visible near the reticle, with the hero HUD and minimap intact.

Runtime: `dist/runner-aim.js`, `dist/speedster.js`, `dist/battle.js` (armor candidate bounds/cache), `dist/index.html` (setting/help/cache). QA: updated `runner-assist-rescue-test.mjs`, new `lightning-aim-browser.cjs`, this report. Documentation: `source/CONTROLS.md`. No new dependency, aimable weak points, camera steering, weapon cooldown or damage multiplier was added.

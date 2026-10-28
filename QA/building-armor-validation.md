# Source-specific building armor — validation

- `node QA/building-armor-test.mjs`: exact 90% reduction for unknown/default,
  tank, helicopter, infantry and all hero sources across walls/slabs/columns;
  direct, splash and dynamic-debris damage; direct health API; no double
  scaling or bypass through player/beam priority; scorch/reset; full robot
  damage still triggers real support loss.
- Existing section durability/scorch, reserved player debris, energy beam and
  city physics suites passed with source-aware expectations. Three ordinary
  player missiles are now needed to break a fresh 5.2 HP wall (1.8 damage each).
- `node QA/building-damage-browser.cjs`: actual full scene passed at 1100×1000
  desktop and 390×844 touch layouts. Measured direct health loss for eleven
  source paths: shell 2.3, player missile 1.8, AI helicopter missile 1.8,
  player electricity 1.2, CPU electricity 1.2, Violet orb 2.6, rifle 0.035,
  Rift bolt 0.2, robot beam 35, robot missile 18, robot plasma 32.
- Browser measurements use a QA-only high-health panel to measure full damage
  without overkill clamping. Production wall/slab/column health remains
  5.2/7.8/13. Test helpers exist only in intercepted browser responses.
- Confirmed electricity still deals 15 damage to the robot over 0.1 seconds,
  and that scorch updates the existing GPU instance tint with no extra draws.
  Reset restored normal panel health/appearance. No page/layout errors.
- Screenshots: `/tmp/armored-building-clean.png`,
  `/tmp/armored-building-scorched.png` and corresponding `-phone` images.
- Incorporated existing GitHub commit `4820588` (Rift Warden self-teleport portals
  now 1.5 seconds; attack/rescue portals remain five seconds) before this work.

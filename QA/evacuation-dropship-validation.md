# Evacuation dropship reinforcement — revision 226

Passed:

- `node QA/evacuation-dropship-test.mjs`: idle until death; fixed captured ground position; inactive cargo; reset during approach, hover and drop; exactly one activation; departure; no automatic second drop; rebuild/replay.
- `node QA/evacuation-dropship-browser.cjs`: desktop Chromium and 430×932 touch emulation, actual four Walker weapon kills, full combat loop updates, cargo/landing screenshots, Bastion HUD activation at full 6000 HP, civilian group spawning during transition, carrier exit, Bastion defeat without mission reset, repeat after city rebuild, no browser errors.
- `node QA/walker-defeat-condition-test.mjs`: all four final-weapon orders, hull immunity, one death, eighteen wrecks and reset.
- `node QA/bastion-permanent-weakpoints-test.mjs`: articulated arm/back targets, damage routing, arm destruction and reset.
- `node QA/bastion-permanent-weakpoints-browser.cjs`: existing combat arena unchanged on desktop/touch; real electric hits in every phase, detached weapons/colliders, health reset.
- `node QA/evacuation-helicopter-strike-test.mjs`: missile-only helicopter strikes, warning, weapon rotation, overlap/startup/stun/death/reset.
- `node QA/evac-raider-waves-test.mjs`: all four original three-Bruiser edge waves and 20s staggering, movement, targeting, reset.
- Syntax checks and `git diff --check`.

Visual inspection: carrier visible above city with Bastion suspended beneath its open belly; post-drop Bastion grounded at the captured Walker origin, carrier departing overhead, updated boss bar and evacuation HUD visible. Screenshots saved outside Git in `/tmp/dropship-approach-{false,true}.png` and `/tmp/dropship-landed-{false,true}.png`.

Browser touch emulation is not a physical phone performance test. The transport has no combat health/collision; arrival does not replace civilian or Bruiser timing. Tests accelerate simulation in discrete updates; shipped timing follows normal simulation time.

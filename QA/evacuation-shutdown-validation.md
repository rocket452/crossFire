# Walker defeat closes evacuation — revision 231

Passed:

- `node QA/evacuation-shutdown-test.mjs`: shutdown from inbound, landing, boarding, departure, return and destroyed phases; direct spawn/inbound guards; one-time clearing; no false rescues/casualties; passengers rescued only on exit; last-flight destruction loses passengers once; other boss units retained; retired civilians cannot be brought back by carry/portal callbacks; reset restores waves.
- `node QA/evacuation-shutdown-browser.cjs`: desktop and touch layouts, actual four-weapon Walker defeat with twelve visible civilians and five passenger fixtures. Immediate crowd/unit/target removal, no spawn warning/countdown, departing Chinook, five rescues only after escape, no returns or further civilians after 100s, live Bastion and arrival cinematic retained, and rebuild restoring evacuation. No browser errors. Screenshots inspected at `/tmp/evac-shutdown231-{false,true}.png`.
- `node QA/evac-wave-stop-browser.cjs`: real defeat before/after first Bruiser wave; existing three enemies retained, later waves blocked, civilian spawning stopped, reset restores schedule.
- Existing evacuation lifecycle unit suite: ordinary pre-defeat boarding/flights/replacements/loss accounting unchanged.
- Bruiser wave, helicopter missile-strike and dropship lifecycle unit suites pass.
- Syntax and diff checks pass. Physical phone performance remains unmeasured.

Vanished ground civilians are recorded only in diagnostic `clearedCivilians`; they do not inflate the rescued or casualty HUD. A destroyed/absent transport is not respawned simply to fly away. Current passengers stay with their transport and retain normal rescue/loss accounting. Bastion fight/cinematic and existing Bruisers remain active; rebuilding starts a new evacuation.

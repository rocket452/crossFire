# Speedster rooftop attacks

- CPU Volt now chooses live intact roof slabs with a clear shot, approaches/climbs the facade, moves into position, brakes and fires aimed electricity from the roof. Three firing windows fit within a 4.8 s attack phase; departure and a 14–20 s cooldown return him to ground patrol between sorties.
- Movement remains in RunnerMotion: actual wall capture, crest, slab support, gravity and debris interaction. Rooftop approach stalls use jump recovery; missed approaches return to their facade staging point. No position teleport or fixed-height support.
- Incoming missiles override the routine. Player control cancels it at the same position. A lost roof/support, occluded firing point, robot defeat or sortie timeout aborts it safely. Rebuild resets timers, plans and counters.

Validation:

- `node QA/runner-rooftops-test.mjs`: actual layout walls/slabs and RunnerMotion at 30/60/120 Hz; wall climbs, supported rooftop firing, clear shot checks, departure, cooldown and subsequent visit. Also exercises blocked targets, detached roofs and gravity, missile priority, player handoff, ceasefire and reset.
- `node QA/runner-rooftops-browser.cjs`: desktop 1100×1000 and touch layout 390×844. Verifies actual facade climb, physical slab support and matching rendered position, visible lightning and robot damage, repeat roof visits/departures, missile interception, pause, takeover/return, destruction of real supporting roof bodies, ceasefire/reset, page/shader errors and overflow.
- Initial live visit reaches B11 at 12.14 m and deals 456 robot damage. Two completed live visits deal 924 damage by 38 simulated seconds; the heroes still intercept missiles (Violet 3 / Volt 9 in that run). Exact later routes depend on destruction and missile interruptions.
- Existing runner motion, animation/CPU, robot missile and energy beam module checks pass.
- Screenshots: `/tmp/runner-rooftop-attack.png` and `/tmp/runner-rooftop-attack-phone.png`.

Browser checks use software WebGL; no physical-phone FPS or thermal claims.

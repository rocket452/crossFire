# Player hero hit feedback — revision 118

Player-controlled Volt Rush and Kage now flash red and play the supplied weighted humanoid's authored `Hit` animation as an upper-body overlay. Running legs, root movement, jump/dash physics and attack/aim input keep their existing behavior. The helper samples a private off-scene skeleton and clones only the actor's emissive materials, preserving geometry sharing without tinting other heroes, infantry or projectiles. Animation transforms never accumulate into the next locomotion pose.

Tuning in `dist/hero-hurt.js`, `HERO_HURT`: .20s flash, .42s reaction, .24s minimum interval between animation restarts, .75 upper-body blend, red #ff233d. Continuous damage can pulse the flash without restarting the clip every frame. Exit, deselection/reset and CPU control restore original materials and stop the reaction. The existing Speedster screen vignette remains.

Existing Bruiser/experimental hit callbacks and eye-shot callbacks trigger the feedback. Main cannon tracing accepts optional controlled-hero proxies and reports actual contacts after shield/cover checks. Hostile Siege Walker projectile traces also include the controlled hero; rocket/plasma blast feedback checks proximity and cover, with the existing bubble-shield interception and rescue phase immunity respected. These proxies are not registered as damageable UnitDamage actors: this task does not add a hero health/death system. Friendly attacks and environmental contact do not produce hit feedback.

Files: shared helper `hero-hurt.js`; integration in `speedster.js`, `ninja-hero.js`, `battle.js`, `beam-combat.js` and `robot-eye-beams.js`; entry/import cache refresh in `index.html`/battle. No character asset changes or new dependencies.

Verification:
- `hero-hurt-test.mjs`: actual private weighted model at 30/60/120Hz and 75ms steps; real Hit clip/spine deformation, exactly unchanged locomotion legs, independent same-variant materials, bounded deformation, no accumulating pose offsets, throttled repeated hits, CPU/exit/reset restoration.
- `hero-hurt-browser.cjs`: desktop and phone emulation for both heroes; a real Bruiser projectile causes red material feedback and active authored Hit overlay; WASD/touch movement and primary attacks continue during hurt; actual beam/rocket/eye contact and plasma blast feedback; blocked beam and rescue phase do not trigger false hits; exit cleans up colors and pose. Screenshots were visually inspected for both rigs.
- Existing robot eye beams, runner torso look, rescue dash, Bruiser hero aim, held primary beam and whip mechanics checks pass.

Physical-phone performance has not been measured. CPU heroes retain their existing feedback policies; this feature targets the player-controlled hero. The upper-body overlay deliberately preserves locomotion rather than stopping movement for a full-body recoil clip.

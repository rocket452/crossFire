# Kage air and shuriken tuning — revision 84

Kage's horizontal air steering is now 32.2m/s (46 × 0.7), his aerial dash travels at 64.4m/s (92 × 0.7), and outward wall-jump push is 12.6m/s (18 × 0.7). Ground running stays at 46m/s. Jump/double-jump/wall-jump vertical impulses and gravity retain their previous values, preserving elevation. Dash range remains 24m, with the existing six-second cooldown, kill reset and two-second post-dash slow fall. The slower dash therefore lasts about 0.373s instead of 0.261s.

Thrown shurikens double from 0.6m to 1.2m diameter (four times the face area). Swept-hit radius doubles from 0.12m to 0.24m. Projectile speed is 59.5m/s (85 × 0.7). Lifetime scales to about 2.143s, preserving the original 127.5m flight range. The ready-hand prop keeps its existing grip size, and projectile/particle pools remain bounded. Damage, firing interval and original weighted character/hand attachments are unchanged. Both player and CPU use the same tuning.

Validation:

- `node QA/ninja-motion-test.mjs`: 30/60/120 Hz and irregular frames; unchanged ground speed/jump heights, lower air steering and wall push, lower-speed dash with exact preserved range, roofs, cooldown, kill reset, slow fall and no extra empty-air jump.
- `node QA/ninja-browser.cjs`: desktop and emulated phone; actual controls/roster, high/double/wall jumps, slower dash and missile/drone kill chains, CPU handoff, primary hits and real weighted-hand origin. The real projectile update measures 29.75m travel over 0.5s, a 1.2m mesh diameter, 0.24m trace radius, preserved flight range and grip size. Existing Violet self-shield and weapon-only red-flash checks also pass.
- Changed JS syntax and patch formatting pass.

Captured `/tmp/ninja84-shurikens-desktop.png` and `/tmp/ninja84-shurikens-phone.png`. Phone results use browser emulation; physical-handset FPS/thermals were not measured. No licensed asset files are added to public source.
